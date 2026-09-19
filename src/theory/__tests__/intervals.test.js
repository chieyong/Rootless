import { describe, expect, it } from 'vitest';
import { noteName, parseNote } from '../notes.js';
import {
  intervalBetween, intervalName, parseInterval, transposeNote,
} from '../intervals.js';

const up = (note, iv) => noteName(transposeNote(parseNote(note), parseInterval(iv)));
const between = (a, b) => intervalName(intervalBetween(parseNote(a), parseNote(b)));

describe('transposeNote', () => {
  it('keeps the correct spelling', () => {
    expect(up('Bb', 'P5')).toBe('F');
    expect(up('Bb', 'A4')).toBe('E');
    expect(up('Bb', 'd5')).toBe('Fb');
    expect(up('F#', 'm3')).toBe('A');
    expect(up('Eb', 'M3')).toBe('G');
    expect(up('C', 'M9')).toBe('D');
  });

  it('transposes downwards', () => {
    expect(up('C', '-m3')).toBe('A');
    expect(up('F', '-P5')).toBe('Bb');
  });

  it('tracks octaves', () => {
    expect(noteName(transposeNote(parseNote('C4'), parseInterval('P5')))).toBe('G4');
    expect(noteName(transposeNote(parseNote('A4'), parseInterval('m3')))).toBe('C5');
    expect(noteName(transposeNote(parseNote('C4'), parseInterval('-M2')))).toBe('Bb3');
    expect(noteName(transposeNote(parseNote('C4'), parseInterval('M9')))).toBe('D5');
  });
});

describe('intervalBetween', () => {
  it('measures pitch classes upwards', () => {
    expect(between('C', 'Bb')).toBe('m7');
    expect(between('C', 'E')).toBe('M3');
    expect(between('Bb', 'D')).toBe('M3');
    expect(between('B', 'F')).toBe('d5');
    expect(between('C', 'C')).toBe('P1');
  });

  it('measures real distance when octaves are given', () => {
    expect(intervalName(intervalBetween(parseNote('C4'), parseNote('Eb3')))).toBe('-M6');
    expect(intervalName(intervalBetween(parseNote('C4'), parseNote('D5')))).toBe('M9');
  });

  it('round-trips with transposeNote', () => {
    for (const [a, b] of [['C', 'Eb'], ['Bb', 'D'], ['F#', 'C#'], ['Ab', 'Gb']]) {
      const iv = intervalBetween(parseNote(a), parseNote(b));
      expect(noteName(transposeNote(parseNote(a), iv))).toBe(b);
    }
  });
});
