package com.grash.dto;

import com.grash.model.DocumentationArticle;

import java.util.Arrays;
import java.util.Date;
import java.util.List;

public record DocumentationArticleDTO(Long id, String locale, Long categoryId, String categoryTitle, String title,
                                      String slug, String summary, String content, List<String> keywords,
                                      String status, String requiredPermission, int displayOrder,
                                      Date updatedAt, Date publishedAt, Long authorId,
                                      boolean hasDraftChanges) {
    public static DocumentationArticleDTO admin(DocumentationArticle article) {
        return from(article, article.getTitle(), article.getSlug(), article.getSummary(), article.getContent(),
                article.getKeywords(), article.getStatus().name(), true);
    }

    public static DocumentationArticleDTO published(DocumentationArticle article) {
        return from(article, article.getPublishedTitle(), article.getPublishedSlug(),
                article.getPublishedSummary(), article.getPublishedContent(), article.getPublishedKeywords(),
                article.getStatus().name(), false);
    }

    private static DocumentationArticleDTO from(DocumentationArticle article, String title, String slug,
                                                 String summary, String content, String keywords,
                                                 String status, boolean includeDraftState) {
        boolean hasDraftChanges = article.getPublishedAt() != null
                && (!java.util.Objects.equals(article.getTitle(), article.getPublishedTitle())
                || !java.util.Objects.equals(article.getSlug(), article.getPublishedSlug())
                || !java.util.Objects.equals(article.getSummary(), article.getPublishedSummary())
                || !java.util.Objects.equals(article.getContent(), article.getPublishedContent())
                || !java.util.Objects.equals(article.getKeywords(), article.getPublishedKeywords()));
        List<String> keywordList = keywords == null || keywords.isBlank() ? List.of()
                : Arrays.stream(keywords.split("\\n")).map(String::trim).filter(value -> !value.isEmpty()).toList();
        return new DocumentationArticleDTO(article.getId(), article.getLocale(), article.getCategory().getId(),
                article.getCategory().getTitle(), title, slug, summary, content, keywordList, status,
                article.getRequiredPermission(), article.getDisplayOrder(), article.getUpdatedAt(),
                article.getPublishedAt(), article.getCreatedBy(), includeDraftState && hasDraftChanges);
    }
}
