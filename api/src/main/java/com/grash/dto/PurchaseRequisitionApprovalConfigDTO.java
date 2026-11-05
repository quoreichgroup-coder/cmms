package com.grash.dto;

import lombok.Data;
import java.util.List;

@Data
public class PurchaseRequisitionApprovalConfigDTO {
    private List<Long> approverUserIds;
    private Integer version;
    private boolean policyManagementEnabled;
}
