import { describe, expect, it } from 'vitest';
import { EAR_BLOCKS, EAR_LEVELS, getLevel, levelsInBlock, usedQualities } from '../levels.js';
import { getProgression, PROGRESSION_KEYS, PROGRESSIONS } from '../progressions.js';
import {
  generateEarQuestion, generateEarRound, identifyFormQuestion, identifyProgressionQuestion,
  identifyQuestion, levelOptions, sameOrDifferentQuestion,
} from '../generators.js';
import { makeRng } from '../../quiz/rng.js';
import { qualityCopy } from '../../content/qualityCopy.js';
import {
  buildVoicing, formatChord, isAwkwardSpelling, parseChord, pitchClass, transposeProgression,
} from '../../theory/index.js';

/** The pitch classes a voicing actually sounds, which is all the ear gets. */
const sounded = (voicing) =>
  [...new Set(voicing.midi.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b).join(',');

/** A progression's root motion and qualities, which survive transposition. */
const shapeOf = (template) => {
  const chords = template.symbols.map((symbol) => parseChord(symbol));
  const base = pitchClass(chords[0].root);
  return chords
    .map((chord) => `${(pitchClass(chord.root) - base + 12) % 12}:${chord.type}`)
    .join(' ');
};

/** However a level offers its options. */
const optionCount = (level) =>
  (level.progressions ?? (level.format === 'identify-form' ? level.forms : level.qualities)).length;

describe('the levels', () => {
  it('never asks a question with two correct answers', () => {
    // The mistake worth catching: two options that sound identical. A shell
    // voicing has no fifth and cannot tell m7 from m7b5; two voicing forms
    // could land on the same notes; two progressions could share a shape.
    // Each kind of level is checked in its own terms.
    for (const level of EAR_LEVELS) {
      const heard = new Map();
      const record = (key, option) => heard.set(key, [...(heard.get(key) ?? []), option]);

      if (level.format === 'identify-progression') {
        for (const id of level.progressions) record(shapeOf(getProgression(id)), id);
      } else if (level.format === 'identify-form') {
        for (const form of level.forms) {
          record(buildVoicing('Cmaj7', form).midi.join(','), form);
        }
      } else {
        for (const quality of level.qualities) {
          record(sounded(buildVoicing(`C${quality}`, level.form)), quality);
        }
      }

      for (const [, options] of heard) {
        expect(options, `${level.id} cannot separate ${options.join(' from ')}`).toHaveLength(1);
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

  it('widens the choice as the quality ladder goes up', () => {
    // Not monotonic by design: the last level offers four dominants rather
    // than six colours, and is harder for it - the distinctions are finer.
    const options = (id) => optionCount(getLevel(id));
    expect(options('A2')).toBeLessThan(options('A3'));
    expect(options('A3')).toBeLessThan(options('A5'));
    expect(options('A5')).toBeLessThan(options('A7'));
    for (const level of EAR_LEVELS) {
      expect(optionCount(level), `${level.id} needs at least two options`)
        .toBeGreaterThanOrEqual(2);
    }
  });

  it('puts every level in a block, and every block has levels', () => {
    const blocks = new Set(EAR_BLOCKS.map((b) => b.id));
    for (const level of EAR_LEVELS) {
      expect(blocks.has(level.block), `${level.id} has block ${level.block}`).toBe(true);
    }
    for (const block of EAR_BLOCKS) {
      expect(levelsInBlock(block.id).length, `${block.id} is empty`).toBeGreaterThan(0);
    }
  });

  it('asks only about progressions that exist', () => {
    for (const level of EAR_LEVELS.filter((l) => l.format === 'identify-progression')) {
      for (const id of level.progressions) {
        expect(getProgression(id), `unknown progression ${id}`).not.toBeNull();
      }
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
    for (const level of EAR_LEVELS.filter((l) => l.qualities && l.format !== 'identify-form')) {
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

describe('voicing questions', () => {
  it('shows the notes of the voicing, not of the chord', () => {
    // A rootless shape does not contain the root, so listing the chord's
    // notes beside the voicing's degrees would not line up.
    for (let seed = 1; seed <= 20; seed += 1) {
      const question = identifyFormQuestion(getLevel('B2'), makeRng(seed));
      const degrees = question.explanation.split(' - ')[0].split(' ');
      const notes = question.explanation.split(' - ')[1].split('.')[0].trim().split(' ');
      expect(notes, question.explanation).toHaveLength(degrees.length);
      // Octaves are part of the answer here.
      for (const note of notes) expect(note).toMatch(/\d$/);
    }
  });

  it('offers every form of the level as an option', () => {
    for (const level of EAR_LEVELS.filter((l) => l.format === 'identify-form')) {
      const question = identifyFormQuestion(level, makeRng(5));
      expect(question.options).toHaveLength(level.forms.length);
    }
  });
});

describe('progression questions', () => {
  it('transposes the whole progression into one key', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const question = identifyProgressionQuestion(getLevel('C3'), makeRng(seed));
      const symbols = question.reveal.trim().split(/\s+/);
      expect(symbols).toHaveLength(3);
      for (const symbol of symbols) expect(parseChord(symbol)).not.toBeNull();
      expect(question.playback).toHaveLength(3);
    }
  });

  it('spaces the chords out in time', () => {
    const question = identifyProgressionQuestion(getLevel('C1'), makeRng(3));
    const times = question.playback.map((event) => event.at);
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
  });
});

describe('transposing a progression', () => {
  it('keeps the harmony in every key of the pool', () => {
    // The shape - root motion plus qualities - is what makes a progression
    // that progression. If transposing changes it, the question is wrong
    // however good the spelling looks.
    for (const template of Object.values(PROGRESSIONS)) {
      const original = shapeOf(template);
      for (const root of PROGRESSION_KEYS) {
        const key = template.key.endsWith('m') ? `${root}m` : root;
        const symbols = transposeProgression(template.symbols, template.key, key);
        expect(shapeOf({ symbols }), `${template.id} in ${key}`).toBe(original);
      }
    }
  });

  it('spells every progression without respelling a root', () => {
    // Gb is left out of the pool for this reason: the backdoor there needs
    // Cbm7 and Fb7, which come back as Bm7 and E7 beside a Gb tonic.
    for (const template of Object.values(PROGRESSIONS)) {
      for (const root of PROGRESSION_KEYS) {
        const key = template.key.endsWith('m') ? `${root}m` : root;
        const symbols = transposeProgression(template.symbols, template.key, key);
        for (const symbol of symbols) {
          expect(parseChord(symbol), `${symbol} in ${key}`).not.toBeNull();
          expect(isAwkwardSpelling(parseChord(symbol).root), `${symbol} in ${key}`).toBe(false);
        }
      }
    }
    expect(PROGRESSION_KEYS).not.toContain('Gb');
  });
});

describe('item keys', () => {
  it('names what is being learned, not the question', () => {
    for (const level of EAR_LEVELS) {
      for (let seed = 1; seed <= 10; seed += 1) {
        const question = generateEarQuestion(level, makeRng(seed));
        expect(question.itemKey, `${level.id} has no item key`).toBeTruthy();
        expect(question.itemKey).toMatch(/^ear:(quality|form|progression):/);
        expect(question.itemKey, 'must not carry the random id').not.toContain(question.id);
      }
    }
  });

  it('is stable across keys and rounds', () => {
    // The same quality in a different key is the same thing to remember.
    const keys = new Set();
    for (let seed = 1; seed <= 40; seed += 1) {
      const question = identifyQuestion({ ...getLevel('A4'), qualities: ['m7'] }, makeRng(seed));
      keys.add(question.itemKey);
    }
    expect(keys).toEqual(new Set(['ear:quality:m7']));
  });

  it('counts naming a quality and comparing it as the same item', () => {
    const named = identifyQuestion({ ...getLevel('A5'), qualities: ['m7b5'] }, makeRng(1));
    const compared = sameOrDifferentQuestion({ ...getLevel('A6'), qualities: ['m7b5'] }, makeRng(1));
    expect(named.itemKey).toBe(compared.itemKey);
  });
});

describe('focus', () => {
  it('draws the answer from the focus but still offers every option', () => {
    const level = { ...getLevel('A7'), focus: ['m7b5'] };
    for (let seed = 1; seed <= 20; seed += 1) {
      const question = identifyQuestion(level, makeRng(seed));
      expect(question.itemKey).toBe('ear:quality:m7b5');
      expect(question.options, 'narrowing the options would flatter the score')
        .toHaveLength(getLevel('A7').qualities.length);
    }
  });

  it('ignores a focus the level cannot ask about', () => {
    // A stale focus must never produce a question with no valid answer.
    const level = { ...getLevel('A3'), focus: ['dim7', 'm6'] };
    for (let seed = 1; seed <= 20; seed += 1) {
      const question = identifyQuestion(level, makeRng(seed));
      expect(getLevel('A3').qualities.map((q) => qualityCopy(q).label))
        .toContain(question.answer);
    }
  });

  it('focuses forms and progressions too', () => {
    const forms = identifyFormQuestion({ ...getLevel('B4'), focus: ['rootless-B'] }, makeRng(2));
    expect(forms.itemKey).toBe('ear:form:rootless-B');
    expect(forms.options).toHaveLength(4);

    const prog = identifyProgressionQuestion({ ...getLevel('C3'), focus: ['backdoor'] }, makeRng(2));
    expect(prog.itemKey).toBe('ear:progression:backdoor');
    expect(prog.options).toHaveLength(4);
  });

  it('lists every option of a level with its item key', () => {
    for (const level of EAR_LEVELS) {
      const options = levelOptions(level);
      expect(options.length).toBeGreaterThanOrEqual(2);
      for (const { option, key } of options) {
        expect(key).toContain(option);
      }
    }
  });
});
