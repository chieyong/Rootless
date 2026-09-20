/**
 * Voicings: shell (1-3-7 / 1-7-3), rootless A/B (Bill Evans type) and the
 * two-handed solo grip, root in the left hand and a rootless shape in the
 * right.
 *
 * Everything is built with interval arithmetic from the chord root, so the
 * notes keep their spelling (C4 = middle C = MIDI 60).
 *
 * Where a voicing sits is data, not code: a register is a map from form id
 * to a placement rule, and every function that needs one takes it as a
 * parameter. Today there is one register, SOLO_REGISTER, because the app is
 * for someone playing alone. A band register can be passed in later without
 * touching any of this.
 */

import { noteName, note, simplifySpelling, toMidi } from './notes.js';
import { rawInterval, transposeNote } from './intervals.js';
import { DEGREE_SEMITONES, degreeInterval, parseChord } from './chords.js';

/** Placed by the root: the root lands in [low, high], ideally on target. */
const SHELL_PLACEMENT = {
  kind: 'root', low: 40, high: 53, target: 48, floor: 36, ceiling: 74,
};

/** Placed by the centre of gravity of the whole shape. */
const ROOTLESS_PLACEMENT = {
  kind: 'centroid', target: 58, floor: 45, ceiling: 81,
};

/**
 * Placed in two parts: a root for the left hand and a rootless shape for the
 * right, with a gap between them that is neither muddy nor hollow.
 */
const SOLO_SPLIT_PLACEMENT = {
  kind: 'split',
  lh: { low: 36, high: 52 },
  rh: { target: 65, floor: 55, ceiling: 84 },
  /** Semitones from the left-hand root up to the lowest right-hand note. */
  gap: { min: 7, max: 19 },
  floor: 36,
  ceiling: 84,
};

/**
 * Where each voicing form sits when you are playing on your own.
 * Keyed by form id, so every reader can look up the rule for the form in
 * hand instead of guessing from its name.
 */
export const SOLO_REGISTER = {
  'shell-1-3-7': SHELL_PLACEMENT,
  'shell-1-7-3': SHELL_PLACEMENT,
  'rootless-A': ROOTLESS_PLACEMENT,
  'rootless-B': ROOTLESS_PLACEMENT,
  'solo-root-rootless': SOLO_SPLIT_PLACEMENT,
};

/** The register in force. Solo is the only model for now. */
export const REGISTER = SOLO_REGISTER;

/** The placement rule for a form, from the given register. */
export function placementFor(form, register = SOLO_REGISTER) {
  return register[form] ?? ROOTLESS_PLACEMENT;
}

function degreeLabel(degree, alter) {
  const accidental = alter === 0 ? '' : alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter);
  return accidental + degree;
}

/** A voice: a degree with its alteration and an optional octave displacement. */
function voice(degree, alter, shift = 0) {
  return { degree, alter, shift, label: degreeLabel(degree, alter) };
}

function alterOf(chord, degree, fallback = 0) {
  return chord.degrees.has(degree) ? chord.degrees.get(degree) : fallback;
}

/** The third of the chord, or the 4th/2nd for sus chords. */
function thirdVoice(chord) {
  if (chord.degrees.has(3)) return voice(3, chord.degrees.get(3));
  if (chord.degrees.has(4)) return voice(4, alterOf(chord, 4));
  if (chord.degrees.has(2)) return voice(2, alterOf(chord, 2));
  return voice(3, 0);
}

/** The seventh, falling back to the sixth for 6 and 6/9 chords. */
function seventhVoice(chord) {
  if (chord.degrees.has(7)) return voice(7, chord.degrees.get(7));
  if (chord.degrees.has(6)) return voice(6, chord.degrees.get(6));
  return null;
}

/** The voice that sits between the third and the seventh in a rootless A form. */
function colourVoice(chord) {
  if (chord.family === 'dominant') {
    // The 13 is voiced as a sixth, right under the seventh.
    const flat13 = chord.degrees.get(13) === -1 || chord.degrees.get(5) === 1;
    return voice(13, flat13 ? -1 : 0, -12);
  }
  if (chord.family === 'major' && chord.degrees.get(11) === 1) return voice(11, 1, -12);
  if (chord.degrees.has(5)) return voice(5, chord.degrees.get(5));
  return voice(5, 0);
}

/** The top voice of a rootless A form: the ninth, or the 11th on a half-diminished. */
function tensionVoice(chord) {
  if (chord.type === 'm7b5') return voice(11, alterOf(chord, 11, 0));
  if (chord.degrees.get(9) === -1) return voice(9, -1);
  if (chord.degrees.has(9.5)) return voice(9, 1);
  if (chord.degrees.has(9)) return voice(9, chord.degrees.get(9));
  return voice(9, 0);
}

/** Semitones above the root, including the octave displacement. */
function voiceSemitones(v) {
  return DEGREE_SEMITONES[v.degree] + v.alter + v.shift;
}

function voiceInterval(v) {
  const base = degreeInterval(v.degree, v.alter);
  return v.shift === 0 ? base : rawInterval(base.steps + (v.shift / 12) * 7, base.semitones + v.shift);
}

/**
 * Voices of a rootless A form, low to high.
 *   maj7/m7:        3 5 7 9
 *   dominant:       3 13 b7 9  (the 13 voiced as a sixth)
 *   m7b5 and dim7:  b3 b5 b7 1 (the root on top - the usual ø voicing)
 *   7sus4:          4 b7 9 5
 */
export function rootlessAVoices(chord) {
  const seventh = seventhVoice(chord);
  let voices;
  if (chord.type === 'm7b5' || chord.family === 'diminished') {
    voices = [thirdVoice(chord), voice(5, alterOf(chord, 5, -1)), seventh, voice(1, 0, 12)];
  } else if (chord.sus || chord.family === 'sus') {
    voices = [thirdVoice(chord), seventh, tensionVoice(chord), voice(5, alterOf(chord, 5), 12)];
  } else {
    voices = [thirdVoice(chord), colourVoice(chord), seventh, tensionVoice(chord)];
  }
  return voices.filter(Boolean).sort((a, b) => voiceSemitones(a) - voiceSemitones(b));
}

/** Voices of a rootless B form: the A form with its two lowest voices an octave up. */
export function rootlessBVoices(chord) {
  const a = rootlessAVoices(chord);
  const split = a.length >= 4 ? 2 : 1;
  const moved = a.slice(0, split).map((v) => ({ ...v, shift: v.shift + 12, label: v.label }));
  return [...a.slice(split), ...moved].sort((x, y) => voiceSemitones(x) - voiceSemitones(y));
}

/** Voices of a shell voicing. */
export function shellVoices(chord, form = '1-3-7') {
  const root = voice(1, 0);
  const third = thirdVoice(chord);
  const seventh = seventhVoice(chord) ?? { ...colourVoice(chord), shift: 0 };
  if (form === '1-7-3') {
    return [root, seventh, { ...third, shift: third.shift + 12, label: third.label }];
  }
  return [root, third, seventh];
}

/**
 * Places a set of voices in the playable register.
 * `score` ranks the candidate octaves; the lowest score wins.
 */
function place(chord, voices, { score, floor, ceiling, octaveOffset = 0 }) {
  const intervals = voices.map(voiceInterval);
  let best = null;
  for (let octave = 0; octave <= 7; octave += 1) {
    const root = note(chord.root.letter, chord.root.alter, octave + octaveOffset);
    const notes = intervals.map((iv) => transposeNote(root, iv));
    const midi = notes.map(toMidi);
    if (Math.min(...midi) < floor || Math.max(...midi) > ceiling) continue;
    const value = score(midi);
    if (!best || value < best.value) best = { notes, midi, value };
  }
  if (best) return best;
  // Nothing fitted the register (a very wide voicing): fall back to a fixed octave.
  const root = note(chord.root.letter, chord.root.alter, 3);
  const notes = intervals.map((iv) => transposeNote(root, iv));
  return { notes, midi: notes.map(toMidi), value: Infinity };
}

const centroid = (midi) => midi.reduce((a, b) => a + b, 0) / midi.length;

/**
 * Places a split voicing: the root in the left hand, the rootless A shape in
 * the right, chosen together.
 *
 * The two hands cannot be placed independently - the best right hand by
 * centroid may leave no root octave at a playable distance - so every pair is
 * scored and the gap rule decides which survive.
 */
function placeSplit(chord, placement, { octaveOffset = 0 } = {}) {
  // The A form of a half-diminished or diminished chord carries the root on
  // top. Here the left hand is already stating the root, so doubling it wastes
  // the finger: the tension takes its place (11 on a m7b5, 9 on a dim7).
  const voices = rootlessAVoices(chord)
    .map((v) => (v.degree === 1 ? tensionVoice(chord) : v))
    .sort((a, b) => voiceSemitones(a) - voiceSemitones(b));
  const intervals = voices.map(voiceInterval);
  const { lh, rh, gap } = placement;

  const rightHands = [];
  for (let octave = 0; octave <= 7; octave += 1) {
    const root = note(chord.root.letter, chord.root.alter, octave + octaveOffset);
    const notes = intervals.map((iv) => transposeNote(root, iv));
    const midi = notes.map(toMidi);
    if (Math.min(...midi) < rh.floor || Math.max(...midi) > rh.ceiling) continue;
    rightHands.push({ notes, midi, cost: Math.abs(centroid(midi) - rh.target) });
  }

  const leftHands = [];
  for (let octave = 0; octave <= 7; octave += 1) {
    const root = note(chord.root.letter, chord.root.alter, octave + octaveOffset);
    const midi = toMidi(root);
    if (midi < lh.low || midi > lh.high) continue;
    leftHands.push({ note: root, midi });
  }

  const middle = (gap.min + gap.max) / 2;
  let best = null;
  let closest = null;
  for (const right of rightHands) {
    for (const left of leftHands) {
      const distance = Math.min(...right.midi) - left.midi;
      const violation = distance < gap.min ? gap.min - distance
        : distance > gap.max ? distance - gap.max : 0;
      // Among legal pairs the right hand's own placement decides; the gap
      // only breaks ties, pulled towards the middle of the allowed range.
      const candidate = {
        left, right, distance, violation, cost: right.cost + Math.abs(distance - middle) * 0.1,
      };
      if (violation === 0 && (!best || candidate.cost < best.cost)) best = candidate;
      if (!closest || violation < closest.violation
        || (violation === closest.violation && candidate.cost < closest.cost)) closest = candidate;
    }
  }

  // No pair satisfies the gap: take the closest one rather than nothing. This
  // happens only when the register leaves a pitch class no room, so the
  // voicing stays playable even if the hands sit a little wide or close.
  const chosen = best ?? closest;
  if (!chosen) return null;

  const lhMidi = [chosen.left.midi];
  const rhMidi = chosen.right.midi;
  return {
    notes: [chosen.left.note, ...chosen.right.notes],
    midi: [...lhMidi, ...rhMidi].sort((a, b) => a - b),
    hands: { lh: lhMidi, rh: [...rhMidi].sort((a, b) => a - b) },
    // The root first, then the rootless voices: the degrees read low to high.
    voices: [voice(1, 0), ...voices],
  };
}

const FORM_LABELS = {
  'shell-1-3-7': 'Shell 1-3-7',
  'shell-1-7-3': 'Shell 1-7-3',
  'rootless-A': 'Rootless A',
  'rootless-B': 'Rootless B',
  'solo-root-rootless': 'Solo: root + rootless',
};

/**
 * Which hand plays which notes, as data beside the labels.
 * 'lh' means the whole voicing is one left-hand grip; 'split' means the form
 * places its hands separately.
 */
const FORM_HANDS = {
  'shell-1-3-7': 'lh',
  'shell-1-7-3': 'lh',
  'rootless-A': 'lh',
  'rootless-B': 'lh',
  'solo-root-rootless': 'split',
};

export const VOICING_FORMS = Object.keys(FORM_LABELS);

/** True when a form puts notes in both hands. */
export function isSplitForm(form) {
  return FORM_HANDS[form] === 'split';
}

/**
 * Builds one voicing.
 * `form` is 'shell-1-3-7', 'shell-1-7-3', 'rootless-A' or 'rootless-B'.
 * `octaveOffset` shifts the whole voicing (used by the voice-leading search).
 */
export function buildVoicing(chordOrSymbol, form = 'rootless-A', {
  octaveOffset = 0, register = SOLO_REGISTER,
} = {}) {
  const chord = parseChord(chordOrSymbol);
  if (!chord) return null;
  const placement = placementFor(form, register);

  let voices;
  let notes;
  let midi;
  let hands;

  if (placement.kind === 'split') {
    const placed = placeSplit(chord, placement, { octaveOffset });
    if (!placed) return null;
    ({ voices, notes, midi, hands } = placed);
  } else {
    voices = form === 'shell-1-3-7' ? shellVoices(chord, '1-3-7')
      : form === 'shell-1-7-3' ? shellVoices(chord, '1-7-3')
        : form === 'rootless-B' ? rootlessBVoices(chord)
          : rootlessAVoices(chord);
    const score = placement.kind === 'root'
      ? (candidate) => (candidate[0] < placement.low || candidate[0] > placement.high
        ? 1000 + Math.abs(candidate[0] - placement.target)
        : Math.abs(candidate[0] - placement.target))
      : (candidate) => Math.abs(centroid(candidate) - placement.target);
    ({ notes, midi } = place(chord, voices, {
      score, floor: placement.floor, ceiling: placement.ceiling, octaveOffset,
    }));
    // One grip, one hand. `midi` is unchanged, so nothing downstream notices.
    hands = { lh: [...midi], rh: [] };
  }

  return {
    form,
    label: FORM_LABELS[form] ?? form,
    symbol: chord.symbol,
    chord,
    voices,
    notes,
    midi,
    hands,
    degrees: voices.map((v) => v.label),
  };
}

/** Every voicing the engine can play for a chord. */
export function voicingsFor(chordOrSymbol, forms = VOICING_FORMS) {
  return forms.map((form) => buildVoicing(chordOrSymbol, form)).filter(Boolean);
}

/** Note names of a voicing: ["E3","A3","Bb3","D4"]. */
export function voicingNoteNames(voicing, { withOctave = true, simplify = false } = {}) {
  return voicing.notes.map((n) => noteName(simplify ? simplifySpelling(n) : n, { withOctave }));
}
