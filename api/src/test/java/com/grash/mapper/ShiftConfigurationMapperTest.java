package com.grash.mapper;

import com.grash.dto.shiftConfiguration.ShiftConfigurationPatchDTO;
import com.grash.model.ShiftConfiguration;
import com.grash.model.ShiftDayConfiguration;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.DayOfWeek;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ShiftConfigurationMapperTest {

    private final ShiftConfigurationMapper mapper = Mappers.getMapper(ShiftConfigurationMapper.class);

    @Test
    void omittedPatchFieldsLeaveExistingShiftConfigurationUntouched() {
        ShiftConfiguration configuration = new ShiftConfiguration();
        configuration.setEnabled(true);
        configuration.setDays(List.of(new ShiftDayConfiguration(DayOfWeek.MONDAY, 420, true)));

        mapper.updateShiftConfiguration(configuration, new ShiftConfigurationPatchDTO());

        assertTrue(configuration.isEnabled());
        assertEquals(1, configuration.getDays().size());
        assertEquals(420, configuration.getDays().get(0).getAvailabilityMinutes());
        assertNotNull(configuration.getExceptions());
    }

    @Test
    void explicitFalseStillDisablesShiftConfiguration() {
        ShiftConfiguration configuration = new ShiftConfiguration();
        configuration.setEnabled(true);
        ShiftConfigurationPatchDTO patch = new ShiftConfigurationPatchDTO();
        patch.setEnabled(false);

        mapper.updateShiftConfiguration(configuration, patch);

        assertFalse(configuration.isEnabled());
    }
}
