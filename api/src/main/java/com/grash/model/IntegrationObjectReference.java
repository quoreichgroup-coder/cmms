package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "integration_object_reference",
        uniqueConstraints = @UniqueConstraint(name = "uk_integration_object_reference_external",
                columnNames = {"company_id", "provider_key", "object_type", "external_id"}),
        indexes = @Index(name = "idx_integration_object_reference_local",
                columnList = "company_id, provider_key, object_type, local_object_id"))
public class IntegrationObjectReference extends CompanyAudit {
    @Column(name = "provider_key", nullable = false, length = 80)
    private String providerKey;

    @Column(name = "object_type", nullable = false, length = 80)
    private String objectType;

    @Column(name = "external_id", nullable = false, length = 255)
    private String externalId;

    @Column(name = "local_object_id", nullable = false, length = 100)
    private String localObjectId;
}
