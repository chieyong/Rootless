import React, { useMemo, useState } from 'react';
import { answersMatch, generateRound, QUESTION_TYPES } from '../quiz/generators.js';
import { makeRng } from '../quiz/rng.js';
import useStored from '../storage/useStored.js';
import ChordBuilder from './ChordBuilder.jsx';
import LeadSheet from './LeadSheet.jsx';

const ROUND_LENGTH = 5;

/** A short round of questions on one tune. */
export default function QuizScreen({ tune, onBack }) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState(null);
  const [score, setScore] = useState(0);
  const [input, setInput] = useStored('quiz:input', 'choice');

  const round = useMemo(
    () => generateRound(tune, makeRng(seed), { count: ROUND_LENGTH, types: QUESTION_TYPES }),
    [tune, seed],
  );

  const question = round[index];
  const done = index >= round.length;
  const answered = given !== null;
  const correct = answered && answersMatch(given, question.answer);
  // Building a chord only makes sense when the answer is a single chord.
  const canBuild = question && (question.type === 'chord-at-bar' || question.type === 'fill-blank');

  const answer = (value) => {
    if (answered) return;
    setGiven(value);
    if (answersMatch(value, question.answer)) setScore((s) => s + 1);
  };

  const next = () => {
    setGiven(null);
    setIndex((i) => i + 1);
  };

  const restart = () => {
    setSeed(Math.floor(Math.random() * 1e9));
    setIndex(0);
    setGiven(null);
    setScore(0);
  };

  if (done) {
    return (
      <main>
        <button type="button" className="back" onClick={onBack}>&larr; {tune.title}</button>
        <h1>Round done</h1>
        <p className="tagline">{score} of {round.length} right.</p>
        <button type="button" className="button primary wide" onClick={restart}>Another round</button>
        <button type="button" className="button wide" onClick={onBack}>Back to the tune</button>
      </main>
    );
  }

  return (
    <main>
      <button type="button" className="back" onClick={onBack}>&larr; {tune.title}</button>
      <h1>Practise</h1>
      <p className="tagline">
        Question {index + 1} of {round.length} &middot; {score} right so far
      </p>

      <div className="card">
        <p className="question">{question.prompt}</p>
        {question.passage && <p className="passage readout">{question.passage}</p>}

        {question.showSheet && (
          <LeadSheet
            tune={tune}
            mode="symbols"
            blankBars={answered ? [] : question.blankBars ?? []}
            highlightBars={question.highlightBars ?? []}
          />
        )}

        {canBuild && (
          <div className="chips">
            <button
              type="button"
              className="chip small"
              aria-pressed={input === 'choice'}
              onClick={() => setInput('choice')}
            >
              Multiple choice
            </button>
            <button
              type="button"
              className="chip small"
              aria-pressed={input === 'build'}
              onClick={() => setInput('build')}
            >
              Build the chord
            </button>
          </div>
        )}

        {canBuild && input === 'build' && !answered
          ? <div style={{ marginTop: '0.75rem' }}><ChordBuilder onAnswer={answer} /></div>
          : (
            <div className="options">
              {question.options.map((option) => {
                const isAnswer = answersMatch(option, question.answer);
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
          )}

        {answered && (
          <div className="verdict">
            <p className={correct ? 'right-text' : 'wrong-text'}>
              {correct ? 'Right.' : `Not quite — it is ${question.answer}.`}
            </p>
            <p className="explanation">{question.explanation}</p>
            <button type="button" className="button primary wide" onClick={next}>
              {index === round.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
