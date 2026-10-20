// @ts-nocheck Jest globals are provided by jest-expo at test runtime.
import {
  CURRENT_ONBOARDING_VERSION,
  shouldShowOnboarding
} from '../onboardingState';

describe('onboarding first-login gate', () => {
  it('shows the current onboarding to a new account', () => {
    expect(
      shouldShowOnboarding({
        onboardingVersion: 0,
        onboardingStatus: 'NOT_STARTED'
      })
    ).toBe(true);
  });

  it.each(['SKIPPED', 'COMPLETED'] as const)(
    'does not show the same version again after %s',
    (onboardingStatus) => {
      expect(
        shouldShowOnboarding({
          onboardingVersion: CURRENT_ONBOARDING_VERSION,
          onboardingStatus
        })
      ).toBe(false);
    }
  );

  it('shows a newer published onboarding version once', () => {
    expect(
      shouldShowOnboarding({
        onboardingVersion: CURRENT_ONBOARDING_VERSION - 1,
        onboardingStatus: 'COMPLETED'
      })
    ).toBe(true);
  });

  it('does not block startup when older servers omit the preference fields', () => {
    expect(shouldShowOnboarding({})).toBe(false);
    expect(shouldShowOnboarding(null)).toBe(false);
  });
});
