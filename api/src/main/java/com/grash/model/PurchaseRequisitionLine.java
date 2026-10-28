package com.grash.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
public class PurchaseRequisitionLine {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private PurchaseRequisition requisition;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Part part;

    @DecimalMin(value = "0.000001", message = "Quantity must be greater than zero")
    private double quantity;

    /** Quantity already converted into supplier orders. Updated only by the conversion service. */
    private double orderedQuantity;

    private String notes;
}
