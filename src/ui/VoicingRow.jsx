import React from 'react';
import { voicingNoteNames } from '../theory/index.js';
import Keyboard from './Keyboard.jsx';
import PlayButton from './PlayButton.jsx';

/** One voicing: its name, the notes, the keys to press and a play button. */
export default function VoicingRow({
  voicing, title, range, labels = false, note = null, onPlay = null, playing = false,
}) {
  const name = title ?? voicing.label;
  const notes = voicingNoteNames(voicing);
  return (
    <div className="voicing-block">
      <div className="voicing-head">
        <span className="voicing-head-left">
          {onPlay && (
            <PlayButton
              onClick={() => onPlay(voicing)}
              active={playing}
              label={`Play ${name}: ${notes.join(' ')}`}
            />
          )}
          <span className="voicing-name">{name}</span>
        </span>
        <span className="voicing-notes readout">{notes.join(' ')}</span>
      </div>
      <Keyboard
        midi={voicing.midi}
        range={range}
        labels={labels}
        ariaLabel={`${name}: ${notes.join(' ')}`}
      />
      <div className="voicing-degrees">
        {voicing.degrees.join(' · ')}
        {note ? ` · ${note}` : ''}
      </div>
    </div>
  );
}
