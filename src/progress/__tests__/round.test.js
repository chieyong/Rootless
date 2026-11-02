import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUND, getRoundMode, questionsToPrepare, roundIsOver, roundProgress, roundRemaining,
} from '../round.js';

const T0 = Date.UTC(2026, 0, 1);
const short = getRoundMode('short');
const ten = getRoundMode('ten');

describe('round modes', () => {
  it('defaults to the five-minute round', () => {
    expect(getRoundMode(DEFAULT_ROUND).seconds).toBe(300);
    expect(getRoundMode('nonsense').id).toBe(DEFAULT_ROUND);
  });

  it('prepares enough questions for either kind', () => {
    expect(questionsToPrepare(ten)).toBe(10);
    expect(questionsToPrepare(short)).toBe(short.maxQuestions);
  });
});

describe('a timed round', () => {
  it('runs until the time is up', () => {
    expect(roundIsOver(short, { answered: 3, startedAt: T0, now: T0 + 60_000 })).toBe(false);
    expect(roundIsOver(short, { answered: 3, startedAt: T0, now: T0 + 299_000 })).toBe(false);
    expect(roundIsOver(short, { answered: 3, startedAt: T0, now: T0 + 300_000 })).toBe(true);
  });

  it('stops before it runs forever, however fast you answer', () => {
    expect(roundIsOver(short, { answered: short.maxQuestions, startedAt: T0, now: T0 })).toBe(true);
  });

  it('counts down', () => {
    expect(roundRemaining(short, { answered: 0, startedAt: T0, now: T0 })).toBe('5:00 left');
    expect(roundRemaining(short, { answered: 0, startedAt: T0, now: T0 + 150_000 })).toBe('2:30 left');
    expect(roundRemaining(short, { answered: 0, startedAt: T0, now: T0 + 400_000 })).toBe('0:00 left');
  });
});

describe('a counted round', () => {
  it('runs until the questions are gone', () => {
    expect(roundIsOver(ten, { answered: 9, startedAt: T0, now: T0 + 10 ** 7 })).toBe(false);
    expect(roundIsOver(ten, { answered: 10, startedAt: T0, now: T0 })).toBe(true);
  });

  it('ignores the clock', () => {
    expect(roundProgress(ten, { answered: 5, startedAt: T0, now: T0 + 10 ** 7 })).toBe(0.5);
    expect(roundRemaining(ten, { answered: 4, startedAt: T0, now: T0 })).toBe('6 to go');
  });
});

describe('progress', () => {
  it('never goes above one', () => {
    expect(roundProgress(short, { answered: 0, startedAt: T0, now: T0 + 10 ** 7 })).toBe(1);
    expect(roundProgress(ten, { answered: 99, startedAt: T0, now: T0 })).toBe(1);
  });

  it('follows whichever is further along, the clock or the count', () => {
    expect(roundProgress(short, { answered: 0, startedAt: T0, now: T0 + 150_000 })).toBeCloseTo(0.5);
    expect(roundProgress(short, { answered: 36, startedAt: T0, now: T0 })).toBeCloseTo(0.9);
  });
});
