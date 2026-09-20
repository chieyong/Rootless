import React, { useState } from 'react';
import { COMMON_KEYS } from '../theory/index.js';

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const QUALITIES = [
  { id: 'maj7', label: 'maj7' },
  { id: 'm7', label: 'm7' },
  { id: '7', label: '7' },
  { id: 'm7b5', label: 'm7b5' },
  { id: 'dim7', label: 'dim7' },
  { id: '7alt', label: '7alt' },
  { id: '6', label: '6' },
  { id: 'm6', label: 'm6' },
];

/** Builds a chord symbol from buttons: a root and a quality. */
export default function ChordBuilder({ onAnswer, disabled = false }) {
  const [root, setRoot] = useState(null);
  const [quality, setQuality] = useState(null);

  const submit = (nextRoot, nextQuality) => {
    if (nextRoot && nextQuality) onAnswer(nextRoot + nextQuality);
  };

  return (
    <div>
      <span className="label">Root</span>
      <div className="chips" style={{ marginTop: 0 }}>
        {ROOTS.map((name) => (
          <button
            type="button"
            className="chip small"
            key={name}
            disabled={disabled}
            aria-pressed={name === root}
            onClick={() => { setRoot(name); submit(name, quality); }}
          >
            {name}
          </button>
        ))}
      </div>
      <span className="label" style={{ marginTop: '0.75rem' }}>Quality</span>
      <div className="chips" style={{ marginTop: 0 }}>
        {QUALITIES.map((item) => (
          <button
            type="button"
            className="chip small"
            key={item.id}
            disabled={disabled}
            aria-pressed={item.id === quality}
            onClick={() => { setQuality(item.id); submit(root, item.id); }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { ROOTS, QUALITIES, COMMON_KEYS };
