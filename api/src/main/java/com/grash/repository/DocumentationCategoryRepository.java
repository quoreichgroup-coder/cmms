package com.grash.repository;

import com.grash.model.DocumentationCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentationCategoryRepository extends JpaRepository<DocumentationCategory, Long> {
    List<DocumentationCategory> findByCompany_IdOrderByDisplayOrderAscTitleAsc(Long companyId);
    List<DocumentationCategory> findByCompany_IdAndLocaleAndActiveTrueOrderByDisplayOrderAscTitleAsc(Long companyId, String locale);
    List<DocumentationCategory> findByCompany_IdAndLocaleOrderByDisplayOrderAscTitleAsc(Long companyId, String locale);
    Optional<DocumentationCategory> findByIdAndCompany_Id(Long id, Long companyId);
    Optional<DocumentationCategory> findByCompany_IdAndLocaleAndSlug(Long companyId, String locale, String slug);
}
