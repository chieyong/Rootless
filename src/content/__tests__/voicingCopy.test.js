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
    expect(Object.keys(VOICING_COPY).sort()).toEqual([...VOICING_FORMS].sort());
    expect(voicingCopy('shell-3-7-1')).toBeNull();
  });

  it('keeps `short` to one line', () => {
    for (const form of VOICING_FORMS) {
      expect(voicingCopy(form).short).not.toContain('\n');
    }
  });
});
