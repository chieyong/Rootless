import { describe, expect, it } from 'vitest';
import { buildVoicing, voicingNoteNames, voicingsFor, VOICING_FORMS } from '../voicings.js';
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

  it('stays in the left-hand register', () => {
    for (const symbol of ['Cmaj7', 'Ebm7', 'F#7', 'Bm7b5', 'Ab7alt', 'Dm6']) {
      for (const voicing of voicingsFor(symbol)) {
        expect(Math.min(...voicing.midi)).toBeGreaterThanOrEqual(36);
        expect(Math.max(...voicing.midi)).toBeLessThanOrEqual(81);
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
