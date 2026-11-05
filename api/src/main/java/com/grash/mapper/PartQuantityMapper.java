package com.grash.mapper;

import com.grash.dto.PartQuantityPatchDTO;
import com.grash.dto.PartQuantityShowDTO;
import com.grash.model.PartQuantity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.Mappings;
import org.mapstruct.Mapping;
import org.mapstruct.BeanMapping;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", uses = {PartMapper.class, PurchaseOrderMapper.class, WorkOrderMapper.class})
public interface PartQuantityMapper {
    @Mapping(target = "requisitionLine", ignore = true)
    @Mapping(target = "purchaseUnitPrice", ignore = true)
    @Mapping(target = "purchasePriceCurrency", ignore = true)
    @Mapping(target = "site", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    PartQuantity updatePartQuantity(@MappingTarget PartQuantity entity, PartQuantityPatchDTO dto);

    @Mapping(target = "siteId", source = "site.id")
    PartQuantityPatchDTO toPatchDto(PartQuantity model);

    @Mapping(target = "purchaseRequisitionId", source = "requisitionLine.requisition.id")
    @Mapping(target = "siteId", source = "site.id")
    @Mapping(target = "siteName", source = "site.name")
    PartQuantityShowDTO toShowDto(PartQuantity model);

}
