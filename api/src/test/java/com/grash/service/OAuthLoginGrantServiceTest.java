package com.grash.service;

import com.grash.dto.AuthTokens;
import com.grash.exception.CustomException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

import java.util.Date;

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
}
