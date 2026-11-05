package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Append-only snapshots survive changes to users, documents and policy definitions. */
@Entity
@Getter
@Setter
@Table(indexes = @Index(name = "idx_proc_approval_event_company_date", columnList = "company_id,created_at"),
        uniqueConstraints = @UniqueConstraint(name = "uk_proc_approval_event_step", columnNames = {"instance_id", "level_number"}))
public class ProcurementApprovalEvent extends CompanyAudit {
    private Long instanceId;
    private Long documentId;
    @Column(length = 2)
    private String documentType;
    @Column(length = 200)
    private String documentName;
    private Long policyId;
    private long policyVersion;
    @Column(length = 160)
    private String policyName;
    private Integer levelNumber;
    @Column(length = 120)
    private String levelName;
    private Long actorId;
    @Column(length = 200)
    private String actorName;
    @Column(nullable = false, length = 24)
    private String action;
    @Column(length = 1000)
    private String comment;
}
