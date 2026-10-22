package com.grash.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

/** The caller may request only field keys advertised by the report field catalog. */
public record ReportPreviewRequest(@NotEmpty @Size(max = 23) Set<@NotBlank String> fields) { }
