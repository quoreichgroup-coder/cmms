package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.Asset;
import com.grash.model.Location;
import com.grash.model.Request;
import com.grash.model.Team;
import com.grash.model.enums.Priority;
import org.junit.jupiter.api.Test;

import java.util.Date;
import java.util.Locale;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class RequestReportDataProviderTest {
    private final RequestReportDataProvider provider = new RequestReportDataProvider();
    private final DocumentContextResolver.DocumentContext context = new DocumentContextResolver.DocumentContext(
            "QPM", "QPM Industries SA", "+225000000", "ops@example.test", "Abidjan", "RC-1", "NIF-1",
            "XOF", null, "Africa/Abidjan", com.grash.model.enums.Language.FR, Locale.FRENCH, 4L, "Plant A");

    @Test
    void resolvesOnlyRequestedAllowlistedRequestValues() {
        Request request = new Request();
        request.setCustomId("REQ-18");
        request.setTitle("Vibration anormale sur pompe");
        request.setDescription("Contrôler le palier côté accouplement");
        request.setPriority(Priority.HIGH);
        request.setDueDate(new Date(0));
        request.setEstimatedDuration(1.5);
        request.setContact("poste maintenance");
        request.setCancelled(false);
        Asset asset = new Asset(); asset.setName("Pompe P-101"); asset.setSerialNumber("SN-101");
        request.setAsset(asset);
        Location location = new Location(); location.setName("Atelier central"); request.setLocation(location);
        Team team = new Team(); team.setName("Équipe mécanique"); request.setTeam(team);

        var values = provider.resolve(request, context, Set.of("request.customId", "request.title",
                "request.priority", "request.dueDate", "request.cancelled", "asset.name", "location.name",
                "request.team", "company.legalName", "site.name"));

        assertEquals(10, values.size());
        assertEquals("REQ-18", values.get("request.customId"));
        assertEquals("HIGH", values.get("request.priority"));
        assertEquals("1970-01-01T00:00:00Z", values.get("request.dueDate"));
        assertEquals(false, values.get("request.cancelled"));
        assertEquals("Pompe P-101", values.get("asset.name"));
        assertEquals("Atelier central", values.get("location.name"));
        assertEquals("QPM Industries SA", values.get("company.legalName"));
        assertFalse(values.containsKey("request.description"));
    }

    @Test
    void rejectsUnknownOrUnapprovedFieldsAndWrongSourceTypes() {
        Request request = new Request();
        assertThrows(CustomException.class, () -> provider.resolve(request, context, Set.of("request.workOrder")));
        assertThrows(CustomException.class, () -> provider.resolve(request, context, Set.of("request.audioDescription")));
        assertThrows(CustomException.class, () -> provider.resolve(new Object(), context, Set.of("request.title")));
        assertTrue(provider.supports("request.title"));
        assertFalse(provider.supports("request.audioDescription"));
        assertFalse(provider.supports("request.cancellationReason"));
    }
}
