import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootParamList } from '../types';

export const navigationRef = createNavigationContainerRef<RootParamList>();

// A link that opens the app arrives before the navigator is mounted; keep the latest one until it is ready.
let pendingNavigation: { name: keyof RootParamList; params?: any } | null = null;

export function navigate<Name extends keyof RootParamList>(
  name: Name,
  params?: RootParamList[Name]
) {
  if (navigationRef.isReady()) {
    // @ts-ignore
    navigationRef.navigate(name, params);
  } else {
    pendingNavigation = { name, params };
  }
}

/** Called from NavigationContainer.onReady (and after sign-in) to replay a link received during startup. */
export function flushPendingNavigation() {
  if (!pendingNavigation || !navigationRef.isReady()) return;
  const { name, params } = pendingNavigation;
  pendingNavigation = null;
  // @ts-ignore
  navigationRef.navigate(name, params);
}
