/**
 * Quiz questions.
 *
 * Pure functions: a tune plus a seeded random generator in, a question object
 * out. Nothing here touches React or storage, so the spaced repetition of
 * phase 4 can reuse them as they are.
 *
 * Every question looks the same:
 *   { id, type, prompt, options, answer, explanation, highlightBars, showSheet }
 */

import {
  COMMON_KEYS, diatonicSeventhSymbols, keyName, noteName, parseChord, parseKey,
  pitchClass, romanNumeral, transposeProgression,
} from '../theory/index.js';
import {
  analyzeTune, findModulationsInTune, transposeTune, tuneBars, tuneKey,
} from '../tunes/tune.js';
import { pick, sample, shuffle } from './rng.js';

const QUALITY_POOL = ['maj7', 'm7', '7', 'm7b5', 'dim7', '6', 'm6', '7alt', 'm', 'maj7#11'];

/** True when two chord symbols mean the same chord, whatever the spelling. */
export function answersMatch(given, expected) {
  if (given == null || expected == null) return false;
  if (String(given).trim() === String(expected).trim()) return true;
  const a = parseChord(given);
  const b = parseChord(expected);
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  if (pitchClass(a.root) !== pitchClass(b.root)) return false;
  const bassA = a.bass ? pitchClass(a.bass) : null;
  const bassB = b.bass ? pitchClass(b.bass) : null;
  return bassA === bassB;
}

/** Bars holding exactly one chord: the cleanest material for a question. */
function singleChordBars(tune) {
  return tuneBars(tune).filter((bar) => bar.slots.length === 1 && bar.slots[0].symbol);
}

function explain(tune, barNumber) {
  const { slots, entries, groups } = analyzeTune(tune);
  const slotIndex = slots.findIndex((slot) => slot.barNumber === barNumber);
  const entry = entries[slotIndex];
  if (!entry) return '';
  const group = groups.find((g) => g.fromBar <= barNumber && barNumber <= g.toBar);
  const degree = `${entry.roman} in ${keyName(tuneKey(tune))}`;
  return group ? `${degree}, part of the ${group.label} in bars ${group.fromBar}-${group.toBar}.` : `${degree}.`;
}

/**
 * "What is bar X?" - from memory, without the chart.
 * With `showSheet` it becomes the fill-in-the-blank question instead.
 */
export function chordAtBarQuestion(tune, rng, { showSheet = false } = {}) {
  const bars = singleChordBars(tune);
  const bar = pick(rng, bars);
  const answer = bar.slots[0].symbol;
  const chord = parseChord(answer);
  const root = noteName(chord.root);

  // Distractors: the same root with another quality, other chords from the
  // tune, and the diatonic chords of the key. Each pool excludes what the
  // previous one already offered, so no option is ever repeated.
  const sameRoot = QUALITY_POOL.map((quality) => root + quality);
  const fromTune = bars.map((b) => b.slots[0].symbol);
  const fromKey = diatonicSeventhSymbols(tuneKey(tune));

  const distractors = [];
  for (const [pool, count] of [[sameRoot, 2], [[...fromTune, ...fromKey], 3]]) {
    for (const option of sample(rng, pool, count, [answer, ...distractors])) {
      if (distractors.length < 3) distractors.push(option);
    }
  }
  while (distractors.length < 3) {
    const filler = sample(rng, QUALITY_POOL.map((q) => root + q), 1, [answer, ...distractors]);
    if (!filler.length) break;
    distractors.push(filler[0]);
  }

  return {
    id: `${showSheet ? 'fill-blank' : 'chord-at-bar'}:${tune.id}:${bar.barNumber}`,
    type: showSheet ? 'fill-blank' : 'chord-at-bar',
    tuneId: tune.id,
    prompt: showSheet
      ? `Which chord belongs in the empty bar?`
      : `What is bar ${bar.barNumber} of ${tune.title}?`,
    barNumber: bar.barNumber,
    highlightBars: [bar.barNumber],
    blankBars: showSheet ? [bar.barNumber] : [],
    showSheet,
    options: shuffle(rng, [answer, ...distractors]),
    answer,
    explanation: explain(tune, bar.barNumber),
  };
}

/** "Transpose this passage to X." */
export function transposeQuestion(tune, rng) {
  const bars = tuneBars(tune);
  const start = Math.floor(rng() * (bars.length - 2));
  const passage = bars.slice(start, start + 2);
  const symbols = passage.flatMap((bar) => bar.slots.map((slot) => slot.symbol));

  const from = tuneKey(tune);
  const targets = COMMON_KEYS.filter((name) => pitchClass(parseKey(name).tonic) !== pitchClass(from.tonic));
  const targetName = pick(rng, targets);
  const target = parseKey(from.mode === 'minor' ? `${targetName}m` : targetName);

  const correct = transposeProgression(symbols, from, target).join(' ');
  // Plausible mistakes: the right shape, a semitone or a fifth off.
  const wrongKeys = sample(rng, COMMON_KEYS, 6, [targetName])
    .map((name) => parseKey(from.mode === 'minor' ? `${name}m` : name));
  const distractors = [];
  for (const key of wrongKeys) {
    const candidate = transposeProgression(symbols, from, key).join(' ');
    if (candidate !== correct && !distractors.includes(candidate)) distractors.push(candidate);
    if (distractors.length === 3) break;
  }

  return {
    id: `transpose:${tune.id}:${start}:${targetName}`,
    type: 'transpose',
    tuneId: tune.id,
    prompt: `Transpose bars ${passage[0].barNumber}-${passage.at(-1).barNumber} to ${keyName(target)}.`,
    passage: symbols.join(' '),
    barNumber: passage[0].barNumber,
    highlightBars: passage.map((bar) => bar.barNumber),
    showSheet: true,
    options: shuffle(rng, [correct, ...distractors]),
    answer: correct,
    explanation: `${symbols.join(' ')} in ${keyName(from)} is ${correct} in ${keyName(target)}.`,
  };
}

/**
 * "Where does the tune modulate?"
 * Returns null for tunes that never leave their key, so the picker can
 * choose another question instead.
 */
export function modulationQuestion(tune, rng) {
  const modulations = findModulationsInTune(tune);
  if (!modulations.length) return null;
  const modulation = pick(rng, modulations);

  const others = COMMON_KEYS
    .filter((name) => pitchClass(parseKey(name).tonic) !== pitchClass(modulation.tonic))
    .map((name) => (modulation.mode === 'minor' ? `${name} minor` : name));
  const distractors = sample(rng, others, 3, [modulation.name]);

  return {
    id: `modulation:${tune.id}:${modulation.fromBar}`,
    type: 'modulation',
    tuneId: tune.id,
    prompt: `Bars ${modulation.fromBar}-${modulation.toBar} of ${tune.title} lead to which key?`,
    barNumber: modulation.fromBar,
    highlightBars: [modulation.fromBar, modulation.toBar],
    showSheet: true,
    options: shuffle(rng, [modulation.name, ...distractors]),
    answer: modulation.name,
    explanation: `That ii-V targets ${modulation.name}, the ${modulation.degree} of ${keyName(tuneKey(tune))}.`,
  };
}

export const QUESTION_TYPES = ['chord-at-bar', 'fill-blank', 'transpose', 'modulation'];

const BUILDERS = {
  'chord-at-bar': (tune, rng) => chordAtBarQuestion(tune, rng, { showSheet: false }),
  'fill-blank': (tune, rng) => chordAtBarQuestion(tune, rng, { showSheet: true }),
  transpose: transposeQuestion,
  modulation: modulationQuestion,
};

/**
 * Builds one question of any of the requested types.
 * Falls back to another type when a tune cannot support the one picked.
 */
export function generateQuestion(tune, rng, { types = QUESTION_TYPES } = {}) {
  const order = shuffle(rng, types);
  for (const type of order) {
    const question = BUILDERS[type]?.(tune, rng);
    if (question) return question;
  }
  return chordAtBarQuestion(tune, rng);
}

/** A round of questions, no two the same in a row. */
export function generateRound(tune, rng, { count = 5, types = QUESTION_TYPES } = {}) {
  const questions = [];
  const seen = new Set();
  let guard = 0;
  while (questions.length < count && guard < count * 12) {
    guard += 1;
    const question = generateQuestion(tune, rng, { types });
    if (seen.has(question.id)) continue;
    seen.add(question.id);
    questions.push(question);
  }
  return questions;
}
