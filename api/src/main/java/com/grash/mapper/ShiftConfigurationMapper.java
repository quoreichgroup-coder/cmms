package com.grash.mapper;

import com.grash.dto.shiftConfiguration.ShiftConfigurationPatchDTO;
import com.grash.dto.shiftConfiguration.ShiftConfigurationPostDTO;
import com.grash.dto.shiftConfiguration.ShiftConfigurationShowDTO;
import com.grash.model.ShiftConfiguration;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface ShiftConfigurationMapper {

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    ShiftConfiguration updateShiftConfiguration(@MappingTarget ShiftConfiguration entity,
                                                ShiftConfigurationPatchDTO dto);

    ShiftConfiguration fromPostDto(ShiftConfigurationPostDTO dto);

    ShiftConfigurationShowDTO toShowDto(ShiftConfiguration model);

}
