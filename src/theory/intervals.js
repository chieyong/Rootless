/**
 * Interval arithmetic that preserves spelling.
 *
 * An interval is { steps, semitones }:
 *   steps     - diatonic distance, 0 = unison, 1 = second, ... 7 = octave, 8 = ninth
 *   semitones - chromatic distance
 *
 * Both may be negative for descending intervals.
 */

import { LETTERS, LETTER_SEMITONES, letterIndex, note, toMidi } from './notes.js';

/** Semitones of the major/perfect interval for each diatonic step within an octave. */
const STEP_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

/** Diatonic numbers that are perfect (1, 4, 5, 8) rather than major/minor. */
function isPerfectNumber(number) {
  const simple = ((Math.abs(number) - 1) % 7) + 1;
  return simple === 1 || simple === 4 || simple === 5;
}

const PERFECT_OFFSETS = { P: 0, A: 1, AA: 2, d: -1, dd: -2 };
const MAJOR_OFFSETS = { M: 0, m: -1, A: 1, AA: 2, d: -2, dd: -3 };

/**
 * Builds an interval from a diatonic number and a quality.
 * interval(3, 'm') -> minor third, interval(5, 'd') -> diminished fifth.
 */
export function interval(number, quality = null) {
  if (number === 0) throw new Error('Interval numbers start at 1 (unison)');
  const sign = number < 0 ? -1 : 1;
  const abs = Math.abs(number);
  const steps = abs - 1;
  const base = STEP_SEMITONES[steps % 7] + 12 * Math.floor(steps / 7);
  const q = quality ?? (isPerfectNumber(abs) ? 'P' : 'M');
  const table = isPerfectNumber(abs) ? PERFECT_OFFSETS : MAJOR_OFFSETS;
  if (!(q in table)) throw new Error(`Invalid quality ${q} for interval ${number}`);
  return { steps: steps * sign, semitones: (base + table[q]) * sign };
}

/** Builds an interval from raw numbers (used by the chord builder). */
export function rawInterval(steps, semitones) {
  return { steps, semitones };
}

/** Flips an interval's direction. */
export function invertDirection(iv) {
  return { steps: -iv.steps, semitones: -iv.semitones };
}

/** "m3", "P5", "A4", "M9". */
export function intervalName(iv) {
  const sign = iv.steps < 0 || iv.semitones < 0 ? -1 : 1;
  const steps = Math.abs(iv.steps);
  const semitones = Math.abs(iv.semitones);
  const number = steps + 1;
  const base = STEP_SEMITONES[steps % 7] + 12 * Math.floor(steps / 7);
  const diff = semitones - base;
  const table = isPerfectNumber(number) ? PERFECT_OFFSETS : MAJOR_OFFSETS;
  const quality = Object.keys(table).find((k) => table[k] === diff) ?? `${diff >= 0 ? '+' : ''}${diff}`;
  return `${sign < 0 ? '-' : ''}${quality}${number}`;
}

/** Parses "m3", "P5", "-M2". */
export function parseInterval(text) {
  const m = /^(-)?(P|M|m|AA|A|dd|d)?(\d+)$/.exec(String(text).trim());
  if (!m) throw new Error(`Invalid interval: ${text}`);
  const [, minus, quality, number] = m;
  const iv = interval(Number(number), quality ?? null);
  return minus ? invertDirection(iv) : iv;
}

/**
 * Transposes a note by an interval, keeping the correct spelling.
 * Bb + P5 -> F, Bb + A4 -> E (not Fb).
 */
export function transposeNote(n, iv) {
  const idx = letterIndex(n) + iv.steps;
  const octaveShift = Math.floor(idx / 7);
  const letter = LETTERS[((idx % 7) + 7) % 7];
  const naturalDistance = LETTER_SEMITONES[letter] + 12 * octaveShift - LETTER_SEMITONES[n.letter];
  const alter = n.alter + iv.semitones - naturalDistance;
  return n.octave === undefined
    ? note(letter, alter)
    : note(letter, alter, n.octave + octaveShift);
}

/**
 * The interval from `a` to `b`.
 * With octaves it is the real distance; without, the ascending interval
 * within one octave (C -> A is a major sixth, not a minor third down).
 */
export function intervalBetween(a, b) {
  if (a.octave !== undefined && b.octave !== undefined) {
    const steps = letterIndex(b) + 7 * b.octave - (letterIndex(a) + 7 * a.octave);
    return { steps, semitones: toMidi(b) - toMidi(a) };
  }
  const steps = (((letterIndex(b) - letterIndex(a)) % 7) + 7) % 7;
  const natural = STEP_SEMITONES[steps];
  const rawPc = LETTER_SEMITONES[b.letter] + b.alter - (LETTER_SEMITONES[a.letter] + a.alter);
  // Move the chromatic distance into the octave closest to the diatonic size,
  // so C -> Cb stays a diminished unison instead of becoming a major seventh.
  let semitones = ((rawPc % 12) + 12) % 12;
  while (semitones - natural > 6) semitones -= 12;
  while (semitones - natural < -6) semitones += 12;
  return { steps, semitones };
}

/** Semitone distance between two pitch classes, always 0-11 upwards. */
export function semitonesBetweenPitchClasses(a, b) {
  const pcA = ((LETTER_SEMITONES[a.letter] + a.alter) % 12 + 12) % 12;
  const pcB = ((LETTER_SEMITONES[b.letter] + b.alter) % 12 + 12) % 12;
  return ((pcB - pcA) % 12 + 12) % 12;
}

/** Common intervals, by name. */
export const INTERVALS = {
  P1: interval(1, 'P'),
  m2: interval(2, 'm'),
  M2: interval(2, 'M'),
  m3: interval(3, 'm'),
  M3: interval(3, 'M'),
  P4: interval(4, 'P'),
  A4: interval(4, 'A'),
  d5: interval(5, 'd'),
  P5: interval(5, 'P'),
  m6: interval(6, 'm'),
  M6: interval(6, 'M'),
  m7: interval(7, 'm'),
  M7: interval(7, 'M'),
  P8: interval(8, 'P'),
};
