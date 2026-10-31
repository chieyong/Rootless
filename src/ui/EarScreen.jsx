import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EAR_BLOCKS, getLevel, levelsInBlock } from '../ear/levels.js';
import { generateEarRound } from '../ear/generators.js';
import { makeRng } from '../quiz/rng.js';
import useAudio from '../audio/useAudio.js';
import useStored from '../storage/useStored.js';
import AudioHint from './AudioHint.jsx';
import PlayButton from './PlayButton.jsx';

const ROUND_LENGTH = 10;

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

  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState(null);
  const [score, setScore] = useState(0);
  const played = useRef(null);

  const level = getLevel(levelId);
  const [blockId, setBlockId] = useState(level.block);
  const block = EAR_BLOCKS.find((b) => b.id === blockId) ?? EAR_BLOCKS[0];
  const settings = useMemo(() => ({
    ...(playOverride === 'level' ? {} : { play: playOverride }),
    ...(rootsOverride === 'level' ? {} : { roots: rootsOverride }),
  }), [playOverride, rootsOverride]);

  const round = useMemo(
    () => generateEarRound(level, makeRng(seed), { count: ROUND_LENGTH, settings }),
    [level, seed, settings],
  );

  const question = round[index];
  const done = index >= round.length;
  const answered = given !== null;

  const hear = () => question && audio.playPlan(question.playback, {
    arpeggio: question.play === 'arpeggio',
  });

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
    setGiven(option);
    if (option === question.answer) setScore((s) => s + 1);
  };

  const next = () => {
    setGiven(null);
    setIndex((i) => i + 1);
  };

  const restart = (nextLevelId = levelId) => {
    if (nextLevelId !== levelId) setLevelId(nextLevelId);
    setSeed(Math.floor(Math.random() * 1e9));
    setIndex(0);
    setGiven(null);
    setScore(0);
    played.current = null;
  };

  // Remember the best score per level.
  useEffect(() => {
    if (!done) return;
    setBest((current) => (score > (current[levelId] ?? -1)
      ? { ...current, [levelId]: score } : current));
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
                <span className="chip-score"> {best[item.id]}/{ROUND_LENGTH}</span>
              )}
            </button>
          ))}
        </div>
        <p className="level-name">{level.label}</p>
        <p className="voicing-guidance">{level.description}</p>

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
          <p className="question">{score} of {round.length} right.</p>
          <button type="button" className="button primary wide" onClick={() => restart()}>
            Another round
          </button>
        </div>
      ) : (
        <div className="card">
          <p className="tagline" style={{ margin: 0 }}>
            Question {index + 1} of {round.length} &middot; {score} right so far
          </p>
          <p className="question">{question.prompt}</p>

          <div className="hear-row">
            <PlayButton onClick={hear} size="large" label="Play the chord again" />
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
              <button type="button" className="button primary wide" onClick={next}>
                {index === round.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
