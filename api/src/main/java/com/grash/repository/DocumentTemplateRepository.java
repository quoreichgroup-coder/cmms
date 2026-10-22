package com.grash.repository;

import com.grash.model.DocumentTemplate;
import com.grash.model.enums.DocumentTemplateStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DocumentTemplateRepository extends JpaRepository<DocumentTemplate, Long> {
    List<DocumentTemplate> findByCompany_IdOrderByUpdatedAtDesc(Long companyId);
    Optional<DocumentTemplate> findByIdAndCompany_Id(Long id, Long companyId);
    Optional<DocumentTemplate> findByIdAndCompany_IdAndStatus(Long id, Long companyId, DocumentTemplateStatus status);

    @Modifying
    @Query("update DocumentTemplate t set t.isDefault = false where t.company.id = :companyId " +
            "and t.documentType.id = :typeId and t.defaultScope = 'COMPANY' and t.isDefault = true")
    int clearDefaultForType(@Param("companyId") Long companyId, @Param("typeId") Long typeId);
}
