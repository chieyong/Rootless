import { beforeEach, describe, expect, it } from 'vitest';
import {
  allItems, dueKeys, exportProgress, getItem, importProgress, itemsMatching, loadProgress,
  recordAnswer, resetProgress, summaryFor,
} from '../store.js';
import { BOX_COUNT } from '../leitner.js';

const T0 = Date.UTC(2026, 0, 1);
const DAY = 24 * 60 * 60 * 1000;

/** A localStorage that behaves like the real one, including throwing. */
function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

beforeEach(() => {
  globalThis.window = { localStorage: fakeStorage() };
});

describe('recording', () => {
  it('creates an item the first time it is answered', () => {
    const item = recordAnswer('ear:quality:m7', true, T0);
    expect(item.box).toBe(2);
    expect(item.seen).toBe(1);
    expect(getItem('ear:quality:m7').box).toBe(2);
  });

  it('keeps building on what is already stored', () => {
    recordAnswer('a', true, T0);
    recordAnswer('a', true, T0);
    const item = recordAnswer('a', false, T0);
    expect(item.seen).toBe(3);
    expect(item.correct).toBe(2);
    expect(item.box, 'a wrong answer drops it to box one').toBe(1);
  });

  it('ignores an answer with no item key', () => {
    expect(recordAnswer(null, true, T0)).toBeNull();
    expect(allItems()).toHaveLength(0);
  });

  it('survives storage that refuses to co-operate', () => {
    globalThis.window = {
      get localStorage() { throw new Error('blocked'); },
    };
    expect(() => recordAnswer('a', true, T0)).not.toThrow();
    expect(loadProgress().items).toEqual({});
  });
});

describe('grouping', () => {
  beforeEach(() => {
    recordAnswer('tune:blue-bossa:bar:1', true, T0);
    recordAnswer('tune:blue-bossa:bar:2', false, T0);
    recordAnswer('ear:quality:m7', true, T0);
  });

  it('finds the items of one tune', () => {
    expect(itemsMatching('tune:blue-bossa:')).toHaveLength(2);
    expect(itemsMatching('ear:')).toHaveLength(1);
    expect(itemsMatching('tune:autumn-leaves:')).toHaveLength(0);
  });

  it('summarises a group', () => {
    const summary = summaryFor('tune:blue-bossa:', T0);
    expect(summary.count).toBe(2);
    expect(summary.seen).toBe(2);
    expect(summary.correct).toBe(1);
    expect(summary.accuracy).toBeCloseTo(0.5);
  });
});

describe('dueKeys', () => {
  it('puts unseen and failed items before ones answered correctly', () => {
    recordAnswer('known', true, T0);
    recordAnswer('failed', false, T0);
    const order = dueKeys(['known', 'failed', 'unseen'], T0);
    expect(order.at(-1)).toBe('known');
    expect(order.slice(0, 2).sort()).toEqual(['failed', 'unseen']);
  });

  it('includes keys that have never been answered', () => {
    expect(dueKeys(['a', 'b'], T0)).toHaveLength(2);
  });
});

describe('export and import', () => {
  it('round-trips', () => {
    recordAnswer('a', true, T0);
    recordAnswer('b', false, T0);
    const backup = exportProgress();

    resetProgress();
    expect(allItems()).toHaveLength(0);

    const result = importProgress(backup);
    expect(result).toMatchObject({ ok: true, imported: 2, skipped: 0 });
    expect(getItem('a').box).toBe(2);
    expect(getItem('b').box).toBe(1);
  });

  it('names the app, so another file can be turned away', () => {
    expect(JSON.parse(exportProgress()).app).toBe('rootless');
    expect(importProgress('{"app":"something-else","items":{}}').ok).toBe(false);
  });

  it('refuses what is not a backup', () => {
    expect(importProgress('not json').error).toMatch(/not JSON/);
    expect(importProgress('{"hello":1}').error).toMatch(/no Rootless progress/);
    expect(importProgress('null').ok).toBe(false);
  });

  it('does not trust the numbers in the file', () => {
    // The file came off a disk and could say anything.
    const nonsense = JSON.stringify({
      app: 'rootless',
      items: {
        huge: { box: 9999, seen: 5, correct: 500, due: 0 },
        negative: { box: -4, seen: -2, correct: -1, due: 0 },
        rubbish: { box: 'three', seen: null, correct: {}, due: 'soon' },
        notAnItem: 'a string',
      },
    });
    const result = importProgress(nonsense, { merge: false });
    expect(result.ok).toBe(true);
    expect(getItem('huge').box).toBe(BOX_COUNT);
    expect(getItem('huge').correct, 'cannot be right more often than asked').toBe(5);
    expect(getItem('negative').box).toBe(1);
    expect(getItem('negative').seen).toBe(0);
    expect(getItem('rubbish').box).toBe(1);
    expect(getItem('notAnItem')).toBeNull();
    expect(result.skipped).toBe(1);
  });

  it('keeps the side that was practised more recently when merging', () => {
    recordAnswer('a', true, T0 + 10 * DAY);
    const newer = getItem('a');

    const olderBackup = JSON.stringify({
      app: 'rootless',
      items: { a: { box: 5, seen: 99, correct: 99, due: 0, lastSeen: T0 } },
    });
    importProgress(olderBackup, { merge: true });
    expect(getItem('a').seen, 'the newer practice wins').toBe(newer.seen);

    const newerBackup = JSON.stringify({
      app: 'rootless',
      items: { a: { box: 4, seen: 12, correct: 10, due: 0, lastSeen: T0 + 20 * DAY } },
    });
    importProgress(newerBackup, { merge: true });
    expect(getItem('a').seen).toBe(12);
  });

  it('replaces everything when merge is off', () => {
    recordAnswer('old', true, T0);
    importProgress(JSON.stringify({ app: 'rootless', items: { fresh: { box: 1, seen: 0, correct: 0, due: 0 } } }), { merge: false });
    expect(getItem('old')).toBeNull();
    expect(getItem('fresh')).not.toBeNull();
  });
});
