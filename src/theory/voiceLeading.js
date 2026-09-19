/**
 * Voice leading: pick the voicing that moves least from the previous chord.
 *
 * For a progression the engine runs a small Viterbi search over the candidate
 * voicings, so it optimises the whole chain instead of making greedy choices
 * that paint themselves into a corner.
 */

import { buildVoicing, REGISTER, VOICING_FORMS } from './voicings.js';
import { parseChord } from './chords.js';

const OCTAVE_OFFSETS = [-1, 0, 1];

/** Average pitch of a voicing. */
function centroid(midi) {
  return midi.reduce((a, b) => a + b, 0) / midi.length;
}

/** How far a set of notes has to move to reach another, in semitones. */
export function voicingDistance(fromMidi, toMidi) {
  if (!fromMidi || !fromMidi.length) return 0;
  const nearest = (a, b) => a.reduce((sum, n) => sum + Math.min(...b.map((m) => Math.abs(m - n))), 0);
  return (nearest(fromMidi, toMidi) + nearest(toMidi, fromMidi)) / 2;
}

/**
 * Every placement worth considering for a chord.
 * Duplicates (the same octave chosen twice) are dropped.
 */
export function voicingCandidates(chordOrSymbol, { forms = ['rootless-A', 'rootless-B'] } = {}) {
  const chord = parseChord(chordOrSymbol);
  if (!chord) return [];
  const seen = new Set();
  const candidates = [];
  for (const form of forms) {
    for (const offset of OCTAVE_OFFSETS) {
      const voicing = buildVoicing(chord, form, { octaveOffset: offset });
      if (!voicing) continue;
      const lowest = Math.min(...voicing.midi);
      const highest = Math.max(...voicing.midi);
      if (lowest < 40 || highest > REGISTER.rootless.ceiling + 3) continue;
      const key = `${form}:${voicing.midi.join(',')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(voicing);
    }
  }
  return candidates;
}

/** Keeps voicings from drifting to the edges of the keyboard. */
function registerPenalty(voicing) {
  const target = voicing.form.startsWith('shell')
    ? REGISTER.shell.rootTarget + 6
    : REGISTER.rootless.centroidTarget;
  return Math.abs(centroid(voicing.midi) - target) * 0.4;
}

/**
 * The voicing of `chord` that moves least from `previous`.
 * Without a previous voicing it returns the best-placed one.
 */
export function chooseVoicing(chordOrSymbol, previous = null, options = {}) {
  const candidates = voicingCandidates(chordOrSymbol, options);
  if (!candidates.length) return null;
  let best = null;
  for (const candidate of candidates) {
    const movement = previous ? voicingDistance(previous.midi, candidate.midi) : 0;
    const cost = movement + registerPenalty(candidate);
    if (!best || cost < best.cost) best = { cost, candidate, movement };
  }
  return { ...best.candidate, movement: best.movement };
}

/**
 * Voice-leads a whole progression.
 * Returns one voicing per chord (null for empty slots), each carrying the
 * `movement` in semitones from the previous chord.
 */
export function voiceLeadProgression(chordsOrSymbols, { forms = ['rootless-A', 'rootless-B'], start = null } = {}) {
  const slots = chordsOrSymbols.map((c) => (c == null ? null : voicingCandidates(c, { forms })));

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
          const cost = state.cost + voicingDistance(state.candidate.midi, candidate.midi);
          if (cost < bestCost) { bestCost = cost; bestFrom = index; }
        });
      } else {
        bestCost = start ? voicingDistance(start.midi, candidate.midi) : 0;
      }
      return { candidate, cost: bestCost + registerPenalty(candidate), from: bestFrom };
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
    voicing.movement = last ? voicingDistance(last.midi, voicing.midi) : 0;
    last = voicing;
  }
  return result;
}

export { VOICING_FORMS };
