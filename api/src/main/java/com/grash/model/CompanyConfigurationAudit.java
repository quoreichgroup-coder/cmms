package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/** Append-only metadata for changes to company identity and site configuration. */
@Entity
@Table(indexes = @Index(name = "idx_company_configuration_audit_company", columnList = "company_id, created_at"))
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class CompanyConfigurationAudit extends CompanyAudit {
    @Column(nullable = false, length = 40)
    private String entityType;

    @Column(nullable = false)
    private Long entityId;

    @Column(nullable = false, length = 20)
    private String action;

    /** JSON array of field names only; sensitive before/after values are deliberately excluded. */
    @Column(nullable = false, length = 1000)
    private String changedFields;
}
