/**
 * What each voicing is, in plain words.
 *
 * Plain data, keyed by voicing form id: `short` is one line and is always
 * visible; `why` is the two or three sentences behind it, revealed on tap.
 *
 * Every id in VOICING_FORMS needs an entry, and there are no entries for
 * forms that do not exist - voicingCopy.test.js holds both to that.
 */

const VOICING_COPY = {
  'shell-1-3-7': {
    short: 'Root, third, seventh - left hand.',
    why: 'The third and the seventh are what make a chord sound major, minor or dominant. The fifth adds almost nothing, so it is left out. These three notes are enough to play through a whole tune, and everything else you will learn is built on top of them.',
  },
  'shell-1-7-3': {
    short: 'The same three notes, seventh below the third.',
    why: 'Same notes as 1-3-7, stacked the other way round. Alternating the two shapes through a ii-V keeps your hand in one place instead of jumping: play Dm7 as 1-3-7 and G7 as 1-7-3, and the hand barely moves.',
  },
  'rootless-A': {
    short: 'No root: 3-5-7-9, around middle C.',
    why: 'The root is left to the bass player, which frees the hand for the notes that colour the chord. On a dominant the shape is 3-13-b7-9. Learn the shell voicings first - this one only makes sense once you hear what the third and seventh are doing.',
  },
  'rootless-B': {
    short: 'The A shape with its two lowest notes an octave up.',
    why: 'Exactly the same notes as the A form, in a different order. Alternate A and B through a ii-V and the voices move as little as possible, which is what makes a progression sound smooth rather than blocky.',
  },
};

export default VOICING_COPY;

/** The copy for a form, or null when there is none. */
export function voicingCopy(form) {
  return VOICING_COPY[form] ?? null;
}
