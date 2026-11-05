package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.FetchType;
import jakarta.persistence.Column;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

@Entity
@Data
@NoArgsConstructor
@Schema(description = "Part quantity entity for tracking parts on work orders and purchase orders")
public class PartQuantity extends CompanyAudit {

    @NotNull
    @Min(value = 0L, message = "The value must be positive")
    @Schema(description = "Quantity of parts", requiredMode = Schema.RequiredMode.REQUIRED)
    private double quantity;

    /** Purchase cost captured when a PO line is created; inventory cost can change independently. */
    @Column(precision = 19, scale = 4)
    private BigDecimal purchaseUnitCostSnapshot;

    @Column(length = 3)
    private String purchaseCurrencySnapshot;

    /** Supplier-agreed unit price captured on the purchase order line. */
    @Column(precision = 19, scale = 4)
    private BigDecimal purchaseUnitPrice;

    @Column(length = 3)
    private String purchasePriceCurrency;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Part part;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    private PurchaseRequisitionLine requisitionLine;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private WorkOrder workOrder;

    /** Procurement delivery destination; independent from the PO shipping address. */
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.RESTRICT)
    private Site site;

    @Schema(description = "Indicates whether this is a demo record")
    private boolean isDemo;

    public double getCost() {
        double unitCost = purchaseOrder != null && purchaseUnitPrice != null
                ? purchaseUnitPrice.doubleValue()
                : purchaseOrder != null && purchaseUnitCostSnapshot != null
                    ? purchaseUnitCostSnapshot.doubleValue() : part.getCost();
        return quantity * unitCost;
    }

    public PartQuantity(Part part, WorkOrder workOrder, PurchaseOrder purchaseOrder, double quantity) {
        this.part = part;
        this.workOrder = workOrder;
        this.purchaseOrder = purchaseOrder;
        this.quantity = quantity;
    }
}


