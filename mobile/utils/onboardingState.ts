export const CURRENT_ONBOARDING_VERSION = 1;

export interface OnboardingPreference {
  onboardingVersion?: number;
  onboardingStatus?: 'NOT_STARTED' | 'SKIPPED' | 'COMPLETED';
}

export function shouldShowOnboarding(
  preference: OnboardingPreference | null | undefined
): boolean {
  return (
    typeof preference?.onboardingVersion === 'number' &&
    Number.isInteger(preference.onboardingVersion) &&
    typeof preference.onboardingStatus === 'string' &&
    preference.onboardingVersion < CURRENT_ONBOARDING_VERSION
  );
}
