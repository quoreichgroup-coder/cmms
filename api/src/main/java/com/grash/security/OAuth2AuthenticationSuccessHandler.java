package com.grash.security;

import com.grash.exception.CustomException;
import com.grash.factory.MailServiceFactory;
import com.grash.model.Company;
import com.grash.model.User;
import com.grash.model.Subscription;
import com.grash.model.enums.RoleCode;
import com.grash.repository.UserRepository;
import com.grash.service.*;
import com.grash.utils.Helper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final OAuth2Properties oAuth2Properties;
    private final UserRepository userRepository;
    private final LicenseSeatService licenseSeatService;
    private final PlatformTransactionManager transactionManager;
    private final SubscriptionService subscriptionService;
    private final SubscriptionPlanService subscriptionPlanService;
    private final CurrencyService currencyService;
    private final MailServiceFactory mailServiceFactory;
    private final CompanyService companyService;
    private final RoleService roleService;
    private final RefreshTokenService refreshTokenService;
    private final OAuthLoginGrantService oAuthLoginGrantService;

    @Value("${mail.recipients:#{null}}")
    private String[] recipients;
    @Value("${cloud-version}")
    private boolean cloudVersion;
    @Value("${allowed-organization-admins:}")
    private String[] allowedOrganizationAdmins;
    @Autowired
    @Lazy
    private PasswordEncoder passwordEncoder;
    @Autowired
    private BrandingService brandingService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        if (response.isCommitted()) {
            return;
        }

        String targetUrl = determineTargetUrl(request, response, authentication);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    protected String determineTargetUrl(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) {
        try {
            String targetUrl = oAuth2Properties.getSuccessRedirectUrl();

            // Extract user details and generate token
            OAuth2AuthenticationToken authToken = (OAuth2AuthenticationToken) authentication;
            OAuth2User oauth2User = authToken.getPrincipal();
            Map<String, Object> attributes = oauth2User.getAttributes();

            // Get email from OAuth provider
            String email = extractEmail(attributes, authToken.getAuthorizedClientRegistrationId());

            // Find or create user
            Optional<User> userOptional = userRepository.findByEmailIgnoreCase(email);
            User user;

            if (userOptional.isEmpty()) {
                user = new TransactionTemplate(transactionManager).execute(status ->
                        createUserFromOAuth(email, attributes, authToken.getAuthorizedClientRegistrationId()));
            } else {
                user = userOptional.get();
                String provider = authToken.getAuthorizedClientRegistrationId();
                String providerId = extractProviderId(attributes, provider);
                if (provider.equals(user.getSsoProvider()) && user.getSsoProviderId() != null) {
                    // Already linked: the immutable provider subject must match, not just the email claim.
                    if (!user.getSsoProviderId().equals(providerId))
                        throw new CustomException("SSO identity does not match this account", HttpStatus.FORBIDDEN);
                } else {
                    // First SSO login for an existing account: only link on a provider-verified email,
                    // otherwise anyone able to set an arbitrary email claim could take over the account.
                    if (!isEmailVerified(attributes, provider))
                        throw new CustomException("This account cannot be linked to SSO automatically",
                                HttpStatus.FORBIDDEN);
                    user.setSsoProvider(provider);
                    user.setSsoProviderId(providerId);
                    userRepository.save(user);
                }
            }

            // Keep JWTs and exchange credentials out of the browser URL. The
            // one-time grant is held only in the server-side OAuth session.
            oAuthLoginGrantService.issue(request.getSession(true), refreshTokenService.createTokenPair(user));
            return targetUrl;
        } catch (Exception e) {
            log.error("OAuth login could not be completed ({})", e.getClass().getSimpleName());
            return UriComponentsBuilder.fromUriString(oAuth2Properties.getFailureRedirectUrl())
                    .queryParam("error", "authentication_failed")
                    .build().toUriString();
        }

    }

    private User createUserFromOAuth(String email, Map<String, Object> attributes, String provider) {
        licenseSeatService.lockForUserChanges();
        User user = new User();
        user.setEmail(email);
        String emailDomain = user.getEmail().split("@")[1];
        if (allowedOrganizationAdmins != null && allowedOrganizationAdmins.length != 0
                && Arrays.stream(allowedOrganizationAdmins).noneMatch(email::equalsIgnoreCase))
            throw new CustomException("You are not allowed to create an account without being invited",
                    HttpStatus.NOT_ACCEPTABLE);
        List<User> users = userRepository.findBySSOCompany(emailDomain);
        if (!users.isEmpty())
            throw new CustomException("You must be invited to your organization", HttpStatus.BAD_REQUEST);
        user.setEnabled(true);
        user.setCreatedViaSso(true);
        user.setSsoProvider(provider);
        user.setSsoProviderId(extractProviderId(attributes, provider));
        user.setFirstName(extractFirstName(attributes, provider));
        user.setLastName(extractLastName(attributes, provider));
        user.setUsername(Helper.generateStringId());
        user.setPassword(passwordEncoder.encode(Helper.generateStringId()));

        try {
            Subscription subscription = Subscription.builder()
                    .usersCount(300)
                    .monthly(cloudVersion)
                    .startsOn(new Date())
                    .endsOn(cloudVersion ? Helper.incrementDays(new Date(), 15) : null)
                    .subscriptionPlan(subscriptionPlanService.findByCode("BUSINESS").get())
                    .build();

            subscriptionService.create(subscription);

            Company company = new Company("Organization " + emailDomain, 10, subscription);
            company.getCompanySettings().getGeneralPreferences().setCurrency(currencyService.findByCode("$").get());

            companyService.create(company);

            user.setOwnsCompany(true);
            user.setRole(roleService.findDefaultRoleWithCode(RoleCode.ADMIN).get());

            user.setCompany(company);
            licenseSeatService.checkNewUser(user);
            User savedUser = userRepository.save(user);

            // Send notification to super admins about new SSO account
            if (recipients != null && recipients.length > 0) {
                try {
                    mailServiceFactory.getMailService().sendHtmlMessage(
                            recipients,
                            "New " + brandingService.getBrandConfig().getShortName() + " SSO registration",
                            user.getFirstName() + " " + user.getLastName() +
                                    " just created an account via SSO from company " + company.getName() +
                                    ".\nEmail: " + user.getEmail()
                    );
                } catch (Exception e) {
                    log.error("Failed to send notification email about new SSO user", e);
                }
            }

            return savedUser;
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error creating user from SSO ({})", e.getClass().getSimpleName());
            throw new CustomException("Error creating user from SSO: " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private String extractEmail(Map<String, Object> attributes, String registrationId) {
        String email;

        switch (registrationId) {
            case "google":
                email = (String) attributes.get("email");
                break;
            case "microsoft":
                // Microsoft Entra ID (Azure AD) can return email in different attributes
                email = (String) attributes.get("email");
                if (email == null) {
                    email = (String) attributes.get("preferred_username");
                }
                break;
            default:
                throw new CustomException("Unsupported OAuth2 provider", HttpStatus.BAD_REQUEST);
        }

        if (email == null || email.isEmpty()) {
            throw new CustomException("Email not found from OAuth2 provider", HttpStatus.BAD_REQUEST);
        }

        return email;
    }

    /**
     * Google asserts ownership through {@code email_verified}. Microsoft Entra email claims are not
     * verified by the platform for multi-tenant apps, so they are never trusted for account linking.
     */
    private boolean isEmailVerified(Map<String, Object> attributes, String registrationId) {
        if ("google".equals(registrationId)) {
            Object verified = attributes.get("email_verified");
            return Boolean.TRUE.equals(verified) || "true".equalsIgnoreCase(String.valueOf(verified));
        }
        return false;
    }

    private String extractProviderId(Map<String, Object> attributes, String registrationId) {
        switch (registrationId) {
            case "google":
            case "microsoft":
                return (String) attributes.get("sub");
            default:
                return "unknown";
        }
    }

    private String extractFirstName(Map<String, Object> attributes, String registrationId) {
        switch (registrationId) {
            case "google":
            case "microsoft":
                return (String) attributes.get("given_name");
            default:
                return "User";
        }
    }

    private String extractLastName(Map<String, Object> attributes, String registrationId) {
        switch (registrationId) {
            case "google":
                return (String) attributes.get("family_name");
            case "microsoft":
                String lastName = (String) attributes.get("family_name");
                if (lastName == null) {
                    lastName = "";
                }
                return lastName;
            default:
                return "";
        }
    }
}

