package com.grash.repository;

import com.grash.model.DocumentationArticle;
import com.grash.model.enums.DocumentationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentationArticleRepository extends JpaRepository<DocumentationArticle, Long> {
    List<DocumentationArticle> findByCompany_IdAndLocaleAndStatusOrderByDisplayOrderAscUpdatedAtDesc(
            Long companyId, String locale, DocumentationStatus status);
    List<DocumentationArticle> findByCompany_IdAndLocaleOrderByDisplayOrderAscUpdatedAtDesc(Long companyId, String locale);
    List<DocumentationArticle> findByCompany_IdAndStatusAndPublishedContentContaining(
            Long companyId, DocumentationStatus status, String content);
    Optional<DocumentationArticle> findByIdAndCompany_Id(Long id, Long companyId);
    Optional<DocumentationArticle> findByCompany_IdAndLocaleAndSlug(Long companyId, String locale, String slug);
    Optional<DocumentationArticle> findByCompany_IdAndLocaleAndPublishedSlugAndStatus(
            Long companyId, String locale, String publishedSlug, DocumentationStatus status);
    boolean existsByCategory_Id(Long categoryId);
    long countByCategory_Id(Long categoryId);
}
