package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.util.Date;

/** Immutable metadata for an officially issued document artifact. */
@Entity
@Table(indexes = {
        @Index(name = "idx_generated_document_source", columnList = "company_id, source_type, source_id, issued_at")
})
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class GeneratedDocument extends CompanyAudit {
    @Column(nullable = false, length = 40)
    private String documentType;

    @Column(nullable = false, length = 40)
    private String sourceType;

    @Column(nullable = false)
    private Long sourceId;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    private Site site;

    @Column(nullable = false, length = 255)
    private String fileName;

    @Column(nullable = false, length = 1024, unique = true)
    private String storagePath;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(nullable = false, length = 20)
    private String locale;

    @Column(nullable = false, length = 40)
    private String templateVersion;

    @Column(columnDefinition = "TEXT")
    private String renderSnapshot;

    @Column(nullable = false)
    private Date issuedAt;

    @Column(nullable = false)
    private Long issuedBy;
}
