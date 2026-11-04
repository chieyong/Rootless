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
 *
 * Every question also carries `compare`: a playback plan for each option, on
 * the same root and in the same voicing as the question itself. Hearing the
 * four candidates one after another is how a wrong answer teaches you
 * something, so they are built up front rather than left to the screen.
 */

import {
  buildVoicing, formatChord, noteName, parseChord, parseKey, preferredSpelling, simplifySpelling,
  transposeProgression, voiceLeadProgression, voicingNoteNames,
} from '../theory/index.js';
import { qualityCopy } from '../content/qualityCopy.js';
import { voicingCopy } from '../content/voicingCopy.js';
import { getProgression, PROGRESSION_KEYS } from './progressions.js';
import { pitchClass } from '../theory/notes.js';
import { pick, shuffle } from '../quiz/rng.js';

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** How long a rolled chord takes before the next one may start. */
const GAP_BETWEEN_CHORDS = 1.6;
const GAP_AFTER_REFERENCE = 0.8;
const GAP_IN_PROGRESSION = 1.4;

/** How long the last chord of one plan rings before the next plan starts. */
const TAIL = 1.1;
const GAP_BETWEEN_PLANS = 0.5;

/**
 * Strings several playback plans together into one.
 * Each plan keeps its internal timing; the next starts after the previous
 * one has had time to sound, so a three-chord progression gets its three
 * chords before the next candidate begins.
 */
export function concatPlayback(plans, { gap = GAP_BETWEEN_PLANS } = {}) {
  const events = [];
  let offset = 0;
  for (const plan of plans) {
    if (!plan?.length) continue;
    const span = Math.max(...plan.map((event) => event.at ?? 0));
    events.push(...plan.map((event) => ({ ...event, at: (event.at ?? 0) + offset })));
    offset += span + TAIL + gap;
  }
  return events;
}

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
  if (level.format === 'identify-tune-chord') return `ear:tune:${level.tuneId}:${option}`;
  return `ear:quality:${option}`;
}

/** Every option a level can ask about, and the item key of each. */
export function levelOptions(level) {
  const options = level.chords?.map((chord) => chord.symbol)
    ?? level.progressions
    ?? (level.format === 'identify-form' ? level.forms : level.qualities);
  return options.map((option) => ({ option, key: itemKeyFor(level, option) }));
}

/** What a voicing actually sounds, which is all the ear has to go on. */
function soundedPitchClasses(voicing) {
  return [...new Set(voicing.midi.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b).join(',');
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

  // Every candidate on the same root, so the only difference you hear is the
  // quality. No reference tone here: it would treble the length.
  const compare = level.qualities.map((candidate) => ({
    id: candidate,
    label: qualityCopy(candidate)?.label ?? candidate,
    detail: formatChord(parseChord(symbolFor(root, candidate))),
    isAnswer: candidate === quality,
    playback: [{ midi: voicingFor(root, candidate, level.form).midi, at: 0 }],
  }));

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
    compare,
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
    // Not the options - "Same" and "Different" cannot be played. What helps
    // is hearing each chord again on its own.
    compare: [
      {
        id: 'first',
        label: 'First',
        detail: formatChord(parseChord(symbolFor(rootA, first))),
        isAnswer: false,
        playback: [{ midi: voicingA.midi, at: 0 }],
      },
      {
        id: 'second',
        label: 'Second',
        detail: formatChord(parseChord(symbolFor(rootB, second))),
        isAnswer: false,
        playback: [{ midi: voicingB.midi, at: 0 }],
      },
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
    compare: built.map((candidate) => ({
      id: candidate.form,
      label: candidate.label,
      detail: voicingNoteNames(candidate, { simplify: true }).join(' '),
      isAnswer: candidate.form === form,
      playback: [{ midi: candidate.midi, at: 0 }],
    })),
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

  // Every candidate on the same tonic, major or minor as that progression
  // needs, so what differs is the progression and not the key.
  const tonic = key.replace(/m$/, '');
  const compare = level.progressions.map((id) => {
    const candidate = getProgression(id);
    const candidateKey = candidate.key.endsWith('m') ? `${tonic}m` : tonic;
    const candidateSymbols = transposeProgression(candidate.symbols, candidate.key, candidateKey);
    const candidateVoicings = voiceLeadProgression(candidateSymbols, { forms: level.forms });
    return {
      id,
      label: candidate.label,
      detail: candidateSymbols.join(' '),
      isAnswer: id === template.id,
      playback: candidateVoicings.map((voicing, index) => ({
        midi: voicing.midi,
        at: index * GAP_IN_PROGRESSION,
      })),
    };
  });

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
    compare,
    play: playMode(level, settings),
    reveal: symbols.join('  '),
    explanation: `${symbols.join(' ')} - ${template.hear}`,
  };
}


/**
 * "Which chord of this tune is this?" - one chord from the chart, in the
 * tune's own key, against three others from the same chart.
 *
 * Distractors are picked for confusability - the same root with another
 * quality, or the same quality on another root - but never one that sounds
 * the same as the answer. Two different symbols can be the same four notes:
 * a Cm6 and an Am7b5 are indistinguishable, and a tune may well contain both.
 */
export function identifyTuneChordQuestion(level, rng, settings = {}) {
  const symbols = level.chords.map((chord) => chord.symbol);
  const symbol = pick(rng, drawFrom(level, symbols));
  const entry = level.chords.find((chord) => chord.symbol === symbol);
  const chord = parseChord(symbol);
  const voicing = buildVoicing(symbol, level.form);
  const answerSound = soundedPitchClasses(voicing);

  const sameRoot = [];
  const sameQuality = [];
  const rest = [];
  for (const candidate of level.chords) {
    if (candidate.symbol === symbol) continue;
    const other = parseChord(candidate.symbol);
    if (pitchClass(other.root) === pitchClass(chord.root)) sameRoot.push(candidate.symbol);
    else if (other.type === chord.type) sameQuality.push(candidate.symbol);
    else rest.push(candidate.symbol);
  }

  // No two options may sound alike - not just against the answer, but against
  // each other. A D7#11 and a D7 are the same voicing here, because the
  // rootless shape of a dominant voices 3-13-b7-9 and never the eleventh.
  const used = new Set([answerSound]);
  const distractors = [];
  for (const pool of [sameRoot, sameQuality, rest]) {
    for (const candidate of shuffle(rng, pool)) {
      if (distractors.length >= 3) break;
      const sound = soundedPitchClasses(buildVoicing(candidate, level.form));
      if (used.has(sound)) continue;
      used.add(sound);
      distractors.push(candidate);
    }
  }

  const options = shuffle(rng, [symbol, ...distractors]);
  const bars = entry.bars.join(', ');
  const copy = qualityCopy(chord.type);

  return {
    id: `${level.id}:chord:${symbol}:${Math.floor(rng() * 1e6)}`,
    levelId: level.id,
    itemKey: itemKeyFor(level, symbol),
    format: 'identify-tune-chord',
    prompt: 'Which chord of the tune is this?',
    options,
    answer: symbol,
    playback: [{ midi: voicing.midi, at: 0 }],
    compare: options.map((option) => ({
      id: option,
      label: option,
      detail: `bar${level.chords.find((c) => c.symbol === option).bars.length > 1 ? 's' : ''} `
        + level.chords.find((c) => c.symbol === option).bars.join(', '),
      isAnswer: option === symbol,
      playback: [{ midi: buildVoicing(option, level.form).midi, at: 0 }],
    })),
    play: playMode(level, settings),
    reveal: symbol,
    explanation: `${symbol} - ${readableNotes(chord)}. In bar${entry.bars.length > 1 ? 's' : ''} ${bars}.`
      + (copy ? ` ${copy.hear}` : ''),
  };
}

/** One question of whatever shape the level asks for. */
export function generateEarQuestion(level, rng, settings = {}) {
  switch (level.format) {
    case 'same-different': return sameOrDifferentQuestion(level, rng, settings);
    case 'identify-form': return identifyFormQuestion(level, rng, settings);
    case 'identify-progression': return identifyProgressionQuestion(level, rng, settings);
    case 'identify-tune-chord': return identifyTuneChordQuestion(level, rng, settings);
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
