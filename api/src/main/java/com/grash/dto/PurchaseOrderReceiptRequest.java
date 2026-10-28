package com.grash.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class PurchaseOrderReceiptRequest {
    @NotBlank
    @Size(max = 100)
    private String idempotencyKey;
    @Size(max = 100)
    private String reference;
    @Size(max = 2000)
    private String notes;
    @NotEmpty
    @Size(max = 200)
    @Valid
    private List<Line> lines;

    @Data
    @NoArgsConstructor
    public static class Line {
        @NotNull
        private Long purchaseOrderLineId;
        @NotNull
        @DecimalMin(value = "0.000001")
        private Double quantity;
    }
}
