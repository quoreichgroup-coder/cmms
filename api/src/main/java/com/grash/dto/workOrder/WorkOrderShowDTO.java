package com.grash.dto.workOrder;

import com.grash.dto.*;
import com.grash.dto.cutomField.CustomFieldValueShowDTO;
import com.grash.model.enums.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@Schema(description = "Work order DTO for displaying work order details in API responses")
public class WorkOrderShowDTO extends WorkOrderBaseShowDTO {

    @Schema(description = "User who completed the work order")
    private UserMiniDTO completedBy;

    @Schema(description = "Date and time when the work order was completed")
    private Date completedOn;

    @Schema(description = "Whether the work order is archived")
    private boolean archived;

    @Schema(description = "Parent maintenance request that triggered this work order")
    private RequestMiniDTO parentRequest;

    @Schema(description = "Parent preventive maintenance that generated this work order")
    private PreventiveMaintenanceMiniDTO parentPreventiveMaintenance;

    @Schema(description = "Base64 encoded signature for the completed work order")
    private String signature;

    @Schema(description = "Current status of the work order")
    private Status status;

    @Schema(description = "Feedback or notes provided upon work order completion")
    private String feedback;

    @Schema(description = "Actual labor duration in seconds; populated by asset work order history")
    private Long actualLaborSeconds;

    @Schema(description = "Earliest recorded labor start; populated by asset work order history")
    private Date actualStartAt;

    @Schema(description = "Actual labor cost; populated by asset work order history")
    private Double actualLaborCost;

    @Schema(description = "Actual part cost; populated by asset work order history")
    private Double actualPartCost;

    @Schema(description = "Actual additional cost; populated by asset work order history")
    private Double actualAdditionalCost;

    @Schema(description = "Actual total cost respecting company labor cost preferences; populated by asset work order history")
    private Double actualTotalCost;

    @Schema(description = "Audio description file attached to the work order")
    private FileShowDTO audioDescription;

    @Schema(description = "Custom identifier for the work order")
    private String customId;

    private Long maintenanceTaskListId;
    private String maintenanceTaskListReference;
    private List<PlannedOperationDTO> plannedOperations = new ArrayList<>();

    @Data
    @NoArgsConstructor
    public static class PlannedOperationDTO {
        private String operationNumber;
        private String shortDescription;
        private String longText;
        private String workCenter;
        private String controlKey;
        private java.math.BigDecimal workers;
        private java.math.BigDecimal plannedWork;
        private String workUnit;
        private java.math.BigDecimal duration;
        private String durationUnit;
        private String systemCondition;
        private int operationOrder;
        private List<PlannedMaterialDTO> materials = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    public static class PlannedMaterialDTO {
        private Long partId;
        private String partCode;
        private String partName;
        private java.math.BigDecimal quantity;
        private String unit;
        private String storageLocation;
        private java.math.BigDecimal estimatedUnitCost;
    }

}
