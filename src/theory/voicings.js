/**
 * Voicings: shell (1-3-7 / 1-7-3) and rootless A/B (Bill Evans type).
 *
 * Everything is built with interval arithmetic from the chord root, so the
 * notes keep their spelling and land in a sensible left-hand register
 * (roughly C3-C5, MIDI 48-72, with C4 = middle C = 60).
 */

import { noteName, note, simplifySpelling, toMidi } from './notes.js';
import { rawInterval, transposeNote } from './intervals.js';
import { DEGREE_SEMITONES, degreeInterval, parseChord } from './chords.js';

/** Where the lowest note of each voicing family wants to sit. */
export const REGISTER = {
  /** Shell voicings are placed by their root: between E2 and F3, ideally at C3. */
  shell: { rootLow: 40, rootHigh: 53, rootTarget: 48, floor: 36, ceiling: 74 },
  /** Rootless voicings are placed by their centre of gravity, around Bb3. */
  rootless: { centroidTarget: 58, floor: 45, ceiling: 81 },
};

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

const FORM_LABELS = {
  'shell-1-3-7': 'Shell 1-3-7',
  'shell-1-7-3': 'Shell 1-7-3',
  'rootless-A': 'Rootless A',
  'rootless-B': 'Rootless B',
};

export const VOICING_FORMS = Object.keys(FORM_LABELS);

/**
 * Builds one voicing.
 * `form` is 'shell-1-3-7', 'shell-1-7-3', 'rootless-A' or 'rootless-B'.
 * `octaveOffset` shifts the whole voicing (used by the voice-leading search).
 */
export function buildVoicing(chordOrSymbol, form = 'rootless-A', { octaveOffset = 0 } = {}) {
  const chord = parseChord(chordOrSymbol);
  if (!chord) return null;
  const voices = form === 'shell-1-3-7' ? shellVoices(chord, '1-3-7')
    : form === 'shell-1-7-3' ? shellVoices(chord, '1-7-3')
      : form === 'rootless-B' ? rootlessBVoices(chord)
        : rootlessAVoices(chord);
  const register = form.startsWith('shell') ? REGISTER.shell : REGISTER.rootless;
  const score = form.startsWith('shell')
    ? (midi) => (midi[0] < REGISTER.shell.rootLow || midi[0] > REGISTER.shell.rootHigh
      ? 1000 + Math.abs(midi[0] - REGISTER.shell.rootTarget)
      : Math.abs(midi[0] - REGISTER.shell.rootTarget))
    : (midi) => Math.abs(centroid(midi) - REGISTER.rootless.centroidTarget);
  const { notes, midi } = place(chord, voices, {
    score, floor: register.floor, ceiling: register.ceiling, octaveOffset,
  });
  return {
    form,
    label: FORM_LABELS[form] ?? form,
    symbol: chord.symbol,
    chord,
    voices,
    notes,
    midi,
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
