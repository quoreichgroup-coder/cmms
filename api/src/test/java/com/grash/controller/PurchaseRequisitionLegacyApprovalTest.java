package com.grash.controller;

import com.grash.dto.PurchaseRequisitionApprovalConfigDTO;
import com.grash.exception.CustomException;
import com.grash.model.*;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.PurchaseRequisitionStatus;
import com.grash.model.enums.RoleType;
import com.grash.repository.*;
import com.grash.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PurchaseRequisitionLegacyApprovalTest {
    @Mock PurchaseRequisitionRepository requisitionRepository;
    @Mock PurchaseRequisitionApprovalConfigRepository approvalConfigRepository;
    @Mock WorkOrderRepository workOrderRepository;
    @Mock UserService userService;
    @Mock PartService partService;
    @Mock VendorRepository vendorRepository;
    @Mock PurchaseOrderService purchaseOrderService;
    @Mock PartQuantityService partQuantityService;
    @Mock PurchaseOrderPolicyService procurementPolicy;
    @Mock WorkflowService workflowService;
    @Mock com.grash.mapper.PurchaseOrderMapper purchaseOrderMapper;
    @Mock com.grash.mapper.PartQuantityMapper partQuantityMapper;
    @Mock ObjectMapper objectMapper;
    @Mock ProcurementApprovalService procurementApprovals;
    @Mock ProcurementSiteService procurementSiteService;
    @Mock HttpServletRequest request;
    @InjectMocks PurchaseRequisitionController controller;

    private User user(long id, Company company, Role role) {
        User user = new User();
        user.setId(id);
        user.setCompany(company);
        user.setRole(role);
        user.setEnabled(true);
        user.setEnabledInSubscription(true);
        return user;
    }

    private Role role(RoleType type, PermissionEntity... editPermissions) {
        Role role = new Role();
        role.setRoleType(type);
        role.setViewPermissions(new HashSet<>(Set.of(PermissionEntity.SETTINGS)));
        role.setEditOtherPermissions(new HashSet<>(Arrays.asList(editPermissions)));
        return role;
    }

    @Test
    void legacyConfigurationRejectsDisabledApprovers() {
        Company company = new Company(); company.setId(1L);
        User administrator = user(10L, company, role(RoleType.ROLE_CLIENT, PermissionEntity.SETTINGS));
        User disabledApprover = user(20L, company, role(RoleType.ROLE_CLIENT,
                PermissionEntity.PURCHASE_REQUISITION_APPROVAL));
        disabledApprover.setEnabled(false);
        when(userService.whoami(request)).thenReturn(administrator);
        when(procurementApprovals.hasActivatedPolicy("PR", 1L)).thenReturn(false);
        when(userService.findByIdAndCompany(20L, 1L)).thenReturn(Optional.of(disabledApprover));
        PurchaseRequisitionApprovalConfigDTO body = new PurchaseRequisitionApprovalConfigDTO();
        body.setApproverUserIds(List.of(20L));

        CustomException error = assertThrows(CustomException.class,
                () -> controller.saveApprovalConfig(body, request));

        assertEquals(HttpStatus.BAD_REQUEST, error.getHttpStatus());
        assertEquals("approval_approver_unavailable", error.getMessage());
        verify(approvalConfigRepository, never()).save(any());
    }

    @Test
    void staleLegacyConfigurationCannotOverwriteANewerVersion() {
        Company company = new Company(); company.setId(1L);
        User administrator = user(10L, company, role(RoleType.ROLE_CLIENT, PermissionEntity.SETTINGS));
        PurchaseRequisitionApprovalConfig current = new PurchaseRequisitionApprovalConfig();
        current.setVersion(4);
        when(userService.whoami(request)).thenReturn(administrator);
        when(procurementApprovals.hasActivatedPolicy("PR", 1L)).thenReturn(false);
        when(approvalConfigRepository.findByCompany_Id(1L)).thenReturn(Optional.of(current));
        PurchaseRequisitionApprovalConfigDTO body = new PurchaseRequisitionApprovalConfigDTO();
        body.setApproverUserIds(List.of(20L));
        body.setVersion(3);

        CustomException error = assertThrows(CustomException.class,
                () -> controller.saveApprovalConfig(body, request));

        assertEquals(HttpStatus.CONFLICT, error.getHttpStatus());
        assertEquals("approval_version_conflict", error.getMessage());
        verify(userService, never()).findByIdAndCompany(any(), any());
        verify(approvalConfigRepository, never()).save(any());
    }

    @Test
    void submissionRejectsApproverWhoLostEligibilityAfterConfiguration() throws Exception {
        Company company = new Company(); company.setId(1L);
        CompanySettings settings = new CompanySettings(company);
        com.grash.model.Currency currency = new com.grash.model.Currency(); currency.setCode("XOF");
        settings.getGeneralPreferences().setCurrency(currency);
        company.setCompanySettings(settings);
        User requester = user(10L, company, role(RoleType.ROLE_CLIENT, PermissionEntity.PURCHASE_REQUISITIONS));
        PurchaseRequisition requisition = new PurchaseRequisition();
        requisition.setId(60L); requisition.setCompany(company); requisition.setRequester(requester);
        requisition.setTitle("Urgent spare part"); requisition.setStatus(PurchaseRequisitionStatus.DRAFT);
        Part part = new Part(); part.setId(30L); part.setName("Bearing"); part.setCost(100d);
        PurchaseRequisitionLine line = new PurchaseRequisitionLine();
        line.setPart(part); line.setQuantity(1d); line.setRequisition(requisition);
        requisition.setLines(new ArrayList<>(List.of(line)));
        PurchaseRequisitionApprovalConfig config = new PurchaseRequisitionApprovalConfig();
        config.setApproverUserIds("[20]"); config.setVersion(2);
        User disabledApprover = user(20L, company, role(RoleType.ROLE_CLIENT,
                PermissionEntity.PURCHASE_REQUISITION_APPROVAL));
        disabledApprover.setEnabled(false);
        when(userService.whoami(request)).thenReturn(requester);
        when(requisitionRepository.findByIdForUpdateAndCompany(60L, 1L)).thenReturn(Optional.of(requisition));
        when(procurementSiteService.canAccessSite(any(), isNull())).thenReturn(true);
        when(procurementApprovals.start(eq("PR"), eq(60L), eq("Urgent spare part"), eq(10L), same(company),
                any(), eq("XOF"))).thenReturn(false);
        when(approvalConfigRepository.findByCompany_Id(1L)).thenReturn(Optional.of(config));
        when(userService.findByIdAndCompany(20L, 1L)).thenReturn(Optional.of(disabledApprover));
        doReturn(List.of(20L)).when(objectMapper).readValue(eq("[20]"), any(TypeReference.class));

        CustomException error = assertThrows(CustomException.class, () -> controller.submit(60L, request));

        assertEquals(HttpStatus.CONFLICT, error.getHttpStatus());
        assertEquals("approval_approver_unavailable", error.getMessage());
        verify(requisitionRepository, never()).save(any());
    }

    @Test
    void legacyReassignmentCannotReplaceAnEligibleCurrentApprover() throws Exception {
        Company company = new Company(); company.setId(1L);
        User administrator = user(10L, company, role(RoleType.ROLE_CLIENT, PermissionEntity.SETTINGS));
        User currentApprover = user(20L, company, role(RoleType.ROLE_CLIENT,
                PermissionEntity.PURCHASE_REQUISITION_APPROVAL));
        PurchaseRequisition requisition = new PurchaseRequisition();
        requisition.setId(60L); requisition.setCompany(company);
        requisition.setStatus(PurchaseRequisitionStatus.PENDING_APPROVAL);
        requisition.setApprovalApproverIds("[20]"); requisition.setApprovalStep(0);
        when(userService.whoami(request)).thenReturn(administrator);
        when(requisitionRepository.findByIdForUpdateAndCompany(60L, 1L)).thenReturn(Optional.of(requisition));
        doReturn(List.of(20L)).when(objectMapper).readValue(eq("[20]"), any(TypeReference.class));
        when(userService.findByIdAndCompany(20L, 1L)).thenReturn(Optional.of(currentApprover));

        CustomException error = assertThrows(CustomException.class, () -> controller.reassignLegacyApproval(60L,
                new com.grash.dto.ProcurementApprovalDTO.Reassignment(30L, "Temporary coverage"), request));

        assertEquals(HttpStatus.CONFLICT, error.getHttpStatus());
        verify(requisitionRepository, never()).save(any());
    }

    @Test
    void legacyReassignmentReplacesOnlyCurrentStepAndRecordsReason() throws Exception {
        Company company = new Company(); company.setId(1L);
        User administrator = user(10L, company, role(RoleType.ROLE_CLIENT, PermissionEntity.SETTINGS));
        User disabledApprover = user(20L, company, role(RoleType.ROLE_CLIENT,
                PermissionEntity.PURCHASE_REQUISITION_APPROVAL));
        disabledApprover.setEnabled(false);
        User nextApprover = user(40L, company, role(RoleType.ROLE_CLIENT,
                PermissionEntity.PURCHASE_REQUISITION_APPROVAL));
        PurchaseRequisition requisition = new PurchaseRequisition();
        requisition.setId(60L); requisition.setCompany(company);
        requisition.setStatus(PurchaseRequisitionStatus.PENDING_APPROVAL);
        requisition.setApprovalApproverIds("[20,30]"); requisition.setApprovalStep(0);
        requisition.setApprovalHistory("[]"); requisition.setLines(new ArrayList<>());
        when(userService.whoami(request)).thenReturn(administrator);
        when(requisitionRepository.findByIdForUpdateAndCompany(60L, 1L)).thenReturn(Optional.of(requisition));
        when(requisitionRepository.save(any(PurchaseRequisition.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doReturn(List.of(20L, 30L)).when(objectMapper).readValue(eq("[20,30]"), any(TypeReference.class));
        doReturn(List.of(40L, 30L)).when(objectMapper).readValue(eq("[40,30]"), any(TypeReference.class));
        doReturn(new ArrayList<Map<String, Object>>()).when(objectMapper).readValue(eq("[]"), any(TypeReference.class));
        when(userService.findByIdAndCompany(20L, 1L)).thenReturn(Optional.of(disabledApprover));
        when(userService.findByIdAndCompany(40L, 1L)).thenReturn(Optional.of(nextApprover));
        ObjectMapper json = new ObjectMapper();
        when(objectMapper.writeValueAsString(any())).thenAnswer(invocation -> json.writeValueAsString(invocation.getArgument(0)));

        controller.reassignLegacyApproval(60L,
                new com.grash.dto.ProcurementApprovalDTO.Reassignment(40L, "Temporary coverage"), request);

        assertEquals("[40,30]", requisition.getApprovalApproverIds());
        List<Map<String, Object>> history = json.readValue(requisition.getApprovalHistory(), new TypeReference<>() {});
        assertEquals("REASSIGNED", history.get(0).get("action"));
        assertEquals(10, ((Number) history.get(0).get("userId")).intValue());
        assertEquals(40, ((Number) history.get(0).get("reassignedToUserId")).intValue());
        assertEquals("Temporary coverage", history.get(0).get("note"));
    }

    @Test
    void requisitionCannotUseAWorkOrderFromAnInaccessibleSite() {
        Company company = new Company(); company.setId(1L);
        Role requesterRole = role(RoleType.ROLE_CLIENT);
        requesterRole.setCreatePermissions(new HashSet<>(Set.of(PermissionEntity.PURCHASE_REQUISITIONS)));
        requesterRole.setViewPermissions(new HashSet<>(Set.of(PermissionEntity.WORK_ORDERS)));
        requesterRole.setViewOtherPermissions(new HashSet<>(Set.of(PermissionEntity.WORK_ORDERS)));
        User requester = user(10L, company, requesterRole);
        Site restrictedSite = new Site(); restrictedSite.setId(8L); restrictedSite.setCompany(company);
        requester.setAllSitesAccess(false);
        requester.setSites(new ArrayList<>());
        WorkOrder source = new WorkOrder(); source.setId(40L); source.setCompany(company); source.setSite(restrictedSite);

        when(userService.whoami(request)).thenReturn(requester);
        when(workOrderRepository.findByIdAndCompany_Id(40L, 1L)).thenReturn(Optional.of(source));
        var body = new com.grash.dto.PurchaseRequisitionCreateRequest();
        body.setTitle("Spare part request"); body.setSourceWorkOrderId(40L);
        body.setLines(List.of());

        CustomException error = assertThrows(CustomException.class, () -> controller.create(body, request));

        assertEquals(HttpStatus.FORBIDDEN, error.getHttpStatus());
        assertEquals("Access denied to source work order", error.getMessage());
        verify(requisitionRepository, never()).save(any());
    }
}
