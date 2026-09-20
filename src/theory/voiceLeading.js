/**
 * Voice leading: pick the voicing that moves least from the previous chord.
 *
 * For a progression the engine runs a small Viterbi search over the candidate
 * voicings, so it optimises the whole chain instead of making greedy choices
 * that paint themselves into a corner.
 */

import { buildVoicing, placementFor, SOLO_REGISTER, VOICING_FORMS } from './voicings.js';
import { parseChord } from './chords.js';

const OCTAVE_OFFSETS = [-1, 0, 1];

/** How far outside its register a candidate may still be considered. */
const REGISTER_SLACK = 3;

/** Average pitch of a set of notes. */
function centroid(midi) {
  return midi.reduce((a, b) => a + b, 0) / midi.length;
}

/** Accepts either a voicing or a bare array of MIDI numbers. */
const midiOf = (x) => (Array.isArray(x) ? x : x?.midi ?? []);

/** A voicing that puts notes in both hands. */
function splitHands(x) {
  const hands = Array.isArray(x) ? null : x?.hands;
  return hands?.lh?.length && hands?.rh?.length ? hands : null;
}

/**
 * How far a voicing has to move to reach another, in semitones.
 *
 * Between two split voicings only the right hands are compared. The
 * left-hand root moves with the roots of the progression whatever the search
 * does, so counting it would swamp the signal the search is looking for.
 *
 * Takes voicings, or bare MIDI arrays when there are no hands to consider.
 */
export function voicingDistance(from, to) {
  const fromHands = splitHands(from);
  const toHands = splitHands(to);
  const a = fromHands && toHands ? fromHands.rh : midiOf(from);
  const b = fromHands && toHands ? toHands.rh : midiOf(to);
  if (!a || !a.length || !b.length) return 0;
  const nearest = (x, y) => x.reduce((sum, n) => sum + Math.min(...y.map((m) => Math.abs(m - n))), 0);
  return (nearest(a, b) + nearest(b, a)) / 2;
}

/**
 * Every placement worth considering for a chord.
 * Duplicates (the same octave chosen twice) are dropped.
 */
export function voicingCandidates(chordOrSymbol, {
  forms = ['rootless-A', 'rootless-B'], register = SOLO_REGISTER,
} = {}) {
  const chord = parseChord(chordOrSymbol);
  if (!chord) return [];
  const seen = new Set();
  const candidates = [];
  for (const form of forms) {
    // The bounds come from the form's own placement rule. Reading one form's
    // register for every form would quietly filter out any form that lives
    // somewhere else - the solo grip reaches to MIDI 84.
    const placement = placementFor(form, register);
    for (const offset of OCTAVE_OFFSETS) {
      const voicing = buildVoicing(chord, form, { octaveOffset: offset, register });
      if (!voicing) continue;
      const lowest = Math.min(...voicing.midi);
      const highest = Math.max(...voicing.midi);
      if (lowest < placement.floor || highest > placement.ceiling + REGISTER_SLACK) continue;
      const key = `${form}:${voicing.midi.join(',')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(voicing);
    }
  }
  return candidates;
}

/**
 * Keeps voicings from drifting to the edges of the keyboard, measured
 * against the form's own placement rule.
 */
function registerPenalty(voicing, register = SOLO_REGISTER) {
  const placement = placementFor(voicing.form, register);
  if (placement.kind === 'split') {
    // Judge the hand that is free to move; the root goes where the root goes.
    return Math.abs(centroid(voicing.hands.rh) - placement.rh.target) * 0.4;
  }
  // A shell voicing is placed by its root, so its centre sits a little above it.
  const target = placement.kind === 'root' ? placement.target + 6 : placement.target;
  return Math.abs(centroid(voicing.midi) - target) * 0.4;
}

/**
 * The voicing of `chord` that moves least from `previous`.
 * Without a previous voicing it returns the best-placed one.
 */
export function chooseVoicing(chordOrSymbol, previous = null, options = {}) {
  const candidates = voicingCandidates(chordOrSymbol, options);
  if (!candidates.length) return null;
  const register = options.register;
  let best = null;
  for (const candidate of candidates) {
    const movement = previous ? voicingDistance(previous, candidate) : 0;
    const cost = movement + registerPenalty(candidate, register);
    if (!best || cost < best.cost) best = { cost, candidate, movement };
  }
  return { ...best.candidate, movement: best.movement };
}

/**
 * Voice-leads a whole progression.
 * Returns one voicing per chord (null for empty slots), each carrying the
 * `movement` in semitones from the previous chord.
 */
export function voiceLeadProgression(chordsOrSymbols, {
  forms = ['rootless-A', 'rootless-B'], start = null, register = SOLO_REGISTER,
} = {}) {
  const slots = chordsOrSymbols.map((c) => (
    c == null ? null : voicingCandidates(c, { forms, register })));

  // Viterbi over the candidate voicings.
  let previousStates = null;
  const table = [];
  for (const candidates of slots) {
    if (!candidates || !candidates.length) { table.push(null); continue; }
    const states = candidates.map((candidate) => {
      let bestCost = Infinity;
      let bestFrom = -1;
      if (previousStates) {
        previousStates.forEach((state, index) => {
          const cost = state.cost + voicingDistance(state.candidate, candidate);
          if (cost < bestCost) { bestCost = cost; bestFrom = index; }
        });
      } else {
        bestCost = start ? voicingDistance(start, candidate) : 0;
      }
      return { candidate, cost: bestCost + registerPenalty(candidate, register), from: bestFrom };
    });
    table.push(states);
    previousStates = states;
  }

  // Walk back from the cheapest final state.
  const result = new Array(slots.length).fill(null);
  let index = table.length - 1;
  while (index >= 0 && !table[index]) index -= 1;
  if (index < 0) return result;
  let state = table[index].reduce((a, b) => (b.cost < a.cost ? b : a));
  while (index >= 0) {
    if (!table[index]) { index -= 1; continue; }
    result[index] = state.candidate;
    const from = state.from;
    let previousIndex = index - 1;
    while (previousIndex >= 0 && !table[previousIndex]) previousIndex -= 1;
    if (previousIndex < 0 || from < 0) break;
    state = table[previousIndex][from];
    index = previousIndex;
  }

  // Annotate how far each chord moved.
  let last = start;
  for (const voicing of result) {
    if (!voicing) continue;
    voicing.movement = last ? voicingDistance(last, voicing) : 0;
    last = voicing;
  }
  return result;
}

export { VOICING_FORMS };
