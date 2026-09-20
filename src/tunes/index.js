/**
 * The tune library.
 *
 * Every tune ships with `verified: false`: the changes are written from the
 * versions most commonly played, but nobody has checked them against a chart
 * yet. The UI says so, and each tune's `notes` list the bars that vary
 * between charts.
 */

import allTheThingsYouAre from './data/all-the-things-you-are.json';
import autumnLeaves from './data/autumn-leaves.json';
import bbBlues from './data/bb-blues.json';
import blueBossa from './data/blue-bossa.json';
import thereWillNeverBeAnotherYou from './data/there-will-never-be-another-you.json';

export const TUNES = [
  autumnLeaves,
  blueBossa,
  bbBlues,
  thereWillNeverBeAnotherYou,
  allTheThingsYouAre,
];

export function getTune(id) {
  return TUNES.find((tune) => tune.id === id) ?? null;
}

export * from './tune.js';
