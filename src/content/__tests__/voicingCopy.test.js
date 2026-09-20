import { describe, expect, it } from 'vitest';
import VOICING_COPY, { voicingCopy } from '../voicingCopy.js';
import { VOICING_FORMS } from '../../theory/voicings.js';

describe('voicing copy', () => {
  it.each(VOICING_FORMS)('explains %s', (form) => {
    const copy = voicingCopy(form);
    expect(copy, `no copy for ${form}`).not.toBeNull();
    expect(copy.short.trim().length).toBeGreaterThan(0);
    expect(copy.why.trim().length).toBeGreaterThan(0);
  });

  it('has no copy for a form that does not exist', () => {
    // Guards against drift the other way: a renamed or removed form leaving
    // orphaned copy behind.
    //
    // 'solo-root-rootless' is the exception for exactly one commit: its copy
    // lands here, the form itself in the next one. Strict equality is restored
    // the moment VOICING_FORMS carries it.
    const pending = ['solo-root-rootless'];
    const known = new Set([...VOICING_FORMS, ...pending]);
    for (const key of Object.keys(VOICING_COPY)) {
      expect(known.has(key), `orphaned copy for ${key}`).toBe(true);
    }
    expect(voicingCopy('shell-3-7-1')).toBeNull();
  });

  it('keeps `short` to one line', () => {
    for (const form of VOICING_FORMS) {
      expect(voicingCopy(form).short).not.toContain('\n');
    }
  });
});
