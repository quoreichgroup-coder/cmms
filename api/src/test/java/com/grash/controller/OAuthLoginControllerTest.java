package com.grash.controller;

import com.grash.dto.AuthTokens;
import com.grash.exception.CustomException;
import com.grash.service.OAuthLoginGrantService;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OAuthLoginControllerTest {
    private final OAuthLoginGrantService grantService = mock(OAuthLoginGrantService.class);
    private final OAuthLoginController controller = new OAuthLoginController(grantService);

    @BeforeEach
    void configureAllowedFrontendOrigins() {
        ReflectionTestUtils.setField(controller, "frontendUrl", "https://qpm.example/app");
        ReflectionTestUtils.setField(controller, "frontendHomeUrl", "https://www.qpm.example/");
    }

    @Test
    void exchangeAcceptsConfiguredOriginAndDisablesCaching() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        HttpSession session = new MockHttpSession();
        request.addHeader("Origin", "https://qpm.example");
        request.setSession((MockHttpSession) session);
        when(grantService.consume(session)).thenReturn(new AuthTokens("access", "refresh", new Date()));

        var response = controller.exchange(request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("no-store", response.getHeaders().getCacheControl());
        assertEquals("access", response.getBody().getAccessToken());
        verify(grantService).consume(session);
    }

    @Test
    void exchangeRejectsUnconfiguredOriginBeforeConsumingGrant() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Origin", "https://attacker.example");

        assertThrows(CustomException.class, () -> controller.exchange(request));
        verifyNoInteractions(grantService);
    }

    @Test
    void exchangeRejectsMissingOriginBeforeConsumingGrant() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThrows(CustomException.class, () -> controller.exchange(request));
        verifyNoInteractions(grantService);
    }
}
