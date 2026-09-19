import { describe, expect, it } from 'vitest';
import {
  analyzeChord, analyzeProgression, degreeOf, findModulations, isDiatonic, romanNumeral,
} from '../analysis.js';
import { parseNote } from '../notes.js';

const romans = (progression, key) =>
  analyzeProgression(progression, key).entries.map((e) => (e ? e.roman : null));

describe('degreeOf', () => {
  it('numbers scale degrees against the major scale', () => {
    expect(degreeOf(parseNote('D'), 'C').numeral).toBe('II');
    expect(degreeOf(parseNote('Bb'), 'C').numeral).toBe('bVII');
    expect(degreeOf(parseNote('Db'), 'C').numeral).toBe('bII');
    expect(degreeOf(parseNote('F#'), 'C').numeral).toBe('#IV');
    expect(degreeOf(parseNote('Eb'), 'C minor').numeral).toBe('bIII');
  });
});

describe('romanNumeral', () => {
  it('cases the numeral after the chord quality', () => {
    expect(romanNumeral('Cmaj7', 'C')).toBe('Imaj7');
    expect(romanNumeral('Dm7', 'C')).toBe('ii7');
    expect(romanNumeral('G7', 'C')).toBe('V7');
    expect(romanNumeral('Bm7b5', 'C')).toBe('viiø7');
    expect(romanNumeral('Bb7', 'C')).toBe('bVII7');
    expect(romanNumeral('G7alt', 'C')).toBe('V7alt');
    expect(romanNumeral('C#dim7', 'C')).toBe('#i°7');
    expect(romanNumeral('D7b9', 'C')).toBe('II7b9');
  });

  it('shows the slash bass as a degree', () => {
    expect(romanNumeral('Dm7/G', 'C')).toBe('ii7/V');
  });
});

describe('isDiatonic', () => {
  it('separates diatonic chords from chromatic ones', () => {
    expect(isDiatonic('Dm7', 'C')).toBe(true);
    expect(isDiatonic('G7', 'C')).toBe(true);
    expect(isDiatonic('A7', 'C')).toBe(false);
    expect(isDiatonic('Fm7', 'C')).toBe(false);
  });
});

describe('analyzeProgression', () => {
  it('reads a major ii-V-I', () => {
    const { entries, groups } = analyzeProgression(['Dm7', 'G7', 'Cmaj7'], 'C');
    expect(entries.map((e) => e.roman)).toEqual(['ii7', 'V7', 'Imaj7']);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: 'ii-V-I', start: 0, end: 2, mode: 'major' });
  });

  it('reads a minor ii-V-i', () => {
    const { groups } = analyzeProgression(['Am7b5', 'D7', 'Gm7'], 'Bb');
    expect(groups[0]).toMatchObject({ kind: 'ii-V-I', mode: 'minor' });
    expect(groups[0].label).toContain('minor ii-V-i in G');
  });

  it('finds the ii-V units in Autumn Leaves', () => {
    const { groups } = analyzeProgression(
      ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm7'], 'Bb',
    );
    expect(groups.map((g) => g.kind)).toEqual(['ii-V-I', 'ii-V-I']);
    expect(groups[0]).toMatchObject({ start: 0, end: 2 });
    expect(groups[1]).toMatchObject({ start: 4, end: 6, mode: 'minor' });
  });

  it('labels secondary dominants', () => {
    const { entries } = analyzeProgression(['Cmaj7', 'A7', 'Dm7', 'G7'], 'C');
    expect(entries[1].role).toBe('secondary-dominant');
    expect(entries[1].functionLabel).toBe('V7/ii');
  });

  it('labels a tritone substitution', () => {
    const { entries, groups } = analyzeProgression(['Dm7', 'Db7', 'Cmaj7'], 'C');
    expect(entries[1].role).toBe('tritone-sub');
    expect(entries[1].functionLabel).toBe('subV7/I');
    expect(groups[0].kind).toBe('tritone-sub-ii-V-I');
  });

  it('labels a backdoor ii-V', () => {
    const { entries, groups } = analyzeProgression(['Cmaj7', 'Fm7', 'Bb7', 'Cmaj7'], 'C');
    expect(entries[2].role).toBe('backdoor-dominant');
    expect(groups[0]).toMatchObject({ kind: 'backdoor-ii-V', start: 1, end: 3 });
  });

  it('keeps empty slots aligned with the bars', () => {
    const { entries } = analyzeProgression(['Dm7', null, 'G7'], 'C');
    expect(entries[1]).toBeNull();
    expect(entries[2].roman).toBe('V7');
  });
});

describe('findModulations', () => {
  it('reports ii-Vs that leave the home key', () => {
    const modulations = findModulations(
      ['Cm7', 'F7', 'Bbmaj7', 'Am7b5', 'D7', 'Gm7'], 'Bb',
    );
    expect(modulations).toHaveLength(1);
    expect(modulations[0]).toMatchObject({ index: 3, name: 'G minor', degree: 'vi' });
  });

  it('stays quiet when the tune never leaves the key', () => {
    expect(findModulations(['Dm7', 'G7', 'Cmaj7'], 'C')).toEqual([]);
  });
});

describe('analyzeChord', () => {
  it('works without context', () => {
    const entry = analyzeChord('E7', 'C');
    expect(entry.roman).toBe('III7');
    expect(entry.functionLabel).toBe('V7/vi');
  });
});
