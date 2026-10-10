package com.grash.dto;

import com.grash.model.enums.Language;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SiteDTO {
    private Long id;

    @NotBlank
    @Size(max = 120)
    private String name;

    @NotBlank
    @Size(max = 40)
    @Pattern(regexp = "^[A-Za-z0-9_-]+$")
    private String code;

    private Long rootLocationId;
    private String timeZone;
    private Language documentLanguage;
}
