import React from 'react';

/** A round play button. Big enough for a thumb, quiet enough for a list. */
export default function PlayButton({ onClick, label = 'Play', size = 'small', active = false }) {
  return (
    <button
      type="button"
      className={`play-button ${size}${active ? ' active' : ''}`}
      onClick={onClick}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {active
          ? <rect x="7" y="6" width="10" height="12" rx="1.5" fill="currentColor" />
          : <path d="M9 6.5 18 12l-9 5.5z" fill="currentColor" />}
      </svg>
    </button>
  );
}
