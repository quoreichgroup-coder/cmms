import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistGate } from 'redux-persist/integration/react';
import useCachedResources from './hooks/useCachedResources';
import Navigation from './navigation';
import { Provider } from 'react-redux';
import store, { persistor } from './store';
import { CompanySettingsProvider } from './contexts/CompanySettingsContext';
import { CustomSnackbarProvider } from './contexts/CustomSnackBarContext';
import { AuthProvider } from './contexts/AuthContext';
import FlashMessage from 'react-native-flash-message';
import { URL } from 'react-native-url-polyfill';
import 'text-encoding';

import Constants from 'expo-constants';

import * as Sentry from '@sentry/react-native';

const sentryDsn = Constants.expoConfig?.extra?.SENTRY_DSN;
const sentryEnvironment = Constants.expoConfig?.extra?.SENTRY_ENVIRONMENT;
const sentryRelease = Constants.expoConfig?.extra?.SENTRY_RELEASE;

Sentry.init({
  dsn: sentryDsn,
  environment: sentryEnvironment,
  release: sentryRelease,
  tracesSampleRate: 0.1
});

import { useEffect } from 'react';
import { Alert, Linking, LogBox } from 'react-native';
import { SheetProvider } from 'react-native-actions-sheet';
import './components/actionSheets/sheets';
import * as Notifications from 'expo-notifications';
import { navigate } from './navigation/RootNavigation';
import subscriptionPlan from './slices/subscriptionPlan';
import { isNumeric } from './utils/validators';
import { RootLayout } from './components/RootLayout';
import { ReviewModal } from './components/ReviewModal';
import {
  AppearanceProvider,
  useAppearance
} from './contexts/AppearanceContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default Sentry.wrap(function App() {
  return (
    <AppearanceProvider>
      <AppContent />
    </AppearanceProvider>
  );
});

function AppContent() {
  const isLoadingComplete = useCachedResources();
  const { isReady: isAppearanceReady } = useAppearance();

  useEffect(() => {
    if (isLoadingComplete && isAppearanceReady) {
      // Keep the native splash visible until both fonts and the saved theme are ready.
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isAppearanceReady, isLoadingComplete]);

  useEffect(() => {
    LogBox.ignoreLogs([
      'Warning: Async Storage has been extracted from react-native core'
    ]);

    // Foreground presentation is handled by setNotificationHandler below.
  }, []);

  useEffect(() => {
    let subscription;
    const handleDeepLink = async () => {
      // Get the initial URL when the app is launched from the deep link
      const initialUrl = await Linking.getInitialURL();
      handleUrl(initialUrl);
      // Listen to incoming deep links while the app is open
      subscription = Linking.addEventListener('url', ({ url }) =>
        handleUrl(url)
      );
    };

    const handleUrl = (url: string) => {
      if (url) {
        const { pathname: path } = new URL(url);
        if (path.startsWith('/app/')) {
          const arr = path.split('/');
          if (arr[2] === 'work-orders') {
            if (isNumeric(arr[3]))
              navigate('WODetails', { id: Number(arr[3]) });
            else navigate('WorkOrders', { filterFields: [] });
          } else {
            if (arr[2] === 'requests') {
              if (isNumeric(arr[3]))
                navigate('RequestDetails', { id: Number(arr[3]) });
              else navigate('Requests');
            }
          }
        }
      }
    };

    handleDeepLink();

    // Clean up event listeners
    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  if (!isLoadingComplete || !isAppearanceReady) return null;

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <AuthProvider>
            <CompanySettingsProvider>
              <CustomSnackbarProvider>
                <SheetProvider>
                  <RootLayout>
                    <FlashMessage
                      position="top"
                      statusBarHeight={Constants.statusBarHeight}
                    />
                    <Navigation />
                    <ReviewModal />
                  </RootLayout>
                  <ThemedStatusBar />
                </SheetProvider>
              </CustomSnackbarProvider>
            </CompanySettingsProvider>
          </AuthProvider>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { colorScheme } = useAppearance();
  return <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />;
}
