package com.grash.repository;

import com.grash.model.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentTypeRepository extends JpaRepository<DocumentType, Long> {
    List<DocumentType> findByActiveTrueAndCompany_Id(Long companyId);
    List<DocumentType> findByActiveTrueAndCompanyIsNull();
    Optional<DocumentType> findByCodeAndCompanyIsNull(String code);
    Optional<DocumentType> findByCodeAndCompany_Id(String code, Long companyId);
}
