package com.grash.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.math.BigDecimal;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;

@Data
@NoArgsConstructor
public class PurchaseRequisitionConversionRequest {
    @NotNull
    private Long vendorId;
    @Size(max = 255)
    private String purchaseOrderName;
    @NotEmpty
    @Size(max = 200)
    @Valid
    private List<Line> lines;

    @Data
    @NoArgsConstructor
    public static class Line {
        @NotNull
        private Long requisitionLineId;
        @NotNull
        private Double quantity;
        @NotNull
        @DecimalMin(value = "0.0", inclusive = true)
        @Digits(integer = 15, fraction = 4)
        private BigDecimal purchaseUnitPrice;
    }
}
