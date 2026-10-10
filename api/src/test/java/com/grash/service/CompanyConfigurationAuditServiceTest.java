package com.grash.service;

import com.grash.model.Company;
import com.grash.model.CompanyConfigurationAudit;
import com.grash.model.User;
import com.grash.repository.CompanyConfigurationAuditRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanyConfigurationAuditServiceTest {
    @InjectMocks private CompanyConfigurationAuditService service;
    @Mock private CompanyConfigurationAuditRepository repository;

    @Test
    void recordStoresChangedFieldNamesWithoutSensitiveValues() {
        Company company = new Company(); company.setId(23L);
        User actor = new User(); actor.setId(51L);

        service.record(company, actor, "COMPANY_LEGAL_PROFILE", 8L, "UPDATED",
                List.of("taxIdentificationNumber", "registeredAddress"));

        ArgumentCaptor<CompanyConfigurationAudit> captor = ArgumentCaptor.forClass(CompanyConfigurationAudit.class);
        verify(repository).save(captor.capture());
        CompanyConfigurationAudit event = captor.getValue();
        assertSame(company, event.getCompany());
        assertEquals(51L, event.getCreatedBy());
        assertEquals("[\"taxIdentificationNumber\",\"registeredAddress\"]", event.getChangedFields());
        assertFalse(event.getChangedFields().contains("tax-value"));
    }
}
