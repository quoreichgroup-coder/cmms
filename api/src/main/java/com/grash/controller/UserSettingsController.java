package com.grash.controller;

import com.grash.exception.CustomException;
import com.grash.dto.userSettings.OnboardingPreferenceDTO;
import com.grash.model.User;
import com.grash.model.UserSettings;
import com.grash.model.enums.OnboardingStatus;
import com.grash.service.UserService;
import com.grash.service.UserSettingsService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.Optional;

@RestController
@RequestMapping("/user-settings")
@Tag(name = "User Settings", description = "Operations on user settings")
@RequiredArgsConstructor
public class UserSettingsController {

    private final UserSettingsService userSettingsService;
    private final UserService userService;


    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public UserSettings getById(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);

        Optional<UserSettings> optionalUserSettings = userSettingsService.findById(id);
        if (optionalUserSettings.isPresent()) {
            UserSettings savedUserSettings = optionalUserSettings.get();
            if (!savedUserSettings.getId().equals(user.getUserSettings().getId())) {
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            }
            return savedUserSettings;
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public UserSettings patch(@Parameter(description = "User settings to update") @Valid @RequestBody UserSettings userSettings,
                              @PathVariable("id") Long id,
                              HttpServletRequest req) {
        User user = userService.whoami(req);

        Optional<UserSettings> optionalUserSettings = userSettingsService.findById(id);

        if (optionalUserSettings.isPresent()) {
            UserSettings savedUserSettings = optionalUserSettings.get();
            if (savedUserSettings.getId().equals(user.getUserSettings().getId())) {
                // The path ID is authorized above; never let the request body redirect the save.
                userSettings.setId(savedUserSettings.getId());
                return userSettingsService.update(userSettings);
            } else {
                throw new CustomException("You don't have permission", HttpStatus.NOT_ACCEPTABLE);
            }
        } else {
            throw new CustomException("Can't get someone else's userSettings", HttpStatus.NOT_ACCEPTABLE);
        }

    }

    @PatchMapping("/{id}/onboarding")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public UserSettings updateOnboarding(@PathVariable("id") Long id,
                                         @Valid @RequestBody OnboardingPreferenceDTO preference,
                                         HttpServletRequest req) {
        User user = userService.whoami(req);
        UserSettings settings = userSettingsService.findById(id)
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        if (user.getUserSettings() == null || !settings.getId().equals(user.getUserSettings().getId())) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        if (preference.getVersion() != 1 || preference.getStatus() == OnboardingStatus.NOT_STARTED) {
            throw new CustomException("Unsupported onboarding state", HttpStatus.BAD_REQUEST);
        }
        return userSettingsService.updateOnboarding(settings, preference.getVersion(), preference.getStatus());
    }

}


