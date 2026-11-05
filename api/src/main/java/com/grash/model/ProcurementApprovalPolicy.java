package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.Date;

@Entity
@Getter
@Setter
public class ProcurementApprovalPolicy extends CompanyAudit {
    @Version
    private long version;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(length = 1000)
    private String description;
    @Column(nullable = false, length = 2)
    private String documentType;
    @Column(nullable = false, length = 12)
    private String status = "DRAFT";
    @Column(nullable = false)
    private int priority = 100;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String conditions = "[]";
    @Column(nullable = false, columnDefinition = "TEXT")
    private String levels = "[]";
    private Long replacesPolicyId;
    private Date activatedAt;
}
