/**
 * The tune model.
 *
 * A tune is JSON: a key, a form (which sections play in which order) and
 * sections holding bars. A bar is either one chord symbol for the whole bar
 * or an array of two symbols, half a bar each.
 *
 * Everything here is pure: the leadsheet, the player and the quizzes all read
 * the same flattened views.
 */

import {
  analyzeProgression, findModulations, parseChord, parseKey, transposeProgression,
} from '../theory/index.js';

/** Beats per bar, from the time signature. */
export function beatsPerBar(tune) {
  const [beats] = (tune.timeSignature ?? '4/4').split('/');
  return Number(beats) || 4;
}

/** The sections of the form, in playing order. */
export function formSections(tune) {
  return tune.form.map((id, index) => {
    const section = tune.sections.find((s) => s.id === id);
    if (!section) throw new Error(`${tune.id}: form refers to unknown section "${id}"`);
    return { ...section, id, key: `${id}-${index}`, order: index };
  });
}

/** Normalises a bar to an array of chord symbols. */
function barChords(bar) {
  if (bar == null) return [null];
  return Array.isArray(bar) ? bar : [bar];
}

/**
 * Every bar of the tune, in playing order.
 * Each bar carries its number (1-based), its section and its chord slots.
 */
export function tuneBars(tune) {
  const beats = beatsPerBar(tune);
  const bars = [];
  let barNumber = 1;
  let slotIndex = 0;

  for (const section of formSections(tune)) {
    section.bars.forEach((bar, indexInSection) => {
      const chords = barChords(bar);
      const slots = chords.map((symbol, position) => ({
        index: slotIndex + position,
        symbol,
        beats: beats / chords.length,
        barNumber,
        position,
      }));
      slotIndex += slots.length;
      bars.push({
        barNumber,
        sectionId: section.id,
        sectionLabel: section.label ?? section.id,
        sectionOrder: section.order,
        indexInSection,
        isSectionStart: indexInSection === 0,
        slots,
      });
      barNumber += 1;
    });
  }
  return bars;
}

/** Every chord slot of the tune, flattened. Two-chord bars give two slots. */
export function tuneSlots(tune) {
  return tuneBars(tune).flatMap((bar) => bar.slots);
}

/** The chord symbols in playing order, one per slot. */
export function tuneSymbols(tune) {
  return tuneSlots(tune).map((slot) => slot.symbol);
}

export function barCount(tune) {
  return tuneBars(tune).length;
}

/** The key as a parsed key object. */
export function tuneKey(tune) {
  return parseKey(tune.key);
}

/**
 * Harmonic analysis of the whole tune, aligned to the slots.
 * Groups (ii-V units) carry the bars they span, ready for the brackets.
 */
export function analyzeTune(tune) {
  const slots = tuneSlots(tune);
  const { entries, groups } = analyzeProgression(slots.map((s) => s.symbol), tuneKey(tune));
  return {
    slots,
    entries,
    groups: groups.map((group) => ({
      ...group,
      fromBar: slots[group.start].barNumber,
      toBar: slots[group.end].barNumber,
    })),
  };
}

/** Where the tune leaves its home key, with the bars it happens in. */
export function findModulationsInTune(tune) {
  const slots = tuneSlots(tune);
  return findModulations(slots.map((s) => s.symbol), tuneKey(tune)).map((modulation) => ({
    ...modulation,
    fromBar: slots[modulation.index].barNumber,
    toBar: slots[modulation.end].barNumber,
  }));
}

/** Returns a copy of the tune in another key. */
export function transposeTune(tune, toKey) {
  const from = tuneKey(tune);
  const to = parseKey(toKey);
  const sections = tune.sections.map((section) => ({
    ...section,
    bars: section.bars.map((bar) => {
      const chords = barChords(bar);
      const moved = transposeProgression(chords, from, to);
      return moved.length === 1 ? moved[0] : moved;
    }),
  }));
  return {
    ...tune,
    key: typeof toKey === 'string' ? toKey : `${to.tonic.letter}${to.mode === 'minor' ? 'm' : ''}`,
    tonality: undefined,
    sections,
    transposedFrom: tune.key,
  };
}

/**
 * Checks a tune for the mistakes that matter: unknown sections, empty bars
 * and chord symbols the engine cannot read. Returns a list of problems.
 */
export function validateTune(tune) {
  const problems = [];
  const required = ['id', 'title', 'key', 'form', 'sections'];
  for (const field of required) {
    if (!tune[field]) problems.push(`missing "${field}"`);
  }
  if (problems.length) return problems;

  if (!Object.prototype.hasOwnProperty.call(tune, 'verified')) {
    problems.push('missing "verified" flag');
  }
  try {
    parseKey(tune.key);
  } catch {
    problems.push(`unreadable key "${tune.key}"`);
  }
  for (const id of tune.form) {
    if (!tune.sections.some((s) => s.id === id)) problems.push(`form refers to unknown section "${id}"`);
  }
  for (const section of tune.sections) {
    if (!Array.isArray(section.bars) || section.bars.length === 0) {
      problems.push(`section "${section.id}" has no bars`);
      continue;
    }
    section.bars.forEach((bar, index) => {
      const chords = barChords(bar);
      if (chords.length > 2) {
        problems.push(`section "${section.id}" bar ${index + 1} has more than two chords`);
      }
      for (const symbol of chords) {
        if (symbol == null || !parseChord(symbol)) {
          problems.push(`section "${section.id}" bar ${index + 1}: cannot read "${symbol}"`);
        }
      }
    });
  }
  return problems;
}
