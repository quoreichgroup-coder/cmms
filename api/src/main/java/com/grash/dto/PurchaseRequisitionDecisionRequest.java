package com.grash.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class PurchaseRequisitionDecisionRequest {
    @NotNull
    private Boolean approved;
    @Size(max = 2000)
    private String note;
}
