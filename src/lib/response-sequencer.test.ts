import { describe, expect, it } from 'vitest';
import { createResponseSequencer } from './response-sequencer';

describe('createResponseSequencer', () => {
  it('applies responses that arrive in order', () => {
    const seq = createResponseSequencer();
    const a = seq.begin();
    const b = seq.begin();
    expect(seq.tryApply(a)).toBe(true);
    expect(seq.tryApply(b)).toBe(true);
  });

  it('discards an older response that finishes after a newer one', () => {
    // The bug: a fetch started BEFORE the swap request finished AFTER the one
    // that included it, overwriting the manager's screen with stale data.
    const seq = createResponseSequencer();
    const older = seq.begin();
    const newer = seq.begin();
    expect(seq.tryApply(newer)).toBe(true);
    expect(seq.tryApply(older)).toBe(false);
  });

  it('does not starve under continuously overlapping fetches', () => {
    // A stricter "only the latest started may apply" rule would reject every
    // response here, because a newer fetch always starts before the previous
    // one lands. Each newer-than-applied response must still get through.
    const seq = createResponseSequencer();
    let t = seq.begin();
    let applied = 0;
    for (let i = 0; i < 10; i += 1) {
      const next = seq.begin(); // next fetch starts before t finishes
      if (seq.tryApply(t)) applied += 1;
      t = next;
    }
    expect(applied).toBe(10);
  });

  it('never applies the same ticket twice', () => {
    const seq = createResponseSequencer();
    const t = seq.begin();
    expect(seq.tryApply(t)).toBe(true);
    expect(seq.tryApply(t)).toBe(false);
  });

  it('keeps independent sequencers independent', () => {
    const a = createResponseSequencer();
    const b = createResponseSequencer();
    a.begin();
    a.begin();
    const tb = b.begin();
    expect(b.tryApply(tb)).toBe(true);
  });
});
