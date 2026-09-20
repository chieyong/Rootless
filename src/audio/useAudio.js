import { useCallback, useEffect, useState } from 'react';
import {
  audioState, isAudioReady, onAudioState, playArpeggio, playNotes, playSequence, setTempo,
  startAudio, stopPlayback,
} from './engine.js';

/**
 * The audio engine as a hook: start it on demand, play a chord or a
 * sequence, and follow what is sounding.
 *
 * Every play call starts the engine first if it is not running yet, so any
 * button can be the first tap - which is what iOS requires.
 */
export default function useAudio() {
  const [state, setState] = useState(audioState());
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(null);

  useEffect(() => onAudioState(setState), []);
  useEffect(() => () => stopPlayback(), []);

  const ensure = useCallback(async () => {
    if (!isAudioReady()) await startAudio();
    return isAudioReady();
  }, []);

  /** Plays the notes of a chord or voicing together, or rolled. */
  const playChord = useCallback(async (notesOrVoicing, { arpeggio = false, duration = '2n' } = {}) => {
    const midi = Array.isArray(notesOrVoicing) ? notesOrVoicing : notesOrVoicing?.midi;
    if (!midi?.length || !(await ensure())) return;
    if (arpeggio) await playArpeggio(midi, { duration });
    else await playNotes(midi, { duration });
  }, [ensure]);

  const stop = useCallback(() => {
    stopPlayback();
    setPlaying(false);
    setStep(null);
  }, []);

  /**
   * Plays a run of voicings. `items` are { midi, beats, index }.
   */
  const playProgression = useCallback(async (items, { bpm = 100, beatsPerBar = 4, loop = false } = {}) => {
    if (!items.length || !(await ensure())) return;
    setPlaying(true);
    await playSequence(items, {
      bpm,
      beatsPerBar,
      loop,
      onStep: setStep,
      onEnd: () => { setPlaying(false); setStep(null); },
    });
  }, [ensure]);

  return {
    state,
    ready: isAudioReady(),
    playing,
    step,
    playChord,
    playProgression,
    stop,
    setTempo,
  };
}
