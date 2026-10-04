// Guards state against out-of-order responses.
//
// Schedules are refetched from several places at once — the 15s poll,
// visibility changes, realtime events, the realtime error handler, and every
// mutation. Each fetch is a few paginated round-trips, so a fetch that STARTED
// earlier (with older data) can easily FINISH later and overwrite newer state.
// That is how a just-submitted request could vanish from the manager's screen
// while still sitting in the database.
//
// Each fetch takes a ticket when it starts; its result is applied only if no
// later-started fetch has already been applied. Unlike "only the most recent
// fetch may apply", this cannot starve: under a steady stream of overlapping
// fetches, every response that is newer than what's on screen still lands.

export interface ResponseSequencer {
  /** Call when a fetch starts; returns its ticket. */
  begin(): number;
  /**
   * Call when that fetch's result arrives. Returns true (and records it) when
   * the result is newer than anything applied so far — the caller should then
   * commit it. Returns false for a stale result, which must be discarded.
   */
  tryApply(ticket: number): boolean;
}

export function createResponseSequencer(): ResponseSequencer {
  let started = 0;
  let applied = 0;
  return {
    begin: () => {
      started += 1;
      return started;
    },
    tryApply: (ticket: number) => {
      if (ticket <= applied) return false;
      applied = ticket;
      return true;
    },
  };
}
