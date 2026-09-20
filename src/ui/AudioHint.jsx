import React from 'react';
import useStored from '../storage/useStored.js';

/**
 * The silent switch is the one iOS trap we cannot detect: a web page plays
 * through the ringer channel, and no API reports the switch. So we say it
 * once, after sound has been enabled, and let it be dismissed for good.
 */
export default function AudioHint({ state }) {
  const [dismissed, setDismissed] = useStored('hint:silent-switch', false);
  if (dismissed || state === 'idle' || state === 'starting') return null;

  return (
    <p className="hint">
      {state === 'fallback'
        ? 'The piano samples could not be loaded, so this is a synth for now. Reconnect and reload for the piano.'
        : 'No sound? Check the silent switch on the side of the phone — a web page plays through the ringer.'}
      <button type="button" className="hint-close" onClick={() => setDismissed(true)} aria-label="Dismiss">
        &times;
      </button>
    </p>
  );
}
