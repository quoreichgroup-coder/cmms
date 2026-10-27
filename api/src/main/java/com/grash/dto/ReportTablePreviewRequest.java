package com.grash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Request for a small, column-scoped report table preview. */
public record ReportTablePreviewRequest(
        @NotBlank @Size(max = 100) String binding,
        @NotEmpty @Size(max = 12) List<@NotBlank @Size(max = 40) String> columns) {
}
