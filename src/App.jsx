import React, { useMemo, useState } from 'react';
import { COMMON_KEYS, parseChord, parseKey, transposeProgression } from './theory/index.js';
import ChordCard from './ui/ChordCard.jsx';
import ProgressionCard from './ui/ProgressionCard.jsx';

const EXAMPLES = [
  { label: 'ii-V-I', symbols: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'], key: 'C' },
  { label: 'minor ii-V-i', symbols: ['Bm7b5', 'E7alt', 'Am6', 'Am6'], key: 'A minor' },
  { label: 'Autumn Leaves A', symbols: ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm7', 'Gm7'], key: 'Bb' },
  { label: 'backdoor', symbols: ['Cmaj7', 'Fm7', 'Bb7', 'Cmaj7'], key: 'C' },
  { label: 'tritone sub', symbols: ['Dm7', 'Db7', 'Cmaj7', 'Cmaj7'], key: 'C' },
];

/**
 * Phase 1 screen: a lab for checking the theory engine by hand.
 * No audio yet - that arrives with the Changes module.
 */
export default function App() {
  const [symbolInput, setSymbolInput] = useState('G7alt');
  const [example, setExample] = useState(0);
  const [keyIndex, setKeyIndex] = useState(0);

  const chord = useMemo(() => parseChord(symbolInput), [symbolInput]);
  const current = EXAMPLES[example];
  const sourceKey = useMemo(() => parseKey(current.key), [current.key]);
  const targetKeyName = COMMON_KEYS[keyIndex];
  const targetKey = useMemo(
    () => parseKey(sourceKey.mode === 'minor' ? `${targetKeyName}m` : targetKeyName),
    [targetKeyName, sourceKey.mode],
  );
  const symbols = useMemo(
    () => transposeProgression(current.symbols, sourceKey, targetKey),
    [current.symbols, sourceKey, targetKey],
  );

  return (
    <main>
      <h1>Rootless</h1>
      <p className="tagline">Phase 1 &middot; theory engine check</p>

      <div className="card">
        <label className="label" htmlFor="symbol">Chord symbol</label>
        <input
          id="symbol"
          className="field"
          value={symbolInput}
          onChange={(event) => setSymbolInput(event.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          enterKeyHint="done"
        />
        <div className="chips">
          {['Cmaj7', 'Dm7', 'G7', 'G7alt', 'Bm7b5', 'C#dim7', 'C6/9', 'Fm6', 'Bb13'].map((s) => (
            <button
              type="button"
              className="chip"
              key={s}
              aria-pressed={s === symbolInput}
              onClick={() => setSymbolInput(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {chord
        ? <ChordCard chord={chord} musicKey={targetKey} />
        : <p className="card error">Not a chord symbol yet.</p>}

      <div className="card">
        <h2>Example</h2>
        <div className="chips" style={{ marginTop: 0 }}>
          {EXAMPLES.map((item, index) => (
            <button
              type="button"
              className="chip"
              key={item.label}
              aria-pressed={index === example}
              onClick={() => setExample(index)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <h2 style={{ marginTop: '1.25rem' }}>Transpose to</h2>
        <div className="chips" style={{ marginTop: 0 }}>
          {COMMON_KEYS.map((name, index) => (
            <button
              type="button"
              className="chip"
              key={name}
              aria-pressed={index === keyIndex}
              onClick={() => setKeyIndex(index)}
            >
              {name}{sourceKey.mode === 'minor' ? 'm' : ''}
            </button>
          ))}
        </div>
      </div>

      <ProgressionCard symbols={symbols} musicKey={targetKey} />

      <footer>
        Phase 2 adds the tunes and the sound.
      </footer>
    </main>
  );
}
