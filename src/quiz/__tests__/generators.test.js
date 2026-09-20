import { describe, expect, it } from 'vitest';
import {
  answersMatch, chordAtBarQuestion, generateQuestion, generateRound,
  modulationQuestion, QUESTION_TYPES, transposeQuestion,
} from '../generators.js';
import { makeRng } from '../rng.js';
import { getTune } from '../../tunes/index.js';
import { findModulationsInTune, tuneBars } from '../../tunes/tune.js';

const autumnLeaves = getTune('autumn-leaves');
const blues = getTune('bb-blues');

/** Every question must be answerable: the answer has to be among the options. */
function expectWellFormed(question) {
  expect(question.options).toHaveLength(4);
  expect(new Set(question.options).size, `duplicate options: ${question.options}`).toBe(4);
  expect(question.options).toContain(question.answer);
  expect(question.prompt.length).toBeGreaterThan(0);
  expect(question.explanation.length).toBeGreaterThan(0);
}

describe('answersMatch', () => {
  it('accepts the same chord written differently', () => {
    expect(answersMatch('Cmaj7', 'Cmaj7')).toBe(true);
    expect(answersMatch('C-7', 'Cm7')).toBe(true);
    expect(answersMatch('CΔ', 'Cmaj7')).toBe(true);
    expect(answersMatch('C#m7', 'Dbm7')).toBe(true);
  });

  it('rejects a different chord', () => {
    expect(answersMatch('Cmaj7', 'C7')).toBe(false);
    expect(answersMatch('Cm7', 'Cm7b5')).toBe(false);
    expect(answersMatch('Cm7', 'Dm7')).toBe(false);
    expect(answersMatch('Dm7/G', 'Dm7')).toBe(false);
    expect(answersMatch(null, 'Cm7')).toBe(false);
  });
});

describe('chordAtBarQuestion', () => {
  it('asks about a real bar and is answerable', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const question = chordAtBarQuestion(autumnLeaves, makeRng(seed));
      expectWellFormed(question);
      const bar = tuneBars(autumnLeaves).find((b) => b.barNumber === question.barNumber);
      expect(bar.slots[0].symbol).toBe(question.answer);
    }
  });

  it('hides the chart when asking from memory, shows it with a blank', () => {
    const memory = chordAtBarQuestion(autumnLeaves, makeRng(3), { showSheet: false });
    expect(memory.showSheet).toBe(false);
    expect(memory.prompt).toContain('bar');

    const blank = chordAtBarQuestion(autumnLeaves, makeRng(3), { showSheet: true });
    expect(blank.showSheet).toBe(true);
    expect(blank.blankBars).toEqual([blank.barNumber]);
  });

  it('explains the answer in degrees', () => {
    const question = chordAtBarQuestion(autumnLeaves, makeRng(7));
    expect(question.explanation).toMatch(/in Bb/);
  });
});

describe('transposeQuestion', () => {
  it('produces a passage and one correct transposition', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const question = transposeQuestion(autumnLeaves, makeRng(seed));
      expectWellFormed(question);
      expect(question.answer.split(' ')).toHaveLength(question.passage.split(' ').length);
    }
  });

  it('never offers the passage unchanged as the answer', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const question = transposeQuestion(autumnLeaves, makeRng(seed));
      expect(question.answer).not.toBe(question.passage);
    }
  });
});

describe('modulationQuestion', () => {
  it('asks where a ii-V is heading', () => {
    const targets = findModulationsInTune(autumnLeaves).map((m) => m.name);
    // Bars 5-7 are the minor ii-V-i into G minor; bars 27-28 (Gm7 C7 | Fm7)
    // are a second one into F minor.
    expect(targets).toContain('G minor');
    for (let seed = 1; seed <= 20; seed += 1) {
      const question = modulationQuestion(autumnLeaves, makeRng(seed));
      expectWellFormed(question);
      expect(targets).toContain(question.answer);
      expect(question.highlightBars).toHaveLength(2);
    }
  });

  it('returns null for a tune that never leaves its key', () => {
    expect(modulationQuestion(blues, makeRng(1))).toBeNull();
  });
});

describe('generateQuestion', () => {
  it('falls back to another type when one does not fit the tune', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const question = generateQuestion(blues, makeRng(seed), { types: ['modulation'] });
      expect(question).not.toBeNull();
      expectWellFormed(question);
    }
  });

  it('produces well-formed questions of every type for every tune', () => {
    for (const id of ['autumn-leaves', 'blue-bossa', 'bb-blues', 'all-the-things-you-are']) {
      for (const type of QUESTION_TYPES) {
        for (let seed = 1; seed <= 10; seed += 1) {
          const question = generateQuestion(getTune(id), makeRng(seed), { types: [type] });
          expectWellFormed(question);
        }
      }
    }
  });
});

describe('generateRound', () => {
  it('builds a round without repeating a question', () => {
    const round = generateRound(autumnLeaves, makeRng(11), { count: 5 });
    expect(round).toHaveLength(5);
    expect(new Set(round.map((q) => q.id)).size).toBe(5);
    round.forEach(expectWellFormed);
  });
});
