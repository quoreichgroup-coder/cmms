package com.grash.repository;

import com.grash.model.CompanyConfigurationAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompanyConfigurationAuditRepository extends JpaRepository<CompanyConfigurationAudit, Long> {
    List<CompanyConfigurationAudit> findTop100ByCompany_IdOrderByCreatedAtDesc(Long companyId);
}
