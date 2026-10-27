package com.grash.repository;

import com.grash.model.GeneratedDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GeneratedDocumentRepository extends JpaRepository<GeneratedDocument, Long> {
    boolean existsBySite_Id(Long siteId);
    boolean existsByTemplateVersionEntity_Id(Long templateVersionId);
    List<GeneratedDocument> findByCompany_IdAndSourceTypeAndSourceIdOrderByIssuedAtDesc(
            Long companyId, String sourceType, Long sourceId);
}
