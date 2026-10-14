export const dispatchAfterDiscard = (
  dirtyRef: { current: boolean },
  dispatchNavigation: () => void
) => {
  // Clear the guard before replaying the blocked action so beforeRemove
  // does not intercept the same navigation a second time.
  dirtyRef.current = false;
  dispatchNavigation();
};
