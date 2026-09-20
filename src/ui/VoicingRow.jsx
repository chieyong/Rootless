import React, { useId, useState } from 'react';
import { voicingNoteNames } from '../theory/index.js';
import { voicingCopy } from '../content/voicingCopy.js';
import Keyboard from './Keyboard.jsx';
import { keyboardRange } from './keyboardLayout.js';
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
  // Boolean, not a length: `0 && ...` renders a literal 0 in JSX.
  const split = Boolean(voicing.hands?.lh?.length && voicing.hands?.rh?.length);
  // A split voicing spans the best part of three octaves on its own. Sharing
  // a range across a whole tune would push it to four and squeeze the keys
  // below reading size on a phone, so it gets a range of its own. One-handed
  // shapes keep the shared range, which is what makes them comparable.
  const keyRange = split ? keyboardRange(voicing.midi, { snapToOctaves: false }) : range;

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
        range={keyRange}
        labels={labels}
        hands={voicing.hands}
        ariaLabel={`${name}: ${notes.join(' ')}`}
      />
      {split && (
        <p className="hand-legend">
          <span className="swatch lh" aria-hidden="true" /> left hand
          <span className="swatch rh" aria-hidden="true" /> right hand
        </p>
      )}
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
