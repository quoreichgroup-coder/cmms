package com.grash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.model.ProcurementApprovalEvent;
import com.grash.model.ProcurementApprovalInstance;
import com.grash.model.enums.Language;
import com.grash.repository.ProcurementApprovalEventRepository;
import com.grash.repository.ProcurementApprovalInstanceRepository;
import org.junit.jupiter.api.Test;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProcurementApprovalPrintServiceTest {
    private final ProcurementApprovalInstanceRepository instances = mock(ProcurementApprovalInstanceRepository.class);
    private final ProcurementApprovalEventRepository events = mock(ProcurementApprovalEventRepository.class);
    private final ProcurementApprovalPrintService service = new ProcurementApprovalPrintService(instances, events, new ObjectMapper());

    @Test
    void formatsTenantScopedDecisionSnapshotsForApprovalAnnex() {
        when(instances.findByCompany_IdAndDocumentTypeAndDocumentId(9L, "PO", 70L))
                .thenReturn(Optional.of(new ProcurementApprovalInstance()));
        ProcurementApprovalEvent event = new ProcurementApprovalEvent();
        event.setLevelNumber(1); event.setLevelName("Finance"); event.setPolicyName("Standard PO");
        event.setPolicyVersion(3); event.setActorName("Awa Kone"); event.setAction("APPROVED");
        event.setCreatedAt(new Date(0)); event.setComment("Contrôlé");
        ProcurementApprovalEvent reassignment = new ProcurementApprovalEvent();
        reassignment.setLevelNumber(1);
        reassignment.setLevelName("Finance → User 40"); reassignment.setPolicyName("Standard PO");
        reassignment.setPolicyVersion(3); reassignment.setActorName("Admin QPM"); reassignment.setAction("REASSIGNED");
        reassignment.setCreatedAt(new Date(1000)); reassignment.setComment("Approver disabled");
        when(events.findByCompany_IdAndDocumentTypeAndDocumentIdOrderByCreatedAtAscIdAsc(9L, "PO", 70L))
                .thenReturn(List.of(event, reassignment));

        String history = service.history("PO", 70L, 9L, Language.FR);

        assertTrue(history.contains("Politique : Standard PO (v3)"));
        assertTrue(history.contains("1. Finance — Approuvé — Awa Kone"));
        assertTrue(history.contains("1970-01-01T00:00:00Z"));
        assertTrue(history.contains("Contrôlé"));
        assertTrue(history.contains("Finance → User 40 — Réaffecté — Admin QPM"));
        assertTrue(history.contains("Approver disabled"));
        verify(events).findByCompany_IdAndDocumentTypeAndDocumentIdOrderByCreatedAtAscIdAsc(9L, "PO", 70L);
    }

    @Test
    void approvalAppendixShowsSkippedOptionalLevelsInConfiguredOrder() {
        ProcurementApprovalInstance instance = new ProcurementApprovalInstance();
        instance.setPolicyName("PR controls"); instance.setPolicyVersion(4L);
        instance.setSteps("[{\"name\":\"Optional review\",\"approverType\":\"ROLE\",\"candidates\":[],\"required\":false},"
                + "{\"name\":\"Finance\",\"approverType\":\"USER\",\"approverName\":\"Awa Kone\",\"candidates\":[11]}]");
        when(instances.findByCompany_IdAndDocumentTypeAndDocumentId(9L, "PR", 71L)).thenReturn(Optional.of(instance));
        ProcurementApprovalEvent decision = new ProcurementApprovalEvent();
        decision.setLevelNumber(2); decision.setLevelName("Finance"); decision.setActorName("Awa Kone");
        decision.setAction("APPROVED"); decision.setCreatedAt(new Date(0));
        when(events.findByCompany_IdAndDocumentTypeAndDocumentIdOrderByCreatedAtAscIdAsc(9L, "PR", 71L))
                .thenReturn(List.of(decision));

        String history = service.history("PR", 71L, 9L, Language.FR);

        assertTrue(history.contains("1. Optional review — Étape facultative ignorée automatiquement"));
        assertTrue(history.contains("2. Finance — Approuvé — Awa Kone"));
        assertTrue(history.indexOf("1. Optional review") < history.indexOf("2. Finance"));
    }

    @Test
    void clearlyLabelsLegacyDocumentsWithoutCentralizedApproval() {
        when(instances.findByCompany_IdAndDocumentTypeAndDocumentId(4L, "PR", 31L)).thenReturn(Optional.empty());

        String history = service.history("PR", 31L, 4L, Language.FR);

        assertTrue(history.contains("document ancien"));
        verifyNoInteractions(events);
    }

    @Test
    void distinguishesPendingPoliciesWithNoDecisionsFromLegacyDocuments() {
        when(instances.findByCompany_IdAndDocumentTypeAndDocumentId(4L, "PR", 32L))
                .thenReturn(Optional.of(new ProcurementApprovalInstance()));

        assertEquals("Aucune décision enregistrée.", service.history("PR", 32L, 4L, Language.FR));
    }
}
