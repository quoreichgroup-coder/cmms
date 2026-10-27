package com.grash.dto;

import com.grash.model.PurchaseOrder;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@Schema(description = "Atomic purchase order creation request")
public class PurchaseOrderCreateRequest {
    @NotNull
    @Valid
    private PurchaseOrder purchaseOrder;

    @NotEmpty
    @Valid
    private List<PartQuantityCompletePatchDTO> partQuantities;

    private boolean approveOnSubmit;
}
