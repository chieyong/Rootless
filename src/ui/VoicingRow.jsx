import React, { useId, useState } from 'react';
import { voicingNoteNames } from '../theory/index.js';
import { voicingCopy } from '../content/voicingCopy.js';
import Keyboard from './Keyboard.jsx';
import PlayButton from './PlayButton.jsx';

/**
 * One voicing: its name, the notes, the keys to press and a play button.
 *
 * With `explain` the row also carries a line saying what this voicing is,
 * and the name becomes a button that reveals the longer answer. A native
 * <details> cannot do this: the control sits in the head row and the text
 * belongs at the bottom, under the degrees.
 *
 * Pass explain={false} wherever the copy would give something away, such as
 * a voicing shown during a quiz question.
 */
export default function VoicingRow({
  voicing, title, range, labels = false, note = null, onPlay = null, playing = false,
  explain = true,
}) {
  const [open, setOpen] = useState(false);
  const copyId = useId();
  const name = title ?? voicing.label;
  const notes = voicingNoteNames(voicing);
  const copy = explain ? voicingCopy(voicing.form) : null;

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
          {copy ? (
            <button
              type="button"
              className="voicing-name as-toggle"
              aria-expanded={open}
              aria-controls={copyId}
              onClick={() => setOpen((value) => !value)}
            >
              {name}
              <span className={`caret${open ? ' open' : ''}`} aria-hidden="true" />
            </button>
          ) : (
            <span className="voicing-name">{name}</span>
          )}
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
      {copy && (
        <div className="voicing-copy" id={copyId}>
          <p className="voicing-short">{copy.short}</p>
          {open && <p className="voicing-why">{copy.why}</p>}
        </div>
      )}
    </div>
  );
}
