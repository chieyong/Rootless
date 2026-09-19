import { describe, expect, it } from 'vitest';
import { chordNoteNames, formatChord, isDominantType, parseChord } from '../chords.js';
import { noteName } from '../notes.js';

const notes = (symbol) => chordNoteNames(parseChord(symbol));
const type = (symbol) => parseChord(symbol).type;

describe('parseChord', () => {
  it('parses the core jazz vocabulary', () => {
    expect(notes('Cmaj7')).toEqual(['C', 'E', 'G', 'B']);
    expect(notes('Dm7')).toEqual(['D', 'F', 'A', 'C']);
    expect(notes('G7')).toEqual(['G', 'B', 'D', 'F']);
    expect(notes('Bm7b5')).toEqual(['B', 'D', 'F', 'A']);
    expect(notes('Cm6')).toEqual(['C', 'Eb', 'G', 'A']);
    expect(notes('C6/9')).toEqual(['C', 'E', 'G', 'A', 'D']);
    expect(notes('G7sus4')).toEqual(['G', 'C', 'D', 'F']);
  });

  it('spells diminished sevenths with a double-flat seventh', () => {
    expect(notes('Cdim7')).toEqual(['C', 'Eb', 'Gb', 'Bbb']);
    expect(notes('C#dim7')).toEqual(['C#', 'E', 'G', 'Bb']);
  });

  it('parses extensions and alterations', () => {
    expect(notes('C13')).toEqual(['C', 'E', 'G', 'Bb', 'D', 'A']);
    expect(notes('C7b9')).toEqual(['C', 'E', 'G', 'Bb', 'Db']);
    expect(notes('Cmaj7#11')).toEqual(['C', 'E', 'G', 'B', 'F#']);
    expect(parseChord('C13b9').tensions).toEqual(['b9', '13']);
  });

  it('expands 7alt to the altered tensions and drops the fifth', () => {
    const chord = parseChord('G7alt');
    expect(chord.type).toBe('7alt');
    expect(chord.tensions).toEqual(['b9', '#9', '#11', 'b13']);
    expect(chord.degrees.has(5)).toBe(false);
    expect(chordNoteNames(chord)).toEqual(['G', 'B', 'F', 'Ab', 'A#', 'C#', 'Eb']);
  });

  it('accepts the usual shorthand', () => {
    expect(type('C-7')).toBe('m7');
    expect(type('Cmi7')).toBe('m7');
    expect(type('Cma7')).toBe('maj7');
    expect(type('CM7')).toBe('maj7');
    expect(type('CΔ7')).toBe('maj7');
    expect(type('Cø')).toBe('m7b5');
    expect(type('C°7')).toBe('dim7');
    expect(type('C+')).toBe('aug');
    expect(type('C69')).toBe('6/9');
  });

  it('classifies chord types for ear training', () => {
    expect(type('Cmaj7')).toBe('maj7');
    expect(type('Cm7')).toBe('m7');
    expect(type('C7')).toBe('7');
    expect(type('C7b9')).toBe('7');
    expect(type('Cm7b5')).toBe('m7b5');
    expect(type('Cdim7')).toBe('dim7');
    expect(type('C7alt')).toBe('7alt');
    expect(type('Cm6')).toBe('m6');
    expect(type('CmMaj7')).toBe('mMaj7');
  });

  it('reads a slash bass but leaves 6/9 alone', () => {
    const slash = parseChord('Dm7/G');
    expect(noteName(slash.bass)).toBe('G');
    expect(chordNoteNames(slash)).toEqual(['D', 'F', 'A', 'C']);
    expect(parseChord('C6/9').bass).toBeNull();
  });

  it('keeps the original body so transposing only rewrites the root', () => {
    expect(formatChord(parseChord('Bb7alt'))).toBe('Bb7alt');
    expect(formatChord(parseChord('F#m7b5/C'))).toBe('F#m7b5/C');
  });

  it('returns null for slots that are not chords', () => {
    expect(parseChord('%')).toBeNull();
    expect(parseChord('N.C.')).toBeNull();
    expect(parseChord('')).toBeNull();
  });

  it('knows which chords work as a dominant', () => {
    expect(isDominantType(parseChord('G7'))).toBe(true);
    expect(isDominantType(parseChord('G7alt'))).toBe(true);
    expect(isDominantType(parseChord('G7sus4'))).toBe(true);
    expect(isDominantType(parseChord('Gmaj7'))).toBe(false);
    expect(isDominantType(parseChord('Gm7'))).toBe(false);
  });
});
