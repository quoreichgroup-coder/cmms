import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { ColorSchemeName } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import useColorScheme from '../hooks/useColorScheme';
import { customTheme, darkTheme, QpmTheme } from '../custom-theme';
import {
  AppearancePreference,
  createAsyncWriteQueue,
  parseAppearancePreference,
  resolveAppearanceScheme
} from '../utils/appearance';

export type { AppearancePreference } from '../utils/appearance';

const STORAGE_KEY = 'qpm.appearance.preference.v1';

type AppearanceContextValue = {
  preference: AppearancePreference;
  colorScheme: NonNullable<ColorSchemeName>;
  theme: QpmTheme;
  isReady: boolean;
  setPreference: (preference: AppearancePreference) => Promise<void>;
  resetPreference: () => Promise<void>;
};

const AppearanceContext = createContext<AppearanceContextValue | undefined>(
  undefined
);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const deviceScheme = useColorScheme();
  const [preference, setPreferenceState] =
    useState<AppearancePreference>('system');
  const [isReady, setIsReady] = useState(false);
  const writePreference = useRef(createAsyncWriteQueue()).current;

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (mounted) setPreferenceState(parseAppearancePreference(stored));
      })
      .catch((error) => {
        console.warn('Could not load QPM appearance preference:', error);
      })
      .finally(() => {
        if (mounted) setIsReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const effectiveScheme = resolveAppearanceScheme(preference, deviceScheme);
  const theme = effectiveScheme === 'dark' ? darkTheme : customTheme;

  const setPreference = useCallback(
    async (nextPreference: AppearancePreference) => {
      setPreferenceState(nextPreference);
      try {
        await writePreference(() =>
          nextPreference === 'system'
            ? AsyncStorage.removeItem(STORAGE_KEY)
            : AsyncStorage.setItem(STORAGE_KEY, nextPreference)
        );
      } catch (error) {
        console.warn('Could not save QPM appearance preference:', error);
        throw error;
      }
    },
    [writePreference]
  );

  const resetPreference = useCallback(
    () => setPreference('system'),
    [setPreference]
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({
      preference,
      colorScheme: effectiveScheme,
      theme,
      isReady,
      setPreference,
      resetPreference
    }),
    [
      preference,
      effectiveScheme,
      theme,
      isReady,
      setPreference,
      resetPreference
    ]
  );

  return (
    <AppearanceContext.Provider value={value}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used inside AppearanceProvider');
  }
  return context;
}
