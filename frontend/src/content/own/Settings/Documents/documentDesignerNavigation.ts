type RetryableTransition = { retry: () => void };
type BlockableHistory = {
  block?: (callback: (transition: RetryableTransition) => void) => () => void;
};

/** Block SPA navigation until the caller confirms how to handle its draft. */
export function blockDocumentNavigation(
  navigator: unknown,
  onBlocked: (retry: () => void) => void
): () => void {
  const history = navigator as BlockableHistory;
  if (!history.block) return () => {};

  let unblock = () => {};
  unblock = history.block((transition) => {
    unblock();
    onBlocked(transition.retry);
  });
  return unblock;
}
