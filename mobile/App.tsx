import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistGate } from 'redux-persist/integration/react';
import useCachedResources from './hooks/useCachedResources';
import useColorScheme from './hooks/useColorScheme';
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

import {
  MD3LightTheme as DefaultTheme,
  Provider as PaperProvider,
  useTheme
} from 'react-native-paper';
import { useEffect } from 'react';
import { Alert, Linking, LogBox } from 'react-native';
import { SheetProvider } from 'react-native-actions-sheet';
import './components/actionSheets/sheets';
import * as Notifications from 'expo-notifications';
import { navigate } from './navigation/RootNavigation';
import subscriptionPlan from './slices/subscriptionPlan';
import { isNumeric } from './utils/validators';
import { customTheme } from './custom-theme';
import { RootLayout } from './components/RootLayout';
import { ReviewModal } from './components/ReviewModal';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export default Sentry.wrap(function App() {
  const isLoadingComplete = useCachedResources();
  const colorScheme = useColorScheme();
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

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <AuthProvider>
              <CompanySettingsProvider>
                <PaperProvider theme={customTheme}>
                  <CustomSnackbarProvider>
                    <SheetProvider>
                      <RootLayout>
                        <FlashMessage
                          position="top"
                          statusBarHeight={Constants.statusBarHeight}
                        />
                        <Navigation colorScheme={colorScheme} />
                        <ReviewModal />
                      </RootLayout>
                      <StatusBar />
                    </SheetProvider>
                  </CustomSnackbarProvider>
                </PaperProvider>
              </CompanySettingsProvider>
            </AuthProvider>
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    );
  }
});
