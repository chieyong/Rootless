/**
 * The tune library.
 *
 * Every tune ships with `verified: false`: the changes are written from the
 * versions most commonly played, but nobody has checked them against a chart
 * yet. The UI says so, and each tune's `notes` list the bars that vary
 * between charts.
 */

import allOfMe from './data/all-of-me.json';
import allTheThingsYouAre from './data/all-the-things-you-are.json';
import autumnLeaves from './data/autumn-leaves.json';
import bbBlues from './data/bb-blues.json';
import blueBossa from './data/blue-bossa.json';
import bodyAndSoul from './data/body-and-soul.json';
import misty from './data/misty.json';
import takeTheATrain from './data/take-the-a-train.json';
import thereWillNeverBeAnotherYou from './data/there-will-never-be-another-you.json';

/** Roughly in order of how hard the changes are to hold on to. */
export const TUNES = [
  allOfMe,
  blueBossa,
  bbBlues,
  autumnLeaves,
  takeTheATrain,
  thereWillNeverBeAnotherYou,
  misty,
  allTheThingsYouAre,
  bodyAndSoul,
];

export function getTune(id) {
  return TUNES.find((tune) => tune.id === id) ?? null;
}

export * from './tune.js';
