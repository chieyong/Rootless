/**
 * How long a practice round lasts.
 *
 * The default is a short round: five minutes, which is the session you will
 * actually do on a train. It ends on the clock, checked when you answer, so
 * nothing counts down while you are still listening.
 */

export const ROUND_MODES = [
  { id: 'short', label: '5 minutes', seconds: 300, maxQuestions: 40 },
  { id: 'ten', label: '10 questions', questions: 10 },
  { id: 'twenty', label: '20 questions', questions: 20 },
];

export const DEFAULT_ROUND = 'short';

export function getRoundMode(id) {
  return ROUND_MODES.find((mode) => mode.id === id) ?? ROUND_MODES[0];
}

/** How many questions to prepare up front. */
export function questionsToPrepare(mode) {
  return mode.questions ?? mode.maxQuestions;
}

/** Whether the round has finished, after `answered` questions. */
export function roundIsOver(mode, { answered, startedAt, now = Date.now() }) {
  if (mode.questions) return answered >= mode.questions;
  if (answered >= mode.maxQuestions) return true;
  return now - startedAt >= mode.seconds * 1000;
}

/** 0 to 1, for a progress bar. */
export function roundProgress(mode, { answered, startedAt, now = Date.now() }) {
  if (mode.questions) return Math.min(answered / mode.questions, 1);
  const byTime = (now - startedAt) / (mode.seconds * 1000);
  const byCount = answered / mode.maxQuestions;
  return Math.min(Math.max(byTime, byCount), 1);
}

/** "2:30 left", or the questions remaining. */
export function roundRemaining(mode, { answered, startedAt, now = Date.now() }) {
  if (mode.questions) {
    const left = Math.max(mode.questions - answered, 0);
    return `${left} to go`;
  }
  const seconds = Math.max(Math.ceil((mode.seconds * 1000 - (now - startedAt)) / 1000), 0);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} left`;
}
