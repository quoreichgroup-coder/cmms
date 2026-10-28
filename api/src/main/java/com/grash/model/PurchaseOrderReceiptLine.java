package com.grash.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
public class PurchaseOrderReceiptLine {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private PurchaseOrderReceipt receipt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private PartQuantity partQuantity;

    @NotNull
    @DecimalMin(value = "0.000001")
    private double quantity;

    /** Unit snapshot keeps the receipt readable if the part's unit label is later changed. */
    @Column(length = 100)
    private String unit;
}
