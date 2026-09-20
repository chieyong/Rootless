/** A small seeded random generator, so questions can be reproduced in tests. */
export function makeRng(seed = Date.now()) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rng, items) => items[Math.floor(rng() * items.length)];

export function shuffle(rng, items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Picks `count` distinct items that are not in `exclude`. */
export function sample(rng, items, count, exclude = []) {
  const blocked = new Set(exclude);
  const pool = [...new Set(items)].filter((item) => !blocked.has(item));
  return shuffle(rng, pool).slice(0, count);
}
