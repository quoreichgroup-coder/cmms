/** Open a window during the user's click before starting asynchronous work. */
export function openPendingWindow(
  blockedMessage: string,
  loadingMessage: string
): Window {
  const pendingWindow = window.open('', '_blank');
  if (!pendingWindow) throw new Error(blockedMessage);

  // Keep the destination from gaining access to the authenticated QPM tab.
  pendingWindow.opener = null;
  pendingWindow.document.title = 'QPM';
  pendingWindow.document.body.textContent = loadingMessage;
  return pendingWindow;
}

/** Only navigate pending windows to regular web URLs returned by trusted APIs. */
export function navigatePendingWindow(
  pendingWindow: Window,
  value: string,
  invalidUrlMessage: string
): void {
  let destination: URL;
  try {
    destination = new URL(value, window.location.origin);
  } catch {
    throw new Error(invalidUrlMessage);
  }

  if (
    !['http:', 'https:'].includes(destination.protocol) ||
    destination.username ||
    destination.password
  ) {
    throw new Error(invalidUrlMessage);
  }

  pendingWindow.location.replace(destination.toString());
}

export function closePendingWindow(pendingWindow?: Window | null): void {
  if (pendingWindow && !pendingWindow.closed) pendingWindow.close();
}
