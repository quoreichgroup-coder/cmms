package com.grash.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class DocumentTemplateRequest {
    @NotBlank @Size(max = 60)
    private String documentTypeCode;
    @NotBlank @Size(max = 60)
    @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9_-]{1,59}")
    private String code;
    @NotBlank @Size(max = 160)
    private String name;
    @Size(max = 500)
    private String description;
    @NotNull
    private JsonNode configuration;
}
