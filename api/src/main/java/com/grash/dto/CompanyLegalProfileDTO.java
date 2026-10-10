package com.grash.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CompanyLegalProfileDTO {
    private Long id;

    @Size(max = 160)
    private String legalName;

    @Pattern(regexp = "^[A-Za-z]{2}$|^$", message = "Country must be a two-letter ISO code")
    private String registrationCountry;

    @Size(max = 120)
    private String businessRegistrationNumber;

    @Size(max = 120)
    private String taxIdentificationNumber;

    @Size(max = 500)
    private String registeredAddress;
}
