package com.grash.model;

import com.grash.model.abstracts.Audit;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/** Legal identity details used when producing company documents. */
@Entity
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class CompanyLegalProfile extends Audit {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, unique = true)
    private Company company;

    @Column(length = 160)
    private String legalName;

    @Column(length = 2)
    private String registrationCountry;

    @Column(length = 120)
    private String businessRegistrationNumber;

    @Column(length = 120)
    private String taxIdentificationNumber;

    @Column(length = 500)
    private String registeredAddress;
}
