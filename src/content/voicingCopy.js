/**
 * What each voicing is, in plain words, for someone playing solo.
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
    why: 'The third and the seventh are what make a chord sound major, minor or dominant, and the root puts a floor under it. Playing solo that matters: these three notes stand on their own, with no one else to state the harmony. Start here and stay here for a while.',
  },
  'shell-1-7-3': {
    short: 'The same three notes, seventh below the third.',
    why: 'Same notes as 1-3-7, stacked the other way round. Alternating the two shapes through a ii-V keeps your hand in one place instead of jumping: play Dm7 as 1-3-7 and G7 as 1-7-3, and the hand barely moves.',
  },
  'rootless-A': {
    short: '3-5-7-9, no root - a right-hand shape when you play solo.',
    why: 'Leaving out the root frees the hand for the notes that colour the chord. On a dominant the shape becomes 3-13-b7-9. On its own it sounds unmoored, because nothing states the root - playing solo you use it in the right hand, over a root or a shell in the left.',
  },
  'rootless-B': {
    short: 'The A shape with its two lowest notes an octave up.',
    why: 'Exactly the same notes as the A form, in a different order. Alternate A and B through a ii-V and the voices move as little as possible, which is what makes a progression sound smooth rather than blocky.',
  },
  'solo-root-rootless': {
    short: 'Root in the left hand, rootless shape in the right.',
    why: 'The everyday solo grip: the left hand states the root low down, the right hand plays the colour above it. This is where the rootless shapes you learned finally pay off, and it is the shape you will use most once shell voicings are under your fingers.',
  },
};

export default VOICING_COPY;

/** The copy for a form, or null when there is none. */
export function voicingCopy(form) {
  return VOICING_COPY[form] ?? null;
}
