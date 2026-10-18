/** Keep a sidebar destination selected while the user is on one of its child routes. */
export const isSidebarPathActive = (
  currentPath: string,
  destination?: string
) =>
  Boolean(
    destination &&
      (currentPath === destination ||
        currentPath.startsWith(`${destination.replace(/\/$/, '')}/`))
  );
