package com.grash.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@Schema(description = "Atomic purchase order update request")
public class PurchaseOrderUpdateRequest {
    @NotNull
    @Valid
    private PurchaseOrderPatchDTO purchaseOrder;

    @NotEmpty
    @Valid
    private List<PartQuantityCompletePatchDTO> partQuantities;
}
