/**
 * Rootless theory engine.
 *
 * A UI-independent module: no React, no audio, no storage. Everything here is
 * pure functions over plain objects, so it can be unit tested and later reused
 * by the ear-training module, the MIDI input layer or a future sync backend.
 */

export * from './notes.js';
export * from './intervals.js';
export * from './chords.js';
export * from './keys.js';
export * from './analysis.js';
export * from './transpose.js';
export * from './voicings.js';
export * from './voiceLeading.js';
