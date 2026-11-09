package com.grash.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.dto.ProcurementApprovalDTO.*;
import com.grash.exception.CustomException;
import com.grash.model.*;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Transactional
public class ProcurementApprovalService {
    private final ProcurementApprovalPolicyRepository policies;
    private final ProcurementApprovalInstanceRepository instances;
    private final ProcurementApprovalEventRepository events;
    private final CompanyRepository companies;
    private final UserRepository users;
    private final ObjectMapper json;

    public static String documentType(String type) {
        if (type == null || !List.of("PR", "PO").contains(type)) throw bad("approval_invalid_type");
        return type;
    }

    public static PermissionEntity approvalPermission(String type) {
        return "PR".equals(documentType(type)) ? PermissionEntity.PURCHASE_REQUISITION_APPROVAL : PermissionEntity.PURCHASE_ORDER_APPROVAL;
    }

    public static BigDecimal estimateRequisitionAmount(PurchaseRequisition requisition) {
        BigDecimal amount = requisition.getLines().stream()
                .map(line -> estimatedLineAmount(line.getPart(), line.getQuantity()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return requireDisplayableAmount(amount);
    }

    public static BigDecimal estimatePurchaseOrderAmount(Collection<PartQuantity> lines) {
        BigDecimal amount = lines.stream().map(line -> line.getPurchaseUnitPrice() != null
                        ? estimatedLineAmount(line.getPurchaseUnitPrice(), line.getQuantity())
                        : line.getPurchaseUnitCostSnapshot() == null
                        ? estimatedLineAmount(line.getPart(), line.getQuantity())
                        : estimatedLineAmount(line.getPurchaseUnitCostSnapshot(), line.getQuantity()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return requireDisplayableAmount(amount);
    }

    private static BigDecimal estimatedLineAmount(BigDecimal unitCost, double quantity) {
        if (unitCost == null || unitCost.signum() < 0 || !Double.isFinite(quantity) || quantity <= 0)
            throw bad("approval_invalid_amount_snapshot");
        return requireDisplayableAmount(unitCost.multiply(BigDecimal.valueOf(quantity)));
    }

    private static BigDecimal estimatedLineAmount(Part part, double quantity) {
        if (part == null || !Double.isFinite(part.getCost()) || part.getCost() < 0
                || !Double.isFinite(quantity) || quantity <= 0) throw bad("approval_invalid_amount_snapshot");
        return estimatedLineAmount(BigDecimal.valueOf(part.getCost()), quantity);
    }

    private static BigDecimal requireDisplayableAmount(BigDecimal amount) {
        if (amount == null || !Double.isFinite(amount.doubleValue())) throw bad("approval_invalid_amount_snapshot");
        return amount;
    }

    private boolean eligible(User user, String type) {
        if (user == null || !user.isEnabled() || !user.isEnabledInSubscription() || user.getRole() == null
                || !user.getRole().getEditOtherPermissions().contains(approvalPermission(type))) return false;
        return "PR".equals(type) || user.getRole().getViewPermissions().contains(PermissionEntity.PURCHASE_ORDERS)
                && user.getRole().getViewOtherPermissions().contains(PermissionEntity.PURCHASE_ORDERS);
    }

    @Transactional(readOnly = true)
    public Page<Policy> search(User actor, String query, String type, String status, int page) {
        Specification<ProcurementApprovalPolicy> spec = (root, q, cb) -> cb.equal(root.get("company").get("id"), actor.getCompany().getId());
        if (type != null && !type.isBlank()) spec = spec.and((root, q, cb) -> cb.equal(root.get("documentType"), documentType(type)));
        if (status != null && !status.isBlank()) {
            if (!List.of("ACTIVE", "INACTIVE", "DRAFT").contains(status)) throw bad("approval_invalid_status");
            spec = spec.and((root, q, cb) -> cb.equal(root.get("status"), status));
        }
        if (query != null && !query.isBlank()) spec = spec.and((root, q, cb) -> cb.like(cb.lower(root.get("name")), pattern(query), '\\'));
        return policies.findAll(spec, PageRequest.of(Math.max(0, page), 20,
                Sort.by(Sort.Order.asc("documentType"), Sort.Order.asc("priority"), Sort.Order.desc("updatedAt")))).map(this::view);
    }

    public ProcurementApprovalPolicy policy(Long id, User actor) {
        return policies.findByIdAndCompany_Id(id, actor.getCompany().getId()).orElseThrow(() -> missing());
    }

    public Policy view(ProcurementApprovalPolicy policy) {
        return new Policy(policy.getId(), policy.getVersion(), policy.getName(), policy.getDescription(), policy.getDocumentType(),
                policy.getStatus(), policy.getPriority(), conditions(policy), levels(policy), policy.getReplacesPolicyId());
    }

    public Policy save(Long id, Draft draft, User actor) {
        if (draft == null || draft.name() == null || draft.name().isBlank() || draft.name().trim().length() > 160
                || draft.description() != null && draft.description().length() > 1000) throw bad("approval_invalid_name");
        documentType(draft.documentType());
        List<Level> levels = normalizeLevels(draft.levels());
        validateLevels(levels, draft.documentType(), actor.getCompany().getId(), false);
        validateConditions(draft.conditions(), companyCurrency(actor.getCompany()), false);
        ProcurementApprovalPolicy policy = id == null ? new ProcurementApprovalPolicy() : policy(id, actor);
        if (id != null) {
            checkVersion(policy, draft.version());
            if (!"DRAFT".equals(policy.getStatus())) throw conflict("approval_revision_required");
            if (policy.getReplacesPolicyId() != null && !policy.getDocumentType().equals(draft.documentType())) throw bad("approval_invalid_type");
        }
        policy.setCompany(actor.getCompany());
        policy.setName(draft.name().trim());
        policy.setDescription(draft.description());
        policy.setDocumentType(draft.documentType());
        policy.setPriority(draft.priority() > 0 ? draft.priority() : 100);
        policy.setConditions(write(draft.conditions() == null ? List.of() : draft.conditions()));
        policy.setLevels(write(levels));
        policies.saveAndFlush(policy);
        audit(policy, actor, id == null ? "CREATED" : "UPDATED");
        return view(policy);
    }

    public Policy copy(Long id, boolean revision, User actor) {
        ProcurementApprovalPolicy original = policy(id, actor);
        if (revision && !"ACTIVE".equals(original.getStatus())) throw conflict("approval_revision_required");
        ProcurementApprovalPolicy copy = new ProcurementApprovalPolicy();
        copy.setCompany(actor.getCompany());
        copy.setName(original.getName());
        copy.setDescription(original.getDescription());
        copy.setDocumentType(original.getDocumentType());
        copy.setPriority(original.getPriority());
        copy.setConditions(original.getConditions());
        copy.setLevels(original.getLevels());
        copy.setReplacesPolicyId(revision ? original.getId() : null);
        policies.saveAndFlush(copy);
        audit(copy, actor, revision ? "REVISED" : "DUPLICATED");
        return view(copy);
    }

    public Policy setActive(Long id, long version, boolean active, User actor) {
        // Serialize selection/activation for the company, including the first policy.
        companies.lockForApprovalPolicies(actor.getCompany().getId()).orElseThrow(() -> missing());
        ProcurementApprovalPolicy policy = policy(id, actor);
        checkVersion(policy, version);
        if (active) {
            validateLevels(levels(policy), policy.getDocumentType(), actor.getCompany().getId(), true);
            var atPriority = policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(actor.getCompany().getId(), policy.getDocumentType(), "ACTIVE")
                    .stream().filter(p -> p.getPriority() == policy.getPriority()).findFirst();
            if (atPriority.isPresent() && !atPriority.get().getId().equals(policy.getReplacesPolicyId())) throw conflict("approval_policy_priority_conflict");
            if (policy.getReplacesPolicyId() != null) {
                policies.findByIdAndCompany_Id(policy.getReplacesPolicyId(), actor.getCompany().getId())
                        .filter(replaced -> "ACTIVE".equals(replaced.getStatus()))
                        .ifPresent(replaced -> {
                            replaced.setStatus("INACTIVE");
                            policies.saveAndFlush(replaced);
                            audit(replaced, actor, "REPLACED");
                        });
            }
            validateConditions(conditions(policy), companyCurrency(actor.getCompany()), true);
            policy.setStatus("ACTIVE");
            if (policy.getActivatedAt() == null) policy.setActivatedAt(new Date());
        } else {
            if (!"ACTIVE".equals(policy.getStatus())) throw conflict("approval_invalid_status");
            policy.setStatus("INACTIVE");
        }
        policies.saveAndFlush(policy);
        audit(policy, actor, active ? "ACTIVATED" : "DEACTIVATED");
        return view(policy);
    }

    public void delete(Long id, long version, User actor) {
        var policy = policy(id, actor);
        checkVersion(policy, version);
        if (!"DRAFT".equals(policy.getStatus()) || policy.getActivatedAt() != null || instances.existsByPolicyId(id)) throw conflict("approval_policy_in_use");
        audit(policy, actor, "DELETED");
        policies.delete(policy);
    }

    @Transactional(readOnly = true)
    public List<Target> targets(User actor) {
        List<User> people = users.findByCompany_Id(actor.getCompany().getId()).stream().filter(u -> eligible(u, "PR") || eligible(u, "PO")).toList();
        List<Target> result = new ArrayList<>();
        Set<Long> roles = new HashSet<>();
        for (User person : people) {
            result.add(new Target(person.getId(), userName(person), "USER", List.of("PR", "PO").stream().filter(t -> eligible(person, t)).toList()));
            if (roles.add(person.getRole().getId())) {
                List<String> types = List.of("PR", "PO").stream().filter(type -> people.stream().anyMatch(u -> u.getRole().getId().equals(person.getRole().getId()) && eligible(u, type))).toList();
                result.add(new Target(person.getRole().getId(), person.getRole().getName(), "ROLE", types));
            }
        }
        return result;
    }

    private void validateLevels(List<Level> levels, String type, Long company, boolean activation) {
        if (levels.size() > 5 || activation && levels.stream().noneMatch(level -> level != null && level.isRequired())) throw bad("approval_levels_required");
        Set<Long> assignedUsers = new HashSet<>();
        for (Level level : levels) {
            if (level == null || level.name() == null || level.name().length() > 120 || level.approverType() == null || !List.of("ROLE", "USER").contains(level.approverType())) throw bad("approval_invalid_level");
            if (activation && level.name().isBlank()) throw bad("approval_invalid_level");
            if (!level.isRequired() && level.approverId() != null) throw bad("approval_invalid_level");
            if (activation && level.isRequired() && level.approverId() == null) throw bad("approval_invalid_level");
            if (level.approverId() != null) {
                if (level.isRequired() && "USER".equals(level.approverType()) && !assignedUsers.add(level.approverId())) throw bad("approval_distinct_approvers");
                if (candidates(level, type, company, null).isEmpty()) throw bad("approval_approver_unavailable");
            }
        }
    }

    private List<User> candidates(Level level, String type, Long company, Long excluded) {
        return users.findByCompany_Id(company).stream().filter(user -> eligible(user, type) && !Objects.equals(user.getId(), excluded))
                .filter(user -> "USER".equals(level.approverType()) ? user.getId().equals(level.approverId()) : user.getRole().getId().equals(level.approverId())).toList();
    }

    /** Returns false only for companies that have never activated policies of this document type. */
    public boolean start(String type, Long documentId, String documentName, Long requesterId, Company company) {
        return start(type, documentId, documentName, requesterId, company, null, null);
    }

    public boolean start(String type, Long documentId, String documentName, Long requesterId, Company company,
                         BigDecimal estimatedNetAmount, String currency) {
        documentType(type);
        if (instances.findByCompany_IdAndDocumentTypeAndDocumentId(company.getId(), type, documentId).isPresent()) return true;
        var activePolicies = policies.findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(company.getId(), type, "ACTIVE");
        if (activePolicies.isEmpty()) {
            if (policies.existsByCompany_IdAndDocumentTypeAndActivatedAtIsNotNull(company.getId(), type)) throw conflict("approval_no_active_policy");
            return false;
        }
        BigDecimal amountSnapshot = estimatedNetAmount == null ? null : estimatedNetAmount.setScale(4, java.math.RoundingMode.HALF_UP);
        if (amountSnapshot != null && (amountSnapshot.signum() < 0 || amountSnapshot.precision() > 19)) throw bad("approval_invalid_amount_snapshot");
        var policy = activePolicies.stream().filter(p -> matchesConditions(conditions(p), amountSnapshot, currency)).findFirst()
                .orElseThrow(() -> conflict("approval_no_matching_policy"));
        List<SnapshotStep> steps = new ArrayList<>();
        for (Level level : levels(policy)) {
            if (!level.isRequired()) {
                steps.add(new SnapshotStep(level.name(), level.approverType(), null, null, List.of(), false));
                continue;
            }
            var people = candidates(level, type, company.getId(), requesterId);
            if (people.isEmpty()) throw conflict("approval_approver_unavailable");
            String name = "ROLE".equals(level.approverType()) ? people.get(0).getRole().getName() : userName(people.get(0));
            steps.add(new SnapshotStep(level.name(), level.approverType(), level.approverId(), name, people.stream().map(User::getId).toList(), true));
        }
        int firstRequiredStep = firstRequiredStepIndex(steps, 0);
        if (firstRequiredStep < 0) throw conflict("approval_levels_required");
        if (!distinctAssignment(steps)) throw conflict("approval_distinct_approvers");
        var instance = new ProcurementApprovalInstance();
        instance.setCompany(company);
        instance.setDocumentId(documentId);
        instance.setDocumentType(type);
        instance.setDocumentName(documentName.length() > 200 ? documentName.substring(0, 200) : documentName);
        instance.setPolicyId(policy.getId());
        instance.setPolicyVersion(policy.getVersion());
        instance.setPolicyName(policy.getName());
        instance.setRequesterId(requesterId);
        instance.setEstimatedNetAmount(amountSnapshot);
        instance.setCurrency(currency);
        instance.setSteps(write(steps));
        instance.setCurrentStep(firstRequiredStep);
        instances.saveAndFlush(instance);
        return true;
    }

    /**
     * A pending purchase order created before the company activated an approval policy is not governed
     * yet. Once its lines (and therefore its amount) change, it must follow the policy like a new order,
     * otherwise the amount could be raised and approved through the legacy single-step flow.
     */
    @Transactional
    public boolean governPendingPurchaseOrder(PurchaseOrder purchaseOrder, Collection<PartQuantity> lines) {
        if (purchaseOrder == null || purchaseOrder.getId() == null
                || purchaseOrder.getStatus() != com.grash.model.enums.ApprovalStatus.PENDING) return false;
        Company company = purchaseOrder.getCompany();
        if (isGoverned("PO", purchaseOrder.getId(), company.getId()) || !hasActivatedPolicy("PO", company.getId()))
            return false;
        String currency = company.getCompanySettings().getGeneralPreferences().getCurrency() == null ? null
                : company.getCompanySettings().getGeneralPreferences().getCurrency().getCode();
        return start("PO", purchaseOrder.getId(), purchaseOrder.getName(), purchaseOrder.getCreatedBy(), company,
                estimatePurchaseOrderAmount(lines), currency);
    }

    @Transactional(readOnly = true)
    public boolean hasActivatedPolicy(String type, Long companyId) {
        return policies.existsByCompany_IdAndDocumentTypeAndActivatedAtIsNotNull(companyId, documentType(type));
    }

    @Transactional(readOnly = true)
    public boolean isGoverned(String type, Long documentId, Long companyId) {
        return instances.findByCompany_IdAndDocumentTypeAndDocumentId(companyId, documentType(type), documentId).isPresent();
    }

    private boolean distinctAssignment(List<SnapshotStep> steps) {
        Map<Long, Integer> assigned = new HashMap<>();
        for (int i = 0; i < steps.size(); i++) {
            if (!steps.get(i).isRequired()) continue;
            if (!assign(i, steps, assigned, new HashSet<>())) return false;
        }
        return true;
    }

    private int firstRequiredStepIndex(List<SnapshotStep> steps, int fromIndex) {
        for (int i = Math.max(0, fromIndex); i < steps.size(); i++) if (steps.get(i).isRequired()) return i;
        return -1;
    }

    private boolean assign(int index, List<SnapshotStep> steps, Map<Long, Integer> assigned, Set<Long> visited) {
        for (Long candidate : steps.get(index).candidates()) {
            if (!visited.add(candidate)) continue;
            if (!assigned.containsKey(candidate) || assign(assigned.get(candidate), steps, assigned, visited)) {
                assigned.put(candidate, index);
                return true;
            }
        }
        return false;
    }

    /** null = legacy document; false = intermediate approval; true = final decision. */
    public Boolean decide(String type, Long documentId, Long company, User actor, boolean approved, String comment) {
        var found = instances.lockDocument(company, documentType(type), documentId);
        if (found.isEmpty()) return null;
        var instance = found.get();
        List<SnapshotStep> steps = steps(instance);
        if (actor == null || !eligible(actor, type) || !actor.getCompany().getId().equals(company)
                || Objects.equals(actor.getId(), instance.getRequesterId())) throw forbidden();
        if (!"PENDING".equals(instance.getStatus()) || !hasEligibleStepIndex(instance, steps)) throw conflict("approval_already_decided");
        if (!matchesStep(steps.get(instance.getCurrentStep()), actor)) throw forbidden();
        if (events.findByInstanceIdOrderByLevelNumberAsc(instance.getId()).stream()
                .anyMatch(e -> isDecision(e) && Objects.equals(e.getActorId(), actor.getId()))) throw conflict("approval_already_decided");
        if ((!approved && (comment == null || comment.isBlank())) || comment != null && comment.length() > 1000) throw bad("approval_rejection_reason_required");
        var event = new ProcurementApprovalEvent();
        event.setCompany(instance.getCompany());
        event.setInstanceId(instance.getId());
        event.setDocumentType(type);
        event.setDocumentId(documentId);
        event.setDocumentName(instance.getDocumentName());
        event.setPolicyId(instance.getPolicyId());
        event.setPolicyVersion(instance.getPolicyVersion());
        event.setPolicyName(instance.getPolicyName());
        event.setLevelNumber(instance.getCurrentStep() + 1);
        event.setLevelName(steps.get(instance.getCurrentStep()).name());
        event.setActorId(actor.getId());
        event.setActorName(userName(actor));
        event.setAction(approved ? "APPROVED" : "REJECTED");
        event.setComment(comment == null ? null : comment.trim());
        events.saveAndFlush(event);
        int nextStep = approved ? firstRequiredStepIndex(steps, instance.getCurrentStep() + 1) : -1;
        boolean terminal = !approved || nextStep < 0;
        if (terminal) instance.setStatus(approved ? "APPROVED" : "REJECTED");
        else instance.setCurrentStep(nextStep);
        instances.saveAndFlush(instance);
        return terminal;
    }

    @Transactional(readOnly = true)
    public Summary summary(String type, Long document, User actor) {
        return instances.findByCompany_IdAndDocumentTypeAndDocumentId(actor.getCompany().getId(), documentType(type), document).map(i -> {
            var steps = steps(i);
            boolean canDecide = "PENDING".equals(i.getStatus()) && eligible(actor, type) && !Objects.equals(actor.getId(), i.getRequesterId())
                    && i.getCurrentStep() < steps.size() && matchesStep(steps.get(i.getCurrentStep()), actor)
                    && events.findByInstanceIdOrderByLevelNumberAsc(i.getId()).stream()
                    .noneMatch(e -> isDecision(e) && Objects.equals(e.getActorId(), actor.getId()));
            return new Summary(i.getPolicyName(), i.getPolicyVersion(), i.getStatus(), i.getCurrentStep() + 1, steps.size(), canDecide,
                    i.getEstimatedNetAmount() == null ? null : i.getEstimatedNetAmount().toPlainString(), i.getCurrency(),
                    steps.stream().map(s -> new StepView(s.name(), s.approverType(), s.approverName(), s.isRequired())).toList(),
                    "PENDING".equals(i.getStatus()) && !hasEligibleApprover(i, steps));
        }).orElse(null);
    }

    public void reassignBlockedStep(String type, Long documentId, Long targetUserId, String reason, User administrator) {
        type = documentType(type);
        if (documentId == null || targetUserId == null || reason == null
                || reason.isBlank() || reason.trim().length() > 1000) throw bad("approval_reassignment_invalid");
        if (administrator == null || administrator.getCompany() == null) throw forbidden();
        User target = users.findByIdAndCompany_Id(targetUserId, administrator.getCompany().getId())
                .orElseThrow(() -> conflict("approval_approver_unavailable"));
        var found = instances.lockDocument(administrator.getCompany().getId(), type, documentId);
        if (found.isEmpty()) throw missing();
        var instance = found.get();
        List<SnapshotStep> steps = steps(instance);
        if (!"PENDING".equals(instance.getStatus()) || instance.getCurrentStep() < 0
                || instance.getCurrentStep() >= steps.size()) throw conflict("approval_already_decided");
        if (hasEligibleApprover(instance, steps)) throw conflict("approval_step_not_blocked");
        if (Objects.equals(instance.getRequesterId(), target.getId()) || !eligible(target, type))
            throw conflict("approval_approver_unavailable");
        List<ProcurementApprovalEvent> history = events.findByInstanceIdOrderByLevelNumberAsc(instance.getId());
        Set<Long> previousApprovers = new HashSet<>();
        history.stream().filter(this::isDecision).map(ProcurementApprovalEvent::getActorId)
                .filter(Objects::nonNull).forEach(previousApprovers::add);
        if (previousApprovers.contains(target.getId()))
            throw conflict("approval_distinct_approvers");

        SnapshotStep current = steps.get(instance.getCurrentStep());
        String targetName = userName(target);
        steps.set(instance.getCurrentStep(), new SnapshotStep(current.name(), "USER", target.getId(),
                targetName, List.of(target.getId()), true));
        if (!distinctRemainingAssignment(steps, instance.getCurrentStep(), previousApprovers))
            throw conflict("approval_distinct_approvers");
        instance.setSteps(write(steps));
        instances.saveAndFlush(instance);

        var event = new ProcurementApprovalEvent();
        event.setCompany(administrator.getCompany()); event.setInstanceId(instance.getId());
        event.setDocumentId(instance.getDocumentId()); event.setDocumentType(type);
        event.setDocumentName(instance.getDocumentName()); event.setPolicyId(instance.getPolicyId());
        event.setPolicyVersion(instance.getPolicyVersion()); event.setPolicyName(instance.getPolicyName());
        event.setLevelNumber(instance.getCurrentStep() + 1);
        String reassignment = current.name() + " → " + targetName;
        event.setLevelName(reassignment.substring(0, Math.min(120, reassignment.length())));
        event.setActorId(administrator.getId()); event.setActorName(userName(administrator));
        event.setAction("REASSIGNED"); event.setComment(reason.trim());
        events.saveAndFlush(event);
    }

    @Transactional(readOnly = true)
    public List<Target> reassignmentTargets(String type, Long documentId, User administrator) {
        type = documentType(type);
        if (administrator == null || administrator.getCompany() == null) throw forbidden();
        var instance = instances.findByCompany_IdAndDocumentTypeAndDocumentId(
                administrator.getCompany().getId(), type, documentId).orElseThrow(() -> missing());
        List<SnapshotStep> steps = steps(instance);
        if (!"PENDING".equals(instance.getStatus()) || !hasEligibleStepIndex(instance, steps)) throw conflict("approval_already_decided");
        if (hasEligibleApprover(instance, steps)) throw conflict("approval_step_not_blocked");
        Set<Long> previousApprovers = new HashSet<>();
        events.findByInstanceIdOrderByLevelNumberAsc(instance.getId()).stream().filter(this::isDecision)
                .map(ProcurementApprovalEvent::getActorId).filter(Objects::nonNull).forEach(previousApprovers::add);
        List<Target> result = new ArrayList<>();
        for (User candidate : users.findByCompany_Id(administrator.getCompany().getId())) {
            if (!eligible(candidate, type) || Objects.equals(candidate.getId(), instance.getRequesterId())
                    || previousApprovers.contains(candidate.getId())) continue;
            List<SnapshotStep> proposed = new ArrayList<>(steps);
            SnapshotStep current = steps.get(instance.getCurrentStep());
            proposed.set(instance.getCurrentStep(), new SnapshotStep(current.name(), "USER", candidate.getId(),
                    userName(candidate), List.of(candidate.getId()), true));
            if (distinctRemainingAssignment(proposed, instance.getCurrentStep(), previousApprovers))
                result.add(new Target(candidate.getId(), userName(candidate), "USER", List.of(type)));
        }
        return result;
    }

    private boolean hasEligibleApprover(ProcurementApprovalInstance instance, List<SnapshotStep> steps) {
        if (!hasEligibleStepIndex(instance, steps)) return false;
        SnapshotStep step = steps.get(instance.getCurrentStep());
        if (!step.isRequired()) return false;
        Set<Long> previousDecisions = new HashSet<>();
        events.findByInstanceIdOrderByLevelNumberAsc(instance.getId()).stream().filter(this::isDecision)
                .map(ProcurementApprovalEvent::getActorId).filter(Objects::nonNull).forEach(previousDecisions::add);
        return users.findByCompany_Id(instance.getCompany().getId()).stream()
                .anyMatch(user -> matchesStep(step, user) && eligible(user, instance.getDocumentType())
                        && !previousDecisions.contains(user.getId()));
    }

    private boolean hasEligibleStepIndex(ProcurementApprovalInstance instance, List<SnapshotStep> steps) {
        return steps != null && instance.getCurrentStep() >= 0 && instance.getCurrentStep() < steps.size()
                && steps.get(instance.getCurrentStep()).isRequired();
    }

    private boolean distinctRemainingAssignment(List<SnapshotStep> steps, int currentStep, Set<Long> previousApprovers) {
        List<SnapshotStep> remaining = new ArrayList<>();
        for (int i = currentStep; i < steps.size(); i++) {
            SnapshotStep step = steps.get(i);
            if (!step.isRequired()) continue;
            List<Long> candidates = step.candidates().stream().filter(id -> !previousApprovers.contains(id)).toList();
            remaining.add(new SnapshotStep(step.name(), step.approverType(), step.approverId(), step.approverName(), candidates, true));
        }
        return !remaining.isEmpty() && distinctAssignment(remaining);
    }

    private boolean isDecision(ProcurementApprovalEvent event) {
        return "APPROVED".equals(event.getAction()) || "REJECTED".equals(event.getAction());
    }

    /**
     * Lets a rejected document be revised or deleted: the rejected approval instance is removed (its events
     * stay in the approval history) so that a resubmission starts a fresh approval. Pending or approved
     * instances keep the document locked.
     */
    @Transactional
    public void releaseRejected(String type, Long document, Long company) {
        instances.findByCompany_IdAndDocumentTypeAndDocumentId(company, documentType(type), document).ifPresent(instance -> {
            if (!"REJECTED".equals(instance.getStatus())) throw conflict("approval_document_locked");
            instances.delete(instance);
        });
    }

    public void requireEditable(String type, Long document, Long company) {
        instances.findByCompany_IdAndDocumentTypeAndDocumentId(company, type, document)
                .ifPresent(i -> { throw conflict("approval_document_locked"); });
    }

    @Transactional(readOnly = true)
    public Page<Event> history(User actor, String query, String type, String action, int page) {
        Specification<ProcurementApprovalEvent> spec = (root, q, cb) -> cb.and(cb.equal(root.get("company").get("id"), actor.getCompany().getId()), cb.isNotNull(root.get("documentId")));
        if (!actor.isAllSitesAccess()) {
            List<Long> allowedSites = actor.getSites() == null ? List.of() : actor.getSites().stream()
                    .map(Site::getId).filter(Objects::nonNull).toList();
            spec = spec.and((event, queryRoot, cb) -> {
                var hiddenRequisition = queryRoot.subquery(Long.class);
                var requisitionLine = hiddenRequisition.from(PurchaseRequisitionLine.class);
                hiddenRequisition.select(requisitionLine.get("id")).where(
                        cb.equal(requisitionLine.get("requisition").get("id"), event.get("documentId")),
                        cb.isNotNull(requisitionLine.get("site")),
                        allowedSites.isEmpty() ? cb.conjunction()
                                : cb.not(requisitionLine.get("site").get("id").in(allowedSites)));
                var hiddenOrderLine = queryRoot.subquery(Long.class);
                var orderLine = hiddenOrderLine.from(PartQuantity.class);
                hiddenOrderLine.select(orderLine.get("id")).where(
                        cb.equal(orderLine.get("purchaseOrder").get("id"), event.get("documentId")),
                        cb.isNotNull(orderLine.get("site")),
                        allowedSites.isEmpty() ? cb.conjunction()
                                : cb.not(orderLine.get("site").get("id").in(allowedSites)));
                return cb.or(
                        cb.and(cb.equal(event.get("documentType"), "PR"), cb.not(cb.exists(hiddenRequisition))),
                        cb.and(cb.equal(event.get("documentType"), "PO"), cb.not(cb.exists(hiddenOrderLine))));
            });
        }
        if (type != null && !type.isBlank()) spec = spec.and((root, q, cb) -> cb.equal(root.get("documentType"), documentType(type)));
        if (action != null && !action.isBlank()) {
            if (!List.of("APPROVED", "REJECTED", "REASSIGNED").contains(action)) throw bad("approval_invalid_status");
            spec = spec.and((root, q, cb) -> cb.equal(root.get("action"), action));
        }
        if (query != null && !query.isBlank()) spec = spec.and((root, q, cb) -> cb.or(cb.like(cb.lower(root.get("documentName")), pattern(query), '\\'), cb.like(cb.lower(root.get("policyName")), pattern(query), '\\'), cb.like(cb.lower(root.get("actorName")), pattern(query), '\\')));
        return events.findAll(spec, PageRequest.of(Math.max(0, page), 20, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))))
                .map(e -> new Event(e.getId(), e.getDocumentType(), e.getDocumentId(), e.getDocumentName(), e.getPolicyName(), e.getPolicyVersion(), e.getLevelNumber(), e.getLevelName(), e.getActorName(), e.getAction(), e.getCreatedAt(), e.getComment()));
    }

    private List<Level> levels(ProcurementApprovalPolicy policy) { return normalizeLevels(read(policy.getLevels(), new TypeReference<>() { })); }
    private List<Level> normalizeLevels(List<Level> levels) {
        if (levels == null) return List.of();
        return levels.stream().map(level -> level == null ? null
                : new Level(level.name(), level.approverType(), level.approverId(), level.isRequired())).toList();
    }
    private List<Condition> conditions(ProcurementApprovalPolicy policy) {
        return read(policy.getConditions() == null ? "[]" : policy.getConditions(), new TypeReference<>() { });
    }
    static boolean matchesConditions(List<Condition> conditions, BigDecimal amount, String currency) {
        if (conditions == null || conditions.isEmpty()) return true;
        for (Condition condition : conditions) {
            if (condition == null || !"ESTIMATED_NET_MATERIAL_AMOUNT".equals(condition.field()) || amount == null
                    || condition.currency() == null || !condition.currency().equalsIgnoreCase(Objects.toString(currency, ""))) return false;
            BigDecimal threshold;
            try { threshold = new BigDecimal(condition.value()); } catch (Exception e) { return false; }
            int comparison = amount.compareTo(threshold);
            boolean matched = switch (condition.operator()) {
                case "EQUALS" -> comparison == 0;
                case "NOT_EQUALS" -> comparison != 0;
                case "GREATER_THAN" -> comparison > 0;
                case "GREATER_THAN_OR_EQUAL" -> comparison >= 0;
                case "LESS_THAN" -> comparison < 0;
                case "LESS_THAN_OR_EQUAL" -> comparison <= 0;
                default -> false;
            };
            if (!matched) return false;
        }
        return true;
    }
    private String companyCurrency(Company company) {
        try { return company.getCompanySettings().getGeneralPreferences().getCurrency().getCode(); }
        catch (Exception e) { return null; }
    }
    private void validateConditions(List<Condition> conditions, String expectedCurrency, boolean requireComplete) {
        if (conditions == null) return;
        if (conditions.size() > 10) throw bad("approval_invalid_conditions");
        BigDecimal equal = null, lower = null, upper = null;
        boolean lowerInclusive = false, upperInclusive = false;
        List<BigDecimal> excluded = new ArrayList<>();
        for (Condition condition : conditions) {
            if (condition == null || !"ESTIMATED_NET_MATERIAL_AMOUNT".equals(condition.field())
                    || !List.of("EQUALS", "NOT_EQUALS", "GREATER_THAN", "GREATER_THAN_OR_EQUAL", "LESS_THAN", "LESS_THAN_OR_EQUAL").contains(condition.operator())) throw bad("approval_invalid_conditions");
            if (condition.value() == null || condition.value().isBlank()) {
                if (requireComplete) throw bad("approval_invalid_conditions");
                continue;
            }
            if (condition.currency() == null || !condition.currency().matches("[A-Z]{3}")
                    || expectedCurrency == null || !expectedCurrency.equalsIgnoreCase(condition.currency())) throw bad("approval_invalid_conditions");
            BigDecimal threshold;
            try { threshold = new BigDecimal(condition.value()); if (threshold.signum() < 0) throw bad("approval_invalid_conditions"); }
            catch (RuntimeException e) { throw bad("approval_invalid_conditions"); }
            switch (condition.operator()) {
                case "EQUALS" -> {
                    if (equal != null && equal.compareTo(threshold) != 0) throw bad("approval_invalid_conditions");
                    equal = threshold;
                }
                case "NOT_EQUALS" -> excluded.add(threshold);
                case "GREATER_THAN", "GREATER_THAN_OR_EQUAL" -> {
                    boolean inclusive = "GREATER_THAN_OR_EQUAL".equals(condition.operator());
                    int comparison = lower == null ? 1 : threshold.compareTo(lower);
                    if (comparison > 0) { lower = threshold; lowerInclusive = inclusive; }
                    else if (comparison == 0) lowerInclusive &= inclusive;
                }
                case "LESS_THAN", "LESS_THAN_OR_EQUAL" -> {
                    boolean inclusive = "LESS_THAN_OR_EQUAL".equals(condition.operator());
                    int comparison = upper == null ? -1 : threshold.compareTo(upper);
                    if (comparison < 0) { upper = threshold; upperInclusive = inclusive; }
                    else if (comparison == 0) upperInclusive &= inclusive;
                }
                default -> throw bad("approval_invalid_conditions");
            }
        }
        if (lower != null && upper != null) {
            int range = lower.compareTo(upper);
            if (range > 0 || range == 0 && (!lowerInclusive || !upperInclusive)) throw bad("approval_invalid_conditions");
            BigDecimal boundary = lower;
            if (range == 0 && excluded.stream().anyMatch(value -> value.compareTo(boundary) == 0)) throw bad("approval_invalid_conditions");
        }
        if (equal != null) {
            BigDecimal requiredValue = equal;
            if ((lower != null && (requiredValue.compareTo(lower) < 0 || requiredValue.compareTo(lower) == 0 && !lowerInclusive))
                    || (upper != null && (requiredValue.compareTo(upper) > 0 || requiredValue.compareTo(upper) == 0 && !upperInclusive))
                    || excluded.stream().anyMatch(value -> value.compareTo(requiredValue) == 0)) throw bad("approval_invalid_conditions");
        }
    }
    private boolean matchesStep(SnapshotStep step, User actor) {
        return step.candidates().contains(actor.getId()) &&
                (!"ROLE".equals(step.approverType()) || step.approverId().equals(actor.getRole().getId()));
    }
    private List<SnapshotStep> steps(ProcurementApprovalInstance instance) {
        List<SnapshotStep> values = read(instance.getSteps(), new TypeReference<>() { });
        if (values == null) return List.of();
        return new ArrayList<>(values.stream().map(step -> step == null ? null : new SnapshotStep(step.name(), step.approverType(),
                step.approverId(), step.approverName(), step.candidates(), step.isRequired())).toList());
    }
    private <T> T read(String value, TypeReference<T> type) {
        try { return json.readValue(value, type); } catch (Exception e) { throw new CustomException("approval_data_unreadable", HttpStatus.INTERNAL_SERVER_ERROR); }
    }
    private String write(Object value) {
        try { return json.writeValueAsString(value); } catch (Exception e) { throw new CustomException("approval_data_unreadable", HttpStatus.INTERNAL_SERVER_ERROR); }
    }
    private void checkVersion(ProcurementApprovalPolicy policy, Long expected) {
        if (expected == null || expected != policy.getVersion()) throw conflict("approval_version_conflict");
    }
    private void audit(ProcurementApprovalPolicy policy, User actor, String action) {
        var event = new ProcurementApprovalEvent();
        event.setCompany(actor.getCompany()); event.setPolicyId(policy.getId()); event.setPolicyName(policy.getName());
        event.setPolicyVersion(policy.getVersion()); event.setDocumentType(policy.getDocumentType());
        event.setActorId(actor.getId()); event.setActorName(userName(actor)); event.setAction(action);
        events.save(event);
    }
    private String userName(User user) { return (Objects.toString(user.getFirstName(), "") + " " + Objects.toString(user.getLastName(), "")).trim(); }
    private static String pattern(String query) { return "%" + query.trim().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"; }
    private static CustomException bad(String key) { return new CustomException(key, HttpStatus.BAD_REQUEST); }
    private static CustomException conflict(String key) { return new CustomException(key, HttpStatus.CONFLICT); }
    private static CustomException forbidden() { return new CustomException("approval_not_assigned", HttpStatus.FORBIDDEN); }
    private static CustomException missing() { return new CustomException("approval_not_found", HttpStatus.NOT_FOUND); }
}
