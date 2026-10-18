type NetworkAvailability = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

/**
 * NetInfo reports null while connectivity is still being determined. Keep
 * online actions available in that transient state and block only on a
 * confirmed disconnected or unreachable result.
 */
export const canAttemptOnlineAction = ({
  isConnected,
  isInternetReachable
}: NetworkAvailability): boolean =>
  isConnected !== false && isInternetReachable !== false;
