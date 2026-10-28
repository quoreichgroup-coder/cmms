package com.grash.dto;

import com.grash.model.enums.PurchaseRequisitionStatus;
import lombok.Builder;
import lombok.Data;

import java.util.Date;
import java.util.List;

@Data
@Builder
public class PurchaseRequisitionShowDTO {
    private Long id;
    private String title;
    private String justification;
    private Date requiredDate;
    private PurchaseRequisitionStatus status;
    private Long requesterId;
    private String requesterName;
    private Long decisionById;
    private Date decisionAt;
    private String decisionNote;
    private List<Line> lines;

    @Data
    @Builder
    public static class Line {
        private Long id;
        private Long partId;
        private String partName;
        private String unit;
        private double quantity;
        private double orderedQuantity;
        private String notes;
    }
}
