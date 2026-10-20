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

export interface SidebarRouteItem {
  link?: string;
  items?: SidebarRouteItem[];
}

/** Return true when this item or any nested destination contains the current route. */
export const isSidebarItemPathActive = (
  currentPath: string,
  item: SidebarRouteItem
): boolean =>
  isSidebarPathActive(currentPath, item.link) ||
  Boolean(
    item.items?.some((child) => isSidebarItemPathActive(currentPath, child))
  );

/** Groups are selected only at their own destination; child routes only expand them. */
export const isSidebarPathExact = (
  currentPath: string,
  destination?: string
): boolean =>
  Boolean(
    destination &&
      currentPath.replace(/\/$/, '') === destination.replace(/\/$/, '')
  );
