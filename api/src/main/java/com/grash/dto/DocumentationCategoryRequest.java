package com.grash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DocumentationCategoryRequest(
        @Size(max = 8) String locale,
        @NotBlank @Size(max = 120) String title,
        @Size(max = 140) String slug,
        @Size(max = 500) String description,
        @Size(max = 60) String icon,
        Integer displayOrder,
        @Size(max = 60) String requiredPermission,
        Boolean active) {
}
