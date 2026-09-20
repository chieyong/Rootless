import { describe, expect, it } from 'vitest';
import { TUNES, getTune } from '../index.js';
import {
  analyzeTune, barCount, tuneBars, tuneSlots, transposeTune, tuneSymbols, validateTune,
} from '../tune.js';
import { parseChord } from '../../theory/index.js';

describe('the tune library', () => {
  it('has the five standards', () => {
    expect(TUNES.map((t) => t.id)).toEqual([
      'autumn-leaves',
      'blue-bossa',
      'bb-blues',
      'there-will-never-be-another-you',
      'all-the-things-you-are',
    ]);
  });

  it.each(TUNES.map((t) => [t.title, t]))('%s is structurally valid', (_title, tune) => {
    expect(validateTune(tune)).toEqual([]);
  });

  it.each(TUNES.map((t) => [t.title, t]))('%s has readable chord symbols', (_title, tune) => {
    for (const symbol of tuneSymbols(tune)) {
      const chord = parseChord(symbol);
      expect(chord, `cannot read "${symbol}"`).not.toBeNull();
      expect(chord.unparsed, `leftover text in "${symbol}"`).toBe('');
    }
  });

  it.each(TUNES.map((t) => [t.title, t]))('%s is marked unverified', (_title, tune) => {
    expect(tune.verified).toBe(false);
    expect(tune.notes, 'a tune should say which bars vary between charts').toBeTruthy();
  });

  it('has the expected forms and lengths', () => {
    expect(barCount(getTune('autumn-leaves'))).toBe(32);
    expect(barCount(getTune('blue-bossa'))).toBe(16);
    expect(barCount(getTune('bb-blues'))).toBe(12);
    expect(barCount(getTune('there-will-never-be-another-you'))).toBe(32);
    expect(barCount(getTune('all-the-things-you-are'))).toBe(36);
  });
});

describe('tuneBars', () => {
  const tune = getTune('autumn-leaves');

  it('numbers bars across the whole form', () => {
    const bars = tuneBars(tune);
    expect(bars[0]).toMatchObject({ barNumber: 1, sectionId: 'A', isSectionStart: true });
    expect(bars[8]).toMatchObject({ barNumber: 9, sectionId: 'A', isSectionStart: true });
    expect(bars.at(-1).barNumber).toBe(32);
  });

  it('splits a two-chord bar into two slots of half the beats', () => {
    const bar27 = tuneBars(tune).find((b) => b.barNumber === 27);
    expect(bar27.slots.map((s) => s.symbol)).toEqual(['Gm7', 'C7']);
    expect(bar27.slots.map((s) => s.beats)).toEqual([2, 2]);
    const bar1 = tuneBars(tune)[0];
    expect(bar1.slots[0].beats).toBe(4);
  });

  it('repeats a section that appears twice in the form', () => {
    const bars = tuneBars(tune);
    expect(bars.slice(0, 8).map((b) => b.slots[0].symbol))
      .toEqual(bars.slice(8, 16).map((b) => b.slots[0].symbol));
  });
});

describe('analyzeTune', () => {
  it('finds the ii-Vs and maps them onto bars', () => {
    const { groups } = analyzeTune(getTune('autumn-leaves'));
    expect(groups.length).toBeGreaterThan(3);
    expect(groups[0]).toMatchObject({ kind: 'ii-V-I', fromBar: 1, toBar: 3 });
    const minor = groups.find((g) => g.mode === 'minor');
    expect(minor).toBeTruthy();
  });

  it('indexes slots so the leadsheet can look up its own analysis', () => {
    // tuneBars and analyzeTune are separate calls, so the slot objects are
    // never identical: the index is the only link between them.
    for (const tune of TUNES) {
      const { slots, entries } = analyzeTune(tune);
      slots.forEach((slot, index) => {
        expect(slot.index).toBe(index);
        expect(entries[slot.index].symbol).toBe(slot.symbol);
      });
      const fromBars = tuneBars(tune).flatMap((bar) => bar.slots);
      expect(fromBars.map((s) => s.index)).toEqual(slots.map((s) => s.index));
    }
  });

  it('aligns entries with the slots', () => {
    const { slots, entries } = analyzeTune(getTune('blue-bossa'));
    expect(entries).toHaveLength(slots.length);
    expect(entries[0].roman).toBe('i7');
    expect(entries[5].roman).toBe('V7alt');
  });

  it('reads the blues as its degrees', () => {
    const { entries } = analyzeTune(getTune('bb-blues'));
    expect(entries[0].roman).toBe('I7');
    expect(entries[1].roman).toBe('IV7');
  });
});

describe('transposeTune', () => {
  it('moves every chord and keeps the shape', () => {
    const moved = transposeTune(getTune('autumn-leaves'), 'C');
    expect(barCount(moved)).toBe(32);
    expect(tuneSymbols(moved).slice(0, 4)).toEqual(['Dm7', 'G7', 'Cmaj7', 'Fmaj7']);
    expect(moved.key).toBe('C');
  });

  it('keeps two-chord bars intact', () => {
    const bar27 = tuneBars(transposeTune(getTune('autumn-leaves'), 'C'))
      .find((b) => b.barNumber === 27);
    expect(bar27.slots.map((s) => s.symbol)).toEqual(['Am7', 'D7']);
  });

  it('uses the spelling of the destination key', () => {
    const moved = transposeTune(getTune('blue-bossa'), 'Ebm');
    expect(tuneSymbols(moved).slice(0, 5)).toEqual(['Ebm7', 'Ebm7', 'Abm7', 'Abm7', 'Fm7b5']);
  });

  it('is reversible', () => {
    const there = transposeTune(getTune('bb-blues'), 'F');
    expect(tuneSymbols(transposeTune(there, 'Bb'))).toEqual(tuneSymbols(getTune('bb-blues')));
  });
});

describe('validateTune', () => {
  it('reports the mistakes that matter', () => {
    expect(validateTune({ id: 'x', title: 'x', key: 'C', form: ['A'], sections: [] }))
      .toContain('form refers to unknown section "A"');
    expect(validateTune({
      id: 'x', title: 'x', key: 'C', verified: false, form: ['A'],
      sections: [{ id: 'A', bars: ['Cmaj7', 'Hm7'] }],
    })).toContain('section "A" bar 2: cannot read "Hm7"');
  });
});
