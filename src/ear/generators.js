/**
 * Ear-training questions.
 *
 * Pure functions: a level plus a seeded random generator in, a question out.
 * The question carries its own playback plan - what to sound and when - so
 * the screen stays dumb and the generator stays testable.
 *
 * Every question also carries an `itemKey`: the thing being learned, as
 * opposed to the question's own id, which is random and never repeats. The
 * key is what spaced repetition counts against, so hearing m7b5 in level A5
 * and comparing it in A6 strengthen the same item.
 *
 * A level may carry `focus`: the subset of its options the answer is drawn
 * from, so a round can lean on what is weak or due. The options on screen
 * stay the level's full set - narrowing those would make a six-way question
 * a three-way one and flatter the score.
 */

import {
  buildVoicing, formatChord, noteName, parseChord, parseKey, preferredSpelling, simplifySpelling,
  transposeProgression, voiceLeadProgression, voicingNoteNames,
} from '../theory/index.js';
import { qualityCopy } from '../content/qualityCopy.js';
import { voicingCopy } from '../content/voicingCopy.js';
import { getProgression, PROGRESSION_KEYS } from './progressions.js';
import { pick, shuffle } from '../quiz/rng.js';

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** How long a rolled chord takes before the next one may start. */
const GAP_BETWEEN_CHORDS = 1.6;
const GAP_AFTER_REFERENCE = 0.8;
const GAP_IN_PROGRESSION = 1.4;

/**
 * The pool an answer is drawn from: the level's focus when it has one,
 * otherwise everything it offers. Entries that are not in the level's own
 * options are ignored, so a stale focus can never ask an impossible question.
 */
function drawFrom(level, options) {
  const focus = level.focus?.filter((option) => options.includes(option));
  return focus?.length ? focus : options;
}

/** The item key for one of a level's options. */
export function itemKeyFor(level, option) {
  if (level.format === 'identify-form') return `ear:form:${option}`;
  if (level.format === 'identify-progression') return `ear:progression:${option}`;
  return `ear:quality:${option}`;
}

/** Every option a level can ask about, and the item key of each. */
export function levelOptions(level) {
  const options = level.progressions
    ?? (level.format === 'identify-form' ? level.forms : level.qualities);
  return options.map((option) => ({ option, key: itemKeyFor(level, option) }));
}

/** The chord symbol for a root and a canonical quality. */
function symbolFor(root, quality) {
  return root + quality;
}

function voicingFor(root, quality, form) {
  return buildVoicing(symbolFor(root, quality), form);
}

function chooseRoot(level, rng, settings) {
  const roots = settings?.roots ?? level.roots;
  return roots === 'fixed' ? 'C' : pick(rng, ROOTS);
}

function playMode(level, settings) {
  return settings?.play ?? level.play;
}

function useReference(level, settings) {
  return settings?.reference ?? level.reference;
}

/**
 * The notes as you would read them back, not as theory spells them.
 * A Db7b9 is strictly Db F Ab Cb Ebb; in a "what did you just hear" line
 * those double accidentals obstruct rather than teach, so they are respelled
 * towards the accidentals of the chord's own root. The voicing display keeps
 * the strict spelling, where the degrees sit beside it to explain why.
 */
function readableNotes(chord) {
  const spelling = preferredSpelling(parseKey(noteName(chord.root)));
  return chord.notes.map((n) => noteName(simplifySpelling(n, { spelling }))).join(' ');
}

function describe(root, quality) {
  const chord = parseChord(symbolFor(root, quality));
  const copy = qualityCopy(quality);
  return `${formatChord(chord)} - ${readableNotes(chord)}. ${copy ? copy.hear : ''}`.trim();
}

/** "Which quality is this?" - one chord, the options are quality names. */
export function identifyQuestion(level, rng, settings = {}) {
  const quality = pick(rng, drawFrom(level, level.qualities));
  const root = chooseRoot(level, rng, settings);
  const voicing = voicingFor(root, quality, level.form);
  const reference = useReference(level, settings);

  const playback = [];
  if (reference) {
    playback.push({ midi: [Math.min(...voicing.midi)], at: 0, duration: '4n', plain: true });
  }
  playback.push({ midi: voicing.midi, at: reference ? GAP_AFTER_REFERENCE : 0 });

  return {
    id: `${level.id}:identify:${root}${quality}:${Math.floor(rng() * 1e6)}`,
    levelId: level.id,
    itemKey: `ear:quality:${quality}`,
    format: 'identify',
    prompt: level.roots === 'fixed' && !settings.roots
      ? 'Which quality, on C?'
      : 'Which quality?',
    options: shuffle(rng, level.qualities.map((q) => qualityCopy(q)?.label ?? q)),
    answer: qualityCopy(quality)?.label ?? quality,
    quality,
    playback,
    play: playMode(level, settings),
    reveal: formatChord(parseChord(symbolFor(root, quality))),
    explanation: describe(root, quality),
  };
}

/** "Same quality or not?" - two chords on different roots. */
export function sameOrDifferentQuestion(level, rng, settings = {}) {
  const first = pick(rng, drawFrom(level, level.qualities));
  const same = rng() < 0.5;
  const others = level.qualities.filter((q) => q !== first);
  const second = same ? first : pick(rng, others);

  // Always different roots, or "same" could be answered on pitch alone.
  const rootA = chooseRoot(level, rng, settings);
  const rootB = pick(rng, ROOTS.filter((r) => r !== rootA));

  const voicingA = voicingFor(rootA, first, level.form);
  const voicingB = voicingFor(rootB, second, level.form);

  return {
    id: `${level.id}:same:${rootA}${first}:${rootB}${second}:${Math.floor(rng() * 1e6)}`,
    levelId: level.id,
    // The quality being compared, so a comparison feeds the same item as
    // naming it does.
    itemKey: `ear:quality:${first}`,
    format: 'same-different',
    prompt: 'Same quality, or different?',
    options: ['Same', 'Different'],
    answer: same ? 'Same' : 'Different',
    quality: first,
    playback: [
      { midi: voicingA.midi, at: 0 },
      { midi: voicingB.midi, at: GAP_BETWEEN_CHORDS },
    ],
    play: playMode(level, settings),
    reveal: `${formatChord(parseChord(symbolFor(rootA, first)))} then ${formatChord(parseChord(symbolFor(rootB, second)))}`,
    explanation: same
      ? `Both ${qualityCopy(first)?.label ?? first}. ${qualityCopy(first)?.hear ?? ''}`
      : `${describe(rootA, first)} Then ${describe(rootB, second)}`,
  };
}


/** "Which voicing is this?" - one chord, the options are the shapes. */
export function identifyFormQuestion(level, rng, settings = {}) {
  const form = pick(rng, drawFrom(level, level.forms));
  const quality = pick(rng, level.qualities);
  const root = chooseRoot(level, rng, settings);
  const symbol = symbolFor(root, quality);

  // Build every candidate: it gives the option labels, and it is what the
  // distinguishability test checks.
  const built = level.forms.map((candidate) => buildVoicing(symbol, candidate));
  const chosen = built.find((v) => v.form === form);
  const copy = voicingCopy(form);

  return {
    id: `${level.id}:form:${symbol}:${form}:${Math.floor(rng() * 1e6)}`,
    levelId: level.id,
    itemKey: `ear:form:${form}`,
    format: 'identify-form',
    prompt: 'Which voicing is this?',
    options: shuffle(rng, built.map((v) => v.label)),
    answer: chosen.label,
    playback: [{ midi: chosen.midi, at: 0 }],
    play: playMode(level, settings),
    reveal: `${symbol} as ${chosen.label}`,
    // The voicing's own notes, with octaves: register is what the question
    // is about, and a rootless shape does not contain the chord's root.
    explanation: `${chosen.degrees.join(' ')} - ${voicingNoteNames(chosen, { simplify: true }).join(' ')}. ${copy ? copy.short : ''}`.trim(),
  };
}

/** The key to transpose a progression into, matching the template's mode. */
function targetKeyFor(template, rng, settings) {
  if ((settings?.roots ?? 'random') === 'fixed') return template.key;
  const root = pick(rng, PROGRESSION_KEYS);
  return template.key.endsWith('m') ? `${root}m` : root;
}

/** "Which progression is this?" - three chords, voice-led. */
export function identifyProgressionQuestion(level, rng, settings = {}) {
  const template = getProgression(pick(rng, drawFrom(level, level.progressions)));
  const key = targetKeyFor(template, rng, settings);
  const symbols = transposeProgression(template.symbols, template.key, key);
  const voicings = voiceLeadProgression(symbols, { forms: level.forms });

  const options = level.progressions.map((id) => getProgression(id).label);

  return {
    id: `${level.id}:prog:${template.id}:${key}:${Math.floor(rng() * 1e6)}`,
    levelId: level.id,
    itemKey: `ear:progression:${template.id}`,
    format: 'identify-progression',
    prompt: 'Which progression is this?',
    options: shuffle(rng, options),
    answer: template.label,
    playback: voicings.map((voicing, index) => ({
      midi: voicing.midi,
      at: index * GAP_IN_PROGRESSION,
    })),
    play: playMode(level, settings),
    reveal: symbols.join('  '),
    explanation: `${symbols.join(' ')} - ${template.hear}`,
  };
}

/** One question of whatever shape the level asks for. */
export function generateEarQuestion(level, rng, settings = {}) {
  switch (level.format) {
    case 'same-different': return sameOrDifferentQuestion(level, rng, settings);
    case 'identify-form': return identifyFormQuestion(level, rng, settings);
    case 'identify-progression': return identifyProgressionQuestion(level, rng, settings);
    default: return identifyQuestion(level, rng, settings);
  }
}

/**
 * A round of questions.
 *
 * The same answer never comes up three times running: a run of three invites
 * guessing the pattern instead of listening.
 */
export function generateEarRound(level, rng, { count = 10, settings = {} } = {}) {
  const questions = [];
  let guard = 0;
  while (questions.length < count && guard < count * 20) {
    guard += 1;
    const question = generateEarQuestion(level, rng, settings);
    const previous = questions.slice(-2);
    if (previous.length === 2 && previous.every((q) => q.answer === question.answer)) continue;
    questions.push(question);
  }
  return questions;
}
