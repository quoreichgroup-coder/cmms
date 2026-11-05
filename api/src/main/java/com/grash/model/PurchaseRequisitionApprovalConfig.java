package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Company-level ordered approver list used as the default PR approval workflow. */
@Entity
@Table(name = "purchase_requisition_approval_config",
        uniqueConstraints = @UniqueConstraint(name = "uk_pr_approval_config_company", columnNames = "company_id"))
@Data
@NoArgsConstructor
public class PurchaseRequisitionApprovalConfig extends CompanyAudit {
    /** JSON array of user IDs; one approver per sequential level. */
    @Column(name = "approver_user_ids", nullable = false, columnDefinition = "TEXT")
    private String approverUserIds = "[]";

    @Column(nullable = false)
    private Integer version = 1;
}
