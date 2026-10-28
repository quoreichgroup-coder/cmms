package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@Table(uniqueConstraints = @UniqueConstraint(name = "uk_po_receipt_idempotency", columnNames = {"purchase_order_id", "idempotency_key"}))
public class PurchaseOrderReceipt extends CompanyAudit {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User receivedBy;

    @Temporal(TemporalType.TIMESTAMP)
    private Date receivedAt;

    @Column(length = 100)
    private String reference;

    @Column(length = 2000)
    private String notes;

    @Column(nullable = false, length = 100)
    private String idempotencyKey;

    @Column(nullable = false, length = 64)
    private String requestHash;

    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchaseOrderReceiptLine> lines = new ArrayList<>();
}
