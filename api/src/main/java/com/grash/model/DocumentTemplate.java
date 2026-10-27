package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import com.grash.model.enums.DocumentTemplateStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

/** Tenant-owned template identity. Published content lives in immutable version rows. */
@Entity
@Table(name = "document_template")
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class DocumentTemplate extends CompanyAudit {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_type_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private DocumentType documentType;

    @Column(nullable = false, length = 60)
    private String code;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, length = 40)
    private String style = "CLASSIC";

    @Column(nullable = false, length = 40)
    private String engine = "QPM_NATIVE";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentTemplateStatus status = DocumentTemplateStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "draft_version_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private DocumentTemplateVersion draftVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "published_version_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private DocumentTemplateVersion publishedVersion;

    @Column(name = "default_scope", nullable = false, length = 20)
    private String defaultScope = "COMPANY";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Site site;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    @Version
    @Column(name = "lock_version", nullable = false)
    private long lockVersion;
}
