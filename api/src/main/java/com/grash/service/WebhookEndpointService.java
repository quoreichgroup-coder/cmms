package com.grash.service;

import com.grash.dto.license.LicenseEntitlement;
import com.grash.dto.webhookEndpoint.WebhookEndpointPatchDTO;
import com.grash.dto.webhookEndpoint.WebhookEndpointPostDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.WebhookEndpointMapper;
import com.grash.model.*;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.PlanFeatures;
import com.grash.repository.WebhookEndpointRepository;
import com.grash.utils.WebhookUrlValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class WebhookEndpointService {

    private final WebhookEndpointRepository webhookEndpointRepository;
    private final WebhookEndpointMapper webhookEndpointMapper;
    private final LicenseService licenseService;

    public WebhookEndpoint create(WebhookEndpointPostDTO webhookEndpointReq, User user) {
        if (!(licenseService.hasEntitlement(LicenseEntitlement.WEBHOOK)
                && user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)
                && user.getCompany().getSubscription().getSubscriptionPlan().getFeatures()
                .contains(PlanFeatures.WEBHOOK)))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        WebhookUrlValidator.validate(webhookEndpointReq.getUrl());
        if (webhookEndpointReq.getEvent().name().contains("_CHANGE"))
            webhookEndpointReq.setSerialize(true);
        WebhookEndpoint webhookEndpoint = webhookEndpointMapper.fromPostDto(webhookEndpointReq);
        webhookEndpoint.setSecret(generateWebhookSecret());
        return webhookEndpointRepository.save(webhookEndpoint);
    }

    public List<WebhookEndpoint> getActiveEndpointsByCompany(Long companyId) {
        return webhookEndpointRepository.findByCompanyIdAndEnabled(companyId, true);
    }

    public WebhookEndpoint update(Long id, WebhookEndpointPatchDTO webhookEndpointReq, User user) {
        if (!(licenseService.hasEntitlement(LicenseEntitlement.WEBHOOK)
                && user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)
                && user.getCompany().getSubscription().getSubscriptionPlan().getFeatures()
                .contains(PlanFeatures.WEBHOOK)))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        WebhookEndpoint savedWebhookEndpoint = webhookEndpointRepository
                .findByIdAndCompanyId(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        if (webhookEndpointReq.getUrl() != null) {
            WebhookUrlValidator.validate(webhookEndpointReq.getUrl());
        }
        WebhookEndpoint updated = webhookEndpointMapper.updateWebhookEndpoint(
                savedWebhookEndpoint, webhookEndpointReq);
        return webhookEndpointRepository.save(updated);
    }

    public void delete(Long id, User user) {
        WebhookEndpoint endpoint = webhookEndpointRepository
                .findByIdAndCompanyId(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        webhookEndpointRepository.delete(endpoint);
    }


    public String rotateSecret(Long endpointId, Long companyId) {
        WebhookEndpoint endpoint = webhookEndpointRepository
                .findByIdAndCompanyId(endpointId, companyId)
                .orElseThrow(() -> new RuntimeException("Webhook endpoint not found"));

        String newSecret = generateWebhookSecret();
        endpoint.setSecret(newSecret);
        webhookEndpointRepository.save(endpoint);

        return newSecret;
    }

    private String generateWebhookSecret() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return "whsec_" + HexFormat.of().formatHex(bytes);
    }

}
