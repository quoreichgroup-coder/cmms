package com.grash.service;

import com.grash.model.UserSettings;
import com.grash.model.enums.OnboardingStatus;
import com.grash.repository.UserSettingsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserSettingsServiceOnboardingTest {
    @Mock
    private UserSettingsRepository userSettingsRepository;

    @Test
    void olderSettingsUpdatePreservesTheOnboardingPreference() {
        UserSettings persisted = new UserSettings();
        persisted.setId(12L);
        persisted.setOnboardingVersion(1);
        persisted.setOnboardingStatus(OnboardingStatus.SKIPPED);

        UserSettings olderClientPayload = new UserSettings();
        olderClientPayload.setId(12L);
        olderClientPayload.setEmailNotified(false);

        when(userSettingsRepository.findById(12L)).thenReturn(Optional.of(persisted));
        when(userSettingsRepository.save(olderClientPayload)).thenReturn(olderClientPayload);

        UserSettings saved = new UserSettingsService(userSettingsRepository).update(olderClientPayload);

        assertEquals(false, saved.isEmailNotified());
        assertEquals(1, saved.getOnboardingVersion());
        assertEquals(OnboardingStatus.SKIPPED, saved.getOnboardingStatus());
        verify(userSettingsRepository).save(olderClientPayload);
    }

    @Test
    void onboardingUpdateOnlyChangesTheOnboardingPreference() {
        UserSettings persisted = new UserSettings();
        persisted.setEmailNotified(false);

        when(userSettingsRepository.save(persisted)).thenReturn(persisted);

        UserSettings saved = new UserSettingsService(userSettingsRepository)
                .updateOnboarding(persisted, 1, OnboardingStatus.COMPLETED);

        assertEquals(false, saved.isEmailNotified());
        assertEquals(1, saved.getOnboardingVersion());
        assertEquals(OnboardingStatus.COMPLETED, saved.getOnboardingStatus());
        verify(userSettingsRepository).save(persisted);
    }
}
