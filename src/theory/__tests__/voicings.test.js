import { describe, expect, it } from 'vitest';
import {
  buildVoicing, isSplitForm, placementFor, SOLO_REGISTER, voicingNoteNames, voicingsFor,
  VOICING_FORMS,
} from '../voicings.js';
import { pitchClass } from '../notes.js';
import { chooseVoicing, voiceLeadProgression, voicingDistance } from '../voiceLeading.js';

const v = (symbol, form) => voicingNoteNames(buildVoicing(symbol, form));

describe('shell voicings', () => {
  it('stacks root, third and seventh', () => {
    expect(v('Cmaj7', 'shell-1-3-7')).toEqual(['C3', 'E3', 'B3']);
    expect(v('Cmaj7', 'shell-1-7-3')).toEqual(['C3', 'B3', 'E4']);
    expect(v('Dm7', 'shell-1-3-7')).toEqual(['D3', 'F3', 'C4']);
    expect(v('G7', 'shell-1-3-7')).toEqual(['G2', 'B2', 'F3']);
  });

  it('uses the sixth when there is no seventh', () => {
    expect(buildVoicing('Cm6', 'shell-1-3-7').degrees).toEqual(['1', 'b3', '6']);
    expect(buildVoicing('C6', 'shell-1-3-7').degrees).toEqual(['1', '3', '6']);
  });

  it('uses the fourth on sus chords', () => {
    expect(buildVoicing('G7sus4', 'shell-1-3-7').degrees).toEqual(['1', '4', 'b7']);
  });
});

describe('rootless voicings', () => {
  it('builds the Bill Evans A form', () => {
    expect(buildVoicing('Cmaj7', 'rootless-A').degrees).toEqual(['3', '5', '7', '9']);
    expect(buildVoicing('Cm7', 'rootless-A').degrees).toEqual(['b3', '5', 'b7', '9']);
    expect(buildVoicing('C7', 'rootless-A').degrees).toEqual(['3', '13', 'b7', '9']);
    expect(v('Cmaj7', 'rootless-A')).toEqual(['E3', 'G3', 'B3', 'D4']);
    expect(v('C7', 'rootless-A')).toEqual(['E3', 'A3', 'Bb3', 'D4']);
  });

  it('builds the B form as the A form with its two lowest voices an octave up', () => {
    expect(buildVoicing('Cmaj7', 'rootless-B').degrees).toEqual(['7', '9', '3', '5']);
    expect(buildVoicing('Cm7', 'rootless-B').degrees).toEqual(['b7', '9', 'b3', '5']);
    expect(buildVoicing('C7', 'rootless-B').degrees).toEqual(['b7', '9', '3', '13']);
    expect(v('C7', 'rootless-B')).toEqual(['Bb3', 'D4', 'E4', 'A4']);
  });

  it('never contains the root, except on half-diminished and diminished chords', () => {
    for (const symbol of ['Cmaj7', 'Cm7', 'C7', 'C7alt', 'Cm6', 'C6/9']) {
      for (const form of ['rootless-A', 'rootless-B']) {
        expect(buildVoicing(symbol, form).degrees).not.toContain('1');
      }
    }
    expect(buildVoicing('Cm7b5', 'rootless-A').degrees).toEqual(['b3', 'b5', 'b7', '1']);
  });

  it('uses the chord’s own alterations', () => {
    expect(buildVoicing('C7alt', 'rootless-A').degrees).toEqual(['3', 'b13', 'b7', 'b9']);
    expect(buildVoicing('C7b9', 'rootless-A').degrees).toEqual(['3', '13', 'b7', 'b9']);
    expect(buildVoicing('C7#9', 'rootless-A').degrees).toEqual(['3', '13', 'b7', '#9']);
    expect(buildVoicing('Cmaj7#11', 'rootless-A').degrees).toEqual(['3', '#11', '7', '9']);
  });

  it('stays inside the register of its own form', () => {
    // Not one global range any more: the solo grip deliberately reaches
    // higher than a comping shape, so each form is held to its own rule.
    for (const symbol of ['Cmaj7', 'Ebm7', 'F#7', 'Bm7b5', 'Ab7alt', 'Dm6']) {
      for (const voicing of voicingsFor(symbol)) {
        const placement = placementFor(voicing.form);
        expect(Math.min(...voicing.midi)).toBeGreaterThanOrEqual(placement.floor);
        expect(Math.max(...voicing.midi)).toBeLessThanOrEqual(placement.ceiling);
      }
    }
  });

  it('offers every form for every chord', () => {
    expect(voicingsFor('G7').map((x) => x.form)).toEqual(VOICING_FORMS);
  });
});

describe('voice leading', () => {
  it('measures movement between voicings', () => {
    expect(voicingDistance([60, 64, 67], [60, 64, 67])).toBe(0);
    expect(voicingDistance([60, 64, 67], [61, 65, 68])).toBe(3);
  });

  it('alternates A and B forms through a ii-V-I', () => {
    const result = voiceLeadProgression(['Dm7', 'G7', 'Cmaj7']);
    expect(result.map((x) => x.form)).toEqual(['rootless-A', 'rootless-B', 'rootless-A']);
    expect(voicingNoteNames(result[0])).toEqual(['F3', 'A3', 'C4', 'E4']);
    expect(voicingNoteNames(result[1])).toEqual(['F3', 'A3', 'B3', 'E4']);
    expect(voicingNoteNames(result[2])).toEqual(['E3', 'G3', 'B3', 'D4']);
  });

  it('alternates shell forms too', () => {
    const result = voiceLeadProgression(['Dm7', 'G7', 'Cmaj7'], {
      forms: ['shell-1-3-7', 'shell-1-7-3'],
    });
    expect(result.map((x) => x.form)).toEqual(['shell-1-3-7', 'shell-1-7-3', 'shell-1-3-7']);
  });

  it('keeps every step small over a longer progression', () => {
    const result = voiceLeadProgression(
      ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm7'],
    );
    for (const voicing of result.slice(1)) {
      expect(voicing.movement).toBeLessThanOrEqual(6);
    }
  });

  it('follows a given starting voicing', () => {
    const start = buildVoicing('Dm7', 'rootless-B');
    const chosen = chooseVoicing('G7', start);
    expect(voicingDistance(start.midi, chosen.midi)).toBeLessThanOrEqual(3);
  });

  it('skips empty bars', () => {
    const result = voiceLeadProgression(['Dm7', null, 'Cmaj7']);
    expect(result[1]).toBeNull();
    expect(result[2]).not.toBeNull();
  });
});

/**
 * The placements that were in the app before the solo grip was added.
 * Hard-coded on purpose: parameterising the register must not move a single
 * note of the shapes people have already learned.
 */
const PLACEMENTS_BEFORE_THE_SOLO_FORM = {
  'Cmaj7|shell-1-3-7': [48, 52, 59],
  'Cmaj7|shell-1-7-3': [48, 59, 64],
  'Cmaj7|rootless-A': [52, 55, 59, 62],
  'Cmaj7|rootless-B': [59, 62, 64, 67],
  'Dm7|shell-1-3-7': [50, 53, 60],
  'Dm7|shell-1-7-3': [50, 60, 65],
  'Dm7|rootless-A': [53, 57, 60, 64],
  'Dm7|rootless-B': [48, 52, 53, 57],
  'G7|shell-1-3-7': [43, 47, 53],
  'G7|shell-1-7-3': [43, 53, 59],
  'G7|rootless-A': [47, 52, 53, 57],
  'G7|rootless-B': [53, 57, 59, 64],
  'Bb7|shell-1-3-7': [46, 50, 56],
  'Bb7|rootless-A': [50, 55, 56, 60],
  'Am7b5|shell-1-3-7': [45, 48, 55],
  'Am7b5|rootless-A': [48, 51, 55, 57],
  'C7alt|rootless-A': [52, 56, 58, 61],
  'Cdim7|rootless-A': [51, 54, 57, 60],
  'G7sus4|rootless-A': [48, 53, 57, 62],
  'Cm6|shell-1-3-7': [48, 51, 57],
  'F#m7|rootless-A': [57, 61, 64, 68],
  'Ebmaj7|shell-1-7-3': [51, 62, 67],
  'Ebmaj7|rootless-B': [50, 53, 55, 58],
};

describe('hands', () => {
  it('splits every voicing into hands that add back up to midi', () => {
    for (const symbol of ['Cmaj7', 'Dm7', 'G7', 'Bm7b5', 'Ebmaj7', 'F#7alt']) {
      for (const voicing of voicingsFor(symbol)) {
        const { lh, rh } = voicing.hands;
        const rejoined = [...lh, ...rh].sort((a, b) => a - b);
        expect(rejoined, `${symbol} ${voicing.form}`).toEqual(voicing.midi);
      }
    }
  });

  it('keeps one-handed forms in the left hand', () => {
    for (const form of VOICING_FORMS.filter((f) => !isSplitForm(f))) {
      const voicing = buildVoicing('Cmaj7', form);
      expect(voicing.hands.rh).toEqual([]);
      expect(voicing.hands.lh).toEqual(voicing.midi);
    }
  });
});

describe('the solo grip', () => {
  const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const QUALITIES = ['maj7', 'm7', '7', 'm7b5'];

  it('puts one root in the left hand', () => {
    for (const root of ROOTS) {
      const voicing = buildVoicing(`${root}maj7`, 'solo-root-rootless');
      expect(voicing.hands.lh).toHaveLength(1);
      expect(voicing.hands.lh[0] % 12).toBe(pitchClass(voicing.chord.root));
    }
  });

  it('never doubles the root in the right hand', () => {
    // Including the half-diminished and diminished A forms, which carry the
    // root on top when played as a comping shape.
    for (const root of ROOTS) {
      for (const quality of [...QUALITIES, 'dim7']) {
        const voicing = buildVoicing(root + quality, 'solo-root-rootless');
        const rootPitchClass = pitchClass(voicing.chord.root);
        for (const note of voicing.hands.rh) {
          expect(note % 12, `${root}${quality} doubles the root`).not.toBe(rootPitchClass);
        }
      }
    }
  });

  it('keeps the hands 7 to 19 semitones apart, in every key', () => {
    const { gap } = SOLO_REGISTER['solo-root-rootless'];
    for (const root of ROOTS) {
      for (const quality of QUALITIES) {
        const voicing = buildVoicing(root + quality, 'solo-root-rootless');
        const distance = Math.min(...voicing.hands.rh) - voicing.hands.lh[0];
        expect(distance, `${root}${quality} gap`).toBeGreaterThanOrEqual(gap.min);
        expect(distance, `${root}${quality} gap`).toBeLessThanOrEqual(gap.max);
      }
    }
  });

  it('puts the right hand where the register says', () => {
    const { rh } = SOLO_REGISTER['solo-root-rootless'];
    for (const root of ROOTS) {
      const voicing = buildVoicing(`${root}7`, 'solo-root-rootless');
      expect(Math.min(...voicing.hands.rh)).toBeGreaterThanOrEqual(rh.floor);
      expect(Math.max(...voicing.hands.rh)).toBeLessThanOrEqual(rh.ceiling);
    }
  });
});

describe('placements that must not move', () => {
  it('builds the shell and rootless shapes exactly as it did before', () => {
    for (const [key, expected] of Object.entries(PLACEMENTS_BEFORE_THE_SOLO_FORM)) {
      const [symbol, form] = key.split('|');
      expect(buildVoicing(symbol, form).midi, key).toEqual(expected);
    }
  });

  it('still alternates the forms through a ii-V-I', () => {
    expect(voiceLeadProgression(['Dm7', 'G7', 'Cmaj7']).map((v) => v.midi))
      .toEqual([[53, 57, 60, 64], [53, 57, 59, 64], [52, 55, 59, 62]]);
  });
});
