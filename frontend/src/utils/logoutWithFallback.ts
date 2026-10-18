/** Always clear the browser session after attempting server-side logout. */
export const logoutWithFallback = async (
  requestServerLogout: () => Promise<unknown>,
  clearLocalSession: () => void
): Promise<void> => {
  let serverLogoutFailed = false;
  let serverLogoutError: unknown;

  try {
    await requestServerLogout();
  } catch (error) {
    serverLogoutFailed = true;
    serverLogoutError = error;
  }

  let localCleanupFailed = false;
  let localCleanupError: unknown;
  try {
    clearLocalSession();
  } catch (error) {
    localCleanupFailed = true;
    localCleanupError = error;
  }

  if (serverLogoutFailed) throw serverLogoutError;
  if (localCleanupFailed) throw localCleanupError;
};
