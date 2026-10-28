package com.grash.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
public class PurchaseRequisitionCreateRequest {
    @NotBlank
    @Size(max = 255)
    private String title;
    @Size(max = 4000)
    private String justification;
    private Date requiredDate;
    private Long sourceWorkOrderId;
    @NotEmpty
    @Size(max = 200)
    @Valid
    private List<Line> lines;

    @Data
    @NoArgsConstructor
    public static class Line {
        @NotNull
        private Long partId;
        @NotNull
        private Double quantity;
        @Size(max = 2000)
        private String notes;
    }
}
