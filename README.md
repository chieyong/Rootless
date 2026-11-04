# Rootless

A mobile web app (PWA) for learning jazz harmony away from the piano: memorise
the changes of standards, and recognise jazz chords by ear. Built for the
iPhone via "Add to Home Screen".

It is aimed at someone who plays **solo** jazz piano. There is no bass player,
which decides what the app teaches and in what order: shell voicings first,
because root, third and seventh carry a tune on their own; then the two-handed
grip, root in the left hand and a rootless shape in the right. A rootless
voicing on its own states no root, so here it is a right-hand device rather
than a way to comp.

## Status

**Phases 1 and 2 are done:** the theory engine, and the Changes module -
nine standards, a leadsheet you can play, and four kinds of quiz. Phase 3
(ear training) and phase 4 (progress) are still to come.

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

## The Changes module

Nine standards, ordered roughly by how hard the changes are to hold on to:
All Of Me, Blue Bossa, a Bb blues, Autumn Leaves, Take The A Train, There
Will Never Be Another You, Misty, All The Things You Are and Body And Soul.

Open a tune and you get a leadsheet, four bars to a line, with the sections
labelled and every ii-V marked with a bracket underneath. Tap a bar to hear
its voicing and see it on the keyboard; press play to hear the whole tune at
your own tempo, following the bar that is sounding. Switch the grid between
chord symbols and degrees, and transpose the whole tune to any of the twelve
keys. "Practise this tune" gives a five-question round.

| module | what it does |
| --- | --- |
| `tunes/data/*.json` | the changes: key, form, sections, bars (one or two chords each) |
| `tunes/tune.js` | flattens the form into bars and slots, analyses, transposes, validates |
| `audio/engine.js` | Tone.js, loaded lazily on the first tap; piano samples with a synth fallback |
| `audio/usePlayer.js` | plays a tune and reports which bar is sounding |
| `quiz/generators.js` | the four question types as pure functions |
| `storage/local.js` | the one place that touches localStorage |

### The changes are unverified

Every tune ships with `verified: false` and says so in the app. The changes are
written from the versions most commonly played, and each tune's `notes` field
lists the bars that differ between charts - exactly the ones worth checking
first. Only chord changes are stored: no melodies, no lyrics.

### The four quiz types

1. **What is bar X?** - from memory, without the chart.
2. **Fill the empty bar** - the same question with the chart in front of you.
3. **Transpose this passage** - two bars into another key.
4. **Where does it modulate?** - which key a ii-V is heading for.

The first two can be answered by multiple choice or by building the chord from
a root and a quality. Answers are compared by sound, not spelling, so `C-7`
and `Cm7` both count.

## The Ear module

Fifteen levels in three blocks: what the chord is, how it is laid out under
the hands, and what the chords are doing together.

| block | levels | from | to |
| --- | --- | --- | --- |
| Quality | A1-A8 | same or different, maj7 against m7 | four dominants against each other |
| Voicing | B1-B4 | one hand or two | all four shapes at once |
| Progression | C1-C3 | major or minor ii-V | tritone sub and backdoor in the mix |
| Tune | two per tune | the qualities that tune uses | its own chords, in its own key |

The Tune block builds its levels from whichever tune is chosen, so practising
Take The A Train drills maj7, 7 and m7 and nothing else, while All The Things
You Are brings in dim7 and 7alt.

Its second level asks **which chord**, not which bar. Which bar cannot be
asked: in Take The A Train not one chord appears in a single bar, and in most
of the others only two or three do, so nearly every question would have
several right answers. Naming the chord trains the same ear, and the answer
says which bars it turns up in.

A level is a point in seven dimensions rather than a rung on a ladder - how
many options, a fixed or a random root, with or without a reference tone,
rolled or struck, which voicing - so a hard pair can be made easier by turning
one knob instead of dropping a level.

| module | what it does |
| --- | --- |
| `ear/levels.js` | the ladder, as data, in three blocks |
| `ear/progressions.js` | the progressions, written in C and transposed from there |
| `ear/generators.js` | questions, each carrying its own playback plan |
| `content/qualityCopy.js` | what each quality sounds like, for the feedback |

### Hearing the answers back

After an answer, right or wrong, every candidate can be played: all six
qualities on the same root, all four voicings of the same chord, all four
progressions on the same tonic. Hearing them one after another is where a
wrong answer teaches you something, so the comparison is built into the
question rather than left to the screen - and the candidates deliberately
share a root, so the only thing that differs is the thing being asked about.

Same-or-different offers the two chords again instead, since "Same" cannot
be played.

### Why the voicing matters

Two facts decide which voicing a question is played with, and a test enforces
both:

- A **rootless** voicing cannot be identified at all. The rootless A form of
  Cmaj7 is E G B D, which is an Em7 - same four notes. Without a root the
  question has two correct answers.
- A **shell** voicing has no fifth, so it cannot tell m7 from m7b5, dim7 from
  m6, or 7 from 7alt.

So the early levels use the shell, where only the third and seventh are in
question, and everything from the half-diminished onwards uses the solo grip,
which states the root in the left hand and the colour in the right.

`ear.test.js` fails any level with two options that sound alike, in whichever
terms that level works: qualities that share a sounded pitch-class set, voicing
forms that land on the same notes, or progressions that share a shape. That
last one is transposition-invariant, so a ii-V-I cannot be confused with a
tritone sub just because they were asked in different keys.

## Progress

Every answer, in the tune quiz and the ear exercises alike, is recorded
against an **item**: the thing being learned, rather than the question, which
is generated at random and never repeats. Naming bar 7 of Autumn Leaves and
filling it into the grid are one item; hearing a m7b5 in level A5 and
comparing it in A6 are another. Items live in a five-box Leitner system -
right moves an item up a box and out of the way for longer, wrong drops it
straight back to box one, whatever height it had reached.

| module | what it does |
| --- | --- |
| `progress/leitner.js` | the boxes: grading, due dates, strength, practice order |
| `progress/store.js` | load, save, record, export, import, all through `storage/local.js` |
| `progress/round.js` | how long a round lasts |

A round defaults to **five minutes** - the session you will actually do on a
train - and ends on the clock, checked when you answer, so nothing counts
down while you are still listening. Ten and twenty question rounds are there
for when you want a fixed length.

Rounds lean on what is weak or due: the answer is drawn from the half of the
level's options that most need the work, while the options on screen stay the
full set. Narrowing those would turn a six-way question into a three-way one
and flatter the score.

### Keeping it

The Progress tab shows what is strong, due and weak per tune and per chord
type, and exports everything as a JSON file. On iOS that lands in Files, from
where it can go to AirDrop or a mail to yourself. Import merges by default and
keeps whichever side was practised more recently, so restoring an old backup
onto a phone you have since used does not throw away the newer work.

An imported file is data off a disk, not something to trust: every field is
checked and clamped on the way in, and an item cannot claim to have been
answered correctly more often than it was asked.

`navigator.storage.persist()` is requested once at first start. Without it iOS
clears site data after about a week of not opening the app.

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
| `voicings.js` | shell (1-3-7, 1-7-3), rootless A/B, and the two-handed solo grip; where each sits is register data, not code |
| `voiceLeading.js` | picks the voicings with the least movement across a progression; between two split voicings it compares right hands only |

### The voicing forms

| form | what it is |
| --- | --- |
| `shell-1-3-7` | root, third, seventh - the left-hand shape to learn first |
| `shell-1-7-3` | the same notes, seventh under the third; alternate the two through a ii-V and the hand barely moves |
| `rootless-A` | 3-5-7-9 (3-13-b7-9 on a dominant), no root - a right-hand shape when you play solo |
| `rootless-B` | the A shape with its two lowest notes an octave up |
| `solo-root-rootless` | the everyday solo grip: the root alone in the left hand, the rootless A shape in the right, around F4. The hands are placed together so the gap between them stays between 7 and 19 semitones - closer sounds muddy down there, wider leaves a hole. On a m7b5 or dim7 the right hand takes the tension instead of the root the left hand is already playing. |

Every voicing has a play button, in the Lab and on a tune alike, and a
progression can be played as a whole to hear the voice leading. The Lab
chooses between block chords and arpeggios and sets its own tempo.

The screen draws every voicing on a piano keyboard with the played keys lit up.
Within a card all keyboards share one range, so shell and rootless shapes can be
compared directly, and the voice leading through a progression is visible as
movement. The geometry lives in `src/ui/keyboardLayout.js` and is unit tested
too.

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
- Voicings carry `hands: { lh, rh }`. `midi` stays a flat ascending array
  equal to both hands together, so anything that only wants notes can ignore
  the split.
- Where a voicing sits is a register: a map from form id to a placement rule,
  passed in rather than read from module scope. `SOLO_REGISTER` is the only
  one today; a band register can be passed to `buildVoicing`,
  `voicingCandidates` and `voiceLeadProgression` without changing them.
- Roman numerals are read against the **major** scale of the key, as jazz
  analysis does it: in C minor, Eb is `bIII` and Bb7 is `bVII7`.
- Chord tones keep their theoretical spelling, so a diminished seventh really
  has a double-flat seventh (`Cdim7` = C Eb Gb Bbb) and `C7#9` has a `B#`.
  `simplifySpelling()` is there for displays that would rather read `A`.

## Roadmap

- **Phase 1 - theory engine** (done)
- **Phase 2 - Changes**: tunes as JSON, lead-sheet grid, playback with Tone.js, quizzes
- **Phase 3 - Ear** (done)
- **Phase 4 - Progress** (done)

Later, outside the current scope: microphone input for bass lines and guide
tone lines, and MIDI input on the MacBook. Input (buttons, microphone, MIDI)
will go through one abstraction layer so these can be added without touching
the rest.
