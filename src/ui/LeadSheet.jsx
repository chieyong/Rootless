import React from 'react';
import { analyzeTune, tuneBars } from '../tunes/tune.js';

const BARS_PER_LINE = 4;

/** Short labels for the brackets: they have to fit under two or three bars. */
function bracketLabel(group) {
  const tonic = group.mode === 'minor' ? 'i' : 'I';
  switch (group.kind) {
    case 'ii-V': return 'ii\u2013V';
    case 'ii-V-I': return `ii\u2013V\u2013${tonic}`;
    case 'backdoor-ii-V': return 'backdoor';
    case 'tritone-sub-ii-V': return 'subV';
    case 'tritone-sub-ii-V-I': return `subV\u2013${tonic}`;
    default: return group.kind;
  }
}

/** Splits the bars into lines of four, starting a new line at every section. */
function toLines(bars) {
  const lines = [];
  let current = [];
  for (const bar of bars) {
    if (bar.isSectionStart && current.length) {
      lines.push(current);
      current = [];
    }
    current.push(bar);
    if (current.length === BARS_PER_LINE) {
      lines.push(current);
      current = [];
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

/**
 * The leadsheet grid: four bars to a line, sections labelled, ii-V units
 * marked with a bracket underneath.
 */
export default function LeadSheet({
  tune,
  mode = 'symbols',
  selectedBar = null,
  playingBar = null,
  blankBars = [],
  highlightBars = [],
  onSelectBar = null,
}) {
  const bars = tuneBars(tune);
  const { entries, groups } = analyzeTune(tune);
  const lines = toLines(bars);

  // Slots carry their own index: the bars and the analysis come from separate
  // calls, so the objects are never identical and indexOf would always miss.
  const romanFor = (slot) => entries[slot.index]?.roman ?? slot.symbol;

  return (
    <div className="leadsheet">
      {lines.map((line) => {
        const first = line[0];
        const lineStart = first.barNumber;
        const lineEnd = line.at(-1).barNumber;
        // Groups clipped to this line, stacked into lanes so that two
        // overlapping ii-Vs never draw on top of each other.
        const lanes = [];
        for (const group of groups) {
          const from = Math.max(group.fromBar, lineStart);
          const to = Math.min(group.toBar, lineEnd);
          if (from > to || group.toBar < lineStart || group.fromBar > lineEnd) continue;
          const clipped = { ...group, from, to };
          const lane = lanes.find((row) => row.every((other) => other.to < from || other.from > to));
          if (lane) lane.push(clipped);
          else lanes.push([clipped]);
        }

        return (
          <div className="leadsheet-line" key={first.barNumber}>
            {first.isSectionStart && (
              <div className="section-label">{first.sectionLabel}</div>
            )}
            <div className="bar-row">
              {line.map((bar) => {
                const blank = blankBars.includes(bar.barNumber);
                const classes = [
                  'sheet-bar',
                  bar.barNumber === selectedBar ? 'selected' : '',
                  bar.barNumber === playingBar ? 'playing' : '',
                  highlightBars.includes(bar.barNumber) ? 'highlighted' : '',
                  blank ? 'blank' : '',
                ].filter(Boolean).join(' ');
                return (
                  <button
                    type="button"
                    className={classes}
                    key={bar.barNumber}
                    onClick={onSelectBar ? () => onSelectBar(bar.barNumber) : undefined}
                    disabled={!onSelectBar}
                    aria-label={`Bar ${bar.barNumber}: ${bar.slots.map((s) => s.symbol).join(', ')}`}
                  >
                    <span className="bar-number">{bar.barNumber}</span>
                    <span className={`bar-chords${bar.slots.length > 1 ? ' split' : ''}`}>
                      {blank
                        ? <span className="bar-chord">?</span>
                        : bar.slots.map((slot) => (
                          <span className="bar-chord" key={slot.index}>
                            {mode === 'roman' ? romanFor(slot) : slot.symbol}
                          </span>
                        ))}
                    </span>
                  </button>
                );
              })}
              {line.length < BARS_PER_LINE && Array.from({ length: BARS_PER_LINE - line.length })
                .map((_, index) => <span className="sheet-bar filler" key={`f${index}`} />)}
            </div>
            {lanes.map((lane) => (
              <div className="bracket-row" key={`lane-${lane[0].fromBar}-${lane[0].kind}`}>
                {lane.map((group) => (
                  <span
                    className="bracket"
                    key={`${group.kind}-${group.fromBar}`}
                    style={{
                      gridColumn: `${group.from - lineStart + 1} / ${group.to - lineStart + 2}`,
                    }}
                  >
                    <span>{bracketLabel(group)}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
