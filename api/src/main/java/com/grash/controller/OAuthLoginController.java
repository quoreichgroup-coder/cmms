package com.grash.controller;

import com.grash.dto.AuthResponse;
import com.grash.exception.CustomException;
import com.grash.service.OAuthLoginGrantService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.stream.Stream;

@RestController
@RequestMapping("/auth/oauth")
@RequiredArgsConstructor
public class OAuthLoginController {
    private final OAuthLoginGrantService oAuthLoginGrantService;
    @Value("${frontend.url}")
    private String frontendUrl;
    @Value("${frontend.home-url:}")
    private String frontendHomeUrl;

    @PostMapping("/exchange")
    public ResponseEntity<AuthResponse> exchange(HttpServletRequest httpRequest) {
        validateOrigin(httpRequest.getHeader("Origin"));
        AuthResponse response = AuthResponse.of(oAuthLoginGrantService.consume(httpRequest.getSession(false)));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response);
    }

    private void validateOrigin(String originHeader) {
        if (originHeader == null || Stream.of(frontendUrl, frontendHomeUrl)
                .filter(configuredUrl -> configuredUrl != null && !configuredUrl.isBlank())
                .map(this::toOrigin)
                .noneMatch(configuredOrigin -> configuredOrigin.equals(toOrigin(originHeader)))) {
            throw new CustomException("Invalid request origin", HttpStatus.FORBIDDEN);
        }
    }

    private URI toOrigin(String value) {
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null || !(scheme.equalsIgnoreCase("http")
                    || scheme.equalsIgnoreCase("https"))) return URI.create("invalid://origin");
            int port = uri.getPort();
            if ((scheme.equalsIgnoreCase("http") && port == 80)
                    || (scheme.equalsIgnoreCase("https") && port == 443)) port = -1;
            return new URI(scheme.toLowerCase(), null, host.toLowerCase(), port, null, null, null);
        } catch (Exception ignored) {
            return URI.create("invalid://origin");
        }
    }
}
