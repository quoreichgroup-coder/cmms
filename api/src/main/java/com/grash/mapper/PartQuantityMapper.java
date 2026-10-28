package com.grash.mapper;

import com.grash.dto.PartQuantityPatchDTO;
import com.grash.dto.PartQuantityShowDTO;
import com.grash.model.PartQuantity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.Mappings;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {PartMapper.class, PurchaseOrderMapper.class, WorkOrderMapper.class})
public interface PartQuantityMapper {
    @Mapping(target = "requisitionLine", ignore = true)
    PartQuantity updatePartQuantity(@MappingTarget PartQuantity entity, PartQuantityPatchDTO dto);

    @Mappings({})
    PartQuantityPatchDTO toPatchDto(PartQuantity model);

    @Mapping(target = "purchaseRequisitionId", source = "requisitionLine.requisition.id")
    PartQuantityShowDTO toShowDto(PartQuantity model);

}
