/**
 * Transposition.
 *
 * Spelling comes out of interval arithmetic, so a ii-V-I in Bb reads
 * Cm7 F7 Bbmaj7 and never Cm7 F7 A#maj7. Roots that would land on an
 * awkward name (A#, Cb, double accidentals) are respelled towards the
 * accidentals of the destination key.
 */

import { noteName, parseNote, simplifySpelling } from './notes.js';
import { intervalBetween, transposeNote } from './intervals.js';
import { formatChord, parseChord } from './chords.js';
import { keySignature, parseKey, preferredSpelling } from './keys.js';

/** The interval that moves `fromKey` onto `toKey` (upwards, within an octave). */
export function intervalBetweenKeys(fromKey, toKey) {
  return intervalBetween(parseKey(fromKey).tonic, parseKey(toKey).tonic);
}

/**
 * Transposes a chord by an interval.
 * `spelling` ('flat' | 'sharp') decides how awkward roots are respelled;
 * pass `simplify: false` to keep the strict interval spelling.
 */
export function transposeChord(chordOrSymbol, iv, { spelling = 'flat', simplify = true } = {}) {
  const chord = parseChord(chordOrSymbol);
  if (!chord) return null;
  let root = transposeNote(chord.root, iv);
  let bass = chord.bass ? transposeNote(chord.bass, iv) : null;
  if (simplify) {
    root = simplifySpelling(root, { spelling });
    bass = bass ? simplifySpelling(bass, { spelling }) : null;
  }
  return parseChord(noteName(root) + chord.body + (bass ? `/${noteName(bass)}` : ''));
}

/** Transposes a symbol and returns a symbol. */
export function transposeSymbol(symbol, iv, options) {
  const chord = transposeChord(symbol, iv, options);
  return chord ? formatChord(chord) : symbol;
}

/** Transposes a whole progression between keys, keeping empty slots intact. */
export function transposeProgression(symbols, fromKey, toKey) {
  const from = parseKey(fromKey);
  const to = parseKey(toKey);
  const iv = intervalBetweenKeys(from, to);
  const spelling = preferredSpelling(to);
  return symbols.map((s) => (s == null ? s : transposeSymbol(s, iv, { spelling })));
}

/** Transposes a note, respelling awkward results. */
export function transposeNoteTo(noteOrName, iv, { spelling = 'flat', simplify = true } = {}) {
  const n = parseNote(noteOrName);
  const moved = transposeNote(n, iv);
  return simplify ? simplifySpelling(moved, { spelling }) : moved;
}

/** Transposes a key itself, choosing the spelling with the fewest accidentals. */
export function transposeKey(key, iv) {
  const k = parseKey(key);
  const tonic = transposeNote(k.tonic, iv);
  const candidate = { tonic, mode: k.mode };
  if (Math.abs(keySignature(candidate)) <= 7 && Math.abs(tonic.alter) <= 1) return candidate;
  const simplified = { tonic: simplifySpelling(tonic, { spelling: keySignature(candidate) > 0 ? 'sharp' : 'flat' }), mode: k.mode };
  return simplified;
}
