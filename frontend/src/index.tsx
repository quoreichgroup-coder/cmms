import ReactDOM from 'react-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import ScrollTop from 'src/hooks/useScrollTop';

import 'nprogress/nprogress.css';
// Brand typeface (QPM visual identity), bundled with the app: no runtime call to an external font CDN.
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import { Provider } from 'react-redux';
import store from 'src/store';
import App from 'src/App';
import { SidebarProvider } from 'src/contexts/SidebarContext';
import { TitleProvider } from 'src/contexts/TitleContext';
import * as serviceWorker from 'src/serviceWorker';
import { AuthProvider } from 'src/contexts/JWTAuthContext';
import {
  sentryDsn,
  sentryEnvironment,
  sentryRelease,
  zendeskKey
} from './config';
import { ZendeskProvider } from 'react-use-zendesk';
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: sentryDsn,
  environment: sentryEnvironment,
  release: sentryRelease,
  tracesSampleRate: 0.1,
  integrations: [Sentry.browserTracingIntegration()]
});

ReactDOM.render(
  <HelmetProvider>
    <Helmet titleTemplate="%s · QPM" defaultTitle="QPM">
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <Provider store={store}>
      <SidebarProvider>
        <TitleProvider>
          <BrowserRouter>
            <ScrollTop />
            <ZendeskProvider apiKey={zendeskKey}>
              <AuthProvider>
                <Sentry.ErrorBoundary
                  onError={(_error, componentStack, eventId) => {
                    // Keep exception messages out of console logs: API errors
                    // can contain response data. The component stack is enough
                    // to identify which part of the UI failed to render.
                    console.error('[QPM] UI render failed', {
                      componentStack,
                      eventId
                    });
                  }}
                  fallback={
                    <main
                      role="alert"
                      style={{
                        fontFamily: 'sans-serif',
                        margin: '10vh auto',
                        maxWidth: 520,
                        padding: 24,
                        textAlign: 'center'
                      }}
                    >
                      <h1>QPM n’a pas pu afficher cette page.</h1>
                      <p>Recharge l’application pour réessayer.</p>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                      >
                        Recharger
                      </button>
                    </main>
                  }
                >
                  <App />
                </Sentry.ErrorBoundary>
              </AuthProvider>
            </ZendeskProvider>
          </BrowserRouter>
        </TitleProvider>
      </SidebarProvider>
    </Provider>
  </HelmetProvider>,
  document.getElementById('root')
);

serviceWorker.unregister();
