package com.grash.service;

import com.grash.dto.AuthTokens;
import com.grash.exception.CustomException;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.Serializable;
import java.util.concurrent.atomic.AtomicBoolean;

/** One-time OAuth token handoff bound to the browser's server-side OAuth session. */
@Service
public class OAuthLoginGrantService {
    private static final String SESSION_ATTRIBUTE = OAuthLoginGrantService.class.getName() + ".pendingGrant";
    private static final long TTL_MILLIS = 60_000L;

    public void issue(HttpSession session, AuthTokens tokens) {
        synchronized (session) {
            session.setAttribute(SESSION_ATTRIBUTE,
                    new PendingGrant(tokens, System.currentTimeMillis() + TTL_MILLIS));
        }
    }

    public AuthTokens consume(HttpSession session) {
        if (session == null) throw invalidGrant();
        synchronized (session) {
            Object stored = session.getAttribute(SESSION_ATTRIBUTE);
            PendingGrant grant = stored instanceof PendingGrant pending ? pending : null;
            if (grant == null || grant.expiresAt() <= System.currentTimeMillis()
                    || !grant.consumed().compareAndSet(false, true)) {
                throw invalidGrant();
            }
            session.removeAttribute(SESSION_ATTRIBUTE);
            return grant.tokens();
        }
    }

    private CustomException invalidGrant() {
        return new CustomException("Invalid or expired OAuth login session", HttpStatus.UNAUTHORIZED);
    }

    private record PendingGrant(AuthTokens tokens, long expiresAt, AtomicBoolean consumed) implements Serializable {
        private static final long serialVersionUID = 1L;

        private PendingGrant(AuthTokens tokens, long expiresAt) {
            this(tokens, expiresAt, new AtomicBoolean());
        }
    }
}
