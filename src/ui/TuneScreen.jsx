import React, { useMemo, useState } from 'react';
import { COMMON_KEYS, keyName, parseKey } from '../theory/index.js';
import { analyzeTune, transposeTune, tuneBars, tuneKey } from '../tunes/tune.js';
import usePlayer, { voiceTune } from '../audio/usePlayer.js';
import useStored from '../storage/useStored.js';
import AudioHint from './AudioHint.jsx';
import LeadSheet from './LeadSheet.jsx';
import VoicingRow from './VoicingRow.jsx';
import { keyboardRange } from './keyboardLayout.js';

/**
 * Shell comes first, and is the default: root, third and seventh are what a
 * beginner should learn. Rootless voicings assume a bass player.
 * The first entry is also the fallback for an unreadable stored preference.
 */
const VOICING_SETS = [
  { id: 'shell', label: 'Shell', forms: ['shell-1-3-7', 'shell-1-7-3'] },
  { id: 'rootless', label: 'Rootless', forms: ['rootless-A', 'rootless-B'] },
];

/** One tune: the chart, the sound and the way into the quiz. */
export default function TuneScreen({ tune: original, onBack, onQuiz }) {
  const [mode, setMode] = useStored('sheet:mode', 'symbols');
  const [voicingSet, setVoicingSet] = useStored('sheet:voicings', 'shell');
  const [bpm, setBpm] = useStored('player:bpm', 120);
  const [loop, setLoop] = useStored('player:loop', false);
  const [keyIndex, setKeyIndex] = useState(null);
  const [selectedBar, setSelectedBar] = useState(null);

  const forms = (VOICING_SETS.find((s) => s.id === voicingSet) ?? VOICING_SETS[0]).forms;

  const tune = useMemo(() => {
    if (keyIndex === null) return original;
    const target = COMMON_KEYS[keyIndex];
    const mode2 = tuneKey(original).mode;
    return transposeTune(original, mode2 === 'minor' ? `${target}m` : target);
  }, [original, keyIndex]);

  const player = usePlayer(tune, { forms, bpm, loop });
  const voiced = useMemo(() => voiceTune(tune, forms), [tune, forms]);
  const { groups } = useMemo(() => analyzeTune(tune), [tune]);

  const bars = tuneBars(tune);
  const selected = bars.find((bar) => bar.barNumber === selectedBar) ?? null;
  const selectedVoicings = selected
    ? selected.slots.map((slot) => voiced[slot.index]).filter((v) => v?.voicing)
    : [];
  const range = useMemo(
    () => keyboardRange(voiced.filter((v) => v.voicing).flatMap((v) => v.voicing.midi)),
    [voiced],
  );

  const selectBar = (barNumber) => {
    setSelectedBar(barNumber === selectedBar ? null : barNumber);
    if (barNumber !== selectedBar) {
      const bar = bars.find((b) => b.barNumber === barNumber);
      const first = bar?.slots[0] && voiced[bar.slots[0].index]?.voicing;
      if (first) player.playChord(first);
    }
  };

  return (
    <main>
      <button type="button" className="back" onClick={onBack}>&larr; Tunes</button>

      <h1>{tune.title}</h1>
      <p className="tagline">
        {tune.composer} &middot; {keyName(parseKey(tune.key))} &middot; {tune.form.join('')} &middot; {bars.length} bars
      </p>
      {!tune.verified && (
        <p><span className="unverified">unverified changes</span></p>
      )}

      <div className="card">
        <div className="transport">
          <button
            type="button"
            className="button primary"
            onClick={() => (player.playing ? player.stop() : player.play())}
          >
            {player.playing ? 'Stop' : player.state === 'starting' ? 'Loading…' : 'Play'}
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={loop}
            onClick={() => setLoop(!loop)}
          >
            Loop
          </button>
          {VOICING_SETS.map((set) => (
            <button
              type="button"
              className="chip"
              key={set.id}
              aria-pressed={set.id === voicingSet}
              onClick={() => setVoicingSet(set.id)}
            >
              {set.label}
            </button>
          ))}
        </div>
        <p className="voicing-guidance">
          Shell first: 1-3-7 is enough to play a whole tune. Rootless comes
          later, when there is a bass player.
        </p>

        <div className="tempo">
          <input
            type="range"
            min="50"
            max="260"
            step="2"
            value={bpm}
            onChange={(event) => setBpm(Number(event.target.value))}
            aria-label="Tempo"
          />
          <span className="tempo-value">{bpm} bpm</span>
        </div>

        <AudioHint state={player.state} />
      </div>

      <div className="card">
        <div className="chips" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="chip"
            aria-pressed={mode === 'symbols'}
            onClick={() => setMode('symbols')}
          >
            Symbols
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={mode === 'roman'}
            onClick={() => setMode('roman')}
          >
            Degrees
          </button>
        </div>
        <span className="label" style={{ marginTop: '0.875rem' }}>Key</span>
        <div className="chips" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="chip small"
            aria-pressed={keyIndex === null}
            onClick={() => setKeyIndex(null)}
          >
            {original.key}
          </button>
          {COMMON_KEYS.map((name, index) => (
            <button
              type="button"
              className="chip small"
              key={name}
              aria-pressed={index === keyIndex}
              onClick={() => setKeyIndex(index === keyIndex ? null : index)}
            >
              {name}{tuneKey(original).mode === 'minor' ? 'm' : ''}
            </button>
          ))}
        </div>

        <LeadSheet
          tune={tune}
          mode={mode}
          selectedBar={selectedBar}
          playingBar={player.playingBar}
          onSelectBar={selectBar}
        />
      </div>

      {selected && (
        <div className="card">
          <h2>Bar {selected.barNumber} &middot; {selected.sectionLabel}</h2>
          {selectedVoicings.map(({ slot, voicing }) => (
            <VoicingRow
              key={slot.index}
              voicing={voicing}
              range={range}
              title={`${slot.symbol} ${voicing.form.replace('rootless-', '').replace('shell-', '')}`}
              labels
              onPlay={(v) => player.playChord(v)}
            />
          ))}
          <button
            type="button"
            className="button"
            style={{ marginTop: '0.75rem' }}
            onClick={() => selectedVoicings[0] && player.playChord(selectedVoicings[0].voicing)}
          >
            Play again
          </button>
        </div>
      )}

      <div className="card">
        <h2>What the engine hears</h2>
        <ul className="group-list">
          {groups.map((group) => (
            <li key={`${group.kind}-${group.fromBar}`}>
              bars {group.fromBar}&ndash;{group.toBar}: {group.label}
            </li>
          ))}
        </ul>
        {tune.notes && <p className="tune-notes">{tune.notes}</p>}
      </div>

      <button type="button" className="button primary wide" onClick={() => onQuiz(original.id)}>
        Practise this tune
      </button>
    </main>
  );
}
