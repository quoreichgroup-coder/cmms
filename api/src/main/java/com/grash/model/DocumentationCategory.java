package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "documentation_category",
        uniqueConstraints = @UniqueConstraint(name = "uk_documentation_category_company_slug",
                columnNames = {"company_id", "locale", "slug"}),
        indexes = @Index(name = "idx_documentation_category_company_order",
                columnList = "company_id, display_order"))
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class DocumentationCategory extends CompanyAudit {
    @Column(nullable = false, length = 8)
    private String locale = "en";

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 140)
    private String slug;

    @Column(length = 500)
    private String description;

    @Column(length = 60)
    private String icon;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "required_permission", length = 60)
    private String requiredPermission;

    @Column(nullable = false)
    private boolean active = true;
}
