/** Always clear in-memory authentication state, even if browser storage fails. */
export const clearSessionAndState = (
  clearStoredSession: () => void,
  clearApplicationState: () => void
): void => {
  try {
    clearStoredSession();
  } finally {
    clearApplicationState();
  }
};
