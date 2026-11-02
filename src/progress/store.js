/**
 * Where progress lives.
 *
 * Everything goes through src/storage/local.js, so when sync arrives only
 * that module changes. Nothing else in the app touches a Leitner item
 * directly: screens call recordAnswer and read summaries.
 */

import { load, save } from '../storage/local.js';
import { BOX_COUNT, grade, newItem, practiceOrder, summarise } from './leitner.js';

const KEY = 'progress';
export const PROGRESS_VERSION = 1;

const empty = () => ({ version: PROGRESS_VERSION, items: {}, updatedAt: null });

export function loadProgress() {
  const stored = load(KEY, null);
  if (!stored || typeof stored !== 'object' || !stored.items) return empty();
  return { ...empty(), ...stored, items: { ...stored.items } };
}

export function saveProgress(progress) {
  return save(KEY, { ...progress, version: PROGRESS_VERSION, updatedAt: Date.now() });
}

export function getItem(key, progress = loadProgress()) {
  return progress.items[key] ?? null;
}

/** Every item, as an array. */
export function allItems(progress = loadProgress()) {
  return Object.values(progress.items);
}

/**
 * Records one answer against an item, creating it if this is the first time.
 * Returns the item's new state.
 */
export function recordAnswer(key, wasCorrect, now = Date.now()) {
  if (!key) return null;
  const progress = loadProgress();
  const current = progress.items[key] ?? newItem(key, now);
  const graded = grade(current, wasCorrect, now);
  progress.items[key] = graded;
  saveProgress(progress);
  return graded;
}

export function resetProgress() {
  saveProgress(empty());
}

/** The keys worth practising next, strongest last. */
export function dueKeys(candidateKeys, now = Date.now()) {
  const progress = loadProgress();
  const items = candidateKeys.map((key) => progress.items[key] ?? newItem(key, now));
  return practiceOrder(items, now).map((item) => item.key);
}

/** Items whose key starts with a prefix, for the per-tune and per-type views. */
export function itemsMatching(prefix, progress = loadProgress()) {
  return allItems(progress).filter((item) => item.key.startsWith(prefix));
}

export function summaryFor(prefix, now = Date.now(), progress = loadProgress()) {
  return summarise(itemsMatching(prefix, progress), now);
}

/* -------------------------------------------------------------------- */
/* Export and import                                                      */
/* -------------------------------------------------------------------- */

export function exportProgress(progress = loadProgress()) {
  return JSON.stringify({
    app: 'rootless',
    version: PROGRESS_VERSION,
    exportedAt: new Date().toISOString(),
    items: progress.items,
  }, null, 2);
}

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * Reads one item out of imported data.
 * The file came off the user's disk and may be anything, so every field is
 * checked and clamped rather than trusted. Returns null for a bad item.
 */
function readItem(key, raw) {
  if (typeof key !== 'string' || !key || !raw || typeof raw !== 'object') return null;
  const seen = isFiniteNumber(raw.seen) ? Math.max(0, Math.floor(raw.seen)) : 0;
  const correct = isFiniteNumber(raw.correct) ? Math.max(0, Math.floor(raw.correct)) : 0;
  return {
    key,
    box: isFiniteNumber(raw.box) ? Math.min(Math.max(Math.round(raw.box), 1), BOX_COUNT) : 1,
    due: isFiniteNumber(raw.due) ? raw.due : 0,
    seen,
    // Cannot have been right more often than it was asked.
    correct: Math.min(correct, seen),
    streak: isFiniteNumber(raw.streak) ? Math.max(0, Math.floor(raw.streak)) : 0,
    lastSeen: isFiniteNumber(raw.lastSeen) ? raw.lastSeen : null,
  };
}

/**
 * Reads an exported file back in.
 *
 * `merge` keeps whichever version of an item was practised more recently,
 * so importing a backup onto a phone that has since been used does not throw
 * away the newer work. Returns { ok, imported, skipped, error }.
 */
export function importProgress(text, { merge = true, now = Date.now() } = {}) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, imported: 0, skipped: 0, error: 'That file is not JSON.' };
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.items || typeof parsed.items !== 'object') {
    return { ok: false, imported: 0, skipped: 0, error: 'That file holds no Rootless progress.' };
  }
  if (parsed.app && parsed.app !== 'rootless') {
    return { ok: false, imported: 0, skipped: 0, error: 'That file is from another app.' };
  }

  const current = merge ? loadProgress() : empty();
  let imported = 0;
  let skipped = 0;
  for (const [key, raw] of Object.entries(parsed.items)) {
    const item = readItem(key, raw);
    if (!item) { skipped += 1; continue; }
    const existing = current.items[key];
    // Keep whichever side was practised last.
    if (existing && (existing.lastSeen ?? 0) > (item.lastSeen ?? 0)) { skipped += 1; continue; }
    current.items[key] = item;
    imported += 1;
  }
  current.updatedAt = now;
  saveProgress(current);
  return { ok: true, imported, skipped, error: null };
}
