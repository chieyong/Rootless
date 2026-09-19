/**
 * Chord symbol parsing.
 *
 * Handles the vocabulary a jazz lead sheet actually uses:
 *   maj7 m7 7 m7b5 dim7 7alt 7b9 13 m6 6/9 sus, slash bass, and the usual
 *   shorthand (Cma7, C-7, CΔ, Cø, C°7, C+).
 *
 * A parsed chord keeps the original body text, so transposing only rewrites
 * the root and the bass: "Bb7alt" stays "7alt".
 */

import { normalizeAccidentals, noteName, parseNote, pitchClass, requireNote } from './notes.js';
import { rawInterval, transposeNote } from './intervals.js';

/** Semitones above the root for each degree of the major scale. */
export const DEGREE_SEMITONES = {
  1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 14, 11: 17, 13: 21,
};

/** The interval for a degree with an alteration: (9, -1) -> minor ninth. */
export function degreeInterval(degree, alter = 0) {
  const semitones = DEGREE_SEMITONES[degree];
  if (semitones === undefined) throw new Error(`Unsupported degree: ${degree}`);
  return rawInterval(degree - 1, semitones + alter);
}

const ROOT_RE = /^([A-G])(##|bb|x|#|b)?/;

/** Rewrites symbol shorthand to a single spelling before parsing. */
function normalizeSymbol(symbol) {
  return normalizeAccidentals(symbol)
    .replace(/\s+/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/[Δ△]7?/g, 'maj7')
    .replace(/\^7?/g, 'maj7')
    .replace(/[øØ]7?/g, 'm7b5')
    .replace(/[°º]7/g, 'dim7')
    .replace(/[°º]/g, 'dim')
    .replace(/\+/g, 'aug');
}

const BASE_QUALITIES = [
  [/^maj/i, 'maj'],
  [/^ma(?=[679])/, 'maj'],
  [/^M(?![a-z])/, 'maj'],
  [/^min/i, 'min'],
  [/^mi(?![a-z])/, 'min'],
  [/^m(?![a-z])/, 'min'],
  [/^-/, 'min'],
  [/^dim/i, 'dim'],
  [/^aug/i, 'aug'],
];

/** Assembles the degree -> alteration map for a base quality and extension number. */
function baseDegrees(base, number) {
  const d = new Map([[1, 0]]);
  const add = (degree, alter = 0) => d.set(degree, alter);

  if (base === 'min') add(3, -1);
  else if (base === 'dim') { add(3, -1); add(5, -1); }
  else if (base === 'aug') { add(3, 0); add(5, 1); }
  else add(3, 0);

  if (base !== 'dim') add(5, base === 'aug' ? 1 : 0);

  if (number === undefined) return d;

  if (number === 5) { d.delete(3); return d; }
  if (number === 6) { add(6, 0); return d; }

  // Seventh and beyond.
  if (base === 'maj') add(7, 0);
  else if (base === 'dim') add(7, -2);
  else add(7, -1);

  if (number >= 9) add(9, 0);
  if (number === 11) {
    add(11, 0);
    if (base === null || base === 'maj') d.delete(3); // a natural 11 clashes with a major third
  }
  if (number === 13) {
    if (base === 'min') add(11, 0);
    add(13, 0);
  }
  return d;
}

const MODIFIERS = [
  // [pattern, apply(degrees, match)]
  // A major seventh after a minor base: CmMaj7, Cm(maj7), C-Δ7.
  [/^(?:maj|Maj|MAJ|M)(13|11|9|7)?/, (d, m) => {
    d.set(7, 0);
    const number = Number(m[1] ?? 7);
    if (number >= 9) d.set(9, 0);
    if (number >= 11) d.set(11, 0);
    if (number >= 13) d.set(13, 0);
  }],
  [/^alt/, (d) => {
    d.set(7, -1);
    d.delete(5);
    d.set(9, -1);
    d.set(9.5, 1); // #9 lives alongside b9; stored as 9.5 and rendered as a #9
    d.set(11, 1);
    d.set(13, -1);
    return { altered: true };
  }],
  [/^sus(4|2)?/, (d, m) => {
    d.delete(3);
    d.set(m[1] === '2' ? 2 : 4, 0);
    return { sus: true };
  }],
  [/^add(13|11|9|6|4|2)/, (d, m) => { d.set(Number(m[1]), 0); }],
  [/^(?:no|omit)(3|5)/, (d, m) => { d.delete(Number(m[1])); }],
  [/^(b|#)(13|11|9|6|5|4)/, (d, m) => {
    const alter = m[1] === '#' ? 1 : -1;
    const degree = Number(m[2]);
    if (degree === 9 && alter === 1 && d.get(9) === -1) d.set(9.5, 1);
    else d.set(degree, alter);
    if (degree === 5 && alter === 1) d.delete(13);
  }],
  [/^\/?(13|11|9|6)/, (d, m) => { d.set(Number(m[1]), 0); }], // 6/9, 69
];

function parseBody(body) {
  let rest = body;
  let base = null;
  let number;
  let altered = false;
  let sus = false;

  for (const [re, name] of BASE_QUALITIES) {
    const m = re.exec(rest);
    if (m) { base = name; rest = rest.slice(m[0].length); break; }
  }

  const numberMatch = /^(13|11|9|7|6|5)/.exec(rest);
  if (numberMatch) { number = Number(numberMatch[1]); rest = rest.slice(numberMatch[0].length); }

  const degrees = baseDegrees(base, number);

  let guard = 0;
  while (rest.length && guard++ < 24) {
    if (rest[0] === '(' || rest[0] === ')' || rest[0] === ' ') { rest = rest.slice(1); continue; }
    let matched = false;
    for (const [re, apply] of MODIFIERS) {
      const m = re.exec(rest);
      if (!m) continue;
      const flags = apply(degrees, m) || {};
      if (flags.altered) altered = true;
      if (flags.sus) sus = true;
      rest = rest.slice(m[0].length);
      matched = true;
      break;
    }
    if (!matched) break; // unknown tail; keep it in the symbol but ignore it harmonically
  }

  return { degrees, base, number, altered, sus, unparsed: rest };
}

/** Sorts degrees: 1, 3, 5, 7, 9, ... with #9 (9.5) after b9. */
function sortedDegrees(degrees) {
  return [...degrees.entries()].sort((a, b) => a[0] - b[0]);
}

function degreeToRealDegree(degree) {
  return degree === 9.5 ? 9 : degree;
}

/** Coarse family, used for ear training and analysis. */
function familyOf(degrees) {
  const third = degrees.get(3);
  const fifth = degrees.get(5);
  const seventh = degrees.get(7);
  if (third === undefined && (degrees.has(4) || degrees.has(2))) return 'sus';
  if (third === -1) {
    if (fifth === -1) return seventh === -2 ? 'diminished' : seventh === -1 ? 'half-diminished' : 'diminished';
    if (seventh === 0) return 'minor-major';
    return 'minor';
  }
  if (fifth === 1 && seventh === -1) return 'dominant';
  if (fifth === 1) return 'augmented';
  if (seventh === -1) return 'dominant';
  return 'major';
}

/** Canonical short type: the label the ear-training module trains on. */
function typeOf(degrees, { altered, sus }) {
  const has = (d) => degrees.has(d);
  const third = degrees.get(3);
  const fifth = degrees.get(5);
  const seventh = degrees.get(7);

  if (third === undefined && (has(4) || has(2))) return seventh === -1 ? '7sus4' : 'sus';
  if (third === -1) {
    if (fifth === -1 && seventh === -2) return 'dim7';
    if (fifth === -1 && seventh === -1) return 'm7b5';
    if (fifth === -1) return 'dim';
    if (seventh === 0) return 'mMaj7';
    if (seventh === -1) return 'm7';
    if (has(6)) return 'm6';
    return 'm';
  }
  if (seventh === -1) {
    if (altered) return '7alt';
    if (fifth === 1) return '7#5';
    if (fifth === -1) return '7b5';
    return '7'; // b9, #9, #11 and b13 are tensions on a plain dominant
  }
  if (seventh === 0) return 'maj7';
  if (has(6) && has(9)) return '6/9';
  if (has(6)) return '6';
  if (fifth === 1) return 'aug';
  return 'maj';
}

/**
 * Parses a chord symbol.
 * Returns null when the symbol has no readable root (empty bars, "%", "N.C.").
 */
export function parseChord(symbol) {
  if (symbol && typeof symbol === 'object' && symbol.root) return symbol;
  const raw = String(symbol).trim();
  const normalized = normalizeSymbol(raw);
  const rootMatch = ROOT_RE.exec(normalized);
  if (!rootMatch) return null;
  const root = requireNote(rootMatch[0]);
  let body = normalized.slice(rootMatch[0].length);

  // Slash bass, but only when the tail is a note name ("C6/9" is not a slash chord).
  let bass = null;
  const slash = body.lastIndexOf('/');
  if (slash !== -1) {
    const tail = body.slice(slash + 1);
    const parsed = parseNote(tail);
    if (parsed && parsed.octave === undefined) {
      bass = parsed;
      body = body.slice(0, slash);
    }
  }

  const { degrees, altered, sus, unparsed } = parseBody(body);
  const entries = sortedDegrees(degrees);
  const intervals = entries.map(([degree, alter]) => degreeInterval(degreeToRealDegree(degree), alter));
  const notes = intervals.map((iv) => transposeNote(root, iv));

  return {
    symbol: raw,
    body,
    root,
    bass,
    degrees,
    intervals,
    notes,
    pitchClasses: notes.map(pitchClass),
    tensions: entries
      .filter(([degree]) => degree >= 9)
      .map(([degree, alter]) => `${alter > 0 ? '#' : alter < 0 ? 'b' : ''}${degreeToRealDegree(degree)}`),
    family: familyOf(degrees),
    type: typeOf(degrees, { altered, sus }),
    altered,
    sus,
    unparsed,
  };
}

/** Renders a chord back to a symbol (used after transposing). */
export function formatChord(chord) {
  return noteName(chord.root) + chord.body + (chord.bass ? `/${noteName(chord.bass)}` : '');
}

/** Note names of a chord, e.g. ["C","E","G","Bb"]. */
export function chordNoteNames(chord) {
  return chord.notes.map((n) => noteName(n));
}

/** The alteration of a degree, or null when the chord does not contain it. */
export function degreeAlter(chord, degree) {
  return chord.degrees.has(degree) ? chord.degrees.get(degree) : null;
}

/** True for chords that work as a dominant (V7, 7alt, 7sus4, 7b9...). */
export function isDominantType(chord) {
  return chord.family === 'dominant' || chord.type === '7sus4';
}

/** True for chords that can act as the ii of a ii-V. */
export function isMinorSeventhType(chord) {
  return chord.type === 'm7' || chord.type === 'm9' || chord.type === 'm11';
}
