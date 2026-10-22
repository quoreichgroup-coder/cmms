package com.grash.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.grash.model.enums.DocumentTemplateStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Date;

/** Snapshot of a template configuration. Published snapshots are immutable. */
@Entity
@Table(name = "document_template_version", uniqueConstraints = {
        @UniqueConstraint(name = "uk_document_template_version_number", columnNames = {"template_id", "version_number"})
})
@Data
@NoArgsConstructor
public class DocumentTemplateVersion {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private DocumentTemplate template;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "schema_version", nullable = false, length = 20)
    private String schemaVersion = "1.0";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private JsonNode configuration;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentTemplateStatus status = DocumentTemplateStatus.DRAFT;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at", nullable = false, updatable = false)
    private Date createdAt = new Date();

    @Column(name = "published_by")
    private Long publishedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "published_at")
    private Date publishedAt;
}
