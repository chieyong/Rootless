import React from 'react';
import {
  analyzeProgression, findModulations, keyName, voiceLeadProgression, voicingNoteNames,
} from '../theory/index.js';

/** Analyses a progression and shows the voice-led rootless voicings under it. */
export default function ProgressionCard({ symbols, musicKey }) {
  const { entries, groups } = analyzeProgression(symbols, musicKey);
  const voicings = voiceLeadProgression(symbols);
  const modulations = findModulations(symbols, musicKey);

  return (
    <div className="card">
      <h2>Progression in {keyName(musicKey)}</h2>
      <div className="grid">
        {symbols.map((symbol, index) => {
          const entry = entries[index];
          return (
            <div
              className={`bar${entry?.group !== undefined ? ' in-group' : ''}${entry ? '' : ' empty'}`}
              key={`${symbol}-${index}`}
            >
              <span className="bar-symbol">{symbol ?? '—'}</span>
              <span className="bar-roman">{entry ? entry.roman : ''}</span>
            </div>
          );
        })}
      </div>

      {groups.length > 0 && (
        <div className="group-list">
          <ul>
            {groups.map((group) => (
              <li key={`${group.kind}-${group.start}`}>
                bars {group.start + 1}&ndash;{group.end + 1}: {group.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {modulations.length > 0 && (
        <p className="group-list">
          Moves to {modulations.map((m) => `${m.name} (${m.degree})`).join(', ')}
        </p>
      )}

      <h2 style={{ marginTop: '1.25rem' }}>Voice-led rootless voicings</h2>
      {symbols.map((symbol, index) => {
        const voicing = voicings[index];
        if (!voicing) return null;
        return (
          <div className="voicing" key={`${symbol}-${index}`}>
            <span className="voicing-name">
              {symbol} <span className="dim">{voicing.form.replace('rootless-', '')}</span>
            </span>
            <span>
              <span className="voicing-notes readout">
                {voicingNoteNames(voicing).join(' ')}
              </span>
              <br />
              <span className="voicing-degrees">
                {voicing.degrees.join(' · ')}
                {index > 0 ? ` · moves ${voicing.movement} semitones` : ''}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
