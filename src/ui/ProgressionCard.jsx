import React, { useEffect, useMemo } from 'react';
import {
  analyzeProgression, findModulations, keyName, voiceLeadProgression,
} from '../theory/index.js';
import { keyboardRange } from './keyboardLayout.js';
import PlayButton from './PlayButton.jsx';
import VoicingRow from './VoicingRow.jsx';

const BEATS_PER_CHORD = 2;

/** Analyses a progression, shows the voice-led voicings and plays them. */
export default function ProgressionCard({ symbols, musicKey, audio, arpeggio = false, bpm = 100 }) {
  const { entries, groups } = analyzeProgression(symbols, musicKey);
  const voicings = useMemo(() => voiceLeadProgression(symbols), [symbols]);
  const modulations = findModulations(symbols, musicKey);
  // One range for the whole progression, so the voice leading is visible as movement.
  const range = keyboardRange(voicings.filter(Boolean).flatMap((v) => v.midi));

  // Transposing while it plays would leave the old key sounding.
  const stop = audio?.stop;
  const signature = symbols.join(' ');
  useEffect(() => { stop?.(); }, [signature, stop]);

  const playAll = () => {
    if (audio.playing) {
      audio.stop();
      return;
    }
    const items = voicings
      .map((voicing, index) => (voicing ? { midi: voicing.midi, beats: BEATS_PER_CHORD, index } : null))
      .filter(Boolean);
    audio.playProgression(items, { bpm });
  };

  return (
    <div className="card">
      <div className="card-head">
        <h2 style={{ margin: 0 }}>Progression in {keyName(musicKey)}</h2>
        {audio && <PlayButton onClick={playAll} active={audio.playing} label="Play the progression" />}
      </div>

      <div className="grid" style={{ marginTop: '0.75rem' }}>
        {symbols.map((symbol, index) => {
          const entry = entries[index];
          const sounding = audio?.playing && audio.step === index;
          return (
            <div
              className={[
                'bar',
                entry?.group !== undefined ? 'in-group' : '',
                entry ? '' : 'empty',
                sounding ? 'sounding' : '',
              ].filter(Boolean).join(' ')}
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
            playing={audio?.playing && audio.step === index}
            onPlay={audio ? (v) => audio.playChord(v, { arpeggio }) : null}
            note={index > 0
              ? `moves ${voicing.movement} ${voicing.movement === 1 ? 'semitone' : 'semitones'}`
              : null}
          />
        );
      })}
    </div>
  );
}
