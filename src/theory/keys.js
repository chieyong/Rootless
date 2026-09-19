/**
 * Keys, key signatures and diatonic chords.
 */

import { noteName, parseNote, pitchClass, requireNote } from './notes.js';
import { interval, transposeNote } from './intervals.js';

/** Position on the circle of fifths for each natural letter, as a major key. */
const LETTER_FIFTHS = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };

const MAJOR_STEPS = ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'];
const NATURAL_MINOR_STEPS = ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'];

const MAJOR_SEVENTHS = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'];
const MINOR_SEVENTHS = ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7'];

/** Parses "Bb", "C minor", "Ebm", "F#-", "Bb major". */
export function parseKey(text) {
  if (text && typeof text === 'object' && text.tonic) return text;
  const raw = String(text).trim();
  const m = /^([A-G](?:##|bb|x|#|b|♭|♯)?)\s*(.*)$/.exec(raw);
  if (!m) throw new Error(`Invalid key: ${text}`);
  const tonic = requireNote(m[1]);
  const rest = m[2].toLowerCase().replace(/[\s.]/g, '');
  const mode = rest === '' || rest.startsWith('maj') || rest === 'major' ? 'major'
    : /^(m|min|minor|-)$/.test(rest) ? 'minor'
      : rest.startsWith('min') || rest.startsWith('m') || rest === '-' ? 'minor'
        : 'major';
  return { tonic, mode };
}

/** "Bb", "C minor". */
export function keyName(key) {
  return noteName(key.tonic) + (key.mode === 'minor' ? ' minor' : '');
}

/** Short label for tight spaces: "Bb", "Cm". */
export function shortKeyName(key) {
  return noteName(key.tonic) + (key.mode === 'minor' ? 'm' : '');
}

/** Number of accidentals in the key signature; negative means flats. */
export function keySignature(key) {
  const relativeMajor = key.mode === 'minor'
    ? transposeNote(key.tonic, interval(3, 'm'))
    : key.tonic;
  return LETTER_FIFTHS[relativeMajor.letter] + 7 * relativeMajor.alter;
}

/** Which accidentals this key prefers when a spelling has to be chosen. */
export function preferredSpelling(key) {
  return keySignature(key) > 0 ? 'sharp' : 'flat';
}

/** The seven notes of the key (natural minor for minor keys). */
export function scaleNotes(key) {
  const steps = key.mode === 'minor' ? NATURAL_MINOR_STEPS : MAJOR_STEPS;
  return steps.map((name) => {
    const [, quality, number] = /^([PMm])(\d)$/.exec(name);
    return transposeNote(key.tonic, interval(Number(number), quality));
  });
}

/** The seven diatonic seventh chords as symbols: ["Cmaj7","Dm7",...]. */
export function diatonicSeventhSymbols(key) {
  const qualities = key.mode === 'minor' ? MINOR_SEVENTHS : MAJOR_SEVENTHS;
  return scaleNotes(key).map((n, i) => noteName(n) + (qualities[i] === 'maj7' ? 'maj7' : qualities[i]));
}

/** Pitch classes of the key's scale, for "is this chord diatonic" checks. */
export function scalePitchClasses(key) {
  return scaleNotes(key).map(pitchClass);
}

/** The twelve keys in circle-of-fifths order, spelled the way players read them. */
export const COMMON_KEYS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'];

/** Builds a key from a note, keeping the mode. */
export function keyOf(tonic, mode = 'major') {
  return { tonic: parseNote(tonic) ?? requireNote(tonic), mode };
}
