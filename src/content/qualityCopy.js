/**
 * What each chord quality sounds like, for the ear-training feedback.
 *
 * Plain data keyed by the canonical chord type the parser returns.
 * qualityCopy.test.js holds it to the qualities the levels actually use.
 */

const QUALITY_COPY = {
  maj7: {
    label: 'maj7',
    hear: 'Major third, major seventh. The seventh leans up into the root.',
  },
  m7: {
    label: 'm7',
    hear: 'Minor third, minor seventh. Even and calm, nothing pulling.',
  },
  7: {
    label: '7',
    hear: 'Major third with a minor seventh. That pair is the dominant sound, and it wants to resolve.',
  },
  m7b5: {
    label: 'm7b5',
    hear: 'A minor seventh with the fifth flattened. Listen to the fifth: that is the only note that separates it from m7.',
  },
  dim7: {
    label: 'dim7',
    hear: 'Every note a minor third from the next. It has no top and no bottom, which is why it sounds like it could go anywhere.',
  },
  m6: {
    label: 'm6',
    hear: 'Minor third with a major sixth. The same four notes as the m7b5 a minor third above it, so the bass decides which one you hear.',
  },
  '7b9': {
    label: '7b9',
    hear: 'A dominant with a flattened ninth. The half step against the root is what gives a minor ii-V its bite.',
  },
  '7alt': {
    label: '7alt',
    hear: 'A dominant with its tensions altered: b9 and b13 against the third and seventh. Tense, and further from the key than a plain 7.',
  },
  '7sus4': {
    label: '7sus4',
    hear: 'The third replaced by the fourth. Nothing states major or minor, so it hangs unresolved.',
  },
};

export default QUALITY_COPY;

/** The copy for a chord quality, or null when there is none. */
export function qualityCopy(type) {
  return QUALITY_COPY[type] ?? null;
}
