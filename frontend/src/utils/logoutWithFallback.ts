/** Always clear the browser session after attempting server-side logout. */
export const logoutWithFallback = async (
  requestServerLogout: () => Promise<unknown>,
  clearLocalSession: () => void
): Promise<void> => {
  try {
    await requestServerLogout();
  } finally {
    clearLocalSession();
  }
};
