package com.grash.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
    }
}
