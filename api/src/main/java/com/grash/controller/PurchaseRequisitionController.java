package com.grash.controller;

import com.grash.dto.PurchaseOrderShowDTO;
import com.grash.advancedsearch.SearchCriteria;
import com.grash.advancedsearch.SpecificationBuilder;
import com.grash.mapper.PartQuantityMapper;
import com.grash.mapper.PurchaseOrderMapper;
import com.grash.dto.PurchaseRequisitionConversionRequest;
import com.grash.dto.PurchaseRequisitionCreateRequest;
import com.grash.dto.PurchaseRequisitionDecisionRequest;
import com.grash.dto.PurchaseRequisitionShowDTO;
import com.grash.dto.PurchaseRequisitionApprovalConfigDTO;
import com.grash.dto.ProcurementApprovalDTO;
import com.grash.dto.UserMiniDTO;
import com.grash.exception.CustomException;
import com.grash.model.*;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.PurchaseRequisitionStatus;
import com.grash.model.enums.RoleType;
import com.grash.model.enums.Status;
import com.grash.model.enums.workflow.WFMainCondition;
import com.grash.model.enums.workflow.PurchaseOrderAction;
import com.grash.repository.PurchaseRequisitionRepository;
import com.grash.repository.PurchaseRequisitionApprovalConfigRepository;
import com.grash.service.ProcurementSiteService;
import com.grash.repository.WorkOrderRepository;
import com.grash.repository.VendorRepository;
import com.grash.service.PartService;
import com.grash.service.PartQuantityService;
import com.grash.service.PurchaseOrderPolicyService;
import com.grash.service.PurchaseOrderService;
import com.grash.service.ProcurementApprovalService;
import com.grash.service.UserService;
import com.grash.service.WorkflowService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.hibernate.Hibernate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.data.jpa.domain.Specification;

import java.util.*;
import java.util.stream.Collectors;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneOffset;

@RestController
@RequestMapping("/purchase-requisitions")
@RequiredArgsConstructor
public class PurchaseRequisitionController {
    private final PurchaseRequisitionRepository requisitionRepository;
    private final PurchaseRequisitionApprovalConfigRepository approvalConfigRepository;
    private final WorkOrderRepository workOrderRepository;
    private final UserService userService;
    private final PartService partService;
    private final VendorRepository vendorRepository;
    private final PurchaseOrderService purchaseOrderService;
    private final PartQuantityService partQuantityService;
    private final PurchaseOrderPolicyService procurementPolicy;
    private final WorkflowService workflowService;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final PartQuantityMapper partQuantityMapper;
    private final ObjectMapper objectMapper;
    private final com.grash.service.ProcurementApprovalService procurementApprovals;
    private final ProcurementSiteService procurementSiteService;

    @GetMapping("/approval-config")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional(readOnly = true)
    public PurchaseRequisitionApprovalConfigDTO getApprovalConfig(HttpServletRequest request) {
        User user = userService.whoami(request);
        requireSettings(user);
        PurchaseRequisitionApprovalConfigDTO response = new PurchaseRequisitionApprovalConfigDTO();
        response.setPolicyManagementEnabled(procurementApprovals.hasActivatedPolicy("PR", user.getCompany().getId()));
        approvalConfigRepository.findByCompany_Id(user.getCompany().getId()).ifPresent(config -> {
            response.setApproverUserIds(parseApproverIds(config.getApproverUserIds()));
            response.setVersion(config.getVersion());
        });
        if (response.getApproverUserIds() == null) response.setApproverUserIds(Collections.emptyList());
        if (response.getVersion() == null) response.setVersion(0);
        return response;
    }

    @PutMapping("/approval-config")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseRequisitionApprovalConfigDTO saveApprovalConfig(
            @Valid @RequestBody PurchaseRequisitionApprovalConfigDTO request, HttpServletRequest httpRequest) {
        User actor = userService.whoami(httpRequest);
        requireSettings(actor);
        if (procurementApprovals.hasActivatedPolicy("PR", actor.getCompany().getId())) {
            throw new CustomException("approval_use_policy_management", HttpStatus.CONFLICT);
        }
        Optional<PurchaseRequisitionApprovalConfig> existingConfig =
                approvalConfigRepository.findByCompany_Id(actor.getCompany().getId());
        if (request.getVersion() != null) {
            int currentVersion = existingConfig.map(config -> config.getVersion() == null ? 0 : config.getVersion())
                    .orElse(0);
            if (request.getVersion() != currentVersion) {
                throw new CustomException("approval_version_conflict", HttpStatus.CONFLICT);
            }
        }
        List<Long> ids = request.getApproverUserIds() == null ? Collections.emptyList() : request.getApproverUserIds();
        if (ids.size() > 5 || new HashSet<>(ids).size() != ids.size()) {
            throw new CustomException("Configure up to five unique approval levels", HttpStatus.BAD_REQUEST);
        }
        for (Long id : ids) {
            User approver = userService.findByIdAndCompany(id, actor.getCompany().getId())
                    .orElseThrow(() -> new CustomException("Approver not found in this company", HttpStatus.BAD_REQUEST));
            requireEligibleLegacyApprover(approver, HttpStatus.BAD_REQUEST);
        }
        PurchaseRequisitionApprovalConfig config = existingConfig.orElseGet(PurchaseRequisitionApprovalConfig::new);
        config.setApproverUserIds(writeJson(ids));
        config.setVersion(config.getVersion() == null ? 1 : config.getVersion() + 1);
        config = approvalConfigRepository.save(config);
        PurchaseRequisitionApprovalConfigDTO response = new PurchaseRequisitionApprovalConfigDTO();
        response.setApproverUserIds(ids);
        response.setVersion(config.getVersion());
        return response;
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseRequisitionShowDTO create(@Valid @RequestBody PurchaseRequisitionCreateRequest request,
                                               HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        require(user, "create");
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = new PurchaseRequisition();
        requisition.setTitle(request.getTitle().trim());
        requisition.setJustification(request.getJustification());
        requisition.setRequiredDate(request.getRequiredDate());
        requisition.setRequester(user);
        applySourceWorkOrder(requisition, request.getSourceWorkOrderId(), user);
        applyLines(requisition, request.getLines(), user);
        return show(requisitionRepository.save(requisition));
    }

    /** Imports purchase requisitions as drafts; submission and approval remain explicit user actions. */
    @PostMapping(value = "/import", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public Map<String, Object> importCsv(@RequestParam("file") MultipartFile file, HttpServletRequest request) throws Exception {
        if (file.isEmpty() || file.getSize() > 10 * 1024 * 1024) {
            throw new CustomException("purchase_import_file_invalid", HttpStatus.BAD_REQUEST);
        }
        User user = userService.whoami(request);
        require(user, "create");
        procurementPolicy.requireModuleEnabled(user);
        LinkedHashMap<String, ImportedRequisition> requisitions = new LinkedHashMap<>();
        String csv = new String(file.getBytes(), StandardCharsets.UTF_8).replace("\uFEFF", "");
        try (CSVParser parser = CSVFormat.DEFAULT.withFirstRecordAsHeader().withIgnoreEmptyLines(true).parse(new StringReader(csv))) {
            Set<String> requiredHeaders = Set.of("requisitionKey", "title", "justification", "requiredDate", "sourceWorkOrderId", "partId", "quantity", "notes");
            if (!parser.getHeaderMap().keySet().containsAll(requiredHeaders)) {
                throw new CustomException("purchase_import_headers_invalid", HttpStatus.BAD_REQUEST);
            }
            int rowNumber = 1;
            for (CSVRecord row : parser) {
                rowNumber++;
                if (rowNumber > 5001) throw new CustomException("purchase_import_row_limit_exceeded", HttpStatus.BAD_REQUEST);
                try {
                    String key = csvRequired(row, "requisitionKey");
                    ImportedRequisition item = requisitions.computeIfAbsent(key, ignored -> new ImportedRequisition(row));
                    item.assertSameHeader(row);
                    long partId = Long.parseLong(csvRequired(row, "partId"));
                    double quantity = Double.parseDouble(csvRequired(row, "quantity"));
                    if (!Double.isFinite(quantity) || quantity <= 0) throw new IllegalArgumentException("quantity_invalid");
                    Long siteId = csvOptional(row, "siteId").isBlank() ? null : Long.valueOf(csvOptional(row, "siteId"));
                    item.lines.add(new PurchaseRequisitionCreateRequest.Line() {{ setPartId(partId); setQuantity(quantity); setNotes(csvOptional(row, "notes")); setSiteId(siteId); }});
                } catch (RuntimeException error) {
                    throw new CustomException("purchase_import_invalid_row_" + rowNumber + "_" + safeCsvMessage(error), HttpStatus.UNPROCESSABLE_ENTITY);
                }
            }
        }
        if (requisitions.isEmpty()) throw new CustomException("purchase_import_empty", HttpStatus.BAD_REQUEST);
        if (requisitions.size() > 100) throw new CustomException("purchase_import_document_limit_exceeded", HttpStatus.BAD_REQUEST);
        for (ImportedRequisition imported : requisitions.values()) {
            PurchaseRequisitionCreateRequest dto = new PurchaseRequisitionCreateRequest();
            dto.setTitle(imported.title);
            dto.setJustification(imported.justification);
            dto.setRequiredDate(imported.requiredDate == null ? null : java.util.Date.from(imported.requiredDate.atStartOfDay().toInstant(ZoneOffset.UTC)));
            dto.setSourceWorkOrderId(imported.sourceWorkOrderId);
            dto.setLines(imported.lines);
            create(dto, request); // Reuse tenant, part, permission, and draft-creation rules.
        }
        return Map.of("importedRequisitions", requisitions.size(), "createdAs", "DRAFT");
    }

    private static String csvOptional(CSVRecord row, String name) { return !row.isMapped(name) || row.get(name) == null ? "" : row.get(name).trim(); }
    private static String csvRequired(CSVRecord row, String name) { String value = csvOptional(row, name); if (value.isBlank()) throw new IllegalArgumentException(name + "_required"); return value; }
    private static String safeCsvMessage(RuntimeException error) { return (error.getMessage() == null ? "invalid" : error.getMessage()).replaceAll("[^a-zA-Z0-9_-]", "_"); }
    private static final class ImportedRequisition {
        final String title, justification; final LocalDate requiredDate; final Long sourceWorkOrderId;
        final List<PurchaseRequisitionCreateRequest.Line> lines = new ArrayList<>();
        ImportedRequisition(CSVRecord row) {
            title = csvRequired(row, "title"); justification = csvOptional(row, "justification");
            requiredDate = csvDate(row, "requiredDate");
            sourceWorkOrderId = csvOptional(row, "sourceWorkOrderId").isBlank() ? null : Long.valueOf(csvOptional(row, "sourceWorkOrderId"));
        }
        void assertSameHeader(CSVRecord row) {
            if (!title.equals(csvRequired(row, "title")) || !justification.equals(csvOptional(row, "justification"))
                    || !Objects.equals(requiredDate, csvDate(row, "requiredDate"))
                    || !Objects.equals(sourceWorkOrderId, csvOptional(row, "sourceWorkOrderId").isBlank() ? null : Long.valueOf(csvOptional(row, "sourceWorkOrderId"))))
                throw new IllegalArgumentException("requisition_header_mismatch");
        }
    }
    private static LocalDate csvDate(CSVRecord row, String name) {
        String value = csvOptional(row, name);
        return value.isBlank() ? null : LocalDate.parse(value.substring(0, Math.min(10, value.length())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseRequisitionShowDTO update(@PathVariable Long id,
            @Valid @RequestBody PurchaseRequisitionCreateRequest request, HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = locked(id, user);
        if (!requisition.canEdit(user) || requisition.getStatus() != PurchaseRequisitionStatus.DRAFT) {
            throw new CustomException("Only a draft requisition can be edited", HttpStatus.CONFLICT);
        }
        requisition.setTitle(request.getTitle().trim());
        requisition.setJustification(request.getJustification());
        requisition.setRequiredDate(request.getRequiredDate());
        applySourceWorkOrder(requisition, request.getSourceWorkOrderId(), user);
        requisition.getLines().clear();
        applyLines(requisition, request.getLines(), user);
        return show(requisitionRepository.save(requisition));
    }

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public PurchaseRequisitionShowDTO get(@PathVariable Long id, HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = requisitionRepository.findWithLinesByIdAndCompany(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Purchase requisition not found", HttpStatus.NOT_FOUND));
        if (!requisition.canView(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        requireSiteAccess(requisition, user);
        return show(requisition);
    }

    @PostMapping("/search")
    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public Page<PurchaseRequisitionShowDTO> list(@RequestBody(required = false) SearchCriteria criteria,
                                                  HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        procurementPolicy.requireModuleEnabled(user);
        boolean canViewOwn = user.getRole().getCreatePermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS)
                || user.getRole().getEditOtherPermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS);
        boolean canViewAny = user.getRole().getViewPermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS)
                && user.getRole().getViewOtherPermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS);
        boolean canApprovePending = user.getRole().getEditOtherPermissions()
                .contains(PermissionEntity.PURCHASE_REQUISITION_APPROVAL);
        if (user.getRole().getRoleType() == RoleType.ROLE_CLIENT
                && !canViewOwn && !canViewAny && !canApprovePending) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        SearchCriteria search = criteria == null ? new SearchCriteria() : criteria;
        search.filterCompany(user);
        SpecificationBuilder<PurchaseRequisition> builder = new SpecificationBuilder<>();
        Specification<PurchaseRequisition> siteScope = procurementSiteService.requisitionsVisibleTo(user);
        if (!canViewAny && canApprovePending) {
            Specification<PurchaseRequisition> ownOrPendingApproval = (root, query, cb) -> cb.or(
                    cb.equal(root.get("createdBy"), user.getId()),
                    cb.equal(root.get("status"), PurchaseRequisitionStatus.PENDING_APPROVAL));
            builder.with(ownOrPendingApproval.and(siteScope));
        } else if (!canViewAny) {
            search.filterCreatedBy(user);
            builder.with(siteScope);
        } else {
            builder.with(siteScope);
        }
        search.getFilterFields().forEach(builder::with);
        PageRequest page = PageRequest.of(Math.max(0, search.getPageNum()),
                Math.max(1, Math.min(100, search.getPageSize())), Sort.Direction.DESC, "createdAt");
        return requisitionRepository.findAll(builder.build(), page).map(this::show);
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseRequisitionShowDTO submit(@PathVariable Long id, HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = locked(id, user);
        if (!requisition.canEdit(user) || requisition.getStatus() != PurchaseRequisitionStatus.DRAFT
                || requisition.getLines().isEmpty()) {
            throw new CustomException("A non-empty draft requisition is required", HttpStatus.CONFLICT);
        }
        boolean governed = procurementApprovals.start("PR", requisition.getId(), requisition.getTitle(),
                requisition.getRequester() == null ? requisition.getCreatedBy() : requisition.getRequester().getId(), user.getCompany(),
                com.grash.service.ProcurementApprovalService.estimateRequisitionAmount(requisition),
                user.getCompany().getCompanySettings().getGeneralPreferences().getCurrency().getCode());
        PurchaseRequisitionApprovalConfig approvalConfig = governed ? null : approvalConfigRepository
                .findByCompany_Id(user.getCompany().getId()).orElse(null);
        List<Long> configuredApprovers = approvalConfig == null ? Collections.emptyList()
                : parseApproverIds(approvalConfig.getApproverUserIds());
        validateLegacyApprovers(configuredApprovers, user.getCompany().getId());
        if (configuredApprovers.contains(user.getId())) {
            throw new CustomException("The requester cannot be assigned as an approver on their own requisition", HttpStatus.CONFLICT);
        }
        requisition.setStatus(PurchaseRequisitionStatus.PENDING_APPROVAL);
        if (!configuredApprovers.isEmpty()) {
            requisition.setApprovalApproverIds(writeJson(configuredApprovers));
            requisition.setApprovalStep(0);
            requisition.setApprovalHistory("[]");
            requisition.setApprovalConfigVersion(approvalConfig.getVersion());
        }
        return show(requisitionRepository.save(requisition));
    }

    private void validateLegacyApprovers(List<Long> approverIds, Long companyId) {
        for (Long id : approverIds) {
            User approver = userService.findByIdAndCompany(id, companyId)
                    .orElseThrow(() -> new CustomException("approval_approver_unavailable", HttpStatus.CONFLICT));
            requireEligibleLegacyApprover(approver, HttpStatus.CONFLICT);
        }
    }

    private void requireEligibleLegacyApprover(User approver, HttpStatus status) {
        if (!approver.isEnabled() || !approver.isEnabledInSubscription() || approver.getRole() == null
                || approver.getRole().getEditOtherPermissions() == null
                || !approver.getRole().getEditOtherPermissions()
                .contains(PermissionEntity.PURCHASE_REQUISITION_APPROVAL)) {
            throw new CustomException("approval_approver_unavailable", status);
        }
    }

    @PostMapping("/{id}/decision")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseRequisitionShowDTO decide(@PathVariable Long id,
            @Valid @RequestBody PurchaseRequisitionDecisionRequest decision, HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        require(user, "approve");
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = locked(id, user);
        if (requisition.getStatus() != PurchaseRequisitionStatus.PENDING_APPROVAL) {
            throw new CustomException("Only pending requisitions can be decided", HttpStatus.CONFLICT);
        }
        if (!requisition.canView(user)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        if (requisition.getRequester() != null && requisition.getRequester().getId().equals(user.getId())) {
            throw new CustomException("A requester cannot approve or reject their own requisition", HttpStatus.FORBIDDEN);
        }
        var policySummary = procurementApprovals.summary("PR", id, user);
        Boolean terminal = procurementApprovals.decide("PR", id, user.getCompany().getId(), user,
                decision.getApproved(), decision.getNote());
        if (terminal != null) {
            appendApprovalHistory(requisition, user, decision, policySummary.currentLevel() - 1);
            requisition.setApprovalStep(terminal ? policySummary.currentLevel() - 1 : policySummary.currentLevel());
            if (terminal) requisition.setStatus(decision.getApproved() ? PurchaseRequisitionStatus.APPROVED : PurchaseRequisitionStatus.REJECTED);
            return show(requisitionRepository.save(requisition));
        }
        List<Long> assignedApprovers = parseApproverIds(requisition.getApprovalApproverIds());
        int currentStep = requisition.getApprovalStep() == null ? 0 : requisition.getApprovalStep();
        if (!assignedApprovers.isEmpty() && (currentStep >= assignedApprovers.size()
                || !assignedApprovers.get(currentStep).equals(user.getId()))) {
            throw new CustomException("This requisition is assigned to another approver", HttpStatus.FORBIDDEN);
        }
        if (!decision.getApproved() && (decision.getNote() == null || decision.getNote().isBlank())) {
            throw new CustomException("A rejection note is required", HttpStatus.BAD_REQUEST);
        }
        appendApprovalHistory(requisition, user, decision, currentStep);
        boolean finalApproval = assignedApprovers.isEmpty() || currentStep + 1 >= assignedApprovers.size();
        requisition.setStatus(decision.getApproved()
                ? (finalApproval ? PurchaseRequisitionStatus.APPROVED : PurchaseRequisitionStatus.PENDING_APPROVAL)
                : PurchaseRequisitionStatus.REJECTED);
        if (decision.getApproved() && !finalApproval) requisition.setApprovalStep(currentStep + 1);
        return show(requisitionRepository.save(requisition));
    }

    @GetMapping("/{id}/legacy-approval-reassignment-targets")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional(readOnly = true)
    public List<UserMiniDTO> legacyReassignmentTargets(@PathVariable Long id, HttpServletRequest httpRequest) {
        User actor = userService.whoami(httpRequest);
        requireSettings(actor);
        PurchaseRequisition requisition = requisitionRepository.findByIdAndCompany_Id(id, actor.getCompany().getId())
                .orElseThrow(() -> new CustomException("Purchase requisition not found", HttpStatus.NOT_FOUND));
        ensureLegacyPendingReassignment(requisition);
        Long assignedId = currentApproverId(requisition);
        User assigned = assignedId == null ? null : userService.findByIdAndCompany(assignedId, actor.getCompany().getId()).orElse(null);
        if (isEligibleLegacyApprover(assigned)) {
            throw new CustomException("Current approver is still eligible", HttpStatus.CONFLICT);
        }
        List<Long> chain = parseApproverIds(requisition.getApprovalApproverIds());
        int step = requisition.getApprovalStep() == null ? 0 : requisition.getApprovalStep();
        Set<Long> alreadyActed = approvalHistoryUserIds(requisition);
        return userService.findByCompany(actor.getCompany().getId()).stream()
                .filter(candidate -> !Objects.equals(candidate.getId(), currentApproverId(requisition)))
                .filter(candidate -> !Objects.equals(candidate.getId(), actor.getId()))
                .filter(candidate -> requisition.getRequester() == null || !Objects.equals(candidate.getId(), requisition.getRequester().getId()))
                .filter(candidate -> !alreadyActed.contains(candidate.getId()))
                .filter(candidate -> java.util.stream.IntStream.range(step + 1, chain.size()).noneMatch(i -> Objects.equals(chain.get(i), candidate.getId())))
                .filter(candidate -> isEligibleLegacyApprover(candidate))
                .map(candidate -> {
                    UserMiniDTO dto = new UserMiniDTO();
                    dto.setId(candidate.getId()); dto.setFirstName(candidate.getFirstName()); dto.setLastName(candidate.getLastName());
                    return dto;
                })
                .toList();
    }

    @PostMapping("/{id}/legacy-approval-reassignment")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseRequisitionShowDTO reassignLegacyApproval(@PathVariable Long id,
            @Valid @RequestBody ProcurementApprovalDTO.Reassignment request, HttpServletRequest httpRequest) {
        User actor = userService.whoami(httpRequest);
        requireSettings(actor);
        PurchaseRequisition requisition = locked(id, actor);
        ensureLegacyPendingReassignment(requisition);
        int step = requisition.getApprovalStep() == null ? 0 : requisition.getApprovalStep();
        List<Long> chain = new ArrayList<>(parseApproverIds(requisition.getApprovalApproverIds()));
        User currentApprover = step < chain.size()
                ? userService.findByIdAndCompany(chain.get(step), actor.getCompany().getId()).orElse(null) : null;
        if (isEligibleLegacyApprover(currentApprover)) {
            throw new CustomException("Current approver is still eligible", HttpStatus.CONFLICT);
        }
        if (request.targetUserId() == null || request.reason() == null || request.reason().isBlank()
                || request.reason().trim().length() > 1000 || step >= chain.size()) {
            throw new CustomException("Invalid approval reassignment", HttpStatus.BAD_REQUEST);
        }
        User target = userService.findByIdAndCompany(request.targetUserId(), actor.getCompany().getId())
                .orElseThrow(() -> new CustomException("Approver not found in this company", HttpStatus.BAD_REQUEST));
        if (!isEligibleLegacyApprover(target) || Objects.equals(target.getId(), actor.getId())
                || Objects.equals(target.getId(), currentApproverId(requisition))
                || (requisition.getRequester() != null && Objects.equals(target.getId(), requisition.getRequester().getId()))
                || approvalHistoryUserIds(requisition).contains(target.getId())
                || java.util.stream.IntStream.range(step + 1, chain.size()).anyMatch(i -> Objects.equals(chain.get(i), target.getId()))) {
            throw new CustomException("approval_approver_unavailable", HttpStatus.CONFLICT);
        }
        Long previousApproverId = chain.set(step, target.getId());
        requisition.setApprovalApproverIds(writeJson(chain));
        List<Map<String, Object>> history = readApprovalHistory(requisition);
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("step", step + 1); entry.put("action", "REASSIGNED"); entry.put("userId", actor.getId());
        entry.put("previousApproverId", previousApproverId); entry.put("reassignedToUserId", target.getId());
        entry.put("note", request.reason().trim()); entry.put("decidedAt", new Date());
        history.add(entry);
        requisition.setApprovalHistory(writeJson(history));
        return show(requisitionRepository.save(requisition));
    }

    private void ensureLegacyPendingReassignment(PurchaseRequisition requisition) {
        if (requisition.getStatus() != PurchaseRequisitionStatus.PENDING_APPROVAL
                || parseApproverIds(requisition.getApprovalApproverIds()).isEmpty()
                || requisition.getApprovalStep() == null || requisition.getApprovalStep() < 0
                || requisition.getApprovalStep() >= parseApproverIds(requisition.getApprovalApproverIds()).size()) {
            throw new CustomException("Only pending legacy approvals can be reassigned", HttpStatus.CONFLICT);
        }
    }

    private boolean isEligibleLegacyApprover(User user) {
        return user != null && user.isEnabled() && user.isEnabledInSubscription() && user.getRole() != null
                && user.getRole().getEditOtherPermissions() != null
                && user.getRole().getEditOtherPermissions().contains(PermissionEntity.PURCHASE_REQUISITION_APPROVAL);
    }

    private Set<Long> approvalHistoryUserIds(PurchaseRequisition requisition) {
        return readApprovalHistory(requisition).stream().map(entry -> entry.get("userId"))
                .filter(Objects::nonNull).map(value -> value instanceof Number n ? n.longValue() : Long.valueOf(value.toString()))
                .collect(Collectors.toSet());
    }

    private List<Map<String, Object>> readApprovalHistory(PurchaseRequisition requisition) {
        if (requisition.getApprovalHistory() == null || requisition.getApprovalHistory().isBlank()) return new ArrayList<>();
        try { return objectMapper.readValue(requisition.getApprovalHistory(), new TypeReference<List<Map<String, Object>>>() {}); }
        catch (Exception exception) { throw new CustomException("approval_data_unreadable", HttpStatus.INTERNAL_SERVER_ERROR); }
    }

    /** Convert selected approved quantities to a supplier PO. Direct PO creation remains available. */
    @PostMapping("/{id}/convert-to-order")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseOrderShowDTO convert(@PathVariable Long id,
            @Valid @RequestBody PurchaseRequisitionConversionRequest request, HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        if (!user.getRole().getCreatePermissions().contains(PermissionEntity.PURCHASE_ORDERS)) {
            throw new CustomException("Purchase order creation is not allowed", HttpStatus.FORBIDDEN);
        }
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = locked(id, user);
        if (!requisition.canView(user) || !EnumSet.of(PurchaseRequisitionStatus.APPROVED,
                PurchaseRequisitionStatus.PARTIALLY_ORDERED).contains(requisition.getStatus())) {
            throw new CustomException("Only approved requisitions can be converted", HttpStatus.CONFLICT);
        }
        Vendor vendor = vendorRepository.findByIdAndCompany_Id(request.getVendorId(), user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Vendor not found", HttpStatus.NOT_FOUND));
        if (request.getLines().stream().map(PurchaseRequisitionConversionRequest.Line::getRequisitionLineId)
                .distinct().count() != request.getLines().size()) {
            throw new CustomException("A requisition line can only be selected once", HttpStatus.BAD_REQUEST);
        }
        PurchaseOrder order = new PurchaseOrder();
        order.setName(request.getPurchaseOrderName() == null || request.getPurchaseOrderName().isBlank()
                ? "PR-" + requisition.getId() + " — " + requisition.getTitle() : request.getPurchaseOrderName().trim());
        order.setVendor(vendor);
        order.setReceivingWorkflowEnabled(true);
        order.setAdditionalInfoRequisitionedName(requisition.getRequester() == null ? null
                : requisition.getRequester().getFirstName() + " " + requisition.getRequester().getLastName());
        order = purchaseOrderService.create(order);
        PurchaseOrder createdOrder = order;
        for (PurchaseRequisitionConversionRequest.Line selected : request.getLines()) {
            PurchaseRequisitionLine line = requisition.getLines().stream()
                    .filter(candidate -> candidate.getId().equals(selected.getRequisitionLineId())).findFirst()
                    .orElseThrow(() -> new CustomException("Requisition line not found", HttpStatus.NOT_FOUND));
            double quantity = selected.getQuantity();
            double remainingQuantity = line.getQuantity() - line.getOrderedQuantity();
            if (!Double.isFinite(quantity) || quantity <= 0 || quantity > remainingQuantity + 1e-9) {
                throw new CustomException("Ordered quantity exceeds the remaining requested quantity", HttpStatus.CONFLICT);
            }
            if (line.getPart().getUnit() == null && quantity != Math.rint(quantity)) {
                throw new CustomException("A whole quantity is required when the part has no unit", HttpStatus.BAD_REQUEST);
            }
            line.setOrderedQuantity(line.getOrderedQuantity() + quantity);
            PartQuantity orderLine = new PartQuantity(line.getPart(), null, order, quantity);
            orderLine.setRequisitionLine(line);
            orderLine.setSite(line.getSite());
            try { partQuantityService.setAgreedPurchasePrice(orderLine, selected.getPurchaseUnitPrice()); }
            catch (IllegalArgumentException ex) { throw new CustomException("A valid supplier unit price is required", HttpStatus.BAD_REQUEST); }
            partQuantityService.create(orderLine);
        }
        var convertedLines = partQuantityService.findByPurchaseOrder(order.getId());
        procurementApprovals.start("PO", order.getId(), order.getName(), order.getCreatedBy(), order.getCompany(),
                com.grash.service.ProcurementApprovalService.estimatePurchaseOrderAmount(convertedLines),
                user.getCompany().getCompanySettings().getGeneralPreferences().getCurrency().getCode());
        boolean remaining = requisition.getLines().stream()
                .anyMatch(line -> line.getOrderedQuantity() + 1e-9 < line.getQuantity());
        requisition.setStatus(remaining ? PurchaseRequisitionStatus.PARTIALLY_ORDERED : PurchaseRequisitionStatus.ORDERED);
        requisitionRepository.save(requisition);
        workflowService.findByCompany(user.getCompany().getId()).stream()
                .filter(workflow -> workflow.isEnabled()
                        && workflow.getMainCondition() == WFMainCondition.PURCHASE_ORDER_CREATED
                        // A requisition-to-order conversion must not treat PO approval as physical receipt.
                        && workflow.getAction() != null
                        && workflow.getAction().getPurchaseOrderAction() != null
                        && workflow.getAction().getPurchaseOrderAction() != PurchaseOrderAction.APPROVE
                        && workflow.getAction().getPurchaseOrderAction() != PurchaseOrderAction.REJECT)
                .forEach(workflow -> workflowService.runPurchaseOrder(workflow, createdOrder));
        return purchaseOrderService.findByIdAndCompany_Id(order.getId(), user.getCompany().getId())
                .map(saved -> {
                    PurchaseOrderShowDTO result = purchaseOrderMapper.toShowDto(saved);
                    result.setPartQuantities(partQuantityService.findByPurchaseOrder(saved.getId()).stream()
                            .map(line -> {
                                var dto = partQuantityMapper.toShowDto(line);
                                dto.setRemainingToReceive(line.getQuantity());
                                return dto;
                            }).collect(Collectors.toList()));
                    return result;
                }).orElseThrow(() -> new CustomException("Created purchase order not found", HttpStatus.INTERNAL_SERVER_ERROR));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public void delete(@PathVariable Long id, HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = locked(id, user);
        boolean canDelete = requisition.getRequester() != null
                && requisition.getRequester().getId().equals(user.getId())
                || user.getRole().getRoleType() != RoleType.ROLE_CLIENT
                || user.getRole().getDeleteOtherPermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS);
        if (!canDelete || requisition.getStatus() != PurchaseRequisitionStatus.DRAFT) {
            throw new CustomException("Only draft requisitions can be deleted", HttpStatus.CONFLICT);
        }
        requisitionRepository.delete(requisition);
    }

    private PurchaseRequisition locked(Long id, User user) {
        PurchaseRequisition requisition = requisitionRepository.findByIdForUpdateAndCompany(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Purchase requisition not found", HttpStatus.NOT_FOUND));
        Hibernate.initialize(requisition.getLines());
        requireSiteAccess(requisition, user);
        return requisition;
    }

    private void requireSiteAccess(PurchaseRequisition requisition, User user) {
        boolean accessible = requisition.getLines().stream().allMatch(line ->
                procurementSiteService.canAccessSite(user, line.getSite()));
        if (!accessible) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
    }

    private void applyLines(PurchaseRequisition requisition, List<PurchaseRequisitionCreateRequest.Line> lines, User user) {
        Set<Long> partIds = new HashSet<>();
        for (PurchaseRequisitionCreateRequest.Line input : lines) {
            if (!Double.isFinite(input.getQuantity()) || input.getQuantity() <= 0) {
                throw new CustomException("Requested quantity must be greater than zero", HttpStatus.BAD_REQUEST);
            }
            if (!partIds.add(input.getPartId())) {
                throw new CustomException("A part can only appear once in a requisition", HttpStatus.BAD_REQUEST);
            }
            Part part = partService.findByIdAndCompany(input.getPartId(), user.getCompany().getId())
                    .orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND));
            if (part.getUnit() == null && input.getQuantity() != Math.rint(input.getQuantity())) {
                throw new CustomException("A whole quantity is required when the part has no unit", HttpStatus.BAD_REQUEST);
            }
            PurchaseRequisitionLine line = new PurchaseRequisitionLine();
            line.setRequisition(requisition);
            line.setPart(part);
            line.setQuantity(input.getQuantity());
            line.setNotes(input.getNotes());
            line.setSite(procurementSiteService.resolveLineSite(input.getSiteId(),
                    requisition.getSourceWorkOrder() == null ? null : requisition.getSourceWorkOrder().getSite(), user));
            requisition.getLines().add(line);
        }
    }

    private PurchaseRequisitionShowDTO show(PurchaseRequisition requisition) {
        return PurchaseRequisitionShowDTO.builder().id(requisition.getId()).title(requisition.getTitle())
                .justification(requisition.getJustification()).requiredDate(requisition.getRequiredDate())
                .status(requisition.getStatus()).requesterId(requisition.getRequester() == null ? null : requisition.getRequester().getId())
                .requesterName(requisition.getRequester() == null ? null : requisition.getRequester().getFirstName() + " " + requisition.getRequester().getLastName())
                .sourceWorkOrderId(requisition.getSourceWorkOrder() == null ? null : requisition.getSourceWorkOrder().getId())
                .sourceWorkOrderName(requisition.getSourceWorkOrder() == null ? null
                        : requisition.getSourceWorkOrder().getCustomId() == null
                                ? "WO-" + requisition.getSourceWorkOrder().getId()
                                : requisition.getSourceWorkOrder().getCustomId())
                .decisionById(requisition.getDecisionBy() == null ? null : requisition.getDecisionBy().getId())
                .decisionAt(requisition.getDecisionAt()).decisionNote(requisition.getDecisionNote())
                .approvalStep(requisition.getApprovalStep() == null ? 0 : requisition.getApprovalStep())
                .approvalLevelCount(parseApproverIds(requisition.getApprovalApproverIds()).size())
                .approvalConfigVersion(requisition.getApprovalConfigVersion())
                .currentApproverId(currentApproverId(requisition))
                .approvalHistory(requisition.getApprovalHistory())
                .lines(requisition.getLines().stream().map(line -> PurchaseRequisitionShowDTO.Line.builder()
                        .id(line.getId()).partId(line.getPart().getId()).partName(line.getPart().getName())
                        .unit(line.getPart().getUnit()).quantity(line.getQuantity()).orderedQuantity(line.getOrderedQuantity())
                        .notes(line.getNotes()).siteId(line.getSite() == null ? null : line.getSite().getId())
                        .siteName(line.getSite() == null ? null : line.getSite().getName()).build()).collect(Collectors.toList())).build();
    }

    private void applySourceWorkOrder(PurchaseRequisition requisition, Long workOrderId, User user) {
        if (workOrderId == null) {
            requisition.setSourceWorkOrder(null);
            return;
        }
        WorkOrder workOrder = workOrderRepository.findByIdAndCompany_Id(
                        workOrderId, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!workOrder.canBeViewedBy(user) || !user.canAccessSite(workOrder.getSite())) {
            throw new CustomException("Access denied to source work order", HttpStatus.FORBIDDEN);
        }
        boolean alreadyLinkedSource = requisition.getSourceWorkOrder() != null
                && requisition.getSourceWorkOrder().getId().equals(workOrderId);
        if (workOrder.getStatus() == Status.COMPLETE && !alreadyLinkedSource) {
            throw new CustomException("A completed work order cannot be a new requisition source", HttpStatus.CONFLICT);
        }
        requisition.setSourceWorkOrder(workOrder);
    }

    private void require(User user, String operation) {
        PermissionEntity permission = PermissionEntity.PURCHASE_REQUISITIONS;
        boolean allowed = switch (operation) {
            case "create" -> user.getRole().getCreatePermissions().contains(permission);
            case "view" -> user.getRole().getViewPermissions().contains(permission);
            case "edit" -> user.getRole().getEditOtherPermissions().contains(permission);
            case "approve" -> user.getRole().getEditOtherPermissions()
                    .contains(PermissionEntity.PURCHASE_REQUISITION_APPROVAL);
            case "delete" -> user.getRole().getDeleteOtherPermissions().contains(permission);
            default -> false;
        };
        if (user.getRole().getRoleType() == RoleType.ROLE_CLIENT && !allowed) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
    }

    private void requireSettings(User user) {
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)
                || !user.getRole().getEditOtherPermissions().contains(PermissionEntity.SETTINGS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        procurementPolicy.requireModuleEnabled(user);
    }

    private List<Long> parseApproverIds(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try { return objectMapper.readValue(json, new TypeReference<List<Long>>() {}); }
        catch (Exception exception) { throw new CustomException("Invalid approval configuration", HttpStatus.INTERNAL_SERVER_ERROR); }
    }

    private String writeJson(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (Exception exception) { throw new CustomException("Could not save approval configuration", HttpStatus.INTERNAL_SERVER_ERROR); }
    }

    private void appendApprovalHistory(PurchaseRequisition requisition, User actor,
                                       PurchaseRequisitionDecisionRequest decision, int step) {
        List<Map<String, Object>> history = new ArrayList<>();
        if (requisition.getApprovalHistory() != null && !requisition.getApprovalHistory().isBlank()) {
            try { history = objectMapper.readValue(requisition.getApprovalHistory(), new TypeReference<List<Map<String, Object>>>() {}); }
            catch (Exception exception) { throw new CustomException("approval_data_unreadable", HttpStatus.INTERNAL_SERVER_ERROR); }
        }
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("step", step + 1);
        entry.put("userId", actor.getId());
        entry.put("approved", decision.getApproved());
        entry.put("note", decision.getNote() == null ? null : decision.getNote().trim());
        entry.put("decidedAt", new Date());
        history.add(entry);
        requisition.setApprovalHistory(writeJson(history));
        requisition.setDecisionBy(actor);
        requisition.setDecisionAt(new Date());
        requisition.setDecisionNote(decision.getNote() == null ? null : decision.getNote().trim());
    }

    private Long currentApproverId(PurchaseRequisition requisition) {
        List<Long> ids = parseApproverIds(requisition.getApprovalApproverIds());
        int step = requisition.getApprovalStep() == null ? 0 : requisition.getApprovalStep();
        return step >= 0 && step < ids.size() ? ids.get(step) : null;
    }
}
