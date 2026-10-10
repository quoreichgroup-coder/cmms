package com.grash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.dto.CompanyConfigurationAuditDTO;
import com.grash.model.Company;
import com.grash.model.CompanyConfigurationAudit;
import com.grash.model.User;
import com.grash.repository.CompanyConfigurationAuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CompanyConfigurationAuditService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final CompanyConfigurationAuditRepository repository;

    @Transactional
    public void record(Company company, User actor, String entityType, Long entityId,
                       String action, List<String> changedFields) {
        if (changedFields == null || changedFields.isEmpty()) return;
        CompanyConfigurationAudit event = new CompanyConfigurationAudit();
        event.setCompany(company);
        event.setCreatedBy(actor.getId());
        event.setUpdatedBy(actor.getId());
        Date now = new Date();
        event.setCreatedAt(now);
        event.setUpdatedAt(now);
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setAction(action);
        try {
            event.setChangedFields(JSON.writeValueAsString(changedFields));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not serialize configuration audit fields", exception);
        }
        repository.save(event);
    }

    @Transactional(readOnly = true)
    public List<CompanyConfigurationAuditDTO> list(Company company) {
        return repository.findTop100ByCompany_IdOrderByCreatedAtDesc(company.getId())
                .stream().map(this::toDto).toList();
    }

    private CompanyConfigurationAuditDTO toDto(CompanyConfigurationAudit event) {
        CompanyConfigurationAuditDTO dto = new CompanyConfigurationAuditDTO();
        dto.setId(event.getId());
        dto.setEntityType(event.getEntityType());
        dto.setEntityId(event.getEntityId());
        dto.setAction(event.getAction());
        dto.setChangedFields(event.getChangedFields());
        dto.setActorId(event.getCreatedBy());
        dto.setOccurredAt(event.getCreatedAt());
        return dto;
    }
}
