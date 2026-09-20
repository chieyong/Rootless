import { describe, expect, it } from 'vitest';
import {
  isWhiteKey, keyboardLayout, keyboardRange, octaveOf, pitchClassOf,
} from '../keyboardLayout.js';
import { buildVoicing } from '../../theory/index.js';

describe('key identity', () => {
  it('knows white keys from black ones', () => {
    expect([60, 62, 64, 65, 67, 69, 71].every(isWhiteKey)).toBe(true);
    expect([61, 63, 66, 68, 70].some(isWhiteKey)).toBe(false);
  });

  it('numbers octaves the way the engine does (C4 = 60)', () => {
    expect(octaveOf(60)).toBe(4);
    expect(octaveOf(48)).toBe(3);
    expect(octaveOf(59)).toBe(3);
    expect(pitchClassOf(60)).toBe(0);
  });
});

describe('keyboardRange', () => {
  it('snaps outwards to whole octaves', () => {
    expect(keyboardRange([52, 55, 59, 62])).toEqual({ from: 48, to: 71 });
    expect(keyboardRange([43, 47, 53])).toEqual({ from: 36, to: 59 });
  });

  it('never shows less than two octaves', () => {
    expect(keyboardRange([60, 64])).toEqual({ from: 60, to: 83 });
  });

  it('fits the keys to the notes when asked not to snap', () => {
    // A two-handed voicing padded to whole octaves spans four of them, which
    // is unreadable at phone width.
    expect(keyboardRange([45, 60, 63, 67, 74], { snapToOctaves: false }))
      .toEqual({ from: 45, to: 74 });
    expect(keyboardRange([45, 60, 63, 67, 74]))
      .toEqual({ from: 36, to: 83 });
  });

  it('starts and ends a non-snapped range on white keys', () => {
    // Eb2 up to Ab4: a black key at either end would have nothing to sit against.
    expect(keyboardRange([39, 68], { snapToOctaves: false })).toEqual({ from: 38, to: 69 });
  });

  it('covers a whole progression when the notes are pooled', () => {
    const midi = ['Dm7', 'G7', 'Cmaj7'].flatMap((s) => buildVoicing(s, 'rootless-A').midi);
    const { from, to } = keyboardRange(midi);
    expect(from).toBeLessThanOrEqual(Math.min(...midi));
    expect(to).toBeGreaterThanOrEqual(Math.max(...midi));
    expect(from % 12).toBe(0);
  });
});

describe('keyboardLayout', () => {
  it('lays out one octave as seven white and five black keys', () => {
    const { white, black, width } = keyboardLayout(60, 71, { whiteWidth: 20, blackWidth: 12 });
    expect(white).toHaveLength(7);
    expect(black).toHaveLength(5);
    expect(width).toBe(140);
  });

  it('puts white keys side by side', () => {
    const { white } = keyboardLayout(60, 71, { whiteWidth: 20, blackWidth: 12 });
    expect(white.map((k) => k.x)).toEqual([0, 20, 40, 60, 80, 100, 120]);
  });

  it('straddles black keys over the seam between two white keys', () => {
    const { white, black } = keyboardLayout(60, 71, { whiteWidth: 20, blackWidth: 12 });
    // C# sits on the seam between C and D, so its centre is the seam at x = 20.
    const cSharp = black.find((k) => k.midi === 61);
    expect(cSharp.x + 12 / 2).toBe(white[1].x);
    // There is no black key between E and F, or between B and C.
    expect(black.map((k) => k.midi)).toEqual([61, 63, 66, 68, 70]);
  });

  it('starts and ends on the given notes', () => {
    const { white, black } = keyboardLayout(48, 83);
    const all = [...white, ...black].map((k) => k.midi).sort((a, b) => a - b);
    expect(all[0]).toBe(48);
    expect(all.at(-1)).toBe(83);
    expect(all).toHaveLength(36);
  });
});
