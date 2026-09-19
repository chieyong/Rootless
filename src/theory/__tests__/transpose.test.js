import { describe, expect, it } from 'vitest';
import {
  intervalBetweenKeys, transposeChord, transposeKey, transposeProgression, transposeSymbol,
} from '../transpose.js';
import { keyName } from '../keys.js';
import { formatChord } from '../chords.js';
import { parseInterval } from '../intervals.js';

const AUTUMN_LEAVES_A = ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm7'];

describe('transposeProgression', () => {
  it('spells the destination key the way a player reads it', () => {
    expect(transposeProgression(AUTUMN_LEAVES_A, 'Bb', 'C'))
      .toEqual(['Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7', 'Am7']);
    expect(transposeProgression(AUTUMN_LEAVES_A, 'Bb', 'Eb'))
      .toEqual(['Fm7', 'Bb7', 'Ebmaj7', 'Abmaj7', 'Dm7b5', 'G7', 'Cm7']);
    expect(transposeProgression(AUTUMN_LEAVES_A, 'Bb', 'G'))
      .toEqual(['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'F#m7b5', 'B7', 'Em7']);
  });

  it('uses flats in flat keys and sharps in sharp keys', () => {
    // The dominant of C in Bb is Bb7, never A#7.
    expect(transposeProgression(['C7'], 'C', 'Bb')).toEqual(['Bb7']);
    expect(transposeProgression(['Dm7', 'G7', 'Cmaj7'], 'C', 'Db'))
      .toEqual(['Ebm7', 'Ab7', 'Dbmaj7']);
    expect(transposeProgression(['Dm7', 'G7', 'Cmaj7'], 'C', 'A'))
      .toEqual(['Bm7', 'E7', 'Amaj7']);
  });

  it('respells awkward roots towards the destination key', () => {
    // E#m7b5 in F# reads as Fm7b5.
    expect(transposeProgression(['Am7b5'], 'Bb', 'F#')).toEqual(['Fm7b5']);
  });

  it('keeps the chord body and the slash bass', () => {
    expect(transposeProgression(['Bb7alt', 'Gm7/D'], 'Bb', 'C')).toEqual(['C7alt', 'Am7/E']);
  });

  it('leaves empty bars alone', () => {
    expect(transposeProgression(['Cm7', null, 'F7'], 'Bb', 'C')).toEqual(['Dm7', null, 'G7']);
  });

  it('is its own inverse', () => {
    const there = transposeProgression(AUTUMN_LEAVES_A, 'Bb', 'E');
    expect(transposeProgression(there, 'E', 'Bb')).toEqual(AUTUMN_LEAVES_A);
  });

  it('transposes every tune to every key without exotic spellings', () => {
    const keys = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'];
    for (const key of keys) {
      for (const symbol of transposeProgression(AUTUMN_LEAVES_A, 'Bb', key)) {
        expect(symbol).toMatch(/^[A-G](#|b)?[^#b]*/);
        expect(symbol).not.toMatch(/^[A-G](##|bb)/);
      }
    }
  });
});

describe('transposeChord', () => {
  it('transposes by a plain interval', () => {
    expect(formatChord(transposeChord('Cmaj7', parseInterval('M2')))).toBe('Dmaj7');
    expect(formatChord(transposeChord('C7', parseInterval('-m3')))).toBe('A7');
  });

  it('can keep the strict interval spelling', () => {
    expect(transposeSymbol('C7', parseInterval('A1'), { simplify: false })).toBe('C#7');
    expect(transposeSymbol('B7', parseInterval('A1'), { simplify: false })).toBe('B#7');
    expect(transposeSymbol('B7', parseInterval('A1'))).toBe('C7');
  });
});

describe('transposeKey', () => {
  it('moves the key itself', () => {
    expect(keyName(transposeKey('C', intervalBetweenKeys('C', 'Eb')))).toBe('Eb');
    expect(keyName(transposeKey('C minor', intervalBetweenKeys('C', 'F')))).toBe('F minor');
  });
});
