package com.grash.repository;

import com.grash.model.CompanyLegalProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyLegalProfileRepository extends JpaRepository<CompanyLegalProfile, Long> {
    Optional<CompanyLegalProfile> findByCompany_Id(Long companyId);
}
