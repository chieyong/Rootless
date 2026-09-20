import React from 'react';
import {
  analyzeProgression, findModulations, keyName, voiceLeadProgression,
} from '../theory/index.js';
import { keyboardRange } from './Keyboard.jsx';
import VoicingRow from './VoicingRow.jsx';

/** Analyses a progression and shows the voice-led rootless voicings under it. */
export default function ProgressionCard({ symbols, musicKey }) {
  const { entries, groups } = analyzeProgression(symbols, musicKey);
  const voicings = voiceLeadProgression(symbols);
  const modulations = findModulations(symbols, musicKey);
  // One range for the whole progression, so the voice leading is visible as movement.
  const range = keyboardRange(voicings.filter(Boolean).flatMap((v) => v.midi));

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
          <VoicingRow
            key={`${symbol}-${index}`}
            voicing={voicing}
            range={range}
            title={`${symbol} ${voicing.form.replace('rootless-', '')}`}
            note={index > 0
              ? `moves ${voicing.movement} ${voicing.movement === 1 ? 'semitone' : 'semitones'}`
              : null}
          />
        );
      })}

    </div>
  );
}
