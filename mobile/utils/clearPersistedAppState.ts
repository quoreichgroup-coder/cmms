import { revertAll } from './redux';

type PersistedStateDispatch = (action: ReturnType<typeof revertAll>) => unknown;

/** Reset cached Redux data and wait until the reset reaches persistent storage. */
export async function clearPersistedAppState(
  dispatch: PersistedStateDispatch,
  flush: () => Promise<unknown>
): Promise<void> {
  dispatch(revertAll());
  await flush();
}
