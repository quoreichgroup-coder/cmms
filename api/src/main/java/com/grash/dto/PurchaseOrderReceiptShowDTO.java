package com.grash.dto;

import lombok.Builder;
import lombok.Value;

import java.util.Date;
import java.util.List;

@Value
@Builder
public class PurchaseOrderReceiptShowDTO {
    Long id;
    Long purchaseOrderId;
    String reference;
    String notes;
    Date receivedAt;
    Long receivedById;
    String receivedByName;
    List<Line> lines;

    @Value
    @Builder
    public static class Line {
        Long id;
        Long purchaseOrderLineId;
        String partName;
        double quantity;
        String unit;
    }
}
