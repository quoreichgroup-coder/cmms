package com.grash.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.dto.ProcurementApprovalDTO.SnapshotStep;
import com.grash.exception.CustomException;
import com.grash.model.ProcurementApprovalEvent;
import com.grash.model.enums.Language;
import com.grash.repository.ProcurementApprovalEventRepository;
import com.grash.repository.ProcurementApprovalInstanceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Builds an immutable, tenant-scoped text snapshot for optional PR/PO PDF templates. */
@Service
public class ProcurementApprovalPrintService {
    private final ProcurementApprovalInstanceRepository instances;
    private final ProcurementApprovalEventRepository events;
    private final ObjectMapper objectMapper;

    public ProcurementApprovalPrintService(ProcurementApprovalInstanceRepository instances,
                                           ProcurementApprovalEventRepository events, ObjectMapper objectMapper) {
        this.instances = instances;
        this.events = events;
        this.objectMapper = objectMapper;
    }

    public String history(String documentType, Long documentId, Long companyId, Language language) {
        boolean fr = language == Language.FR;
        if (documentId == null || companyId == null) {
            return fr ? "Historique d’approbation non disponible (document ancien ou sans décision centralisée)."
                    : "Approval history unavailable (legacy document or no centralized decision).";
        }
        var foundInstance = instances.findByCompany_IdAndDocumentTypeAndDocumentId(companyId, documentType, documentId);
        if (foundInstance.isEmpty()) return fr
                ? "Historique d’approbation non disponible (document ancien ou sans décision centralisée)."
                : "Approval history unavailable (legacy document or no centralized decision).";
        var instance = foundInstance.get();
        List<ProcurementApprovalEvent> records = events.findByCompany_IdAndDocumentTypeAndDocumentIdOrderByCreatedAtAscIdAsc(
                companyId, documentType, documentId);
        List<SnapshotStep> steps = snapshot(instance.getSteps());
        List<String> lines = new ArrayList<>();
        ProcurementApprovalEvent first = records.isEmpty() ? null : records.get(0);
        String policyName = instance.getPolicyName() != null ? instance.getPolicyName() : first == null ? null : first.getPolicyName();
        long policyVersion = instance.getPolicyVersion() > 0 ? instance.getPolicyVersion() : first == null ? 0 : first.getPolicyVersion();
        if (policyName != null && !policyName.isBlank())
            lines.add((fr ? "Politique : " : "Policy: ") + safe(policyName) + " (v" + policyVersion + ")");
        java.util.Set<ProcurementApprovalEvent> emitted = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        for (int index = 0; index < steps.size(); index++) {
            SnapshotStep step = steps.get(index);
            int number = index + 1;
            if (!step.isRequired()) {
                lines.add(number + ". " + safe(step.name()) + " — "
                        + (fr ? "Étape facultative ignorée automatiquement" : "Optional step skipped automatically"));
            } else {
                for (ProcurementApprovalEvent event : records) {
                    if (event.getLevelNumber() != null && event.getLevelNumber() == number) {
                        lines.add(format(event, fr));
                        emitted.add(event);
                    }
                }
            }
        }
        for (ProcurementApprovalEvent event : records) {
            if (!emitted.contains(event)) lines.add(format(event, fr));
        }
        if (records.isEmpty()) lines.add(fr ? "Aucune décision enregistrée." : "No decisions recorded.");
        return String.join("\n", lines);
    }

    private List<SnapshotStep> snapshot(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, new TypeReference<>() { }); }
        catch (Exception e) { throw new CustomException("approval_data_unreadable", HttpStatus.INTERNAL_SERVER_ERROR); }
    }

    private String format(ProcurementApprovalEvent event, boolean fr) {
        String action = switch (event.getAction() == null ? "" : event.getAction()) {
            case "APPROVED" -> fr ? "Approuvé" : "Approved";
            case "REJECTED" -> fr ? "Refusé" : "Rejected";
            case "REASSIGNED" -> fr ? "Réaffecté" : "Reassigned";
            default -> safe(event.getAction());
        };
        String date = event.getCreatedAt() == null ? "" : " — " + Instant.ofEpochMilli(event.getCreatedAt().getTime());
        String line = (event.getLevelNumber() == null ? "" : event.getLevelNumber() + ". ")
                + safe(event.getLevelName()) + " — " + action + " — " + safe(event.getActorName()) + date;
        if (event.getComment() != null && !event.getComment().isBlank()) line += " — " + event.getComment().trim();
        return line;
    }

    private String safe(String value) { return value == null || value.isBlank() ? "—" : value.trim(); }
}
