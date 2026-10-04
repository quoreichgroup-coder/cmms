package com.grash.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.dto.license.LicensingState;
import com.grash.service.LicenseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.servlet.FilterChain;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LicenseReadOnlyFilterTest {
    LicenseService licenses;
    LicenseReadOnlyFilter filter;
    FilterChain chain;

    @BeforeEach
    void setUp() {
        licenses = mock(LicenseService.class);
        filter = new LicenseReadOnlyFilter(licenses, new ObjectMapper());
        ReflectionTestUtils.setField(filter, "enforcementEnabled", true);
        chain = mock(FilterChain.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"POST", "PUT", "PATCH", "DELETE"})
    void expiredLicenseBlocksBusinessChanges(String method) throws Exception {
        when(licenses.getLicensingState()).thenReturn(LicensingState.builder().readOnly(true).build());
        var request = new MockHttpServletRequest(method, "/assets/1");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        assertEquals(423, response.getStatus());
        assertTrue(response.getContentAsString().contains("LICENSE_READ_ONLY"));
        verifyNoInteractions(chain);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/assets/1", "/export/assets"})
    void readAndExportRemainAccessible(String path) throws Exception {
        var request = new MockHttpServletRequest("GET", path);
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        verify(chain).doFilter(request, response);
        verifyNoInteractions(licenses);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/subscriptions/downgrade", "/paddle/cancel", "/paddle/resume"})
    void legacyGetMutationsAreBlocked(String path) throws Exception {
        when(licenses.getLicensingState()).thenReturn(LicensingState.builder().readOnly(true).build());
        var response = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest("GET", path), response, chain);
        assertEquals(423, response.getStatus());
        verifyNoInteractions(chain);
    }

    @Test
    void loginWorksWithServletContextPrefix() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/auth/signin");
        request.setContextPath("/api");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        verify(chain).doFilter(request, response);
        verifyNoInteractions(licenses);
    }

    @Test
    void renewalRemainsAvailableWhenTheLicenseIsReadOnly() throws Exception {
        var request = new MockHttpServletRequest("POST", "/license/activate");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        verify(chain).doFilter(request, response);
        verifyNoInteractions(licenses);
    }

    @Test
    void validLicenseAllowsChanges() throws Exception {
        when(licenses.getLicensingState()).thenReturn(LicensingState.builder().valid(true).build());
        var request = new MockHttpServletRequest("POST", "/assets");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        verify(chain).doFilter(request, response);
    }
}
