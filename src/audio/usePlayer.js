import { useCallback, useEffect, useRef, useState } from 'react';
import { voiceLeadProgression } from '../theory/index.js';
import { beatsPerBar, tuneSlots } from '../tunes/tune.js';
import {
  audioState, isAudioReady, onAudioState, playNotes, playSequence, setTempo, startAudio,
  stopPlayback,
} from './engine.js';

/** Voices a whole tune once, so playback and the bar detail agree. */
export function voiceTune(tune, forms) {
  const slots = tuneSlots(tune);
  const voicings = voiceLeadProgression(slots.map((slot) => slot.symbol), { forms });
  return slots.map((slot, index) => ({ slot, voicing: voicings[index] }));
}

/**
 * Drives the audio engine for one tune: start, stop, tempo, and which bar is
 * sounding right now.
 */
export default function usePlayer(tune, { forms, bpm, loop }) {
  const [state, setState] = useState(audioState());
  const [playingSlot, setPlayingSlot] = useState(null);
  const [playing, setPlaying] = useState(false);
  const voiced = useRef([]);

  useEffect(() => onAudioState(setState), []);
  useEffect(() => () => stopPlayback(), []);

  // Stop when the tune, the key or the voicing type changes under our feet.
  useEffect(() => {
    stopPlayback();
    setPlaying(false);
    setPlayingSlot(null);
  }, [tune, forms]);

  useEffect(() => {
    if (playing) setTempo(bpm);
  }, [bpm, playing]);

  const enable = useCallback(async () => {
    await startAudio();
  }, []);

  const stop = useCallback(() => {
    stopPlayback();
    setPlaying(false);
    setPlayingSlot(null);
  }, []);

  const play = useCallback(async () => {
    if (!isAudioReady()) await startAudio();
    voiced.current = voiceTune(tune, forms);
    const items = voiced.current
      .filter(({ voicing }) => voicing)
      .map(({ slot, voicing }) => ({ midi: voicing.midi, beats: slot.beats, index: slot.index }));
    setPlaying(true);
    await playSequence(items, {
      bpm,
      beatsPerBar: beatsPerBar(tune),
      loop,
      onStep: setPlayingSlot,
      onEnd: () => { setPlaying(false); setPlayingSlot(null); },
    });
  }, [tune, forms, bpm, loop]);

  /** Plays one voicing on its own, for tapping a bar. */
  const playChord = useCallback(async (voicing) => {
    if (!voicing) return;
    if (!isAudioReady()) await startAudio();
    await playNotes(voicing.midi, { duration: '2n' });
  }, []);

  const slots = tuneSlots(tune);
  const playingBar = playingSlot === null ? null : slots[playingSlot]?.barNumber ?? null;

  return { state, ready: isAudioReady(), playing, playingBar, enable, play, stop, playChord };
}
