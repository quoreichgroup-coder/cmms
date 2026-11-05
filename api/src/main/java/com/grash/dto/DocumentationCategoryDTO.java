package com.grash.dto;

import com.grash.model.DocumentationCategory;

public record DocumentationCategoryDTO(Long id, String locale, String title, String slug, String description,
                                       String icon, int displayOrder, String requiredPermission,
                                       boolean active, long articleCount) {
    public static DocumentationCategoryDTO from(DocumentationCategory category, long articleCount) {
        return new DocumentationCategoryDTO(category.getId(), category.getLocale(), category.getTitle(), category.getSlug(),
                category.getDescription(), category.getIcon(), category.getDisplayOrder(),
                category.getRequiredPermission(), category.isActive(), articleCount);
    }
}
