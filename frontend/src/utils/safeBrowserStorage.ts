/** Safely access non-sensitive browser preferences that must never block UI. */
export const readBrowserPreference = (
  key: string,
  storage: Pick<Storage, 'getItem'> | null = getBrowserStorage()
): string | null => {
  try {
    return storage?.getItem(key) ?? null;
  } catch (_error) {
    return null;
  }
};

export const writeBrowserPreference = (
  key: string,
  value: string,
  storage: Pick<Storage, 'setItem'> | null = getBrowserStorage()
): boolean => {
  try {
    storage?.setItem(key, value);
    return Boolean(storage);
  } catch (_error) {
    return false;
  }
};

const getBrowserStorage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch (_error) {
    return null;
  }
};
