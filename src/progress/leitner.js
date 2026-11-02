/**
 * A Leitner box system: five boxes, each with a longer wait than the last.
 *
 * Get an item right and it moves up a box, so you see it less often. Get it
 * wrong and it drops straight back to box one, however long it had been
 * climbing - that is the whole point of the method, and the reason it needs
 * no scores or difficulty ratings.
 *
 * Pure: times are passed in, never read from the clock, so the tests can
 * walk a card through three weeks without waiting.
 */

export const BOX_COUNT = 5;

/** How long an item rests in each box, in days. */
export const BOX_DAYS = [0, 1, 3, 7, 21];

const DAY = 24 * 60 * 60 * 1000;

/** A box number, clamped into range. */
const clampBox = (box) => Math.min(Math.max(Math.round(box), 1), BOX_COUNT);

/** When an item in this box should come back. */
export function nextDue(box, now) {
  return now + BOX_DAYS[clampBox(box) - 1] * DAY;
}

/** A brand new item, due immediately. */
export function newItem(key, now = Date.now()) {
  return {
    key,
    box: 1,
    due: now,
    seen: 0,
    correct: 0,
    streak: 0,
    lastSeen: null,
  };
}

/**
 * Records an answer and returns the item's new state.
 * The item is never mutated: the caller decides what to keep.
 */
export function grade(item, wasCorrect, now = Date.now()) {
  const box = wasCorrect ? clampBox(item.box + 1) : 1;
  return {
    ...item,
    box,
    due: nextDue(box, now),
    seen: item.seen + 1,
    correct: item.correct + (wasCorrect ? 1 : 0),
    streak: wasCorrect ? item.streak + 1 : 0,
    lastSeen: now,
  };
}

export function isDue(item, now = Date.now()) {
  return item.due <= now;
}

/** 0 for a new item, 1 for one that has reached the last box. */
export function strength(item) {
  return (clampBox(item.box) - 1) / (BOX_COUNT - 1);
}

/** An item you have got wrong more often than not, once it has been seen a few times. */
export function isWeak(item) {
  return item.seen >= 3 && item.correct / item.seen < 0.6;
}

/**
 * The order to practise in: what is due first, weakest first within that,
 * then everything else by strength. Ties keep a stable order so a round does
 * not reshuffle itself between renders.
 */
export function practiceOrder(items, now = Date.now()) {
  return [...items].sort((a, b) => {
    const dueA = isDue(a, now);
    const dueB = isDue(b, now);
    if (dueA !== dueB) return dueA ? -1 : 1;
    if (a.box !== b.box) return a.box - b.box;
    if (a.due !== b.due) return a.due - b.due;
    return a.key < b.key ? -1 : 1;
  });
}

/** Totals for a set of items. */
export function summarise(items, now = Date.now()) {
  if (!items.length) {
    return { count: 0, due: 0, weak: 0, seen: 0, correct: 0, accuracy: null, strength: 0 };
  }
  const seen = items.reduce((sum, item) => sum + item.seen, 0);
  const correct = items.reduce((sum, item) => sum + item.correct, 0);
  return {
    count: items.length,
    due: items.filter((item) => isDue(item, now)).length,
    weak: items.filter(isWeak).length,
    seen,
    correct,
    accuracy: seen ? correct / seen : null,
    strength: items.reduce((sum, item) => sum + strength(item), 0) / items.length,
  };
}
