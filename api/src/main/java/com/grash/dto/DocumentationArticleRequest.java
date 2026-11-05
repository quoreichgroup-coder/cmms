package com.grash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record DocumentationArticleRequest(
        @Size(max = 8) String locale,
        @NotNull Long categoryId,
        @NotBlank @Size(max = 180) String title,
        @Size(max = 180) String slug,
        @NotBlank @Size(max = 800) String summary,
        @NotBlank @Size(max = 200000) String content,
        @Size(max = 30) List<@NotBlank @Size(max = 100) String> keywords,
        Integer displayOrder,
        @Size(max = 60) String requiredPermission) {
}
