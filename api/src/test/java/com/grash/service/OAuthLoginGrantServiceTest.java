package com.grash.service;

import com.grash.dto.AuthTokens;
import com.grash.exception.CustomException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

import java.util.Date;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

class OAuthLoginGrantServiceTest {

    private final OAuthLoginGrantService service = new OAuthLoginGrantService();

    @Test
    void grantCanBeExchangedOnlyOnceInIssuingSession() {
        MockHttpSession session = new MockHttpSession();
        AuthTokens expected = new AuthTokens("access", "refresh", new Date());
        service.issue(session, expected);

        assertEquals(expected, service.consume(session));
        assertThrows(CustomException.class, () -> service.consume(session));
    }

    @Test
    void grantCannotBeExchangedFromAnotherSession() {
        service.issue(new MockHttpSession(), new AuthTokens("a", "r", new Date()));

        assertThrows(CustomException.class, () -> service.consume(new MockHttpSession()));
    }

    @Test
    void grantExpiresAtTheSixtySecondBoundary() {
        AtomicLong now = new AtomicLong(1_000L);
        OAuthLoginGrantService clockedService = new OAuthLoginGrantService(now::get);
        AuthTokens expected = new AuthTokens("access", "refresh", new Date());
        MockHttpSession validSession = new MockHttpSession();
        clockedService.issue(validSession, expected);

        now.set(60_999L);
        assertEquals(expected, clockedService.consume(validSession));

        now.set(2_000L);
        MockHttpSession expiredSession = new MockHttpSession();
        clockedService.issue(expiredSession, expected);
        now.set(62_000L);

        assertThrows(CustomException.class, () -> clockedService.consume(expiredSession));
    }
}
