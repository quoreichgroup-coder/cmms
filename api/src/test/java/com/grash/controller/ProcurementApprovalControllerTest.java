package com.grash.controller;

import com.grash.exception.CustomException;
import com.grash.model.*;
import com.grash.model.enums.*;
import com.grash.repository.*;
import com.grash.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import static com.grash.utils.Helper.setCurrentUser;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProcurementApprovalController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProcurementApprovalControllerTest extends AbstractControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean ProcurementApprovalService approvals;
    @MockitoBean UserService users;
    @MockitoBean PurchaseOrderPolicyService procurement;
    @MockitoBean PurchaseRequisitionRepository requisitions;
    @MockitoBean PurchaseOrderRepository orders;
    @MockitoBean PartQuantityService partQuantities;
    @MockitoBean ProcurementSiteService procurementSites;
    User actor;

    @BeforeEach void setup() {
        var company = new Company(); company.setId(7L);
        var role = new Role(); role.setRoleType(RoleType.ROLE_CLIENT);
        role.setViewPermissions(new HashSet<>(Set.of(PermissionEntity.SETTINGS)));
        role.setEditOtherPermissions(new HashSet<>(Set.of(PermissionEntity.SETTINGS)));
        actor = new User(); actor.setId(4L); actor.setRole(role); actor.setCompany(company); actor.setEnabled(true);
        setCurrentUser(actor);
        when(users.whoami(any())).thenReturn(actor);
    }

    @Test void settingsReaderCanListButCannotChangePolicy() throws Exception {
        actor.getRole().getEditOtherPermissions().clear();
        when(approvals.search(actor, "", "", "", 0)).thenReturn(Page.empty());
        mvc.perform(get("/approval-management/policies")).andExpect(status().isOk()).andExpect(jsonPath("$.content").isEmpty());
        mvc.perform(post("/approval-management/policies").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Policy\",\"documentType\":\"PR\",\"levels\":[]}"))
                .andExpect(status().isForbidden());
        verify(approvals, never()).save(any(), any(), any());
    }

    @Test void approvalPermissionAloneCannotReadAdministrationOrGlobalHistory() throws Exception {
        actor.getRole().getViewPermissions().clear();
        actor.getRole().getEditOtherPermissions().add(PermissionEntity.PURCHASE_REQUISITION_APPROVAL);
        mvc.perform(get("/approval-management/policies")).andExpect(status().isForbidden());
        mvc.perform(get("/approval-management/history")).andExpect(status().isForbidden());
        mvc.perform(get("/approval-management/targets")).andExpect(status().isForbidden());
        verifyNoInteractions(approvals);
    }

    @Test void procurementEntitlementIsCheckedBeforeReadingPolicies() throws Exception {
        doThrow(new CustomException("disabled", HttpStatus.FORBIDDEN)).when(procurement).requireModuleEnabled(actor);
        mvc.perform(get("/approval-management/policies")).andExpect(status().isForbidden());
        verifyNoInteractions(approvals);
    }

    @Test void foreignDocumentReturnsNotFoundBeforeExposingApprovalSummary() throws Exception {
        when(orders.findByIdAndCompany_Id(9L, 7L)).thenReturn(Optional.empty());
        mvc.perform(get("/approval-management/documents/PO/9")).andExpect(status().isNotFound());
        verify(approvals, never()).summary(any(), any(), any());
    }

    @Test void legacyDocumentReturnsNoContentRatherThanAnUnreadableEmptyJsonResponse() throws Exception {
        var requisition = new PurchaseRequisition(); requisition.setRequester(actor);
        when(requisitions.findWithLinesByIdAndCompany(9L, 7L)).thenReturn(Optional.of(requisition));
        mvc.perform(get("/approval-management/documents/PR/9")).andExpect(status().isNoContent());
        verify(approvals).summary("PR", 9L, actor);
    }

    @Test void activationConflictHasRecoverableStatusAndMessage() throws Exception {
        when(approvals.setActive(9L, 2L, true, actor)).thenThrow(new CustomException("approval_policy_overlap", HttpStatus.CONFLICT));
        mvc.perform(post("/approval-management/policies/9/activation?version=2&active=true"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("approval_policy_overlap"));
    }

    @Test void onlySettingsEditorCanReassignAndControllerPassesTheAuditReason() throws Exception {
        var requisition = new PurchaseRequisition(); requisition.setRequester(actor);
        when(requisitions.findWithLinesByIdAndCompany(55L, 7L)).thenReturn(Optional.of(requisition));
        mvc.perform(post("/approval-management/documents/PR/55/reassignment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetUserId\":12,\"reason\":\"Approver disabled\"}"))
                .andExpect(status().isNoContent());
        verify(approvals).reassignBlockedStep("PR", 55L, 12L, "Approver disabled", actor);

        actor.getRole().getEditOtherPermissions().clear();
        mvc.perform(post("/approval-management/documents/PR/55/reassignment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetUserId\":12,\"reason\":\"No permission\"}"))
                .andExpect(status().isForbidden());
        verify(approvals, times(1)).reassignBlockedStep(anyString(), anyLong(), any(), any(), any());
    }

    @Test void siteRestrictedSettingsEditorCannotReadTargetsOrReassignOutsideTheirSites() throws Exception {
        Site restrictedSite = new Site(); restrictedSite.setId(88L);
        PurchaseRequisitionLine line = new PurchaseRequisitionLine(); line.setSite(restrictedSite);
        var requisition = new PurchaseRequisition(); requisition.setRequester(actor);
        requisition.setLines(new ArrayList<>(List.of(line)));
        when(requisitions.findWithLinesByIdAndCompany(56L, 7L)).thenReturn(Optional.of(requisition));
        when(procurementSites.canAccessSite(actor, restrictedSite)).thenReturn(false);

        mvc.perform(get("/approval-management/documents/PR/56/reassignment-targets"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/approval-management/documents/PR/56/reassignment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetUserId\":12,\"reason\":\"Replace approver\"}"))
                .andExpect(status().isNotFound());

        verifyNoInteractions(approvals);
    }
}
