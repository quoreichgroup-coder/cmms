package com.grash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.grash.dto.license.LicenseEntitlement;
import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.WebhookEndpoint;
import com.grash.model.WebhookOutboxEvent;
import com.grash.model.WorkOrderCategory;
import com.grash.model.enums.AssetStatus;
import com.grash.model.enums.PlanFeatures;
import com.grash.model.enums.Status;
import com.grash.model.enums.webhook.PartField;
import com.grash.model.enums.webhook.WOField;
import com.grash.model.enums.webhook.WebhookEvent;
import com.grash.repository.CompanyRepository;
import com.grash.repository.WebhookEndpointRepository;
import com.grash.utils.WebhookUrlValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookDispatchService {

    private final WebhookEndpointRepository webhookEndpointRepository;
    private final CompanyRepository companyRepository;
    private final RestTemplate restTemplate = WebhookHttpClientFactory.create();
    private final ObjectMapper objectMapper;
    private final LicenseService licenseService;

    @Async
    public void dispatchWebhook(
            Company company,
            WebhookEvent eventType,
            Map<String, Object> result,
            String serializedField,
            Object serializedPayload,
            Collection<WOField> changedFields,
            AssetStatus assetStatus,
            Status workOrderStatus,
            Collection<WorkOrderCategory> workOrderCategories,
            Collection<PartField> partFields
    ) {
        // Reload company in the async thread's session to avoid LazyInitializationException
        Company managedCompany = companyRepository.findByIdWithSubscription(company.getId()).orElse(null);
        if (managedCompany == null) return;

        if (!(licenseService.hasEntitlement(LicenseEntitlement.WEBHOOK) && managedCompany.getSubscription().getSubscriptionPlan().getFeatures().contains(PlanFeatures.WEBHOOK)))
            return;
        List<WebhookEndpoint> endpoints = webhookEndpointRepository
                .findByCompanyIdAndEnabled(managedCompany.getId(), true)
                .stream()
                .filter(endpoint -> endpoint.getEvent().equals(eventType))
                .filter(endpoint -> {
                    if (changedFields != null && !changedFields.isEmpty()
                            && endpoint.getWoFields() != null && !endpoint.getWoFields().isEmpty()) {
                        if (changedFields.stream().noneMatch(endpoint.getWoFields()::contains)) {
                            return false;
                        }
                    }
                    if (assetStatus != null
                            && endpoint.getAssetStatuses() != null && !endpoint.getAssetStatuses().isEmpty()) {
                        if (!endpoint.getAssetStatuses().contains(assetStatus)) {
                            return false;
                        }
                    }
                    if (workOrderStatus != null
                            && endpoint.getWorkOrderStatuses() != null && !endpoint.getWorkOrderStatuses().isEmpty()) {
                        if (!endpoint.getWorkOrderStatuses().contains(workOrderStatus)) {
                            return false;
                        }
                    }
                    if (workOrderCategories != null && !workOrderCategories.isEmpty()
                            && endpoint.getWorkOrderCategories() != null && !endpoint.getWorkOrderCategories().isEmpty()) {
                        Set<Long> endpointCategoryIds = endpoint.getWorkOrderCategories().stream()
                                .map(WorkOrderCategory::getId)
                                .collect(Collectors.toSet());
                        if (workOrderCategories.stream().noneMatch(cat -> endpointCategoryIds.contains(cat.getId()))) {
                            return false;
                        }
                    }
                    if (partFields != null && !partFields.isEmpty()
                            && endpoint.getPartFields() != null && !endpoint.getPartFields().isEmpty()) {
                        if (partFields.stream().noneMatch(endpoint.getPartFields()::contains)) {
                            return false;
                        }
                    }
                    return true;
                })
                .toList();
        result.put("occurredAt", new Date());
        result.put("companyId", managedCompany.getId());
        for (WebhookEndpoint endpoint : endpoints) {
            try {
                result.put(serializedField, endpoint.isSerialize() ? serializedPayload : null);
                sendWebhook(endpoint, eventType, result);
                endpoint.setLastTriggeredAt(new Date());
                webhookEndpointRepository.save(endpoint);

            } catch (Exception e) {
                // Do not log the full URL: webhook URLs can contain bearer-like tokens in their query string.
                Throwable cause = e;
                while (cause.getCause() != null && cause.getCause() != cause) {
                    cause = cause.getCause();
                }
                log.warn("Webhook delivery failed (endpointId={}, event={}, cause={})",
                        endpoint.getId(), eventType, cause.getClass().getSimpleName());
            }
        }
    }

    /** Synchronous delivery used by the persistent PO outbox worker. */
    public void dispatchOutboxEvent(WebhookOutboxEvent outboxEvent) {
        Company company = companyRepository.findByIdWithSubscription(outboxEvent.getCompanyId()).orElse(null);
        if (company == null) return;
        if (!(licenseService.hasEntitlement(LicenseEntitlement.WEBHOOK)
                && company.getSubscription().getSubscriptionPlan().getFeatures().contains(PlanFeatures.WEBHOOK))) {
            return;
        }

        Set<Long> subscribedEndpointIds = readEndpointIds(outboxEvent.getEndpointIds());
        List<WebhookEndpoint> endpoints = webhookEndpointRepository
                .findByCompanyIdAndEnabled(company.getId(), true).stream()
                .filter(endpoint -> endpoint.getEvent() == outboxEvent.getEventType())
                .filter(endpoint -> subscribedEndpointIds.contains(endpoint.getId()))
                .toList();
        if (endpoints.isEmpty()) return;

        Map<String, Object> basePayload = readPayload(outboxEvent.getPayload());
        Map<String, Object> serializedPayload = readPayload(outboxEvent.getSerializedPayload());
        basePayload.put("occurredAt", outboxEvent.getCreatedAt());
        basePayload.put("companyId", company.getId());
        boolean failed = false;
        for (WebhookEndpoint endpoint : endpoints) {
            try {
                Map<String, Object> endpointPayload = new HashMap<>(basePayload);
                endpointPayload.put("purchaseOrder", endpoint.isSerialize() ? serializedPayload : null);
                String deliveryId = outboxEvent.getEventKey() + "-" + endpoint.getId();
                sendWebhook(endpoint, outboxEvent.getEventType(), endpointPayload, deliveryId);
                endpoint.setLastTriggeredAt(new Date());
                webhookEndpointRepository.save(endpoint);
            } catch (Exception exception) {
                failed = true;
                log.warn("PO webhook delivery failed (outboxId={}, endpointId={}, event={}, cause={})",
                        outboxEvent.getId(), endpoint.getId(), outboxEvent.getEventType(),
                        rootCause(exception).getClass().getSimpleName());
            }
        }
        if (failed) throw new IllegalStateException("One or more PO webhook deliveries failed");
    }

    private Map<String, Object> readPayload(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid persisted webhook payload", exception);
        }
    }

    private Set<Long> readEndpointIds(String json) {
        try {
            return new HashSet<>(objectMapper.readValue(json, new TypeReference<List<Long>>() {}));
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid persisted webhook endpoint list", exception);
        }
    }

    private Throwable rootCause(Throwable failure) {
        Throwable cause = failure;
        while (cause.getCause() != null && cause.getCause() != cause) cause = cause.getCause();
        return cause;
    }

    private void sendWebhook(WebhookEndpoint endpoint, WebhookEvent eventType, Object payload) {
        sendWebhook(endpoint, eventType, payload, UUID.randomUUID().toString());
    }

    private void sendWebhook(WebhookEndpoint endpoint, WebhookEvent eventType, Object payload, String deliveryId) {
        try {
            WebhookUrlValidator.validate(endpoint.getUrl());
            String jsonPayload = objectMapper.writeValueAsString(payload);
            String signature = generateSignature(jsonPayload, endpoint.getSecret());
            String timestamp = String.valueOf(System.currentTimeMillis());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Webhook-Signature", signature);
            headers.set("X-Webhook-Timestamp", timestamp);
            headers.set("X-Webhook-Id", deliveryId);
            headers.set("X-Webhook-Event", eventType.name());

            HttpEntity<String> request = new HttpEntity<>(jsonPayload, headers);

            HttpStatusCode status = restTemplate.execute(
                    endpoint.getUrl(),
                    HttpMethod.POST,
                    outboundRequest -> {
                        outboundRequest.getHeaders().putAll(request.getHeaders());
                        WebhookHttpClientFactory.writeJsonPayload(
                                outboundRequest.getBody(), jsonPayload);
                    },
                    response -> response.getStatusCode()
            );

            if (status == null || !status.is2xxSuccessful()) {
                throw new RuntimeException("Webhook failed with status: " + status);
            }

        } catch (Exception e) {
            throw new RuntimeException("Failed to send webhook", e);
        }
    }

    private String generateSignature(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            );
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate signature", e);
        }
    }
}
