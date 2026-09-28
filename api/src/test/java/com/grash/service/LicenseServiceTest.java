package com.grash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.dto.license.LicenseEntitlement;
import com.grash.repository.KeygenRequestTrackerRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class LicenseServiceTest {

    @Test
    void localPreviewRequiresExplicitFlagDevProfileAndLoopbackApiUrl() {
        LicenseService licenseService = licenseService("dev", true, "http://localhost:3000/api");

        var state = licenseService.getLicensingState();

        assertTrue(state.isPreviewMode());
        assertTrue(state.isValid());
        assertTrue(state.getEntitlements().contains(LicenseEntitlement.RESOURCE_PLANNING.name()));
    }

    @Test
    void localPreviewDoesNotActivateForRemoteApiUrl() {
        LicenseService licenseService = licenseService("dev", true, "https://cmms.example.com/api");

        var state = licenseService.getLicensingState();

        assertFalse(state.isPreviewMode());
        assertFalse(state.isValid());
        assertTrue(state.getEntitlements().isEmpty());
    }

    @Test
    void localPreviewRequiresExplicitFlag() {
        LicenseService licenseService = licenseService("dev", false, "http://localhost:3000/api");

        var state = licenseService.getLicensingState();

        assertFalse(state.isPreviewMode());
        assertFalse(state.isValid());
    }

    private LicenseService licenseService(String profile, boolean previewEnabled, String publicApiUrl) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profile);
        LicenseService licenseService = new LicenseService(
                new ObjectMapper(),
                mock(KeygenRequestTrackerRepository.class),
                environment
        );
        ReflectionTestUtils.setField(licenseService, "licensePreviewEnabled", previewEnabled);
        ReflectionTestUtils.setField(licenseService, "publicApiUrl", publicApiUrl);
        return licenseService;
    }
}
