package com.grash.mapper;

import com.grash.dto.AssetDowntimePatchDTO;
import com.grash.model.AssetDowntime;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.Mappings;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface AssetDowntimeMapper {
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    AssetDowntime updateAssetDowntime(@MappingTarget AssetDowntime entity, AssetDowntimePatchDTO dto);

    @Mappings({})
    AssetDowntimePatchDTO toPatchDto(AssetDowntime model);
}
