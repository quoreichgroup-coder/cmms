const DESKTOP_SIDEBAR_STORAGE_KEY = 'qpm-web-sidebar-collapsed';

export const readDesktopSidebarCollapsed = (): boolean => {
  try {
    return (
      typeof window !== 'undefined' &&
      window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY) === 'true'
    );
  } catch (_error) {
    return false;
  }
};

export const writeDesktopSidebarCollapsed = (collapsed: boolean): void => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        DESKTOP_SIDEBAR_STORAGE_KEY,
        String(collapsed)
      );
    }
  } catch (_error) {
    // Sidebar preference is optional; storage restrictions must not block navigation.
  }
};
