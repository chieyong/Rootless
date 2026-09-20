import React from 'react';
import { voicingNoteNames } from '../theory/index.js';
import Keyboard from './Keyboard.jsx';

/** One voicing: its name, the notes, the degrees and the keys to press. */
export default function VoicingRow({ voicing, title, range, labels = false, note = null }) {
  return (
    <div className="voicing-block">
      <div className="voicing-head">
        <span className="voicing-name">{title ?? voicing.label}</span>
        <span className="voicing-notes readout">{voicingNoteNames(voicing).join(' ')}</span>
      </div>
      <Keyboard
        midi={voicing.midi}
        range={range}
        labels={labels}
        ariaLabel={`${title ?? voicing.label}: ${voicingNoteNames(voicing).join(' ')}`}
      />
      <div className="voicing-degrees">
        {voicing.degrees.join(' · ')}
        {note ? ` · ${note}` : ''}
      </div>
    </div>
  );
}
