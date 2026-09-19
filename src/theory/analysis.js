/**
 * Degree (roman numeral) analysis and progression parsing.
 *
 * Numerals are always read against the MAJOR scale of the key, the way jazz
 * lead-sheet analysis does it: in C minor, Eb is bIII and Bb7 is bVII7.
 */

import { noteName, pitchClass } from './notes.js';
import { interval, intervalBetween, transposeNote } from './intervals.js';
import { isDominantType, parseChord } from './chords.js';
import { diatonicSeventhSymbols, parseKey, scalePitchClasses } from './keys.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Chord types that sound minor and therefore get a lowercase numeral. */
const LOWERCASE_FAMILIES = new Set(['minor', 'diminished', 'half-diminished', 'minor-major']);

const SUFFIX = {
  maj7: 'maj7', maj: '', 6: '6', '6/9': '6/9',
  m: '', m7: '7', m6: '6', mMaj7: '(maj7)',
  m7b5: 'ø7', dim7: '°7', dim: '°',
  7: '7', '7alt': '7alt', '7#5': '7#5', '7b5': '7b5', '7sus4': '7sus4',
  sus: 'sus4', aug: '+',
};

/** Semitones from a up to b, 0-11. */
function upward(a, b) {
  return ((pitchClass(b) - pitchClass(a)) % 12 + 12) % 12;
}

/**
 * The scale degree of a note in a key: { number, accidental, numeral }.
 * Bb in C -> { number: 7, accidental: 'b', numeral: 'bVII' }.
 */
export function degreeOf(noteOrChordRoot, key) {
  const k = parseKey(key);
  const iv = intervalBetween(k.tonic, noteOrChordRoot);
  const number = (iv.steps % 7) + 1;
  const majorSemitones = [0, 2, 4, 5, 7, 9, 11][iv.steps % 7];
  const diff = iv.semitones - majorSemitones;
  const accidental = diff === 0 ? '' : diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff);
  return { number, accidental, numeral: accidental + ROMAN[number - 1] };
}

/** "Imaj7", "ii7", "V7b9", "bVII7", "#ivø7". */
export function romanNumeral(chordOrSymbol, key) {
  const chord = parseChord(chordOrSymbol);
  if (!chord) return null;
  const { numeral } = degreeOf(chord.root, key);
  const lower = LOWERCASE_FAMILIES.has(chord.family);
  const base = lower ? numeral.replace(/[IV]+/, (r) => r.toLowerCase()) : numeral;
  let suffix = SUFFIX[chord.type] ?? chord.type;
  if (chord.type === '7') {
    const altered = chord.tensions.filter((t) => t.startsWith('b') || t.startsWith('#'));
    if (altered.length) suffix += altered.join('');
  }
  const bass = chord.bass ? `/${degreeOf(chord.bass, key).numeral}` : '';
  return base + suffix + bass;
}

/** Is every note of the chord in the key's scale? */
export function isDiatonic(chordOrSymbol, key) {
  const chord = parseChord(chordOrSymbol);
  if (!chord) return false;
  const scale = new Set(scalePitchClasses(parseKey(key)));
  return chord.pitchClasses.every((pc) => scale.has(pc));
}

function isMinorish(chord) {
  return chord && (chord.family === 'minor' || chord.family === 'minor-major');
}

function isTonicish(chord) {
  return chord && (chord.family === 'major' || isMinorish(chord));
}

/**
 * Analyses one chord in a key, optionally with its neighbour for context.
 * `role` is the harmonic function; `target` the chord it points at, if any.
 */
export function analyzeChord(chordOrSymbol, key, { next = null } = {}) {
  const chord = parseChord(chordOrSymbol);
  if (!chord) return null;
  const k = parseKey(key);
  const degree = degreeOf(chord.root, k);
  const roman = romanNumeral(chord, k);
  const nextChord = next ? parseChord(next) : null;

  let role = isDiatonic(chord, k) ? 'diatonic' : 'chromatic';
  let target = null;

  if (isDominantType(chord)) {
    role = degree.numeral === 'V' ? 'dominant' : 'chromatic';
    if (nextChord) {
      const distance = upward(chord.root, nextChord.root);
      if (distance === 5) {
        target = nextChord.root;
        role = degree.numeral === 'V' ? 'dominant' : 'secondary-dominant';
      } else if (distance === 11) {
        target = nextChord.root;
        role = 'tritone-sub';
      } else if (distance === 2 && isTonicish(nextChord)) {
        target = nextChord.root;
        role = 'backdoor-dominant';
      }
    }
    if (!target && degree.numeral !== 'V') {
      // No context: read it as the V7 of whatever it would resolve to.
      role = 'secondary-dominant';
    }
  } else if (role === 'chromatic' && isMinorish(chord)) {
    role = 'borrowed';
  }

  let functionLabel = null;
  if (role === 'secondary-dominant') {
    const implied = target ?? transposeNote(chord.root, interval(4, 'P'));
    functionLabel = `V7/${targetNumeral(implied, k, target ? nextChord : null)}`;
  } else if (role === 'tritone-sub') {
    const implied = target ?? transposeNote(chord.root, interval(2, 'm'));
    functionLabel = `subV7/${targetNumeral(implied, k, target ? nextChord : null)}`;
  } else if (role === 'backdoor-dominant') {
    functionLabel = `backdoor V7/${targetNumeral(target, k, nextChord)}`;
  }

  return { chord, symbol: chord.symbol, degree, roman, role, target, functionLabel, key: k };
}

/** The numeral of a target root, cased after the chord that actually follows
 * (or after the key's own diatonic chord when there is no context). */
function targetNumeral(root, key, followingChord) {
  const { numeral } = degreeOf(root, key);
  let minor = followingChord ? isMinorish(followingChord) || followingChord.family === 'half-diminished' : null;
  if (minor === null) {
    const diatonic = diatonicSeventhSymbols(key)
      .map((symbol) => parseChord(symbol))
      .find((c) => pitchClass(c.root) === pitchClass(root));
    minor = diatonic ? isMinorish(diatonic) || diatonic.family === 'half-diminished' : false;
  }
  return minor ? numeral.replace(/[IV]+/, (r) => r.toLowerCase()) : numeral;
}

const II_V_SUFFIX = { major: 'ii-V-I', minor: 'minor ii-V-i' };

/**
 * Analyses a chord sequence and finds the ii-V units inside it.
 *
 * Returns { entries, groups }:
 *   entries - one analysis per input chord (null for unparsable slots)
 *   groups  - { kind, start, end, target, label } spans for the ii-V brackets
 */
export function analyzeProgression(chordsOrSymbols, key) {
  const k = parseKey(key);
  const chords = chordsOrSymbols.map((c) => (c == null ? null : parseChord(c)));
  const entries = chords.map((chord, i) =>
    (chord ? analyzeChord(chord, k, { next: chords[i + 1] ?? null }) : null));

  const groups = [];
  for (let i = 0; i < chords.length - 1; i += 1) {
    const two = chords[i];
    const five = chords[i + 1];
    if (!two || !five) continue;
    const isTwo = two.type === 'm7' || two.type === 'm7b5' || isMinorish(two);
    if (!isTwo || !isDominantType(five)) continue;

    const step = upward(two.root, five.root);
    const tritoneSub = step === 11;
    if (step !== 5 && !tritoneSub) continue;

    const after = chords[i + 2] ?? null;
    const resolves = after && isTonicish(after);
    const distanceToAfter = after ? upward(five.root, after.root) : null;

    let kind = tritoneSub ? 'tritone-sub-ii-V' : 'ii-V';
    let end = i + 1;
    let target = null;

    if (resolves && (distanceToAfter === 5 || (tritoneSub && distanceToAfter === 11))) {
      kind = tritoneSub ? 'tritone-sub-ii-V-I' : 'ii-V-I';
      end = i + 2;
      target = after.root;
    } else if (resolves && distanceToAfter === 2 && two.type === 'm7') {
      kind = 'backdoor-ii-V';
      end = i + 2;
      target = after.root;
    }

    const minor = two.type === 'm7b5' || (target && after && isMinorish(after));
    const mode = minor ? 'minor' : 'major';
    if (!target) {
      // Unresolved: the ii-V still implies a key a fourth above the V.
      target = null;
    }

    const targetName = target ? noteName(target) : null;
    const label = kind === 'ii-V' || kind === 'tritone-sub-ii-V'
      ? (tritoneSub ? 'tritone sub ii-V' : 'ii-V')
      : kind === 'backdoor-ii-V'
        ? `backdoor ii-V to ${targetName}`
        : `${tritoneSub ? 'tritone sub ' : ''}${II_V_SUFFIX[mode]}${targetName ? ` in ${targetName}` : ''}`;

    groups.push({ kind, start: i, end, target, mode, label });
    i = end - 1; // do not start a new group inside this one
  }

  for (const [index, group] of groups.entries()) {
    for (let i = group.start; i <= group.end; i += 1) {
      if (entries[i]) entries[i].group = index;
    }
  }

  return { entries, groups, key: k };
}

/**
 * Where a progression leaves the home key: every ii-V(-I) that targets
 * another tonic. Feeds the "where does the tune modulate?" quiz.
 */
export function findModulations(chordsOrSymbols, key) {
  const k = parseKey(key);
  const { groups } = analyzeProgression(chordsOrSymbols, k);
  const homePc = pitchClass(k.tonic);
  return groups
    .filter((g) => g.target && pitchClass(g.target) !== homePc)
    .map((g) => ({
      index: g.start,
      end: g.end,
      tonic: g.target,
      mode: g.mode,
      name: noteName(g.target) + (g.mode === 'minor' ? ' minor' : ''),
      degree: g.mode === 'minor'
        ? degreeOf(g.target, k).numeral.replace(/[IV]+/, (r) => r.toLowerCase())
        : degreeOf(g.target, k).numeral,
    }));
}
