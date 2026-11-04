/**
 * Ear levels built from a tune.
 *
 * Two of them, and both are about the tune you are actually playing this
 * week rather than chords in the abstract:
 *
 *   T1  the chord qualities this tune uses, and only those
 *   T2  the chords themselves, in the tune's own key
 *
 * T2 asks which chord, not which bar. Which bar cannot be asked: in Take The
 * A Train not one chord appears in a single bar, and in most of the others
 * only two or three do, so nearly every question would have several right
 * answers. Naming the chord trains the same ear, and the answer says which
 * bars it turns up in.
 */

import { parseChord } from '../theory/index.js';
import { tuneBars } from '../tunes/tune.js';

/** The stimulus voicing: it states the root, and separates every quality. */
const FORM = 'solo-root-rootless';

/** Each distinct chord of a tune, with the bars it appears in. */
export function tuneChords(tune) {
  const where = new Map();
  for (const bar of tuneBars(tune)) {
    for (const slot of bar.slots) {
      if (!slot.symbol) continue;
      const bars = where.get(slot.symbol) ?? [];
      if (!bars.includes(bar.barNumber)) bars.push(bar.barNumber);
      where.set(slot.symbol, bars);
    }
  }
  return [...where.entries()].map(([symbol, bars]) => ({ symbol, bars }));
}

/** The chord qualities a tune uses, in the order they first appear. */
export function tuneQualities(tune) {
  const seen = [];
  for (const { symbol } of tuneChords(tune)) {
    const { type } = parseChord(symbol);
    if (!seen.includes(type)) seen.push(type);
  }
  return seen;
}

/** The two levels for one tune. */
export function tuneLevels(tune) {
  if (!tune) return [];
  return [
    {
      block: 'tune',
      id: `T1:${tune.id}`,
      tuneId: tune.id,
      label: 'Colours of this tune',
      description: `The ${tuneQualities(tune).length} qualities ${tune.title} actually uses, in any key.`,
      format: 'identify',
      qualities: tuneQualities(tune),
      roots: 'random',
      reference: false,
      play: 'block',
      form: FORM,
    },
    {
      block: 'tune',
      id: `T2:${tune.id}`,
      tuneId: tune.id,
      label: 'Chords of this tune',
      description: `One chord from the chart of ${tune.title}, in its own key.`,
      format: 'identify-tune-chord',
      chords: tuneChords(tune),
      roots: 'fixed',
      reference: false,
      play: 'block',
      form: FORM,
    },
  ];
}
