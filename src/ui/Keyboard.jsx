import React, { useId } from 'react';
import { fromMidi, noteName } from '../theory/index.js';
import { keyboardLayout, keyboardRange, octaveOf, pitchClassOf } from './keyboardLayout.js';

export { keyboardRange };

/**
 * A piano with the played notes lit up.
 *
 * `midi`      - the notes to highlight
 * `range`     - { from, to }; defaults to the notes themselves, snapped to octaves
 * `labels`    - show the note name on each highlighted key
 * `markLowest`- draw the bottom note in a deeper shade (the bass of the voicing)
 */
export default function Keyboard({
  midi = [],
  range = null,
  height = 58,
  labels = false,
  markLowest = true,
  ariaLabel = null,
}) {
  const clipId = useId();
  const played = new Set(midi);
  const lowest = midi.length ? Math.min(...midi) : null;
  const { from, to } = range ?? keyboardRange(midi.length ? midi : [60, 71]);

  const whiteWidth = 20;
  const blackWidth = whiteWidth * 0.62;
  const blackHeight = height * 0.62;
  const { white, black, width } = keyboardLayout(from, to, { whiteWidth, blackWidth });

  const fillFor = (note, dark) => {
    if (!played.has(note)) return dark ? 'var(--key-black)' : 'var(--key-white)';
    return markLowest && note === lowest ? 'var(--key-on-low)' : 'var(--key-on)';
  };

  const label = (note) => noteName(fromMidi(note), { withOctave: false });

  return (
    <svg
      className="keyboard"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel ?? `Keyboard, ${midi.map((m) => noteName(fromMidi(m))).join(' ')}`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={width} height={height} rx="3" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {white.map(({ midi: note, x }) => (
          <rect
            key={note}
            x={x}
            y={0}
            width={whiteWidth}
            height={height}
            fill={fillFor(note, false)}
            stroke="var(--key-line)"
            strokeWidth="1"
          />
        ))}
        {white.map(({ midi: note, x }) => {
          const on = played.has(note);
          const isC = pitchClassOf(note) === 0;
          // Every C carries its octave, so you can see where your hand is.
          if (!isC && !(on && labels)) return null;
          return (
            <text
              key={`l${note}`}
              x={x + whiteWidth / 2}
              y={height - 5}
              textAnchor="middle"
              fontSize={isC ? 8 : 9}
              fill={on ? 'var(--key-label-on)' : 'var(--key-label-off)'}
            >
              {isC ? `C${octaveOf(note)}` : label(note)}
            </text>
          );
        })}
        {black.map(({ midi: note, x }) => (
          <rect
            key={note}
            x={x}
            y={0}
            width={blackWidth}
            height={blackHeight}
            rx="1.5"
            fill={fillFor(note, true)}
            stroke="var(--key-line)"
            strokeWidth="0.75"
          />
        ))}
        {labels && black.filter(({ midi: note }) => played.has(note)).map(({ midi: note, x }) => (
          <text
            key={`l${note}`}
            x={x + blackWidth / 2}
            y={blackHeight - 4}
            textAnchor="middle"
            fontSize="8"
            fill="var(--key-label-on)"
          >
            {label(note)}
          </text>
        ))}
      </g>
    </svg>
  );
}
