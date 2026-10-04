package com.grash.mapper;

import com.grash.dto.PreventiveMaintenancePatchDTO;
import com.grash.model.PreventiveMaintenance;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import static org.junit.jupiter.api.Assertions.assertEquals;

class PreventiveMaintenancePatchMapperTest {
    @Test
    void omittedTitlePreservesRequiredTitle() {
        PreventiveMaintenance existing = new PreventiveMaintenance();
        existing.setTitle("Inspection");
        PreventiveMaintenancePatchDTO patch = new PreventiveMaintenancePatchDTO();
        patch.setName("New name");
        Mappers.getMapper(PreventiveMaintenanceMapper.class).updatePreventiveMaintenance(existing, patch);
        assertEquals("Inspection", existing.getTitle());
        assertEquals("New name", existing.getName());
    }

    @Test
    void suppliedTitleUpdatesTitle() {
        PreventiveMaintenance existing = new PreventiveMaintenance();
        existing.setTitle("Inspection");
        PreventiveMaintenancePatchDTO patch = new PreventiveMaintenancePatchDTO();
        patch.setTitle("Replacement inspection");
        Mappers.getMapper(PreventiveMaintenanceMapper.class).updatePreventiveMaintenance(existing, patch);
        assertEquals("Replacement inspection", existing.getTitle());
    }
}
