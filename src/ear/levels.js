/**
 * The ear-training ladder.
 *
 * A level is a point in seven dimensions, not a rung: how many options, a
 * fixed or a random root, with or without a reference tone, rolled or struck,
 * which voicing, and which qualities are in play. That way a hard pair can be
 * made easier by turning one knob instead of dropping a whole level.
 *
 * `form` is the voicing the question is played with, and it is load-bearing:
 * a shell voicing has no fifth, so it cannot tell m7 from m7b5, nor dim7 from
 * m6, nor 7 from 7alt. Levels that need the fifth use the solo grip, which
 * states the root in the left hand and the colour in the right.
 * ear.test.js fails any level whose qualities are indistinguishable.
 */

export const EAR_LEVELS = [
  {
    id: 'A1',
    label: 'Same or different',
    description: 'Two chords. Is the quality the same?',
    format: 'same-different',
    qualities: ['maj7', 'm7'],
    roots: 'random',
    reference: false,
    play: 'arpeggio',
    form: 'shell-1-3-7',
  },
  {
    id: 'A2',
    label: 'Major or minor',
    description: 'One chord in C. Which third?',
    format: 'identify',
    qualities: ['maj7', 'm7'],
    roots: 'fixed',
    reference: true,
    play: 'arpeggio',
    form: 'shell-1-3-7',
  },
  {
    id: 'A3',
    label: 'The three colours',
    description: 'maj7, m7 and 7 in C. The seventh joins in.',
    format: 'identify',
    qualities: ['maj7', 'm7', '7'],
    roots: 'fixed',
    reference: true,
    play: 'block',
    form: 'shell-1-3-7',
  },
  {
    id: 'A4',
    label: 'Any key',
    description: 'The same three, with no fixed root to lean on.',
    format: 'identify',
    qualities: ['maj7', 'm7', '7'],
    roots: 'random',
    reference: false,
    play: 'block',
    form: 'shell-1-3-7',
  },
  {
    id: 'A5',
    label: 'Half-diminished',
    description: 'm7b5 joins. Listen to the fifth.',
    format: 'identify',
    qualities: ['maj7', 'm7', '7', 'm7b5'],
    roots: 'random',
    reference: false,
    play: 'block',
    form: 'solo-root-rootless',
  },
  {
    id: 'A6',
    label: 'm7 or m7b5',
    description: 'The hardest pair, as a comparison instead of a name.',
    format: 'same-different',
    qualities: ['m7', 'm7b5'],
    roots: 'random',
    reference: false,
    play: 'block',
    form: 'solo-root-rootless',
  },
  {
    id: 'A7',
    label: 'Six colours',
    description: 'dim7 and m6 join the four you know.',
    format: 'identify',
    qualities: ['maj7', 'm7', '7', 'm7b5', 'dim7', 'm6'],
    roots: 'random',
    reference: false,
    play: 'block',
    form: 'solo-root-rootless',
  },
  {
    id: 'A8',
    label: 'Dominants',
    description: 'Four dominants against each other. The hardest level.',
    format: 'identify',
    qualities: ['7', '7b9', '7alt', '7sus4'],
    roots: 'random',
    reference: false,
    play: 'block',
    form: 'solo-root-rootless',
  },
];

export function getLevel(id) {
  return EAR_LEVELS.find((level) => level.id === id) ?? EAR_LEVELS[0];
}

/** Every quality any level can ask about. */
export function usedQualities() {
  return [...new Set(EAR_LEVELS.flatMap((level) => level.qualities))];
}
