package com.grash.controller;

import com.grash.dto.ProcurementApprovalDTO.*;
import com.grash.exception.CustomException;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.PurchaseOrderRepository;
import com.grash.repository.PurchaseRequisitionRepository;
import com.grash.service.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/approval-management")
@PreAuthorize("hasRole('ROLE_CLIENT')")
@RequiredArgsConstructor
public class ProcurementApprovalController {
    private final ProcurementApprovalService approvals;
    private final UserService users;
    private final PurchaseOrderPolicyService procurement;
    private final PurchaseRequisitionRepository requisitions;
    private final PurchaseOrderRepository orders;
    private final PartQuantityService partQuantities;
    private final ProcurementSiteService procurementSites;

    private User administrator(HttpServletRequest request, boolean edit) {
        User user = users.whoami(request);
        procurement.requireModuleEnabled(user);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)
                || edit && !user.getRole().getEditOtherPermissions().contains(PermissionEntity.SETTINGS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        return user;
    }

    @GetMapping("/policies")
    public Page<Policy> search(@RequestParam(defaultValue = "") String query, @RequestParam(defaultValue = "") String type,
            @RequestParam(defaultValue = "") String status, @RequestParam(defaultValue = "0") int page, HttpServletRequest request) {
        return approvals.search(administrator(request, false), query, type, status, page);
    }

    @GetMapping("/policies/{id}")
    @Transactional(readOnly = true)
    public Policy get(@PathVariable Long id, HttpServletRequest request) {
        return approvals.view(approvals.policy(id, administrator(request, false)));
    }

    @PostMapping("/policies")
    public Policy create(@RequestBody Draft draft, HttpServletRequest request) {
        return approvals.save(null, draft, administrator(request, true));
    }

    @PutMapping("/policies/{id}")
    public Policy update(@PathVariable Long id, @RequestBody Draft draft, HttpServletRequest request) {
        return approvals.save(id, draft, administrator(request, true));
    }

    @PostMapping("/policies/{id}/copy")
    public Policy copy(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean revision, HttpServletRequest request) {
        return approvals.copy(id, revision, administrator(request, true));
    }

    @PostMapping("/policies/{id}/activation")
    public Policy activation(@PathVariable Long id, @RequestParam long version, @RequestParam boolean active, HttpServletRequest request) {
        return approvals.setActive(id, version, active, administrator(request, true));
    }

    @DeleteMapping("/policies/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @RequestParam long version, HttpServletRequest request) {
        approvals.delete(id, version, administrator(request, true));
    }

    @GetMapping("/targets")
    public List<Target> targets(HttpServletRequest request) { return approvals.targets(administrator(request, false)); }

    @GetMapping("/history")
    public Page<Event> history(@RequestParam(defaultValue = "") String query, @RequestParam(defaultValue = "") String type,
            @RequestParam(defaultValue = "") String action, @RequestParam(defaultValue = "0") int page, HttpServletRequest request) {
        return approvals.history(administrator(request, false), query, type, action, page);
    }

    @GetMapping("/documents/{type}/{id}")
    @Transactional(readOnly = true)
    public org.springframework.http.ResponseEntity<Summary> document(@PathVariable String type, @PathVariable Long id, HttpServletRequest request) {
        User user = users.whoami(request);
        procurement.requireModuleEnabled(user);
        requireDocumentAccess(type, id, user);
        Summary summary = approvals.summary(type, id, user);
        return summary == null ? org.springframework.http.ResponseEntity.noContent().build()
                : org.springframework.http.ResponseEntity.ok(summary);
    }

    @PostMapping("/documents/{type}/{id}/reassignment")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reassignBlockedStep(@PathVariable String type, @PathVariable Long id,
            @RequestBody Reassignment reassignment, HttpServletRequest request) {
        User actor = administrator(request, true);
        requireDocumentAccess(type, id, actor);
        approvals.reassignBlockedStep(type, id,
                reassignment == null ? null : reassignment.targetUserId(),
                reassignment == null ? null : reassignment.reason(), actor);
    }

    @GetMapping("/documents/{type}/{id}/reassignment-targets")
    public List<Target> reassignmentTargets(@PathVariable String type, @PathVariable Long id,
            HttpServletRequest request) {
        User actor = administrator(request, true);
        requireDocumentAccess(type, id, actor);
        return approvals.reassignmentTargets(type, id, actor);
    }

    private void requireDocumentAccess(String type, Long id, User user) {
        String documentType = ProcurementApprovalService.documentType(type);
        boolean allowed = "PR".equals(documentType)
                ? requisitions.findWithLinesByIdAndCompany(id, user.getCompany().getId())
                    .map(requisition -> requisition.canView(user) && requisition.getLines().stream()
                            .allMatch(line -> procurementSites.canAccessSite(user, line.getSite())))
                    .orElse(false)
                : orders.findByIdAndCompany_Id(id, user.getCompany().getId())
                    .map(order -> order.canBeViewedBy(user) && partQuantities.findByPurchaseOrder(id).stream()
                            .allMatch(line -> procurementSites.canAccessSite(user, line.getSite())))
                    .orElse(false);
        if (!allowed) throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }
}
