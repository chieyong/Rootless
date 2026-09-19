import { describe, expect, it } from 'vitest';
import {
  fromMidi, isAwkwardSpelling, isEnharmonic, noteName, parseNote,
  pitchClass, simplifySpelling, toMidi,
} from '../notes.js';

const name = (text) => noteName(parseNote(text));

describe('parseNote', () => {
  it('reads letters, accidentals and octaves', () => {
    expect(parseNote('C')).toEqual({ letter: 'C', alter: 0 });
    expect(parseNote('Bb')).toEqual({ letter: 'B', alter: -1 });
    expect(parseNote('F#4')).toEqual({ letter: 'F', alter: 1, octave: 4 });
    expect(parseNote('Ebb')).toEqual({ letter: 'E', alter: -2 });
    expect(parseNote('Cx')).toEqual({ letter: 'C', alter: 2 });
  });

  it('accepts unicode accidentals', () => {
    expect(name('B♭')).toBe('Bb');
    expect(name('F♯')).toBe('F#');
  });

  it('rejects things that are not notes', () => {
    expect(parseNote('H')).toBeNull();
    expect(parseNote('maj7')).toBeNull();
    expect(parseNote('')).toBeNull();
  });
});

describe('pitch', () => {
  it('maps to pitch classes', () => {
    expect(pitchClass(parseNote('C'))).toBe(0);
    expect(pitchClass(parseNote('B#'))).toBe(0);
    expect(pitchClass(parseNote('Cb'))).toBe(11);
  });

  it('uses scientific pitch notation with C4 = 60', () => {
    expect(toMidi(parseNote('C4'))).toBe(60);
    expect(toMidi(parseNote('A4'))).toBe(69);
    expect(toMidi(parseNote('Bb3'))).toBe(58);
    expect(toMidi(parseNote('C3'))).toBe(48);
  });

  it('round-trips through MIDI', () => {
    expect(noteName(fromMidi(58))).toBe('Bb3');
    expect(noteName(fromMidi(58, { spelling: 'sharp' }))).toBe('A#3');
    expect(noteName(fromMidi(60))).toBe('C4');
  });

  it('knows enharmonics', () => {
    expect(isEnharmonic(parseNote('A#'), parseNote('Bb'))).toBe(true);
    expect(isEnharmonic(parseNote('A'), parseNote('Bb'))).toBe(false);
  });
});

describe('simplifySpelling', () => {
  it('leaves readable spellings alone', () => {
    // A# is a real spelling (it is the vii of B major), so it survives;
    // keeping Bb7 out of A#7 is the job of the key-aware transposer.
    for (const n of ['C', 'Bb', 'F#', 'Eb', 'G#', 'A#']) {
      expect(noteName(simplifySpelling(parseNote(n)))).toBe(n);
    }
  });

  it('respells names no one wants to read', () => {
    expect(noteName(simplifySpelling(parseNote('B#')))).toBe('C');
    expect(noteName(simplifySpelling(parseNote('Cb')))).toBe('B');
    expect(noteName(simplifySpelling(parseNote('E#')))).toBe('F');
    expect(noteName(simplifySpelling(parseNote('Fbb')))).toBe('Eb');
    expect(noteName(simplifySpelling(parseNote('Cx')))).toBe('D');
  });

  it('honours the preferred accidental', () => {
    expect(noteName(simplifySpelling(parseNote('Cx'), { spelling: 'sharp' }))).toBe('D');
    expect(noteName(simplifySpelling(parseNote('Fbb'), { spelling: 'sharp' }))).toBe('D#');
  });

  it('keeps the sounding pitch when an octave is present', () => {
    expect(noteName(simplifySpelling(parseNote('B#3')))).toBe('C4');
    expect(noteName(simplifySpelling(parseNote('Cb4')))).toBe('B3');
    expect(toMidi(simplifySpelling(parseNote('B#3')))).toBe(toMidi(parseNote('B#3')));
  });

  it('flags awkward spellings', () => {
    expect(isAwkwardSpelling(parseNote('B#'))).toBe(true);
    expect(isAwkwardSpelling(parseNote('Ebb'))).toBe(true);
    expect(isAwkwardSpelling(parseNote('Bb'))).toBe(false);
    expect(isAwkwardSpelling(parseNote('A#'))).toBe(false);
  });
});
