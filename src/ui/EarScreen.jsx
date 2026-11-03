import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EAR_BLOCKS, getLevel, levelsInBlock } from '../ear/levels.js';
import { concatPlayback, generateEarRound, levelOptions } from '../ear/generators.js';
import { makeRng } from '../quiz/rng.js';
import useAudio from '../audio/useAudio.js';
import useStored from '../storage/useStored.js';
import { dueKeys, recordAnswer } from '../progress/store.js';
import {
  DEFAULT_ROUND, getRoundMode, questionsToPrepare, roundIsOver, roundProgress, roundRemaining,
  ROUND_MODES,
} from '../progress/round.js';
import AudioHint from './AudioHint.jsx';
import PlayButton from './PlayButton.jsx';

/**
 * Ear training: hear a chord, name what it is.
 *
 * The question carries its own playback plan, so this screen only has to
 * decide when to sound it. iOS needs a tap before any audio, so the first
 * question waits for one; after that each new question plays by itself.
 */
export default function EarScreen() {
  const audio = useAudio();
  const [levelId, setLevelId] = useStored('ear:level', 'A1');
  const [best, setBest] = useStored('ear:best', {});
  const [playOverride, setPlayOverride] = useStored('ear:play', 'level');
  const [rootsOverride, setRootsOverride] = useStored('ear:roots', 'level');

  const [roundId, setRoundId] = useStored('round:mode', DEFAULT_ROUND);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState(null);
  const [score, setScore] = useState(0);
  const played = useRef(null);
  const mode = getRoundMode(roundId);

  const level = getLevel(levelId);
  const [blockId, setBlockId] = useState(level.block);
  const block = EAR_BLOCKS.find((b) => b.id === blockId) ?? EAR_BLOCKS[0];
  const settings = useMemo(() => ({
    ...(playOverride === 'level' ? {} : { play: playOverride }),
    ...(rootsOverride === 'level' ? {} : { roots: rootsOverride }),
  }), [playOverride, rootsOverride]);

  // Lean the round on what is weak or due, while still offering every option.
  const focused = useMemo(() => {
    const options = levelOptions(level);
    const order = dueKeys(options.map((o) => o.key));
    const half = Math.max(2, Math.ceil(options.length / 2));
    const wanted = new Set(order.slice(0, half));
    return { ...level, focus: options.filter((o) => wanted.has(o.key)).map((o) => o.option) };
    // Recomputed per round, not per question, so a round keeps its shape.
  }, [level, seed]);

  const round = useMemo(
    () => generateEarRound(focused, makeRng(seed), {
      count: questionsToPrepare(mode), settings,
    }),
    [focused, seed, settings, mode],
  );

  const question = round[index];
  const done = index >= round.length
    || roundIsOver(mode, { answered: index, startedAt, now: Date.now() });
  const answered = given !== null;

  /** Sounds a plan: the question itself by default, or any one candidate. */
  const hear = (plan) => question && audio.playPlan(plan ?? question.playback, {
    arpeggio: question.play === 'arpeggio',
  });

  /** Every candidate in a row, so they can be compared directly. */
  const hearAll = () => question
    && hear(concatPlayback(question.compare.map((item) => item.playback)));

  // Sound each new question once the engine is up. The very first one waits
  // for a tap, because iOS will not start audio without one.
  useEffect(() => {
    if (!question || !audio.ready) return;
    if (played.current === question.id) return;
    played.current = question.id;
    audio.playPlan(question.playback, { arpeggio: question.play === 'arpeggio' });
  }, [question, audio.ready]);

  const answer = (option) => {
    if (answered || !question) return;
    const right = option === question.answer;
    setGiven(option);
    if (right) setScore((s) => s + 1);
    recordAnswer(question.itemKey, right);
  };

  const next = () => {
    setGiven(null);
    setIndex((i) => i + 1);
  };

  const restart = (nextLevelId = levelId) => {
    if (nextLevelId !== levelId) setLevelId(nextLevelId);
    setSeed(Math.floor(Math.random() * 1e9));
    setStartedAt(Date.now());
    setIndex(0);
    setGiven(null);
    setScore(0);
    played.current = null;
  };

  // Remember the best accuracy per level, as a percentage: rounds are no
  // longer all the same length, so a raw score cannot be compared.
  useEffect(() => {
    if (!done || index === 0) return;
    const pct = Math.round((score / index) * 100);
    setBest((current) => (pct > (current[levelId] ?? -1)
      ? { ...current, [levelId]: pct } : current));
  }, [done]);

  return (
    <main>
      <h1>Ear</h1>
      <p className="tagline">Hear it first, name it second</p>

      <div className="card">
        <h2>What to practise</h2>
        <div className="chips" style={{ marginTop: 0 }}>
          {EAR_BLOCKS.map((item) => (
            <button
              type="button"
              className="chip"
              key={item.id}
              aria-pressed={item.id === blockId}
              onClick={() => setBlockId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <span className="label" style={{ marginTop: '0.875rem' }}>{block.description}</span>
        <div className="chips" style={{ marginTop: 0 }}>
          {levelsInBlock(blockId).map((item) => (
            <button
              type="button"
              className="chip small"
              key={item.id}
              aria-pressed={item.id === levelId}
              onClick={() => restart(item.id)}
            >
              {item.id}
              {best[item.id] !== undefined && (
                <span className="chip-score"> {best[item.id]}%</span>
              )}
            </button>
          ))}
        </div>
        <p className="level-name">{level.label}</p>
        <p className="voicing-guidance">{level.description}</p>

        <span className="label" style={{ marginTop: '0.875rem' }}>Round</span>
        <div className="chips" style={{ marginTop: 0 }}>
          {ROUND_MODES.map((item) => (
            <button
              type="button"
              className="chip small"
              key={item.id}
              aria-pressed={item.id === roundId}
              onClick={() => { setRoundId(item.id); restart(); }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <span className="label" style={{ marginTop: '0.875rem' }}>How it sounds</span>
        <div className="chips" style={{ marginTop: 0 }}>
          {[['level', 'As the level'], ['block', 'Block'], ['arpeggio', 'Arpeggio']].map(([id, label]) => (
            <button
              type="button"
              className="chip small"
              key={id}
              aria-pressed={playOverride === id}
              onClick={() => setPlayOverride(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {/* A comparison always uses two different roots, so the key setting
            has nothing to do there. */}
        {level.format !== 'same-different' && (
          <>
            <span className="label" style={{ marginTop: '0.75rem' }}>Key</span>
            <div className="chips" style={{ marginTop: 0 }}>
              {[['level', 'As the level'], ['fixed', 'Always C'], ['random', 'Any key']].map(([id, label]) => (
                <button
                  type="button"
                  className="chip small"
                  key={id}
                  aria-pressed={rootsOverride === id}
                  onClick={() => setRootsOverride(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
        <AudioHint state={audio.state} />
      </div>

      {done ? (
        <div className="card">
          <h2>Round done</h2>
          <p className="question">{score} of {index} right.</p>
          <button type="button" className="button primary wide" onClick={() => restart()}>
            Another round
          </button>
        </div>
      ) : (
        <div className="card">
          <p className="tagline" style={{ margin: 0 }}>
            {roundRemaining(mode, { answered: index, startedAt })} &middot; {score} right so far
          </p>
          <div
            className="round-bar"
            role="progressbar"
            aria-valuenow={Math.round(roundProgress(mode, { answered: index, startedAt }) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${roundProgress(mode, { answered: index, startedAt }) * 100}%` }} />
          </div>
          <p className="question">{question.prompt}</p>

          <div className="hear-row">
            <PlayButton onClick={() => hear()} size="large" label="Play the chord again" />
            <span className="dim">
              {audio.ready ? 'Play again' : 'Tap to start the sound'}
            </span>
          </div>

          <div className="options">
            {question.options.map((option) => {
              const isAnswer = option === question.answer;
              const chosen = given === option;
              const classes = [
                'option',
                answered && isAnswer ? 'right' : '',
                answered && chosen && !isAnswer ? 'wrong' : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  type="button"
                  className={classes}
                  key={option}
                  onClick={() => answer(option)}
                  disabled={answered}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="verdict">
              <p className={given === question.answer ? 'right-text' : 'wrong-text'}>
                {given === question.answer ? 'Right.' : `Not quite — it was ${question.answer}.`}
              </p>
              <p className="reveal readout">{question.reveal}</p>
              <p className="explanation">{question.explanation}</p>

              <div className="compare">
                <div className="compare-head">
                  <span className="label" style={{ margin: 0 }}>
                    {question.format === 'same-different' ? 'Hear them again' : 'Hear them all'}
                  </span>
                  <button type="button" className="chip small" onClick={hearAll}>
                    Play all
                  </button>
                </div>
                {question.compare.map((item) => (
                  <button
                    type="button"
                    className={`compare-item${item.isAnswer ? ' is-answer' : ''}`}
                    key={item.id}
                    onClick={() => hear(item.playback)}
                  >
                    {/* A glyph, not a nested button: the whole row is the
                        tap target, which is easier to hit on a phone. */}
                    <span className="play-glyph" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M9 6.5 18 12l-9 5.5z" fill="currentColor" />
                      </svg>
                    </span>
                    <span className="compare-label">{item.label}</span>
                    <span className="compare-detail readout">{item.detail}</span>
                  </button>
                ))}
              </div>

              <button type="button" className="button primary wide" onClick={next}>
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
