/**
 * The progressions the ear exercises ask about.
 *
 * Each one is written out in C (or C minor) and transposed from there, so the
 * spelling comes from the transposer that is already tested rather than from
 * a table of twelve hand-written keys.
 *
 * What separates them is the shape - the root motion plus the qualities -
 * which survives transposition. ear.test.js checks that no two progressions
 * in the same level share a shape, or the question would have two answers.
 */

export const PROGRESSIONS = {
  'ii-V-I': {
    id: 'ii-V-I',
    label: 'ii-V-I major',
    key: 'C',
    symbols: ['Dm7', 'G7', 'Cmaj7'],
    hear: 'The roots fall in fourths and land on a major chord. This is the sentence most of the repertoire is built from.',
  },
  'minor-ii-V-i': {
    id: 'minor-ii-V-i',
    label: 'minor ii-V-i',
    key: 'Cm',
    symbols: ['Dm7b5', 'G7alt', 'Cm7'],
    hear: 'The same root motion, but the ii is half-diminished, the V is altered, and it lands on a minor chord.',
  },
  'tritone-sub': {
    id: 'tritone-sub',
    label: 'tritone sub',
    key: 'C',
    symbols: ['Dm7', 'Db7', 'Cmaj7'],
    hear: 'The V is swapped for the dominant a tritone away, so the bass walks down in half steps instead of leaping a fourth.',
  },
  backdoor: {
    id: 'backdoor',
    label: 'backdoor ii-V',
    key: 'C',
    symbols: ['Fm7', 'Bb7', 'Cmaj7'],
    hear: 'A ii-V borrowed from a tone below, resolving up a whole step into the tonic instead of down a fourth.',
  },
};

/**
 * The keys a progression may be transposed into.
 *
 * F# rather than Gb: the backdoor ii-V in Gb needs Cbm7 and Fb7, which the
 * transposer respells to Bm7 and E7, leaving a progression that reads
 * Bm7 E7 Gbmaj7 - correct by sound but odd on the page. In F# the same three
 * chords spell Bm7 E7 F#maj7 and nothing has to be respelled. Every other
 * progression is clean in F# too.
 */
export const PROGRESSION_KEYS = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
];

export function getProgression(id) {
  return PROGRESSIONS[id] ?? null;
}

/** Every progression any level can ask about. */
export function progressionIds() {
  return Object.keys(PROGRESSIONS);
}
