/**
 * Spelling-aware note representation.
 *
 * A note is a plain object: { letter: 'A'..'G', alter: -2..2, octave?: number }
 * `alter` is the accidental in semitones (-1 = flat, +1 = sharp).
 * `octave` is optional: without it the note is a pitch class ("Bb"),
 * with it a concrete pitch ("Bb3", scientific pitch notation, C4 = middle C = MIDI 60).
 *
 * Everything in the engine keeps the spelling, so Bb7 never becomes A#7.
 */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Semitones above C for each natural letter. */
export const LETTER_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const ACCIDENTAL_TO_ALTER = {
  '': 0,
  '#': 1,
  '##': 2,
  x: 2,
  b: -1,
  bb: -2,
};

const NOTE_RE = /^([A-Ga-g])(##|bb|x|#|b|)(-?\d+)?$/;

/** Normalises unicode accidentals (♭ ♯ 𝄪) to ASCII. */
export function normalizeAccidentals(text) {
  return String(text)
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/𝄫/g, 'bb')
    .replace(/𝄪/g, '##');
}

/** Builds a note object. */
export function note(letter, alter = 0, octave = undefined) {
  const up = String(letter).toUpperCase();
  if (!LETTERS.includes(up)) throw new Error(`Invalid letter: ${letter}`);
  return octave === undefined ? { letter: up, alter } : { letter: up, alter, octave };
}

/**
 * Parses a note name: "C", "Bb", "F#", "Ebb", "A#4", "Bb-1".
 * Returns null when the text is not a note name.
 */
export function parseNote(text) {
  if (text && typeof text === 'object' && text.letter) return text;
  const m = NOTE_RE.exec(normalizeAccidentals(String(text).trim()));
  if (!m) return null;
  const [, letter, accidental, octave] = m;
  return note(
    letter,
    ACCIDENTAL_TO_ALTER[accidental] ?? 0,
    octave === undefined ? undefined : Number(octave),
  );
}

/** Same as parseNote but throws on invalid input. */
export function requireNote(text) {
  const n = parseNote(text);
  if (!n) throw new Error(`Invalid note: ${text}`);
  return n;
}

/** Renders an accidental: -1 -> "b", 2 -> "##". */
export function alterToString(alter) {
  if (alter === 0) return '';
  return alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter);
}

/** Renders a note: { letter:'B', alter:-1 } -> "Bb". Includes the octave when present. */
export function noteName(n, { withOctave = true } = {}) {
  const base = n.letter + alterToString(n.alter);
  return withOctave && n.octave !== undefined ? base + n.octave : base;
}

/** 0-11, where C = 0. */
export function pitchClass(n) {
  return (((LETTER_SEMITONES[n.letter] + n.alter) % 12) + 12) % 12;
}

/** Index of the letter in the C-based order, 0-6. */
export function letterIndex(n) {
  return LETTERS.indexOf(n.letter);
}

/** MIDI number (C4 = 60). Requires an octave. */
export function toMidi(n) {
  if (n.octave === undefined) throw new Error(`Note ${noteName(n)} has no octave`);
  return LETTER_SEMITONES[n.letter] + n.alter + (n.octave + 1) * 12;
}

/** True when both notes sound the same pitch class (C# and Db). */
export function isEnharmonic(a, b) {
  return pitchClass(a) === pitchClass(b);
}

/** True when letter, accidental and octave all match. */
export function sameNote(a, b) {
  return a.letter === b.letter && a.alter === b.alter && a.octave === b.octave;
}

const SHARP_SPELLING = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SPELLING = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Spells a MIDI number as a note. `spelling` picks the accidental flavour
 * for the black keys; it is a fallback only - prefer interval arithmetic,
 * which keeps the correct spelling by construction.
 */
export function fromMidi(midi, { spelling = 'flat' } = {}) {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const name = (spelling === 'sharp' ? SHARP_SPELLING : FLAT_SPELLING)[pc];
  const parsed = requireNote(name);
  return note(parsed.letter, parsed.alter, octave);
}

/** Spells a pitch class (0-11) without an octave. */
export function pitchClassToNote(pc, { spelling = 'flat' } = {}) {
  const name = (spelling === 'sharp' ? SHARP_SPELLING : FLAT_SPELLING)[((pc % 12) + 12) % 12];
  return requireNote(name);
}

/** Spellings a jazz musician would rather not read: B#, E#, Cb, Fb and anything doubled. */
export function isAwkwardSpelling(n) {
  if (Math.abs(n.alter) >= 2) return true;
  if (n.alter === 1 && (n.letter === 'B' || n.letter === 'E')) return true;
  if (n.alter === -1 && (n.letter === 'C' || n.letter === 'F')) return true;
  return false;
}

/**
 * Respells awkward note names (A#7 -> Bb7, Cbmaj7 -> Bmaj7) while keeping
 * everything else as written. Octave-safe.
 */
export function simplifySpelling(n, { spelling = 'flat' } = {}) {
  if (!isAwkwardSpelling(n)) return n;
  const simple = pitchClassToNote(pitchClass(n), { spelling });
  if (n.octave === undefined) return simple;
  // The sounding pitch must stay the same, so derive the octave from MIDI.
  const midi = toMidi(n);
  const octave = Math.floor((midi - simple.alter - LETTER_SEMITONES[simple.letter]) / 12) - 1;
  return note(simple.letter, simple.alter, octave);
}
