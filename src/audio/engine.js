/**
 * The sound.
 *
 * Tone.js is imported lazily, on the first tap, for two reasons: it keeps it
 * out of the first paint, and iOS only lets an audio context start inside a
 * user gesture. Nothing here runs before the user asks for sound.
 *
 * The piano is the Salamander sample set, one sample every tritone, so
 * Tone.Sampler never has to shift a note more than three semitones. If the
 * samples cannot be fetched (offline on a first visit), it falls back to a
 * synth so the app still makes a sound.
 */

const SAMPLE_BASE = 'https://tonejs.github.io/audio/salamander/';

/** One sample per tritone over the range the voicings use. */
const SAMPLES = {
  C2: 'C2.mp3',
  'F#2': 'Fs2.mp3',
  C3: 'C3.mp3',
  'F#3': 'Fs3.mp3',
  C4: 'C4.mp3',
  'F#4': 'Fs4.mp3',
  C5: 'C5.mp3',
  'F#5': 'Fs5.mp3',
};

/** How long to wait for the piano before settling for the synth. */
const SAMPLE_TIMEOUT_MS = 10000;

/** idle -> starting -> ready, or -> fallback when the samples fail. */
let state = 'idle';
let Tone = null;
let instrument = null;
let part = null;
let startPromise = null;

const listeners = new Set();

function setState(next) {
  if (state === next) return;
  state = next;
  for (const listener of listeners) listener(state);
}

export function audioState() {
  return state;
}

/** Subscribes to state changes; returns an unsubscribe function. */
export function onAudioState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isAudioReady() {
  return state === 'ready' || state === 'fallback';
}

function buildFallback() {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.6, sustain: 0.25, release: 1.4 },
  }).toDestination();
  synth.volume.value = -12;
  return synth;
}

/**
 * Starts the audio context and loads the piano.
 * Must be called from a user gesture (a tap), or iOS will refuse.
 */
export async function startAudio() {
  if (isAudioReady()) return state;
  if (startPromise) return startPromise;

  startPromise = (async () => {
    setState('starting');
    try {
      Tone = await import('tone');
      await Tone.start();

      let sampler = null;
      try {
        sampler = new Tone.Sampler({ urls: SAMPLES, baseUrl: SAMPLE_BASE }).toDestination();
        sampler.volume.value = -6;
        // A failing request rejects, but a stalled one never settles, so the
        // wait is capped: better a synth than a button stuck on "loading".
        await Promise.race([
          Tone.loaded(),
          new Promise((resolve) => { setTimeout(resolve, SAMPLE_TIMEOUT_MS); }),
        ]);
      } catch {
        // Fetching the samples failed outright.
      }

      if (sampler?.loaded) {
        instrument = sampler;
        setState('ready');
      } else {
        // Offline on a first visit, or the CDN is unreachable: a synth will do.
        sampler?.dispose();
        instrument = buildFallback();
        setState('fallback');
      }
    } catch (error) {
      setState('idle');
      startPromise = null;
      throw error;
    }
    startPromise = null;
    return state;
  })();

  return startPromise;
}

/** iOS suspends the context in the background; resume it before playing. */
async function ensureRunning() {
  if (!Tone || !instrument) return false;
  if (Tone.getContext().state !== 'running') {
    try {
      await Tone.getContext().resume();
    } catch {
      return false;
    }
  }
  return true;
}

const toNote = (midi) => Tone.Frequency(midi, 'midi').toNote();

/** Plays a set of MIDI notes together. */
export async function playNotes(midi, { duration = '2n', velocity = 0.75, time } = {}) {
  if (!isAudioReady() || !(await ensureRunning())) return;
  instrument.triggerAttackRelease(midi.map(toNote), duration, time, velocity);
}

/** Plays the notes of a voicing one after another, low to high. */
export async function playArpeggio(midi, { step = 0.14, duration = '2n', velocity = 0.75 } = {}) {
  if (!isAudioReady() || !(await ensureRunning())) return;
  const now = Tone.now();
  [...midi].sort((a, b) => a - b).forEach((note, index) => {
    instrument.triggerAttackRelease(toNote(note), duration, now + index * step, velocity);
  });
}

export function isPlaying() {
  return Boolean(part) && Tone?.getTransport().state === 'started';
}

/** Stops a running sequence and releases every sounding note. */
export function stopPlayback() {
  if (!Tone) return;
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel(0);
  transport.loop = false;
  if (part) {
    part.dispose();
    part = null;
  }
  instrument?.releaseAll?.();
}

/**
 * Plays a sequence of chords.
 *
 * `items` are { midi, beats, index }. `onStep` fires in sync with the sound
 * (via Tone.Draw), so the leadsheet can follow along; `onEnd` fires when the
 * sequence finishes, unless it loops.
 */
export async function playSequence(items, {
  bpm = 120, beatsPerBar = 4, loop = false, onStep = null, onEnd = null,
} = {}) {
  if (!isAudioReady() || !(await ensureRunning())) return;
  stopPlayback();

  const transport = Tone.getTransport();
  transport.bpm.value = bpm;
  transport.timeSignature = beatsPerBar;

  let beat = 0;
  const events = items.map((item) => {
    const at = beat;
    beat += item.beats;
    return {
      time: `${Math.floor(at / beatsPerBar)}:${at % beatsPerBar}:0`,
      midi: item.midi,
      // Let the chord ring a touch short so repeated chords re-articulate.
      duration: { '4n': Math.max(item.beats - 0.05, 0.25) },
      index: item.index,
    };
  });
  const totalBeats = beat;

  part = new Tone.Part((time, value) => {
    instrument.triggerAttackRelease(value.midi.map(toNote), value.duration, time, 0.75);
    if (onStep) Tone.Draw.schedule(() => onStep(value.index), time);
  }, events);
  part.start(0);

  if (loop) {
    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = `${Math.floor(totalBeats / beatsPerBar)}:${totalBeats % beatsPerBar}:0`;
  } else {
    transport.loop = false;
    transport.scheduleOnce((time) => {
      Tone.Draw.schedule(() => {
        stopPlayback();
        onEnd?.();
      }, time);
    }, `${Math.floor(totalBeats / beatsPerBar)}:${totalBeats % beatsPerBar}:0`);
  }

  transport.position = 0;
  transport.start();
}

/** Changes the tempo of a running sequence. */
export function setTempo(bpm) {
  if (Tone) Tone.getTransport().bpm.value = bpm;
}
