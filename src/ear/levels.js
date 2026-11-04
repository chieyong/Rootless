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
 *
 * Levels come in three blocks: what the chord is (quality), how it is laid
 * out under the hands (voicing), and what the chords are doing together
 * (progression).
 */

export const EAR_BLOCKS = [
  { id: 'quality', label: 'Quality', description: 'What chord is it?' },
  { id: 'voicing', label: 'Voicing', description: 'How is it laid out?' },
  { id: 'progression', label: 'Progression', description: 'What are they doing together?' },
  // Its levels are built from whichever tune is chosen, so levelsInBlock
  // finds none: see tuneLevels.js.
  { id: 'tune', label: 'Tune', description: 'What does this tune sound like?', dynamic: true },
];

export const EAR_LEVELS = [
  {
    block: 'quality',
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
    block: 'quality',
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
    block: 'quality',
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
    block: 'quality',
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
    block: 'quality',
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
    block: 'quality',
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
    block: 'quality',
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
    block: 'quality',
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
  {
    block: 'voicing',
    id: 'B1',
    label: 'One hand or two',
    description: 'A shell voicing, or the solo grip spread across both hands.',
    format: 'identify-form',
    forms: ['shell-1-3-7', 'solo-root-rootless'],
    qualities: ['maj7', 'm7', '7'],
    roots: 'random',
    reference: false,
    play: 'block',
  },
  {
    block: 'voicing',
    id: 'B2',
    label: 'Rootless A or B',
    description: 'The same notes, one of them an octave apart. Listen to the register.',
    format: 'identify-form',
    forms: ['rootless-A', 'rootless-B'],
    qualities: ['maj7', 'm7', '7'],
    roots: 'random',
    reference: false,
    play: 'block',
  },
  {
    block: 'voicing',
    id: 'B3',
    label: 'Shell 1-3-7 or 1-7-3',
    description: 'Three notes either way. Which one is on top?',
    format: 'identify-form',
    forms: ['shell-1-3-7', 'shell-1-7-3'],
    qualities: ['maj7', 'm7', '7'],
    roots: 'random',
    reference: false,
    play: 'block',
  },
  {
    block: 'voicing',
    id: 'B4',
    label: 'All four shapes',
    description: 'Both shells and both rootless forms against each other.',
    format: 'identify-form',
    forms: ['shell-1-3-7', 'shell-1-7-3', 'rootless-A', 'rootless-B'],
    qualities: ['maj7', 'm7', '7'],
    roots: 'random',
    reference: false,
    play: 'block',
  },
  {
    block: 'progression',
    id: 'C1',
    label: 'Major or minor ii-V',
    description: 'Three chords. Does it land major or minor?',
    format: 'identify-progression',
    progressions: ['ii-V-I', 'minor-ii-V-i'],
    forms: ['shell-1-3-7', 'shell-1-7-3'],
    roots: 'random',
    reference: false,
    play: 'block',
  },
  {
    block: 'progression',
    id: 'C2',
    label: 'Tritone sub',
    description: 'The V replaced by the dominant a tritone away. Follow the bass.',
    format: 'identify-progression',
    progressions: ['ii-V-I', 'minor-ii-V-i', 'tritone-sub'],
    forms: ['shell-1-3-7', 'shell-1-7-3'],
    roots: 'random',
    reference: false,
    play: 'block',
  },
  {
    block: 'progression',
    id: 'C3',
    label: 'Backdoor',
    description: 'All four, including the ii-V that resolves up a whole step.',
    format: 'identify-progression',
    progressions: ['ii-V-I', 'minor-ii-V-i', 'tritone-sub', 'backdoor'],
    forms: ['shell-1-3-7', 'shell-1-7-3'],
    roots: 'random',
    reference: false,
    play: 'block',
  },
];

export function getLevel(id) {
  return EAR_LEVELS.find((level) => level.id === id) ?? EAR_LEVELS[0];
}

/** Every quality any level can ask about. */
export function usedQualities() {
  return [...new Set(EAR_LEVELS.flatMap((level) => level.qualities ?? []))];
}

/** The levels of one block, in order. */
export function levelsInBlock(blockId) {
  return EAR_LEVELS.filter((level) => level.block === blockId);
}
