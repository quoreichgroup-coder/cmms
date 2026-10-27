package com.grash.repository;

import com.grash.model.IntegrationObjectReference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IntegrationObjectReferenceRepository extends JpaRepository<IntegrationObjectReference, Long> {
    Optional<IntegrationObjectReference> findByCompany_IdAndProviderKeyAndObjectTypeAndExternalId(
            Long companyId, String providerKey, String objectType, String externalId);
}
