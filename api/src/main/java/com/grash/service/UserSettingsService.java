package com.grash.service;

import com.grash.model.UserSettings;
import com.grash.model.enums.OnboardingStatus;
import com.grash.repository.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserSettingsService {
    private final UserSettingsRepository userSettingsRepository;

    public UserSettings create(UserSettings UserSettings) {
        return userSettingsRepository.save(UserSettings);
    }

    public UserSettings update(UserSettings UserSettings) {
        if (UserSettings.getId() != null) {
            userSettingsRepository.findById(UserSettings.getId()).ifPresent(existing -> {
                UserSettings.setOnboardingVersion(existing.getOnboardingVersion());
                UserSettings.setOnboardingStatus(existing.getOnboardingStatus());
            });
        }
        return userSettingsRepository.save(UserSettings);
    }

    public Collection<UserSettings> getAll() {
        return userSettingsRepository.findAll();
    }

    public void delete(Long id) {
        userSettingsRepository.deleteById(id);
    }

    public Optional<UserSettings> findById(Long id) {
        return userSettingsRepository.findById(id);
    }

    public UserSettings updateOnboarding(UserSettings settings, int version, OnboardingStatus status) {
        settings.setOnboardingVersion(version);
        settings.setOnboardingStatus(status);
        return userSettingsRepository.save(settings);
    }
}
