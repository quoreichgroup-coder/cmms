package com.grash.model;

import com.grash.model.abstracts.Audit;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

/** Registry entry linking a document family to an allowlisted server-side data provider. */
@Entity
@Table(name = "document_type")
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class DocumentType extends Audit {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Company company;

    @Column(nullable = false, length = 60)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(length = 500)
    private String description;

    @Column(name = "provider_code", nullable = false, length = 60)
    private String providerCode;

    @Column(name = "system_managed", nullable = false)
    private boolean systemManaged;

    @Column(nullable = false)
    private boolean active = true;
}
