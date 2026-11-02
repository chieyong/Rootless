import React, { useMemo, useRef, useState } from 'react';
import { TUNES } from '../tunes/index.js';
import { EAR_BLOCKS, EAR_LEVELS } from '../ear/levels.js';
import { levelOptions } from '../ear/generators.js';
import { qualityCopy } from '../content/qualityCopy.js';
import { formLabel } from '../theory/index.js';
import { getProgression } from '../ear/progressions.js';
import {
  allItems, exportProgress, importProgress, loadProgress, resetProgress,
} from '../progress/store.js';
import { summarise } from '../progress/leitner.js';

/** A row: a name, how strong it is, and what it has cost you so far. */
function Row({ label, items, now }) {
  const summary = summarise(items, now);
  const percent = Math.round(summary.strength * 100);
  return (
    <div className="progress-row">
      <div className="progress-head">
        <span className="progress-label">{label}</span>
        <span className="progress-stat">
          {summary.seen === 0
            ? <span className="dim">not started</span>
            : `${Math.round(summary.accuracy * 100)}% of ${summary.seen}`}
        </span>
      </div>
      <div className="strength-bar" role="img" aria-label={`${percent}% learned`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-note">
        {summary.due > 0 && <span className="due">{summary.due} due</span>}
        {summary.weak > 0 && <span className="weak">{summary.weak} weak</span>}
        {summary.seen > 0 && summary.due === 0 && summary.weak === 0
          && <span className="dim">resting</span>}
      </div>
    </div>
  );
}

/** What you know, what is due, and a way to get it off the phone. */
export default function ProgressScreen() {
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState(null);
  const fileInput = useRef(null);
  const now = Date.now();

  const progress = useMemo(() => loadProgress(), [version]);
  const items = allItems(progress);
  const byKey = (prefix) => items.filter((item) => item.key.startsWith(prefix));
  const overall = summarise(items, now);

  const refresh = () => setVersion((v) => v + 1);

  const download = () => {
    const blob = new Blob([exportProgress(progress)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rootless-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const result = importProgress(await file.text());
    setMessage(result.ok
      ? `Imported ${result.imported} item${result.imported === 1 ? '' : 's'}.${result.skipped ? ` ${result.skipped} skipped.` : ''}`
      : result.error);
    refresh();
  };

  const clear = () => {
    if (!window.confirm('Delete all progress? This cannot be undone.')) return;
    resetProgress();
    setMessage('Progress cleared.');
    refresh();
  };

  // The ear options, grouped by block, with a readable name for each.
  const earGroups = EAR_BLOCKS.map((block) => {
    const seen = new Map();
    for (const level of EAR_LEVELS.filter((l) => l.block === block.id)) {
      for (const { option, key } of levelOptions(level)) {
        if (!seen.has(key)) seen.set(key, { option, key, block: block.id });
      }
    }
    return { block, entries: [...seen.values()] };
  });

  const nameFor = (entry) => {
    // The form's name, not its explanation: a whole sentence does not read
    // as a row label.
    if (entry.block === 'voicing') return formLabel(entry.option);
    if (entry.block === 'progression') return getProgression(entry.option)?.label ?? entry.option;
    return qualityCopy(entry.option)?.label ?? entry.option;
  };

  return (
    <main>
      <h1>Progress</h1>
      <p className="tagline">
        {overall.count === 0
          ? 'Nothing practised yet'
          : `${overall.count} things practised · ${overall.due} due · ${overall.weak} weak`}
      </p>

      <div className="card">
        <h2>Tunes</h2>
        {TUNES.map((tune) => (
          <Row key={tune.id} label={tune.title} items={byKey(`tune:${tune.id}:`)} now={now} />
        ))}
      </div>

      {earGroups.map(({ block, entries }) => (
        <div className="card" key={block.id}>
          <h2>{block.label}</h2>
          {entries.map((entry) => (
            <Row
              key={entry.key}
              label={nameFor(entry)}
              items={items.filter((item) => item.key === entry.key)}
              now={now}
            />
          ))}
        </div>
      ))}

      <div className="card">
        <h2>Backup</h2>
        <p className="voicing-guidance">
          iOS clears storage for sites that go unused for a week or so. Keep a
          copy in Files, or send it to yourself.
        </p>
        <div className="chips" style={{ marginTop: '0.75rem' }}>
          <button type="button" className="button" onClick={download}>Export</button>
          <button type="button" className="button" onClick={() => fileInput.current?.click()}>
            Import
          </button>
          <button type="button" className="button" onClick={clear}>Clear</button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          onChange={upload}
          style={{ display: 'none' }}
        />
        {message && <p className="hint" style={{ marginTop: '0.75rem' }}>{message}</p>}
      </div>
    </main>
  );
}
