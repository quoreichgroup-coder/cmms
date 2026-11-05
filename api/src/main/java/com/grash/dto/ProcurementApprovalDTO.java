package com.grash.dto;

import java.util.List;
import java.util.Date;

public final class ProcurementApprovalDTO {
    private ProcurementApprovalDTO() { }
    public record Level(String name, String approverType, Long approverId, Boolean required) {
        public Level(String name, String approverType, Long approverId) { this(name, approverType, approverId, true); }
        public boolean isRequired() { return !Boolean.FALSE.equals(required); }
    }
    public record Condition(String field, String operator, String value, String currency) { }
    public record Draft(String name, String description, String documentType, int priority,
                        List<Condition> conditions, List<Level> levels, Long version) { }
    public record Policy(Long id, long version, String name, String description, String documentType,
                         String status, int priority, List<Condition> conditions, List<Level> levels,
                         Long replacesPolicyId) { }
    public record Target(Long id, String name, String approverType, List<String> documentTypes) { }
    public record SnapshotStep(String name, String approverType, Long approverId, String approverName, List<Long> candidates, Boolean required) {
        public SnapshotStep(String name, String approverType, Long approverId, String approverName, List<Long> candidates) {
            this(name, approverType, approverId, approverName, candidates, true);
        }
        public boolean isRequired() { return !Boolean.FALSE.equals(required); }
    }
    public record StepView(String name, String approverType, String approverName, boolean required) { }
    public record Summary(String policyName, long policyVersion, String status, int currentLevel,
                          int levelCount, boolean canDecide, String estimatedNetAmount, String currency,
                          List<StepView> levels, boolean stepBlocked) { }
    public record Reassignment(Long targetUserId, String reason) { }
    public record Event(Long id, String documentType, Long documentId, String documentName, String policyName,
                        long policyVersion, Integer levelNumber, String levelName, String actorName,
                        String action, Date decidedAt, String comment) { }
}
