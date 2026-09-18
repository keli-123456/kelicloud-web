// A response may update the UI only while it belongs to the current request.
export function createRequestTracker() {
  let generation = 0;
  let pending = false;
  return {
    begin() { pending = true; return ++generation; },
    isCurrent(ticket: number) { return ticket === generation; },
    finish(ticket: number) { if (ticket === generation) pending = false; },
    invalidate() { ++generation; pending = false; },
    get pending() { return pending; },
  };
}
