package com.grash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.dto.ProcurementApprovalDTO.*;
import com.grash.exception.CustomException;
import com.grash.model.*;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProcurementApprovalServiceTest {
    @Mock ProcurementApprovalPolicyRepository policies;
    @Mock ProcurementApprovalInstanceRepository instances;
    @Mock ProcurementApprovalEventRepository events;
    @Mock CompanyRepository companies;
    @Mock UserRepository users;
    ProcurementApprovalService service;
    ObjectMapper json = new ObjectMapper();
    Company company;
    User requester;
    User first;
    User second;
    User third;

    @BeforeEach void setup() {
        company = new Company(); company.setId(1L);
        CompanySettings settings = new CompanySettings(company);
        com.grash.model.Currency currency = new com.grash.model.Currency(); currency.setCode("XOF");
        settings.getGeneralPreferences().setCurrency(currency);
        company.setCompanySettings(settings);
        requester = person(10L, 100L);
        first = person(20L, 200L);
        second = person(30L, 300L);
        third = person(40L, 400L);
        service = new ProcurementApprovalService(policies, instances, events, companies, users, json);
    }

    User person(long id, long roleId) {
        Role role = new Role(); role.setId(roleId); role.setName("Role " + roleId);
        role.setEditOtherPermissions(new HashSet<>(Set.of(PermissionEntity.PURCHASE_REQUISITION_APPROVAL, PermissionEntity.PURCHASE_ORDER_APPROVAL)));
        role.setViewPermissions(new HashSet<>(Set.of(PermissionEntity.PURCHASE_ORDERS)));
        role.setViewOtherPermissions(new HashSet<>(Set.of(PermissionEntity.PURCHASE_ORDERS)));
        User user = new User(); user.setId(id); user.setCompany(company); user.setRole(role);
        user.setFirstName("User"); user.setLastName(String.valueOf(id)); user.setEnabled(true); user.setEnabledInSubscription(true);
        return user;
    }

    ProcurementApprovalPolicy policy() throws Exception {
        var policy = new ProcurementApprovalPolicy(); policy.setId(90L); policy.setCompany(company);
        policy.setName("Sequential"); policy.setDocumentType("PR"); policy.setStatus("ACTIVE"); policy.setVersion(3L);
        policy.setPriority(100); policy.setConditions("[]");
        policy.setLevels(json.writeValueAsString(List.of(new Level("First", "USER", first.getId()), new Level("Second", "USER", second.getId()))));
        return policy;
    }

    ProcurementApprovalInstance instance(String type) throws Exception {
        var instance = new ProcurementApprovalInstance(); instance.setId(50L); instance.setCompany(company);
        instance.setDocumentType(type); instance.setDocumentId(60L); instance.setDocumentName("Document");
        instance.setPolicyId(90L); instance.setPolicyName("Frozen name"); instance.setPolicyVersion(3L); instance.setRequesterId(requester.getId());
        instance.setSteps(json.writeValueAsString(List.of(
                new SnapshotStep("First", "USER", first.getId(), "First user", List.of(first.getId())),
                new SnapshotStep("Second", "USER", second.getId(), "Second user", List.of(second.getId())))));
        when(instances.lockDocument(1L, type, 60L)).thenReturn(Optional.of(instance));
        return instance;
    }

    void assertFailure(HttpStatus status, String message, Runnable action) {
        var error = assertThrows(CustomException.class, action::run);
        assertEquals(status, error.getHttpStatus()); assertEquals(message, error.getMessage());
    }

    @Test void noPolicyPreservesLegacyModeWithoutAutoApproving() {
        assertFalse(service.start("PR", 60L, "Document", 10L, company));
        verify(instances, never()).saveAndFlush(any());
    }

    @Test void optionalLevelsAreSkippedAndKeepTheirConfiguredSequenceNumbers() throws Exception {
        var policy = policy();
        policy.setLevels(json.writeValueAsString(List.of(
                new Level("Optional review", "USER", null, false),
                new Level("Finance", "USER", second.getId(), true))));
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PR", "ACTIVE"))
                .thenReturn(List.of(policy));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(requester, second));
        assertTrue(service.start("PR", 60L, "Document", requester.getId(), company));
        var captor = org.mockito.ArgumentCaptor.forClass(ProcurementApprovalInstance.class);
        verify(instances).saveAndFlush(captor.capture());
        var instance = captor.getValue();
        assertEquals(1, instance.getCurrentStep());
        when(instances.lockDocument(1L, "PR", 60L)).thenReturn(Optional.of(instance));
        when(events.findByInstanceIdOrderByLevelNumberAsc(instance.getId())).thenReturn(List.of());
        assertTrue(service.decide("PR", 60L, 1L, second, true, null));
        var eventCaptor = org.mockito.ArgumentCaptor.forClass(ProcurementApprovalEvent.class);
        verify(events).saveAndFlush(eventCaptor.capture());
        assertEquals(2, eventCaptor.getValue().getLevelNumber());
        assertEquals("APPROVED", instance.getStatus());
    }

    @Test void legacyLevelWithoutRequiredFlagRemainsMandatory() throws Exception {
        var policy = policy();
        policy.setLevels("[{\"name\":\"Legacy\",\"approverType\":\"USER\",\"approverId\":20}]");
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PR", "ACTIVE"))
                .thenReturn(List.of(policy));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(requester, first));
        assertTrue(service.start("PR", 60L, "Document", requester.getId(), company));
        var captor = org.mockito.ArgumentCaptor.forClass(ProcurementApprovalInstance.class);
        verify(instances).saveAndFlush(captor.capture());
        List<SnapshotStep> snapshot = json.readValue(captor.getValue().getSteps(),
                new com.fasterxml.jackson.core.type.TypeReference<>() { });
        var step = snapshot.get(0);
        assertTrue(step.isRequired());
        assertEquals(List.of(first.getId()), step.candidates());
    }

    @Test void activationRejectsPoliciesWithOnlyOptionalLevels() throws Exception {
        var draft = policy();
        draft.setStatus("DRAFT");
        draft.setLevels(json.writeValueAsString(List.of(new Level("Optional", "USER", null, false))));
        when(companies.lockForApprovalPolicies(1L)).thenReturn(Optional.of(company));
        when(policies.findByIdAndCompany_Id(90L, 1L)).thenReturn(Optional.of(draft));
        assertFailure(HttpStatus.BAD_REQUEST, "approval_levels_required", () -> service.setActive(90L, 3L, true, requester));
        assertEquals("DRAFT", draft.getStatus());
        verify(policies, never()).saveAndFlush(any());
    }

    @Test void purchaseOrderAmountUsesFrozenLineCostWhenAvailable() {
        Part part = new Part();
        part.setCost(900d);
        PartQuantity line = new PartQuantity(part, null, null, 3d);
        line.setPurchaseUnitCostSnapshot(new java.math.BigDecimal("12.5000"));

        assertEquals(0, new java.math.BigDecimal("37.5000").compareTo(
                ProcurementApprovalService.estimatePurchaseOrderAmount(List.of(line))));
    }

    @Test void purchaseOrderAmountPrefersSupplierAgreedPriceToInventoryEstimate() {
        Part part = new Part(); part.setCost(900d);
        PartQuantity line = new PartQuantity(part, null, null, 3d);
        line.setPurchaseUnitCostSnapshot(new java.math.BigDecimal("12.5000"));
        line.setPurchaseUnitPrice(new java.math.BigDecimal("21.2500"));

        assertEquals(0, new java.math.BigDecimal("63.7500").compareTo(
                ProcurementApprovalService.estimatePurchaseOrderAmount(List.of(line))));
    }

    @Test void purchaseOrderAmountRejectsTotalsThatWouldOverflowUiAndNotificationNumbers() {
        Part part = new Part();
        PartQuantity line = new PartQuantity(part, null, null, Double.MAX_VALUE);
        line.setPurchaseUnitPrice(new java.math.BigDecimal("2"));

        assertFailure(HttpStatus.BAD_REQUEST, "approval_invalid_amount_snapshot",
                () -> ProcurementApprovalService.estimatePurchaseOrderAmount(List.of(line)));
    }

    @Test void activatedPolicyRemainsManagedAfterDeactivation() {
        when(policies.existsByCompany_IdAndDocumentTypeAndActivatedAtIsNotNull(1L, "PR")).thenReturn(true);
        assertTrue(service.hasActivatedPolicy("PR", 1L));
    }

    @Test void deactivatedLastPolicyBlocksNewDocumentsInsteadOfFallingBack() {
        when(policies.existsByCompany_IdAndDocumentTypeAndActivatedAtIsNotNull(1L, "PR")).thenReturn(true);
        assertFailure(HttpStatus.CONFLICT, "approval_no_active_policy", () -> service.start("PR", 60L, "Document", 10L, company));
    }

    @Test void submissionSnapshotsVersionAndExcludesRequesterFromRoleCandidates() throws Exception {
        var policy = policy();
        policy.setLevels(json.writeValueAsString(List.of(new Level("Team", "ROLE", first.getRole().getId()))));
        requester.setRole(first.getRole());
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PR", "ACTIVE")).thenReturn(List.of(policy));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(requester, first));
        assertTrue(service.start("PR", 60L, "Document", 10L, company));
        var captor = org.mockito.ArgumentCaptor.forClass(ProcurementApprovalInstance.class);
        verify(instances).saveAndFlush(captor.capture());
        var frozen = captor.getValue();
        assertEquals(3, frozen.getPolicyVersion());
        assertEquals(List.of(20L), json.convertValue(json.readTree(frozen.getSteps()).get(0).get("candidates"),
                new com.fasterxml.jackson.core.type.TypeReference<List<Long>>() { }));
        policy.setName("Changed"); policy.setVersion(4L);
        assertEquals("Sequential", frozen.getPolicyName()); assertEquals(3, frozen.getPolicyVersion());
    }

    @Test void soleRequesterCannotBeAnApprover() throws Exception {
        var policy = policy(); policy.setLevels(json.writeValueAsString(List.of(new Level("Self", "USER", 10L))));
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PR", "ACTIVE")).thenReturn(List.of(policy));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(requester));
        assertFailure(HttpStatus.CONFLICT, "approval_approver_unavailable", () -> service.start("PR", 60L, "Document", 10L, company));
    }

    @Test void purchaseOrderApproverMustAlsoBeAbleToViewOtherOrders() throws Exception {
        var policy = policy(); policy.setDocumentType("PO");
        policy.setLevels(json.writeValueAsString(List.of(new Level("Finance", "USER", first.getId()))));
        first.getRole().getViewOtherPermissions().clear();
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PO", "ACTIVE")).thenReturn(List.of(policy));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(first, second));

        assertFailure(HttpStatus.CONFLICT, "approval_approver_unavailable", () ->
                service.start("PO", 70L, "PO 70", requester.getId(), company));
        verify(instances, never()).saveAndFlush(any());
    }

    @Test void overlappingRolesNeedEnoughDistinctPeopleForEveryLevel() throws Exception {
        var policy = policy(); policy.setLevels(json.writeValueAsString(List.of(new Level("One", "ROLE", 200L), new Level("Two", "ROLE", 200L))));
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PR", "ACTIVE")).thenReturn(List.of(policy));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(first));
        assertFailure(HttpStatus.CONFLICT, "approval_distinct_approvers", () -> service.start("PR", 60L, "Document", 10L, company));
    }

    @Test void firstVoteDoesNotApproveDocumentAndFinalVoteDoes() throws Exception {
        var instance = instance("PR");
        assertEquals(Boolean.FALSE, service.decide("PR", 60L, 1L, first, true, null));
        assertEquals("PENDING", instance.getStatus()); assertEquals(1, instance.getCurrentStep());
        assertEquals(Boolean.TRUE, service.decide("PR", 60L, 1L, second, true, null));
        assertEquals("APPROVED", instance.getStatus());
        verify(events, times(2)).saveAndFlush(any());
    }

    @Test void requesterAndWrongStepCannotDecide() throws Exception {
        instance("PR");
        assertFailure(HttpStatus.FORBIDDEN, "approval_not_assigned", () -> service.decide("PR", 60L, 1L, requester, true, null));
        assertFailure(HttpStatus.FORBIDDEN, "approval_not_assigned", () -> service.decide("PR", 60L, 1L, second, true, null));
        verify(events, never()).saveAndFlush(any());
    }

    @Test void automationCannotDecidePolicyManagedPurchaseOrder() throws Exception {
        instance("PO");
        assertFailure(HttpStatus.FORBIDDEN, "approval_not_assigned", () -> service.decide("PO", 60L, 1L, null, true, null));
    }

    @Test void disabledAndCrossCompanyActorsCannotDecide() throws Exception {
        instance("PR"); first.setEnabled(false);
        assertFailure(HttpStatus.FORBIDDEN, "approval_not_assigned", () -> service.decide("PR", 60L, 1L, first, true, null));
        first.setEnabled(true); Company other = new Company(); other.setId(2L); first.setCompany(other);
        assertFailure(HttpStatus.FORBIDDEN, "approval_not_assigned", () -> service.decide("PR", 60L, 1L, first, true, null));
    }

    @Test void rejectionRequiresReasonAndStopsTheWholeChain() throws Exception {
        var instance = instance("PR");
        assertFailure(HttpStatus.BAD_REQUEST, "approval_rejection_reason_required", () -> service.decide("PR", 60L, 1L, first, false, " "));
        assertEquals(Boolean.TRUE, service.decide("PR", 60L, 1L, first, false, "Wrong part"));
        assertEquals("REJECTED", instance.getStatus()); assertEquals(0, instance.getCurrentStep());
        assertFailure(HttpStatus.CONFLICT, "approval_already_decided", () -> service.decide("PR", 60L, 1L, first, true, null));
        verify(events, times(1)).saveAndFlush(any());
    }

    @Test void retryBySameActorCannotAdvanceAnOverlappingRoleTwice() throws Exception {
        var instance = instance("PR"); instance.setCurrentStep(1);
        instance.setSteps(json.writeValueAsString(List.of(
                new SnapshotStep("One", "ROLE", 200L, "Team", List.of(20L, 30L)),
                new SnapshotStep("Two", "ROLE", 200L, "Team", List.of(20L, 30L)))));
        var earlier = new ProcurementApprovalEvent(); earlier.setActorId(20L); earlier.setAction("APPROVED");
        when(events.findByInstanceIdOrderByLevelNumberAsc(50L)).thenReturn(List.of(earlier));
        assertFailure(HttpStatus.CONFLICT, "approval_already_decided", () -> service.decide("PR", 60L, 1L, first, true, null));
        verify(events, never()).saveAndFlush(any());
    }

    @Test void blockedStepCanBeReassignedWithReasonAndImmutableAuditEvent() throws Exception {
        var instance = instance("PR");
        first.setEnabled(false);
        when(users.findByIdAndCompany_Id(40L, 1L)).thenReturn(Optional.of(third));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(requester, first, second, third));

        service.reassignBlockedStep("PR", 60L, 40L, "Responsable initial désactivé", requester);

        List<SnapshotStep> steps = json.readValue(instance.getSteps(), new com.fasterxml.jackson.core.type.TypeReference<>() { });
        assertEquals("USER", steps.get(0).approverType());
        assertEquals(40L, steps.get(0).approverId());
        assertEquals(List.of(40L), steps.get(0).candidates());
        assertEquals(30L, steps.get(1).approverId());
        verify(instances).saveAndFlush(instance);
        var event = org.mockito.ArgumentCaptor.forClass(ProcurementApprovalEvent.class);
        verify(events).saveAndFlush(event.capture());
        assertEquals("REASSIGNED", event.getValue().getAction());
        assertEquals(1, event.getValue().getLevelNumber());
        assertEquals(50L, event.getValue().getInstanceId());
        assertTrue(event.getValue().getLevelName().contains("User 40"));
        assertEquals("Responsable initial désactivé", event.getValue().getComment());
    }

    @Test void reassignmentIsRejectedWhileAnyOriginalApproverCanStillAct() throws Exception {
        instance("PR");
        when(users.findByIdAndCompany_Id(40L, 1L)).thenReturn(Optional.of(third));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(first, second, third));

        assertFailure(HttpStatus.CONFLICT, "approval_step_not_blocked", () ->
                service.reassignBlockedStep("PR", 60L, 40L, "Replace approver", requester));
        verify(instances, never()).saveAndFlush(any());
        verify(events, never()).saveAndFlush(any());
    }

    @Test void requesterAndPreviousDecisionMakerCannotBeReassignedAsApprover() throws Exception {
        var instance = instance("PR");
        first.setEnabled(false);
        when(users.findByIdAndCompany_Id(10L, 1L)).thenReturn(Optional.of(requester));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(requester, first, second, third));
        assertFailure(HttpStatus.CONFLICT, "approval_approver_unavailable", () ->
                service.reassignBlockedStep("PR", 60L, 10L, "Requester", requester));

        instance.setCurrentStep(1);
        first.setEnabled(true);
        second.setEnabled(false);
        var previousDecision = new ProcurementApprovalEvent(); previousDecision.setActorId(20L); previousDecision.setAction("APPROVED");
        when(users.findByIdAndCompany_Id(20L, 1L)).thenReturn(Optional.of(first));
        when(events.findByInstanceIdOrderByLevelNumberAsc(50L)).thenReturn(List.of(previousDecision));
        assertFailure(HttpStatus.CONFLICT, "approval_distinct_approvers", () ->
                service.reassignBlockedStep("PR", 60L, 20L, "Do not reuse previous approver", requester));
        verify(instances, never()).saveAndFlush(any());
    }

    @Test void reassignmentChoicesOnlyIncludeUsersThatPreserveDistinctSequentialApprovers() throws Exception {
        var instance = new ProcurementApprovalInstance(); instance.setId(50L); instance.setCompany(company);
        instance.setDocumentType("PR"); instance.setDocumentId(60L); instance.setDocumentName("Document");
        instance.setPolicyId(90L); instance.setPolicyName("Frozen name"); instance.setPolicyVersion(3L);
        instance.setRequesterId(requester.getId());
        instance.setSteps(json.writeValueAsString(List.of(
                new SnapshotStep("First", "USER", first.getId(), "First user", List.of(first.getId())),
                new SnapshotStep("Second", "USER", second.getId(), "Second user", List.of(second.getId())))));
        first.setEnabled(false);
        when(instances.findByCompany_IdAndDocumentTypeAndDocumentId(1L, "PR", 60L)).thenReturn(Optional.of(instance));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(requester, first, second, third));
        when(events.findByInstanceIdOrderByLevelNumberAsc(50L)).thenReturn(List.of());

        List<Target> choices = service.reassignmentTargets("PR", 60L, requester);

        assertEquals(List.of(new Target(40L, "User 40", "USER", List.of("PR"))), choices);
    }

    @Test void priorApproverIsNotCountedAsAnAvailableApproverForTheNextStep() throws Exception {
        var instance = new ProcurementApprovalInstance(); instance.setId(50L); instance.setCompany(company);
        instance.setDocumentType("PR"); instance.setDocumentId(60L); instance.setDocumentName("Document");
        instance.setPolicyId(90L); instance.setPolicyName("Frozen name"); instance.setPolicyVersion(3L);
        instance.setRequesterId(requester.getId()); instance.setCurrentStep(1);
        instance.setSteps(json.writeValueAsString(List.of(
                new SnapshotStep("First", "USER", first.getId(), "First user", List.of(first.getId())),
                new SnapshotStep("Second", "ROLE", first.getRole().getId(), "Approval team", List.of(first.getId(), second.getId())))));
        var firstDecision = new ProcurementApprovalEvent(); firstDecision.setActorId(first.getId()); firstDecision.setAction("APPROVED");
        when(instances.findByCompany_IdAndDocumentTypeAndDocumentId(1L, "PR", 60L)).thenReturn(Optional.of(instance));
        when(events.findByInstanceIdOrderByLevelNumberAsc(50L)).thenReturn(List.of(firstDecision));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(first));

        Summary summary = service.summary("PR", 60L, requester);

        assertNotNull(summary);
        assertFalse(summary.canDecide());
        assertTrue(summary.stepBlocked());
    }

    @Test void reassignmentCannotReuseAPreviousApproverToFakeFutureDistinctCoverage() throws Exception {
        var instance = new ProcurementApprovalInstance(); instance.setId(50L); instance.setCompany(company);
        instance.setDocumentType("PR"); instance.setDocumentId(60L); instance.setDocumentName("Document");
        instance.setPolicyId(90L); instance.setPolicyName("Frozen name"); instance.setPolicyVersion(3L);
        instance.setRequesterId(requester.getId()); instance.setCurrentStep(1);
        instance.setSteps(json.writeValueAsString(List.of(
                new SnapshotStep("First", "ROLE", 200L, "First role", List.of(20L, 30L)),
                new SnapshotStep("Blocked", "USER", 50L, "Unavailable", List.of(50L)),
                new SnapshotStep("Final", "USER", 20L, "Prior approver", List.of(20L)))));
        var firstDecision = new ProcurementApprovalEvent(); firstDecision.setActorId(20L); firstDecision.setAction("APPROVED");
        when(instances.findByCompany_IdAndDocumentTypeAndDocumentId(1L, "PR", 60L)).thenReturn(Optional.of(instance));
        when(instances.lockDocument(1L, "PR", 60L)).thenReturn(Optional.of(instance));
        when(events.findByInstanceIdOrderByLevelNumberAsc(50L)).thenReturn(List.of(firstDecision));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(requester, first, second, third));
        when(users.findByIdAndCompany_Id(40L, 1L)).thenReturn(Optional.of(third));

        assertTrue(service.reassignmentTargets("PR", 60L, requester).isEmpty());
        assertFailure(HttpStatus.CONFLICT, "approval_distinct_approvers", () ->
                service.reassignBlockedStep("PR", 60L, 40L, "Preserve distinct approvers", requester));
        verify(instances, never()).saveAndFlush(any());
        verify(events, never()).saveAndFlush(any());
    }

    @Test void activationLocksCompanyAndRejectsOverlappingPolicy() throws Exception {
        var draft = policy(); draft.setStatus("DRAFT"); var active = policy(); active.setId(91L);
        when(companies.lockForApprovalPolicies(1L)).thenReturn(Optional.of(company));
        when(policies.findByIdAndCompany_Id(90L, 1L)).thenReturn(Optional.of(draft));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(first, second));
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PR", "ACTIVE")).thenReturn(List.of(active));
        assertFailure(HttpStatus.CONFLICT, "approval_policy_priority_conflict", () -> service.setActive(90L, 3L, true, requester));
        verify(companies).lockForApprovalPolicies(1L); assertEquals("ACTIVE", active.getStatus());
    }

    @Test void staleEditorAndDeletionOfUsedPolicyAreRejected() throws Exception {
        var policy = policy();
        when(policies.findByIdAndCompany_Id(90L, 1L)).thenReturn(Optional.of(policy));
        assertFailure(HttpStatus.CONFLICT, "approval_version_conflict", () -> service.delete(90L, 2L, requester));
        assertFailure(HttpStatus.CONFLICT, "approval_policy_in_use", () -> service.delete(90L, 3L, requester));
        verify(policies, never()).delete(any(ProcurementApprovalPolicy.class));
    }

    @Test void unreadableSnapshotFailsInsteadOfSilentlyRemovingAuditData() throws Exception {
        var instance = instance("PR"); instance.setSteps("invalid JSON");
        assertFailure(HttpStatus.INTERNAL_SERVER_ERROR, "approval_data_unreadable", () -> service.decide("PR", 60L, 1L, first, true, null));
    }

    @Test void firstMatchingPolicyByPriorityWinsAndAmountSnapshotIsPersisted() throws Exception {
        var highValue = policy(); highValue.setId(91L); highValue.setPriority(10);
        highValue.setConditions(json.writeValueAsString(List.of(new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "GREATER_THAN", "500000", "XOF"))));
        var fallback = policy(); fallback.setPriority(100);
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PR", "ACTIVE")).thenReturn(List.of(highValue, fallback));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(first, second));
        service.start("PR", 61L, "High value", 10L, company, new java.math.BigDecimal("750000.12345"), "XOF");
        var captor = org.mockito.ArgumentCaptor.forClass(ProcurementApprovalInstance.class);
        verify(instances).saveAndFlush(captor.capture());
        assertEquals(91L, captor.getValue().getPolicyId());
        assertEquals(new java.math.BigDecimal("750000.1235"), captor.getValue().getEstimatedNetAmount());
        assertEquals("XOF", captor.getValue().getCurrency());
    }

    @Test void failedHigherPriorityConditionFallsThroughToExplicitFallback() throws Exception {
        var highValue = policy(); highValue.setPriority(10);
        highValue.setConditions(json.writeValueAsString(List.of(new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "GREATER_THAN", "500000", "XOF"))));
        var fallback = policy(); fallback.setId(91L); fallback.setName("Fallback"); fallback.setPriority(100);
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PR", "ACTIVE")).thenReturn(List.of(highValue, fallback));
        when(users.findByCompany_Id(1L)).thenReturn(List.of(first, second));
        service.start("PR", 62L, "Standard", 10L, company, new java.math.BigDecimal("250000"), "XOF");
        var captor = org.mockito.ArgumentCaptor.forClass(ProcurementApprovalInstance.class);
        verify(instances).saveAndFlush(captor.capture());
        assertEquals(91L, captor.getValue().getPolicyId());
        assertEquals("Fallback", captor.getValue().getPolicyName());
    }

    @Test void unmatchedConditionsFailClosedAndConditionsAreCombinedWithAnd() throws Exception {
        var policy = policy();
        policy.setConditions(json.writeValueAsString(List.of(
                new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "GREATER_THAN", "100", "XOF"),
                new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "LESS_THAN", "1000", "XOF"))));
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PR", "ACTIVE")).thenReturn(List.of(policy));
        assertFailure(HttpStatus.CONFLICT, "approval_no_matching_policy", () -> service.start("PR", 63L, "Unknown currency", 10L, company, new java.math.BigDecimal("500"), "USD"));
        assertFailure(HttpStatus.CONFLICT, "approval_no_matching_policy", () -> service.start("PR", 64L, "Outside range", 10L, company, new java.math.BigDecimal("1500"), "XOF"));
    }

    @Test void amountOperatorsUseDecimalComparison() {
        var gte = new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "GREATER_THAN_OR_EQUAL", "500000.00", "XOF");
        assertTrue(ProcurementApprovalService.matchesConditions(List.of(gte), new java.math.BigDecimal("500000"), "XOF"));
        assertFalse(ProcurementApprovalService.matchesConditions(List.of(gte), new java.math.BigDecimal("499999.99"), "XOF"));
        assertTrue(ProcurementApprovalService.matchesConditions(List.of(), null, null));
    }

    @Test void policyDraftPersistsPriorityAndTypedConditions() throws Exception {
        var condition = new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "GREATER_THAN_OR_EQUAL", "250000", "XOF");
        var saved = service.save(null, new Draft("High value", "Estimate", "PR", 20, List.of(condition), List.of(), null), requester);
        assertEquals(20, saved.priority());
        assertEquals(List.of(condition), saved.conditions());
        var captor = org.mockito.ArgumentCaptor.forClass(ProcurementApprovalPolicy.class);
        verify(policies).saveAndFlush(captor.capture());
        assertEquals("20", String.valueOf(captor.getValue().getPriority()));
        assertEquals(List.of(condition), json.readValue(captor.getValue().getConditions(), new com.fasterxml.jackson.core.type.TypeReference<List<Condition>>() { }));
    }

    @Test void draftCanBeSavedWithAnIncompleteConditionAndApprovalLevel() throws Exception {
        var incomplete = new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "GREATER_THAN", "", "XOF");
        var draft = new Draft("Work in progress", null, "PR", 20, List.of(incomplete),
                List.of(new Level("", "USER", null)), null);

        var saved = service.save(null, draft, requester);

        assertEquals("DRAFT", saved.status());
        assertEquals(List.of(incomplete), saved.conditions());
        assertEquals(1, saved.levels().size());
        var captor = org.mockito.ArgumentCaptor.forClass(ProcurementApprovalPolicy.class);
        verify(policies).saveAndFlush(captor.capture());
        var persisted = captor.getValue();
        persisted.setId(90L);
        persisted.setVersion(0L);
        persisted.setLevels(json.writeValueAsString(List.of(new Level("Approver", "USER", first.getId()))));
        when(companies.lockForApprovalPolicies(1L)).thenReturn(Optional.of(company));
        when(policies.findByIdAndCompany_Id(90L, 1L)).thenReturn(Optional.of(persisted));
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PR", "ACTIVE"))
                .thenReturn(List.of());
        when(users.findByCompany_Id(1L)).thenReturn(List.of(first));
        assertFailure(HttpStatus.BAD_REQUEST, "approval_invalid_conditions", () ->
                service.setActive(90L, 0L, true, requester));
    }

    @Test void policyRejectsUnsupportedAndMalformedConditions() {
        var unsupported = new Condition("DEPARTMENT", "EQUALS", "Maintenance", "XOF");
        assertFailure(HttpStatus.BAD_REQUEST, "approval_invalid_conditions", () ->
                service.save(null, new Draft("Bad rule", null, "PR", 20, List.of(unsupported), List.of(), null), requester));
        var malformedCurrency = new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "GREATER_THAN", "10", "xof");
        assertFailure(HttpStatus.BAD_REQUEST, "approval_invalid_conditions", () ->
                service.save(null, new Draft("Bad currency", null, "PR", 20, List.of(malformedCurrency), List.of(), null), requester));
        var otherCurrency = new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "GREATER_THAN", "10", "EUR");
        assertFailure(HttpStatus.BAD_REQUEST, "approval_invalid_conditions", () ->
                service.save(null, new Draft("Cross currency", null, "PR", 20, List.of(otherCurrency), List.of(), null), requester));
        verify(policies, never()).saveAndFlush(any());
    }

    @Test void policyRejectsContradictoryAmountRanges() {
        var conditions = List.of(
                new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "GREATER_THAN", "500", "XOF"),
                new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "LESS_THAN_OR_EQUAL", "500", "XOF"));
        assertFailure(HttpStatus.BAD_REQUEST, "approval_invalid_conditions", () ->
                service.save(null, new Draft("Impossible range", null, "PR", 20, conditions, List.of(), null), requester));
        var impossibleEquality = List.of(
                new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "EQUALS", "500", "XOF"),
                new Condition("ESTIMATED_NET_MATERIAL_AMOUNT", "NOT_EQUALS", "500.0", "XOF"));
        assertFailure(HttpStatus.BAD_REQUEST, "approval_invalid_conditions", () ->
                service.save(null, new Draft("Impossible equality", null, "PR", 20, impossibleEquality, List.of(), null), requester));
    }

    @Test void invalidAmountSnapshotDoesNotStartAnApproval() throws Exception {
        var policy = policy();
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PR", "ACTIVE")).thenReturn(List.of(policy));
        assertFailure(HttpStatus.BAD_REQUEST, "approval_invalid_amount_snapshot", () ->
                service.start("PR", 65L, "Negative estimate", 10L, company, new java.math.BigDecimal("-1"), "XOF"));
        verify(instances, never()).saveAndFlush(any());
    }

    @Test void requisitionAndOrderEstimatesSumCurrentPartCosts() {
        Part bolt = new Part(); bolt.setCost(12.3456);
        Part gasket = new Part(); gasket.setCost(7.25);
        var poLines = List.of(new PartQuantity(bolt, null, null, 2), new PartQuantity(gasket, null, null, 3));
        assertEquals(0, ProcurementApprovalService.estimatePurchaseOrderAmount(poLines)
                .compareTo(new java.math.BigDecimal("46.4412")));

        PurchaseRequisition requisition = new PurchaseRequisition();
        PurchaseRequisitionLine line = new PurchaseRequisitionLine(); line.setPart(bolt); line.setQuantity(2);
        requisition.getLines().add(line);
        assertEquals(0, ProcurementApprovalService.estimateRequisitionAmount(requisition)
                .compareTo(new java.math.BigDecimal("24.6912")));
    }

    @Test void estimateRejectsNegativeOrNonFiniteMasterPartCost() {
        Part broken = new Part(); broken.setCost(Double.NaN);
        assertFailure(HttpStatus.BAD_REQUEST, "approval_invalid_amount_snapshot", () ->
                ProcurementApprovalService.estimatePurchaseOrderAmount(List.of(new PartQuantity(broken, null, null, 1))));
    }

    @Test void pendingLegacyPurchaseOrderJoinsActivatedPolicyAfterLineChange() {
        PurchaseOrder order = new PurchaseOrder(); order.setId(55L); order.setName("PO-55"); order.setCompany(company);
        order.setStatus(com.grash.model.enums.ApprovalStatus.PENDING);
        when(instances.findByCompany_IdAndDocumentTypeAndDocumentId(1L, "PO", 55L)).thenReturn(Optional.empty());
        when(policies.existsByCompany_IdAndDocumentTypeAndActivatedAtIsNotNull(1L, "PO")).thenReturn(true);
        when(policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(1L, "PO", "ACTIVE")).thenReturn(List.of());

        // start() is reached: with the policy now deactivated it refuses instead of letting the legacy flow approve.
        assertFailure(HttpStatus.CONFLICT, "approval_no_active_policy", () ->
                service.governPendingPurchaseOrder(order, List.of()));
    }

    @Test void nonPendingOrUngovernedCompanyPurchaseOrderIsLeftUnchanged() {
        PurchaseOrder approved = new PurchaseOrder(); approved.setId(56L); approved.setCompany(company);
        approved.setStatus(com.grash.model.enums.ApprovalStatus.APPROVED);
        assertFalse(service.governPendingPurchaseOrder(approved, List.of()));

        PurchaseOrder pending = new PurchaseOrder(); pending.setId(57L); pending.setCompany(company);
        pending.setStatus(com.grash.model.enums.ApprovalStatus.PENDING);
        when(instances.findByCompany_IdAndDocumentTypeAndDocumentId(1L, "PO", 57L)).thenReturn(Optional.empty());
        when(policies.existsByCompany_IdAndDocumentTypeAndActivatedAtIsNotNull(1L, "PO")).thenReturn(false);
        assertFalse(service.governPendingPurchaseOrder(pending, List.of()));
    }

    @Test void rejectedInstanceIsReleasedButPendingOneStaysLocked() {
        var rejected = new ProcurementApprovalInstance(); rejected.setId(1L); rejected.setStatus("REJECTED");
        when(instances.findByCompany_IdAndDocumentTypeAndDocumentId(1L, "PR", 70L)).thenReturn(Optional.of(rejected));
        service.releaseRejected("PR", 70L, 1L);
        verify(instances).delete(rejected);

        var pending = new ProcurementApprovalInstance(); pending.setId(2L); pending.setStatus("PENDING");
        when(instances.findByCompany_IdAndDocumentTypeAndDocumentId(1L, "PR", 71L)).thenReturn(Optional.of(pending));
        assertFailure(HttpStatus.CONFLICT, "approval_document_locked", () -> service.releaseRejected("PR", 71L, 1L));
        verify(instances, never()).delete(pending);
    }
}
