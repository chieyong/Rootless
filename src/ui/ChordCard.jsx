import React from 'react';
import {
  chordNoteNames, formatChord, romanNumeral, voicingsFor,
} from '../theory/index.js';
import { keyboardRange } from './keyboardLayout.js';
import VoicingRow from './VoicingRow.jsx';

/** Shows what the engine makes of a single chord symbol, and plays it. */
export default function ChordCard({ chord, musicKey, audio, arpeggio = false }) {
  const voicings = voicingsFor(chord);
  // One shared range, so the four shapes can be compared at a glance.
  const range = keyboardRange(voicings.flatMap((v) => v.midi));

  return (
    <div className="card">
      <div className="chord-title">
        <span className="chord-symbol">{formatChord(chord)}</span>
        <span className="badge accent">{chord.type}</span>
        <span className="badge roman">{romanNumeral(chord, musicKey)}</span>
      </div>
      <p className="notes readout">
        {chordNoteNames(chord).join(' · ')}
        {chord.bass ? <span className="dim"> / bass {chord.bass.letter}</span> : null}
      </p>

      <h2 style={{ marginTop: '1.25rem' }}>Voicings</h2>
      {voicings.map((voicing) => (
        <VoicingRow
          key={voicing.form}
          voicing={voicing}
          range={range}
          labels
          onPlay={audio ? (v) => audio.playChord(v, { arpeggio }) : null}
        />
      ))}
    </div>
  );
}
