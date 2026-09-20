import React, { useState } from 'react';
import { TUNES, getTune } from './tunes/index.js';
import QuizScreen from './ui/QuizScreen.jsx';
import TheoryLab from './ui/TheoryLab.jsx';
import TuneScreen from './ui/TuneScreen.jsx';
import { barCount } from './tunes/tune.js';

function TuneList({ onOpen }) {
  return (
    <main>
      <h1>Rootless</h1>
      <p className="tagline">Jazz changes, away from the piano</p>
      {TUNES.map((tune) => (
        <button type="button" className="tune-item" key={tune.id} onClick={() => onOpen(tune.id)}>
          <h3>{tune.title}</h3>
          <p>
            {tune.key} &middot; {tune.form.join('')} &middot; {barCount(tune)} bars
            {tune.verified ? '' : ' · unverified'}
          </p>
        </button>
      ))}
      <p className="tune-notes">
        The changes are written from the versions most commonly played and are
        marked unverified until you have checked them. Each tune lists the bars
        that differ between charts.
      </p>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState({ name: 'tunes' });

  const body = (() => {
    switch (screen.name) {
      case 'tune':
        return (
          <TuneScreen
            tune={getTune(screen.id)}
            onBack={() => setScreen({ name: 'tunes' })}
            onQuiz={(id) => setScreen({ name: 'quiz', id })}
          />
        );
      case 'quiz':
        return (
          <QuizScreen
            tune={getTune(screen.id)}
            onBack={() => setScreen({ name: 'tune', id: screen.id })}
          />
        );
      case 'lab':
        return <TheoryLab />;
      default:
        return <TuneList onOpen={(id) => setScreen({ name: 'tune', id })} />;
    }
  })();

  const tab = screen.name === 'lab' ? 'lab' : 'tunes';

  return (
    <>
      {body}
      <nav className="tabbar">
        <button
          type="button"
          className="tab"
          aria-current={tab === 'tunes' ? 'page' : undefined}
          onClick={() => setScreen({ name: 'tunes' })}
        >
          Tunes
        </button>
        <button
          type="button"
          className="tab"
          aria-current={tab === 'lab' ? 'page' : undefined}
          onClick={() => setScreen({ name: 'lab' })}
        >
          Lab
        </button>
      </nav>
    </>
  );
}
