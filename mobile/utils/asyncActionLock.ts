/** Coalesce concurrent UI submissions into the first in-flight action. */
export function createAsyncActionLock() {
  let inFlight: Promise<unknown> | undefined;

  return function run<T>(action: () => Promise<T> | T): Promise<T> {
    if (inFlight) return inFlight as Promise<T>;

    const current = Promise.resolve().then(action);
    inFlight = current;
    const clear = () => {
      if (inFlight === current) inFlight = undefined;
    };
    current.then(clear, clear);
    return current;
  };
}
