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
@Table(name = "documentation_asset",
        uniqueConstraints = @UniqueConstraint(name = "uk_documentation_asset_public_id",
                columnNames = "public_id"),
        indexes = @Index(name = "idx_documentation_asset_company", columnList = "company_id"))
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class DocumentationAsset extends CompanyAudit {
    @Column(name = "public_id", nullable = false, length = 36)
    private String publicId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "storage_path", nullable = false, length = 1000)
    private String storagePath;

    @Column(name = "content_type", nullable = false, length = 40)
    private String contentType;
}
