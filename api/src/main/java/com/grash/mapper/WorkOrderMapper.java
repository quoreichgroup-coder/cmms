package com.grash.mapper;

import com.grash.dto.WorkOrderBaseMiniDTO;
import com.grash.dto.workOrder.WorkOrderMiniDTO;
import com.grash.dto.workOrder.WorkOrderPatchDTO;
import com.grash.dto.workOrder.WorkOrderShowDTO;
import com.grash.dto.workOrder.WorkOrderPostDTO;
import com.grash.dto.workload.WorkloadWorkOrderDTO;
import com.grash.model.WorkOrder;
import com.grash.model.WorkOrderPlannedOperation;
import com.grash.model.WorkOrderPlannedMaterial;
import org.mapstruct.*;

@Mapper(componentModel = "spring", uses = {PartMapper.class, FileMapper.class, LocationMapper.class
        , TeamMapper.class, UserMapper.class,
        CustomerMapper.class, AssetMapper.class, CustomFieldValueMapper.class})
public interface WorkOrderMapper {
    WorkOrder updateWorkOrder(@MappingTarget WorkOrder entity, WorkOrderPatchDTO dto);

    @Mappings({})
    WorkOrderPatchDTO toPatchDto(WorkOrder model);

    @Mappings({
            @Mapping(source = "parentRequest.audioDescription", target = "audioDescription"),
            @Mapping(target = "image", source = "image", qualifiedByName = "toThumbnailDto"),
            @Mapping(target = "siteId", source = "site.id"),
            @Mapping(target = "siteName", source = "site.name"),
            @Mapping(target = "maintenanceTaskListId", source = "maintenanceTaskListId"),
            @Mapping(target = "plannedOperations", ignore = true),

    })
    WorkOrderShowDTO toShowDto(WorkOrder model);

    WorkOrderShowDTO.PlannedOperationDTO toPlannedOperationDto(WorkOrderPlannedOperation model);

    WorkOrderShowDTO.PlannedMaterialDTO toPlannedMaterialDto(WorkOrderPlannedMaterial model);

    WorkOrderMiniDTO toMiniDto(WorkOrder model);

    WorkOrderBaseMiniDTO toBaseMiniDto(WorkOrder model);

    @Mapping(target = "plannedOperations", ignore = true)
    @Mapping(target = "maintenanceTaskListId", ignore = true)
    @Mapping(target = "maintenanceTaskListReference", ignore = true)
    WorkOrder fromPostDto(WorkOrderPostDTO workOrderPostDTO);

    WorkloadWorkOrderDTO toWorkloadDto(WorkOrder model);

}
