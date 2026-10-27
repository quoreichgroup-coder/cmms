package com.grash.service;

import com.grash.model.Asset;
import com.grash.model.Location;
import com.grash.model.Team;
import com.grash.model.WorkOrder;
import com.grash.model.Company;
import com.grash.model.File;
import com.grash.model.Labor;
import com.grash.model.Part;
import com.grash.model.PartQuantity;
import com.grash.model.Task;
import com.grash.model.TaskBase;
import com.grash.model.User;
import com.grash.model.TimeCategory;
import com.grash.model.enums.Priority;
import com.grash.model.enums.Status;
import com.grash.model.enums.TimeStatus;
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
    private final WorkOrderReportDataProvider provider = createProvider(
            org.mockito.Mockito.mock(TaskService.class), org.mockito.Mockito.mock(LaborService.class),
            org.mockito.Mockito.mock(PartQuantityService.class),
            org.mockito.Mockito.mock(com.grash.factory.StorageServiceFactory.class));

    private static WorkOrderReportDataProvider createProvider(TaskService tasks, LaborService labors,
            PartQuantityService quantities, com.grash.factory.StorageServiceFactory storage) {
        LicenseService licenses = org.mockito.Mockito.mock(LicenseService.class);
        org.mockito.Mockito.when(licenses.hasEntitlement(org.mockito.ArgumentMatchers.any()))
                .thenReturn(true);
        return createProvider(tasks, labors, quantities, storage, licenses);
    }

    private static WorkOrderReportDataProvider createProvider(TaskService tasks, LaborService labors,
            PartQuantityService quantities, com.grash.factory.StorageServiceFactory storage, LicenseService licenses) {
        return new WorkOrderReportDataProvider(tasks, labors, quantities, storage,
                org.mockito.Mockito.mock(com.grash.repository.CommentRepository.class),
                org.mockito.Mockito.mock(WorkOrderHistoryService.class),
                org.mockito.Mockito.mock(RelationService.class),
                licenses,
                org.mockito.Mockito.mock(UserService.class));
    }

    @Test
    void resolvesOnlyRequestedAllowlistedWorkOrderAndEquipmentValues() {
        Company company = new Company(); company.setId(7L);
        WorkOrder order = new WorkOrder();
        order.setCompany(company);
        order.setId(42L);
        order.setCustomId("WO-0042");
        order.setTitle("Inspect pump");
        order.setDescription("Check vibration and coupling");
        order.setStatus(Status.IN_PROGRESS);
        order.setPriority(Priority.HIGH);
        order.setDueDate(new Date(0));
        order.setEstimatedDuration(2.5);
        Asset asset = new Asset();
        asset.setCompany(company);
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
                () -> provider.resolve(order, context, Set.of("workOrder.anything")));
        assertTrue(provider.supports("workOrder.title"));
        assertFalse(provider.supports("workOrder.labor"));
        assertTrue(provider.supports("workOrder.laborTimeEntries"));
        assertTrue(provider.supports("workOrder.executionTasks"));
        assertTrue(provider.supports("workOrder.materialsUsed"));
        assertTrue(provider.supports("workOrder.signature"));
        assertTrue(provider.supports("workOrder.feedback"));
    }

    @Test
    void resolvesAssignedPeopleAndNullableRelationsWithoutLeakingOtherFields() {
        Company company = new Company(); company.setId(7L);
        WorkOrder order = new WorkOrder();
        order.setCompany(company);
        Team team = new Team(); team.setCompany(company); team.setName("Mechanical team"); order.setTeam(team);
        Location location = new Location(); location.setCompany(company); location.setName("Pump house"); order.setLocation(location);

        var resolved = provider.resolve(order, context, Set.of("workOrder.team", "location.name", "asset.name"));

        assertEquals("Mechanical team", resolved.get("workOrder.team"));
        assertEquals("Pump house", resolved.get("location.name"));
        assertNull(resolved.get("asset.name"));
    }

    @Test
    void resolvesStructuredExecutionLaborAndMaterialDataWithoutFinancialValues() {
        var tasks = org.mockito.Mockito.mock(TaskService.class);
        var labors = org.mockito.Mockito.mock(LaborService.class);
        var quantities = org.mockito.Mockito.mock(PartQuantityService.class);
        var reportProvider = createProvider(tasks, labors, quantities,
                org.mockito.Mockito.mock(com.grash.factory.StorageServiceFactory.class));
        Company company = new Company(); company.setId(7L);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company);

        TaskBase taskBase = new TaskBase(); taskBase.setLabel("Verify coupling alignment"); taskBase.setCompany(company);
        Task task = new Task(); task.setTaskOrder(1); task.setTaskBase(taskBase);
        task.setValue("PASS"); task.setNotes("Within tolerance"); task.setCompany(company); task.setWorkOrder(order);
        org.mockito.Mockito.when(tasks.findByWorkOrder(42L)).thenReturn(java.util.List.of(task));

        User technician = new User(); technician.setFirstName("Awa"); technician.setLastName("Traore");
        technician.setCompany(company);
        TimeCategory category = new TimeCategory(); category.setName("Mechanical");
        com.grash.model.CompanySettings settings = new com.grash.model.CompanySettings();
        settings.setCompany(company); category.setCompanySettings(settings);
        Labor labor = new Labor(); labor.setAssignedTo(technician); labor.setTimeCategory(category);
        labor.setStartedAt(new Date(0)); labor.setDuration(5400); labor.setStatus(TimeStatus.STOPPED);
        labor.setHourlyRate(999999); labor.setCompany(company); labor.setWorkOrder(order);
        org.mockito.Mockito.when(labors.findByWorkOrder(42L)).thenReturn(java.util.List.of(labor));

        Part part = new Part(); part.setName("Bearing 6205"); part.setDescription("Sealed bearing");
        part.setUnit("pcs"); part.setCost(800000);
        part.setCompany(company);
        PartQuantity quantity = new PartQuantity(); quantity.setPart(part); quantity.setQuantity(2);
        quantity.setCompany(company); quantity.setWorkOrder(order);
        org.mockito.Mockito.when(quantities.findByWorkOrder(42L)).thenReturn(java.util.List.of(quantity));

        var resolved = reportProvider.resolve(order, context, Set.of("workOrder.executionTasks",
                "workOrder.laborTimeEntries", "workOrder.materialsUsed"));

        var taskRows = (java.util.List<java.util.Map<String, Object>>) resolved.get("workOrder.executionTasks");
        var laborRows = (java.util.List<java.util.Map<String, Object>>) resolved.get("workOrder.laborTimeEntries");
        var materialRows = (java.util.List<java.util.Map<String, Object>>) resolved.get("workOrder.materialsUsed");
        assertEquals("Verify coupling alignment", taskRows.get(0).get("task"));
        assertEquals("PASS", taskRows.get(0).get("result"));
        assertEquals("Awa Traore", laborRows.get(0).get("technician"));
        assertEquals(5400L, laborRows.get(0).get("durationSeconds"));
        assertEquals("1.50", laborRows.get(0).get("durationHours"));
        assertEquals("Bearing 6205", materialRows.get(0).get("part"));
        assertEquals(2.0, materialRows.get(0).get("quantity"));
        assertFalse(laborRows.get(0).containsKey("hourlyRate"));
        assertFalse(materialRows.get(0).containsKey("cost"));
    }

    @Test
    void resolvesActualDurationFromSameCompanyTimeEntriesAndLeavesNoEntriesEmpty() {
        var labors = org.mockito.Mockito.mock(LaborService.class);
        var reportProvider = createProvider(org.mockito.Mockito.mock(TaskService.class), labors,
                org.mockito.Mockito.mock(PartQuantityService.class),
                org.mockito.Mockito.mock(com.grash.factory.StorageServiceFactory.class));
        Company company = new Company(); company.setId(7L);
        Company otherCompany = new Company(); otherCompany.setId(8L);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setEstimatedDuration(3.5);

        Labor first = new Labor(); first.setCompany(company); first.setWorkOrder(order);
        first.setStartedAt(new Date(0)); first.setDuration(5400); first.setStatus(TimeStatus.STOPPED);
        Labor second = new Labor(); second.setCompany(company); second.setWorkOrder(order);
        second.setStartedAt(new Date(6000)); second.setDuration(1800); second.setStatus(TimeStatus.STOPPED);
        Labor crossCompany = new Labor(); crossCompany.setCompany(otherCompany); crossCompany.setWorkOrder(order);
        crossCompany.setStartedAt(new Date(12000)); crossCompany.setDuration(7200); crossCompany.setStatus(TimeStatus.STOPPED);
        org.mockito.Mockito.when(labors.findByWorkOrder(42L)).thenReturn(java.util.List.of(first, second, crossCompany));

        var resolved = reportProvider.resolve(order, context, Set.of("workOrder.actualDuration", "workOrder.estimatedDuration"));

        assertEquals("2.00", resolved.get("workOrder.actualDuration"));
        assertEquals(3.5, resolved.get("workOrder.estimatedDuration"));
        org.mockito.Mockito.when(labors.findByWorkOrder(42L)).thenReturn(java.util.List.of());
        assertNull(reportProvider.resolve(order, context, Set.of("workOrder.actualDuration")).get("workOrder.actualDuration"));
    }

    @Test
    void diagnosesActualDurationUnavailableWhenTimeTrackingIsNotLicensed() {
        var licenses = org.mockito.Mockito.mock(LicenseService.class);
        org.mockito.Mockito.when(licenses.hasEntitlement(org.mockito.ArgumentMatchers.any())).thenReturn(false);
        var reportProvider = createProvider(org.mockito.Mockito.mock(TaskService.class),
                org.mockito.Mockito.mock(LaborService.class), org.mockito.Mockito.mock(PartQuantityService.class),
                org.mockito.Mockito.mock(com.grash.factory.StorageServiceFactory.class), licenses);
        Company company = new Company(); company.setId(7L);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company);

        var diagnosis = reportProvider.diagnose(order, context, Set.of("workOrder.actualDuration"));

        assertEquals("unavailable", diagnosis.get("workOrder.actualDuration").status());
    }

    @Test
    void resolvesCompanyLogoAsEmbeddedPngOnlyForItsOwningCompany() {
        var storageFactory = org.mockito.Mockito.mock(com.grash.factory.StorageServiceFactory.class);
        var storage = org.mockito.Mockito.mock(StorageService.class);
        org.mockito.Mockito.when(storageFactory.getStorageService()).thenReturn(storage);
        byte[] png = new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 1};
        org.mockito.Mockito.when(storage.download(org.mockito.ArgumentMatchers.any(File.class))).thenReturn(png);
        var reportProvider = createProvider(org.mockito.Mockito.mock(TaskService.class),
                org.mockito.Mockito.mock(LaborService.class), org.mockito.Mockito.mock(PartQuantityService.class),
                storageFactory);
        Company company = new Company(); company.setId(7L);
        File logo = new File(); logo.setCompany(company);
        company.setLogo(logo);
        WorkOrder order = new WorkOrder(); order.setCompany(company);

        var resolved = reportProvider.resolve(order, context, Set.of("company.logo"));

        assertEquals("data:image/png;base64," + java.util.Base64.getEncoder().encodeToString(png),
                resolved.get("company.logo"));
        org.mockito.Mockito.verify(storage).download(logo);
    }

    @Test
    void omitsUnsupportedOrCrossCompanyLogoWithoutFailingTheReport() {
        var storageFactory = org.mockito.Mockito.mock(com.grash.factory.StorageServiceFactory.class);
        var storage = org.mockito.Mockito.mock(StorageService.class);
        org.mockito.Mockito.when(storageFactory.getStorageService()).thenReturn(storage);
        var reportProvider = createProvider(org.mockito.Mockito.mock(TaskService.class),
                org.mockito.Mockito.mock(LaborService.class), org.mockito.Mockito.mock(PartQuantityService.class),
                storageFactory);
        Company company = new Company(); company.setId(7L);
        Company otherCompany = new Company(); otherCompany.setId(8L);
        File logo = new File(); logo.setCompany(otherCompany);
        company.setLogo(logo);
        WorkOrder order = new WorkOrder(); order.setCompany(company);

        var resolved = reportProvider.resolve(order, context, Set.of("company.logo"));

        assertNull(resolved.get("company.logo"));
        org.mockito.Mockito.verifyNoInteractions(storageFactory);
    }

    @Test
    void onlyReturnsBoundedPngOrJpegSignatureDataAndCompletionNotes() {
        WorkOrder order = new WorkOrder();
        order.setId(42L);
        order.setFeedback("Coupling verified; no abnormal noise.");
        String signature = "data:image/png;base64," +
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        order.setSignature(signature);

        var resolved = provider.resolve(order, context,
                Set.of("workOrder.signature", "workOrder.feedback"));
        assertEquals(signature, resolved.get("workOrder.signature"));
        assertEquals("Coupling verified; no abnormal noise.", resolved.get("workOrder.feedback"));

        order.setSignature("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=");
        assertNull(provider.resolve(order, context, Set.of("workOrder.signature")).get("workOrder.signature"));

        order.setSignature("data:image/png;base64,%%%invalid%%%");
        assertNull(provider.resolve(order, context, Set.of("workOrder.signature")).get("workOrder.signature"));
    }
}
