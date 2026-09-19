import { describe, expect, it } from 'vitest';
import {
  diatonicSeventhSymbols, keyName, keySignature, parseKey, preferredSpelling, scaleNotes,
} from '../keys.js';
import { noteName } from '../notes.js';

const scale = (key) => scaleNotes(parseKey(key)).map((n) => noteName(n));

describe('parseKey', () => {
  it('reads major and minor keys', () => {
    expect(keyName(parseKey('Bb'))).toBe('Bb');
    expect(keyName(parseKey('C minor'))).toBe('C minor');
    expect(keyName(parseKey('Ebm'))).toBe('Eb minor');
    expect(keyName(parseKey('F#'))).toBe('F#');
    expect(keyName(parseKey('Bb major'))).toBe('Bb');
  });
});

describe('key signatures', () => {
  it('counts accidentals', () => {
    expect(keySignature(parseKey('C'))).toBe(0);
    expect(keySignature(parseKey('Bb'))).toBe(-2);
    expect(keySignature(parseKey('Gb'))).toBe(-6);
    expect(keySignature(parseKey('E'))).toBe(4);
    expect(keySignature(parseKey('A minor'))).toBe(0);
    expect(keySignature(parseKey('C minor'))).toBe(-3);
  });

  it('picks the accidental the key is written with', () => {
    expect(preferredSpelling(parseKey('Bb'))).toBe('flat');
    expect(preferredSpelling(parseKey('A'))).toBe('sharp');
    expect(preferredSpelling(parseKey('C minor'))).toBe('flat');
  });
});

describe('scales and diatonic chords', () => {
  it('spells scales without repeating letters', () => {
    expect(scale('Bb')).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
    expect(scale('F#')).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
    expect(scale('C minor')).toEqual(['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb']);
  });

  it('builds the diatonic seventh chords', () => {
    expect(diatonicSeventhSymbols(parseKey('C')))
      .toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']);
    expect(diatonicSeventhSymbols(parseKey('C minor')))
      .toEqual(['Cm7', 'Dm7b5', 'Ebmaj7', 'Fm7', 'Gm7', 'Abmaj7', 'Bb7']);
  });
});
