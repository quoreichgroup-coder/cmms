package com.grash.dto.workOrder;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Date;

@Schema(description = "Actual time and cost totals for work order history")
public record WorkOrderHistoryMetricsDTO(
        Long workOrderId,
        Long actualLaborSeconds,
        Double actualLaborCost,
        Double actualPartCost,
        Double actualAdditionalCost,
        Double actualTotalCost,
        Date actualStartAt
) {}
