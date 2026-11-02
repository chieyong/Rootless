import { describe, expect, it } from 'vitest';
import {
  BOX_COUNT, BOX_DAYS, grade, isDue, isWeak, newItem, nextDue, practiceOrder, strength, summarise,
} from '../leitner.js';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 0, 1);

const answer = (item, results, start = T0) =>
  results.reduce((current, right, index) => grade(current, right, start + index * DAY), item);

describe('boxes', () => {
  it('starts in box one, due now', () => {
    const item = newItem('x', T0);
    expect(item.box).toBe(1);
    expect(isDue(item, T0)).toBe(true);
    expect(item.seen).toBe(0);
  });

  it('climbs one box per correct answer', () => {
    let item = newItem('x', T0);
    for (let i = 1; i < BOX_COUNT; i += 1) {
      item = grade(item, true, T0);
      expect(item.box).toBe(i + 1);
    }
    item = grade(item, true, T0);
    expect(item.box, 'does not climb past the last box').toBe(BOX_COUNT);
  });

  it('drops to box one on a wrong answer, however high it was', () => {
    const climbed = answer(newItem('x', T0), [true, true, true, true]);
    expect(climbed.box).toBe(BOX_COUNT);
    expect(grade(climbed, false, T0).box).toBe(1);
  });

  it('waits longer the higher the box', () => {
    for (let box = 1; box < BOX_COUNT; box += 1) {
      expect(nextDue(box + 1, T0)).toBeGreaterThan(nextDue(box, T0));
    }
    expect(nextDue(1, T0)).toBe(T0);
    expect(nextDue(2, T0)).toBe(T0 + BOX_DAYS[1] * DAY);
  });

  it('is not due until its wait is over', () => {
    const item = grade(newItem('x', T0), true, T0);
    expect(isDue(item, T0)).toBe(false);
    expect(isDue(item, T0 + BOX_DAYS[1] * DAY - 1)).toBe(false);
    expect(isDue(item, T0 + BOX_DAYS[1] * DAY)).toBe(true);
  });

  it('never mutates the item it grades', () => {
    const item = newItem('x', T0);
    const frozen = { ...item };
    grade(item, true, T0);
    expect(item).toEqual(frozen);
  });
});

describe('counting', () => {
  it('tracks what was seen and what was right', () => {
    const item = answer(newItem('x', T0), [true, false, true]);
    expect(item.seen).toBe(3);
    expect(item.correct).toBe(2);
    expect(item.streak, 'a wrong answer resets the streak').toBe(1);
  });

  it('reports strength from nothing to everything', () => {
    expect(strength(newItem('x', T0))).toBe(0);
    expect(strength(answer(newItem('x', T0), [true, true, true, true]))).toBe(1);
  });

  it('calls an item weak once it has been seen enough to judge', () => {
    expect(isWeak(answer(newItem('x', T0), [false, false]))).toBe(false);
    expect(isWeak(answer(newItem('x', T0), [false, false, false]))).toBe(true);
    expect(isWeak(answer(newItem('x', T0), [true, true, true]))).toBe(false);
  });
});

describe('practiceOrder', () => {
  it('puts what is due first, weakest first', () => {
    const now = T0 + 30 * DAY;
    const fresh = newItem('fresh', now);
    const strong = answer(newItem('strong', T0), [true, true, true, true], T0);
    const shaky = answer(newItem('shaky', T0), [true], T0);
    const order = practiceOrder([strong, fresh, shaky], now).map((i) => i.key);
    expect(order[0]).toBe('fresh');
    expect(order).toEqual(['fresh', 'shaky', 'strong']);
  });

  it('puts items that are not due last', () => {
    const justGraded = grade(newItem('later', T0), true, T0);
    const due = newItem('now', T0);
    expect(practiceOrder([justGraded, due], T0).map((i) => i.key)).toEqual(['now', 'later']);
  });

  it('is stable for equal items', () => {
    const items = ['b', 'a', 'c'].map((k) => newItem(k, T0));
    expect(practiceOrder(items, T0).map((i) => i.key)).toEqual(['a', 'b', 'c']);
  });
});

describe('summarise', () => {
  it('handles an empty set', () => {
    expect(summarise([], T0)).toMatchObject({ count: 0, due: 0, accuracy: null, strength: 0 });
  });

  it('adds up a set', () => {
    const items = [
      answer(newItem('a', T0), [true, true], T0),
      answer(newItem('b', T0), [false, false, false], T0),
    ];
    const summary = summarise(items, T0);
    expect(summary.count).toBe(2);
    expect(summary.seen).toBe(5);
    expect(summary.correct).toBe(2);
    expect(summary.accuracy).toBeCloseTo(0.4);
    expect(summary.weak).toBe(1);
  });
});
