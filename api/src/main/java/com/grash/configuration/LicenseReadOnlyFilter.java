package com.grash.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.service.LicenseService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class LicenseReadOnlyFilter extends OncePerRequestFilter {
    private static final Set<String> ALLOWED_MUTATIONS = Set.of(
            "/auth/signin", "/auth/signin-ldap", "/auth/refresh", "/auth/logout", "/auth/updatepwd",
            "/auth/activate-account", "/auth/reset-pwd-confirm", "/auth/delete-account-confirm",
            "/paddle/create-checkout-session", "/license/activate");
    private static final Set<String> LEGACY_MUTATING_GETS = Set.of(
            "/subscriptions/downgrade", "/paddle/cancel", "/paddle/resume");
    private final LicenseService licenseService;
    private final ObjectMapper objectMapper;
    @Value("${license.read-only-enforcement:true}")
    private boolean enforcementEnabled;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!enforcementEnabled) return true;
        String path = request.getRequestURI().substring(request.getContextPath().length());
        String method = request.getMethod();
        if ("OPTIONS".equals(method)) return true;
        if ("HEAD".equals(method)) return !LEGACY_MUTATING_GETS.contains(path);
        if (ALLOWED_MUTATIONS.contains(path) || path.equals("/webhooks") || path.startsWith("/webhooks/")) return true;
        if ("GET".equals(method)) return !LEGACY_MUTATING_GETS.contains(path);
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!licenseService.getLicensingState().isReadOnly()) {
            filterChain.doFilter(request, response);
            return;
        }
        response.setStatus(423);
        response.setContentType("application/json");
        objectMapper.writeValue(response.getOutputStream(), Map.of(
                "status", 423,
                "code", "LICENSE_READ_ONLY",
                "message", "The license has expired. Data remains available in read-only mode; renew the license to resume changes."
        ));
    }
}
