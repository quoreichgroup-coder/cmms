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
    boolean existsByCompany_IdAndDocumentType_Id(Long companyId, Long documentTypeId);

    @Modifying
    @Query("update DocumentTemplate t set t.isDefault = false where t.company.id = :companyId " +
            "and t.documentType.id = :typeId and t.defaultScope = :scope " +
            "and ((:siteId is null and t.site is null) or t.site.id = :siteId) and t.isDefault = true")
    int clearDefaultForScope(@Param("companyId") Long companyId, @Param("typeId") Long typeId,
                             @Param("scope") String scope, @Param("siteId") Long siteId);

    /** Retained for callers compiled against the original company-scope API. */
    @Modifying
    @Query("update DocumentTemplate t set t.isDefault = false where t.company.id = :companyId " +
            "and t.documentType.id = :typeId and t.isDefault = true")
    int clearDefaultForType(@Param("companyId") Long companyId, @Param("typeId") Long typeId);
}
