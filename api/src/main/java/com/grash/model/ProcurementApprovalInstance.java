package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(uniqueConstraints = @UniqueConstraint(name = "uk_proc_approval_document", columnNames = {"company_id", "document_type", "document_id"}))
public class ProcurementApprovalInstance extends CompanyAudit {
    @Version
    private long version;
    @Column(nullable = false, length = 2)
    private String documentType;
    @Column(nullable = false)
    private Long documentId;
    @Column(nullable = false)
    private Long policyId;
    private long policyVersion;
    @Column(nullable = false, length = 160)
    private String policyName;
    private Long requesterId;
    private java.math.BigDecimal estimatedNetAmount;
    @Column(length = 3)
    private String currency;
    @Column(nullable = false, length = 200)
    private String documentName;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String steps;
    private int currentStep;
    @Column(nullable = false, length = 12)
    private String status = "PENDING";
}
