import { describe, expect, it } from 'vitest';
import { EAR_LEVELS, getLevel, usedQualities } from '../levels.js';
import {
  generateEarQuestion, generateEarRound, identifyQuestion, sameOrDifferentQuestion,
} from '../generators.js';
import { makeRng } from '../../quiz/rng.js';
import { qualityCopy } from '../../content/qualityCopy.js';
import { buildVoicing, formatChord, parseChord } from '../../theory/index.js';

/** The pitch classes a voicing actually sounds, which is all the ear gets. */
const sounded = (voicing) =>
  [...new Set(voicing.midi.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b).join(',');

describe('the levels', () => {
  it('never asks a question with two correct answers', () => {
    // A shell voicing has no fifth, so it cannot tell m7 from m7b5. Any level
    // whose qualities sound identical in its own voicing is unanswerable,
    // however carefully the options are worded.
    for (const level of EAR_LEVELS) {
      const heard = new Map();
      for (const quality of level.qualities) {
        const key = sounded(buildVoicing(`C${quality}`, level.form));
        heard.set(key, [...(heard.get(key) ?? []), quality]);
      }
      for (const [, qualities] of heard) {
        expect(qualities, `${level.id} cannot separate ${qualities.join(' from ')}`).toHaveLength(1);
      }
    }
  });

  it('asks about chords the engine can actually build', () => {
    // A level's quality is a symbol suffix, not the parser's canonical type:
    // 7b9 is deliberately read as a dominant carrying a b9, so that the
    // coarse set stays maj7 / m7 / 7 / m7b5 / 7alt everywhere else.
    for (const quality of usedQualities()) {
      const chord = parseChord(`C${quality}`);
      expect(chord, `cannot parse C${quality}`).not.toBeNull();
      expect(formatChord(chord), `C${quality} does not round-trip`).toBe(`C${quality}`);
      expect(chord.unparsed, `leftover text in C${quality}`).toBe('');
    }
  });

  it('widens the choice as the ladder goes up', () => {
    // Not monotonic by design: the last level offers four dominants rather
    // than six colours, and is harder for it - the distinctions are finer.
    const options = (id) => getLevel(id).qualities.length;
    expect(options('A2')).toBeLessThan(options('A3'));
    expect(options('A3')).toBeLessThan(options('A5'));
    expect(options('A5')).toBeLessThan(options('A7'));
    for (const level of EAR_LEVELS) {
      expect(level.qualities.length, `${level.id}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('starts from a fixed root and ends on random ones', () => {
    expect(EAR_LEVELS.find((l) => l.id === 'A2').roots).toBe('fixed');
    expect(EAR_LEVELS.at(-1).roots).toBe('random');
  });

  it('falls back to the first level for an unknown id', () => {
    expect(getLevel('nope').id).toBe('A1');
  });
});

describe('question shape', () => {
  const expectPlayable = (question) => {
    expect(question.options.length).toBeGreaterThanOrEqual(2);
    expect(question.options).toContain(question.answer);
    expect(new Set(question.options).size).toBe(question.options.length);
    expect(question.playback.length).toBeGreaterThan(0);
    for (const event of question.playback) {
      expect(event.midi.length).toBeGreaterThan(0);
      expect(event.at).toBeGreaterThanOrEqual(0);
      for (const note of event.midi) {
        expect(note).toBeGreaterThanOrEqual(21);
        expect(note).toBeLessThanOrEqual(108);
      }
    }
    expect(question.explanation.length).toBeGreaterThan(0);
    expect(question.reveal.length).toBeGreaterThan(0);
  };

  it('builds a playable question for every level', () => {
    for (const level of EAR_LEVELS) {
      for (let seed = 1; seed <= 25; seed += 1) {
        expectPlayable(generateEarQuestion(level, makeRng(seed)));
      }
    }
  });

  it('plays a reference tone only when the level asks for one', () => {
    const withReference = identifyQuestion(getLevel('A2'), makeRng(4));
    expect(withReference.playback).toHaveLength(2);
    expect(withReference.playback[0].midi).toHaveLength(1);
    expect(withReference.playback[0].at).toBe(0);
    expect(withReference.playback[1].at).toBeGreaterThan(0);

    const without = identifyQuestion(getLevel('A4'), makeRng(4));
    expect(without.playback).toHaveLength(1);
  });

  it('never compares two chords on the same root', () => {
    // Otherwise "same" could be answered on pitch alone, without hearing quality.
    for (let seed = 1; seed <= 50; seed += 1) {
      const question = sameOrDifferentQuestion(getLevel('A6'), makeRng(seed));
      const [a, b] = question.reveal.split(' then ');
      expect(a).not.toBe(b);
      expect(question.playback[0].midi).not.toEqual(question.playback[1].midi);
    }
  });

  it('asks both same and different over a round', () => {
    const answers = generateEarRound(getLevel('A1'), makeRng(9), { count: 20 })
      .map((q) => q.answer);
    expect(new Set(answers)).toEqual(new Set(['Same', 'Different']));
  });

  it('keeps a fixed-root level on C and lets a setting override it', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      expect(identifyQuestion(getLevel('A3'), makeRng(seed)).reveal).toMatch(/^C/);
    }
    const moved = Array.from({ length: 20 }, (_, i) =>
      identifyQuestion(getLevel('A3'), makeRng(i + 1), { roots: 'random' }).reveal);
    expect(new Set(moved).size).toBeGreaterThan(1);
  });

  it('honours the play-mode setting', () => {
    expect(identifyQuestion(getLevel('A3'), makeRng(1)).play).toBe('block');
    expect(identifyQuestion(getLevel('A3'), makeRng(1), { play: 'arpeggio' }).play).toBe('arpeggio');
  });
});

describe('rounds', () => {
  it('never repeats the same answer three times running', () => {
    for (const level of EAR_LEVELS) {
      const answers = generateEarRound(level, makeRng(3), { count: 12 }).map((q) => q.answer);
      for (let i = 2; i < answers.length; i += 1) {
        expect(
          answers[i] === answers[i - 1] && answers[i] === answers[i - 2],
          `${level.id} repeated ${answers[i]} three times`,
        ).toBe(false);
      }
    }
  });

  it('fills the round', () => {
    expect(generateEarRound(getLevel('A5'), makeRng(2), { count: 10 })).toHaveLength(10);
  });
});

describe('quality copy', () => {
  it('describes every quality the levels use', () => {
    for (const quality of usedQualities()) {
      const copy = qualityCopy(quality);
      expect(copy, `no copy for ${quality}`).not.toBeNull();
      expect(copy.label.length).toBeGreaterThan(0);
      expect(copy.hear.length).toBeGreaterThan(0);
    }
  });

  it('gives every quality in a level a distinct option label', () => {
    for (const level of EAR_LEVELS) {
      const labels = level.qualities.map((q) => qualityCopy(q).label);
      expect(new Set(labels).size, `${level.id} has duplicate labels`).toBe(labels.length);
    }
  });
});

describe('the reveal', () => {
  it('spells the notes the way you would read them back', () => {
    // Db7b9 is strictly Db F Ab Cb Ebb; nobody reads that at a glance.
    const level = { ...getLevel('A8'), roots: 'fixed' };
    const question = identifyQuestion(
      { ...level, qualities: ['7b9'] },
      makeRng(1),
      { roots: 'random' },
    );
    expect(question.explanation).not.toMatch(/bb|##/);
  });

  it('keeps ordinary accidentals alone', () => {
    const question = identifyQuestion({ ...getLevel('A3'), qualities: ['m7'] }, makeRng(1));
    expect(question.explanation).toContain('Eb');
  });
});
