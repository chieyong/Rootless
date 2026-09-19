import React from 'react';
import {
  chordNoteNames, formatChord, romanNumeral, voicingNoteNames, voicingsFor,
} from '../theory/index.js';

/** Shows what the engine makes of a single chord symbol. */
export default function ChordCard({ chord, musicKey }) {
  const voicings = voicingsFor(chord);
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
        <div className="voicing" key={voicing.form}>
          <span className="voicing-name">{voicing.label}</span>
          <span>
            <span className="voicing-notes readout">
              {voicingNoteNames(voicing).join(' ')}
            </span>
            <br />
            <span className="voicing-degrees">{voicing.degrees.join(' · ')}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
