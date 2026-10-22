package com.grash.service;

import com.grash.model.Asset;
import com.grash.model.Location;
import com.grash.model.Team;
import com.grash.model.WorkOrder;
import com.grash.model.enums.Priority;
import com.grash.model.enums.Status;
import org.junit.jupiter.api.Test;

import java.util.Date;
import java.util.Locale;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class WorkOrderReportDataProviderTest {
    private final DocumentContextResolver.DocumentContext context = new DocumentContextResolver.DocumentContext(
            "QPM Industries", "QPM Industries SA", "+225000000", "maintenance@example.test",
            "Abidjan", "RC-123", "NIF-456", "XOF", null, "Africa/Abidjan",
            com.grash.model.enums.Language.EN, Locale.ENGLISH, 3L, "Plant A");
    private final WorkOrderReportDataProvider provider = new WorkOrderReportDataProvider();

    @Test
    void resolvesOnlyRequestedAllowlistedWorkOrderAndEquipmentValues() {
        WorkOrder order = new WorkOrder();
        order.setId(42L);
        order.setCustomId("WO-0042");
        order.setTitle("Inspect pump");
        order.setDescription("Check vibration and coupling");
        order.setStatus(Status.IN_PROGRESS);
        order.setPriority(Priority.HIGH);
        order.setDueDate(new Date(0));
        order.setEstimatedDuration(2.5);
        Asset asset = new Asset();
        asset.setName("Transfer pump P-101");
        asset.setSerialNumber("SN-101");
        order.setAsset(asset);

        var resolved = provider.resolve(order, context, Set.of(
                "workOrder.customId", "workOrder.title", "workOrder.status", "workOrder.priority",
                "workOrder.dueDate", "workOrder.estimatedDuration", "asset.name", "asset.serialNumber",
                "company.legalName", "site.name"));

        assertEquals(10, resolved.size());
        assertEquals("WO-0042", resolved.get("workOrder.customId"));
        assertEquals("IN_PROGRESS", resolved.get("workOrder.status"));
        assertEquals("1970-01-01T00:00:00Z", resolved.get("workOrder.dueDate"));
        assertEquals("Transfer pump P-101", resolved.get("asset.name"));
        assertEquals("QPM Industries SA", resolved.get("company.legalName"));
        assertFalse(resolved.containsKey("workOrder.description"), "unrequested fields must not be returned");
    }

    @Test
    void rejectsUnsupportedSensitiveAndUnknownFields() {
        WorkOrder order = new WorkOrder();

        assertThrows(com.grash.exception.CustomException.class,
                () -> provider.resolve(order, context, Set.of("workOrder.labor")));
        assertThrows(com.grash.exception.CustomException.class,
                () -> provider.resolve(order, context, Set.of("workOrder.signature")));
        assertThrows(com.grash.exception.CustomException.class,
                () -> provider.resolve(order, context, Set.of("workOrder.anything")));
        assertTrue(provider.supports("workOrder.title"));
        assertFalse(provider.supports("workOrder.labor"));
    }

    @Test
    void resolvesAssignedPeopleAndNullableRelationsWithoutLeakingOtherFields() {
        WorkOrder order = new WorkOrder();
        Team team = new Team(); team.setName("Mechanical team"); order.setTeam(team);
        Location location = new Location(); location.setName("Pump house"); order.setLocation(location);

        var resolved = provider.resolve(order, context, Set.of("workOrder.team", "location.name", "asset.name"));

        assertEquals("Mechanical team", resolved.get("workOrder.team"));
        assertEquals("Pump house", resolved.get("location.name"));
        assertNull(resolved.get("asset.name"));
    }
}
