package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Append-only audit record for opening an archived PDF. */
@Entity
@Getter
@Setter
@Table(indexes = {
        @Index(name = "idx_generated_document_access_document",
                columnList = "company_id,generated_document_id,created_at"),
        @Index(name = "idx_generated_document_access_company_date",
                columnList = "company_id,created_at,id")
})
public class GeneratedDocumentAccessEvent extends CompanyAudit {
    @Column(name = "generated_document_id", nullable = false)
    private Long generatedDocumentId;

    @Column(name = "source_type", nullable = false, length = 40)
    private String sourceType;

    @Column(name = "source_id", nullable = false)
    private Long sourceId;

    @Column(name = "actor_id", nullable = false)
    private Long actorId;

    @Column(name = "actor_name", nullable = false, length = 200)
    private String actorName;

    @Column(nullable = false, length = 16)
    private String outcome;
}
