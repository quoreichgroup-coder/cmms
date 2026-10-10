package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import com.grash.model.enums.Language;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(name = "uk_site_company_code", columnNames = {"company_id", "code"}))
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Site extends CompanyAudit {
    @NotBlank
    @Column(nullable = false, length = 120)
    private String name;

    @NotBlank
    @Column(nullable = false, length = 40)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    private Location rootLocation;

    /** Null means inherit the company's corresponding preference. */
    @Column(length = 80)
    private String timeZone;

    @Enumerated(EnumType.STRING)
    private Language documentLanguage;
}
