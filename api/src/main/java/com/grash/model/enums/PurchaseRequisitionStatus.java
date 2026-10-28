package com.grash.model.enums;

/** Internal demand lifecycle. A requisition is not a supplier commitment or a stock receipt. */
public enum PurchaseRequisitionStatus {
    DRAFT,
    PENDING_APPROVAL,
    APPROVED,
    PARTIALLY_ORDERED,
    ORDERED,
    REJECTED,
    CANCELLED
}
