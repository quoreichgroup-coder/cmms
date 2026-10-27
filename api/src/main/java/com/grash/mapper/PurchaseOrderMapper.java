package com.grash.mapper;

import com.grash.dto.PurchaseOrderPatchDTO;
import com.grash.dto.PurchaseOrderShowDTO;
import com.grash.model.PurchaseOrder;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.Mappings;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface PurchaseOrderMapper {
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    PurchaseOrder updatePurchaseOrder(@MappingTarget PurchaseOrder entity, PurchaseOrderPatchDTO dto);

    @Mappings({})
    PurchaseOrderPatchDTO toPatchDto(PurchaseOrder model);

    PurchaseOrderShowDTO toShowDto(PurchaseOrder model);
}
