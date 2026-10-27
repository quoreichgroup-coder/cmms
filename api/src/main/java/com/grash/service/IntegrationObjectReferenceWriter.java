package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.IntegrationObjectReference;
import com.grash.repository.IntegrationObjectReferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Isolates a unique-key insert so a concurrent duplicate cannot poison the caller's transaction. */
@Service
@RequiredArgsConstructor
public class IntegrationObjectReferenceWriter {
    private final IntegrationObjectReferenceRepository referenceRepository;
    private final CompanyService companyService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public IntegrationObjectReference insert(Long companyId, String providerKey, String objectType,
                                             String externalId, String localObjectId) {
        Company company = companyService.findById(companyId)
                .orElseThrow(() -> new CustomException("Company not found", HttpStatus.NOT_FOUND));
        IntegrationObjectReference reference = new IntegrationObjectReference();
        reference.setCompany(company);
        reference.setProviderKey(providerKey);
        reference.setObjectType(objectType);
        reference.setExternalId(externalId);
        reference.setLocalObjectId(localObjectId);
        return referenceRepository.saveAndFlush(reference);
    }
}
