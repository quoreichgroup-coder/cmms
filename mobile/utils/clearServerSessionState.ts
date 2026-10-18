import { clearPersistedAppState } from './clearPersistedAppState';
import { revertAll } from './redux';

type StateDispatch = (action: ReturnType<typeof revertAll>) => unknown;

/** Clear credentials and persisted tenant data whenever the API origin changes. */
export async function clearServerSessionState(
  clearCredentials: () => Promise<unknown>,
  dispatch: StateDispatch,
  flush: () => Promise<unknown>
): Promise<void> {
  await clearCredentials();
  await clearPersistedAppState(dispatch, flush);
}
