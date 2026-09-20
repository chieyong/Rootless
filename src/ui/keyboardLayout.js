/**
 * Keyboard geometry, kept free of React so it can be unit tested.
 *
 * Notes are MIDI numbers (C4 = 60). Coordinates are in SVG user units:
 * white keys sit side by side, black keys straddle the seam between them.
 */

/** Pitch classes of the white keys: C D E F G A B. */
export const WHITE_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];

export const pitchClassOf = (midi) => ((midi % 12) + 12) % 12;

export const isWhiteKey = (midi) => WHITE_PITCH_CLASSES.includes(pitchClassOf(midi));

/** The octave number of a MIDI note, scientific pitch notation. */
export const octaveOf = (midi) => Math.floor(midi / 12) - 1;

/**
 * Snaps a set of notes outwards to whole octaves (C up to B), so every
 * keyboard starts on a C and shapes stay comparable between chords.
 */
export function keyboardRange(midiNumbers, { minOctaves = 2 } = {}) {
  if (!midiNumbers.length) return { from: 60, to: 71 };
  const low = Math.min(...midiNumbers);
  const high = Math.max(...midiNumbers);
  const from = Math.floor(low / 12) * 12;
  let to = Math.ceil((high + 1) / 12) * 12 - 1;
  while (to - from + 1 < minOctaves * 12) to += 12;
  return { from, to };
}

/**
 * Places the keys of a range.
 * Returns the white keys, the black keys and the total width.
 */
export function keyboardLayout(from, to, { whiteWidth = 20, blackWidth = 12.4 } = {}) {
  const white = [];
  const black = [];
  let x = 0;
  for (let midi = from; midi <= to; midi += 1) {
    if (isWhiteKey(midi)) {
      white.push({ midi, x });
      x += whiteWidth;
    } else {
      // A black key always follows a white one, so x is that key's right edge.
      black.push({ midi, x: x - blackWidth / 2 });
    }
  }
  return { white, black, width: x };
}
