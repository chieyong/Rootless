# Rootless

A mobile web app (PWA) for learning jazz harmony away from the piano: memorise
the changes of standards, and recognise jazz chords by ear. Built for the
iPhone via "Add to Home Screen".

## Status

**Phase 1 is done: the theory engine.** Phases 2-4 (tunes, ear training,
progress tracking) are still to come.

## Getting started

```bash
npm install
npm run dev     # development server
npm test        # unit tests for the theory engine
npm run build   # production build into dist/
npm run icons   # regenerate the app icons
```

To try it on the iPhone during development, run `npm run dev -- --host` and
open the network URL shown in the terminal.

## Deploying

`netlify.toml` is set up for Netlify: connect the repository and it builds with
`npm run build` and publishes `dist/`. On the phone, open the site in Safari and
use Share -> Add to Home Screen; the app then runs full screen and works offline.

## The theory engine

Everything harmonic lives in `src/theory/` and is independent of React, audio
and storage, so the later modules (ear training, MIDI input, sync) can reuse it.
Every module has unit tests in `src/theory/__tests__/`.

| module | what it does |
| --- | --- |
| `notes.js` | spelling-aware notes: `Bb` stays `Bb`, never `A#` |
| `intervals.js` | interval arithmetic that preserves spelling |
| `chords.js` | chord symbol parser: `maj7 m7 7 m7b5 dim7 7alt 7b9 13 m6 6/9 sus`, slash bass, and the usual shorthand (`C-7`, `CΔ`, `Cø`, `C°7`, `C+`) |
| `keys.js` | keys, key signatures, scales, diatonic chords |
| `analysis.js` | roman numerals, secondary dominants, tritone subs, ii-V detection, modulations |
| `transpose.js` | transposition with the enharmonic spelling of the destination key |
| `voicings.js` | shell (1-3-7, 1-7-3) and rootless A/B voicings in the left-hand register |
| `voiceLeading.js` | picks the voicings with the least movement across a progression |

```js
import { analyzeProgression, voiceLeadProgression, transposeProgression } from './src/theory/index.js';

analyzeProgression(['Cm7', 'F7', 'Bbmaj7'], 'Bb').entries.map((e) => e.roman);
// ['ii7', 'V7', 'Imaj7']

transposeProgression(['Cm7', 'F7', 'Bbmaj7'], 'Bb', 'Eb');
// ['Fm7', 'Bb7', 'Ebmaj7']

voiceLeadProgression(['Dm7', 'G7', 'Cmaj7']).map((v) => v.form);
// ['rootless-A', 'rootless-B', 'rootless-A']
```

### Conventions

- MIDI numbers use scientific pitch notation: C4 = middle C = 60.
- Roman numerals are read against the **major** scale of the key, as jazz
  analysis does it: in C minor, Eb is `bIII` and Bb7 is `bVII7`.
- Chord tones keep their theoretical spelling, so a diminished seventh really
  has a double-flat seventh (`Cdim7` = C Eb Gb Bbb) and `C7#9` has a `B#`.
  `simplifySpelling()` is there for displays that would rather read `A`.

## Roadmap

- **Phase 1 - theory engine** (done)
- **Phase 2 - Changes**: tunes as JSON, lead-sheet grid, playback with Tone.js, quizzes
- **Phase 3 - Ear**: chord quality, voicing type and progression recognition
- **Phase 4 - Progress**: Leitner-style spaced repetition, 5-minute rounds, JSON export/import

Later, outside the current scope: microphone input for bass lines and guide
tone lines, and MIDI input on the MacBook. Input (buttons, microphone, MIDI)
will go through one abstraction layer so these can be added without touching
the rest.
