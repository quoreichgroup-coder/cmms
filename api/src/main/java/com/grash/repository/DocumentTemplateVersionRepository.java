package com.grash.repository;

import com.grash.model.DocumentTemplateVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface DocumentTemplateVersionRepository extends JpaRepository<DocumentTemplateVersion, Long> {
    Optional<DocumentTemplateVersion> findFirstByTemplate_IdOrderByVersionNumberDesc(Long templateId);
    List<DocumentTemplateVersion> findByTemplate_IdOrderByVersionNumberDesc(Long templateId);
}
