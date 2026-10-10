package com.grash.service;

import com.grash.dto.ReportConfig;
import com.grash.factory.StorageServiceFactory;
import com.grash.model.Company;
import com.grash.model.GeneratedDocument;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.GeneratedDocumentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GeneratedDocumentServiceTest {
    @InjectMocks private GeneratedDocumentService service;
    @Mock private GeneratedDocumentRepository repository;
    @Mock private WorkOrderService workOrderService;
    @Mock private StorageServiceFactory storageFactory;
    @Mock private DocumentContextResolver documentContextResolver;
    @Mock private StorageService storage;

    @Test
    void issuingWorkOrderReportStoresImmutableArtifactMetadata() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .editOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS))).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        when(documentContextResolver.resolve(order)).thenReturn(new DocumentContextResolver.DocumentContext(
                "Company", null, null, null, null, null, null, "", null, "UTC",
                com.grash.model.enums.Language.EN, java.util.Locale.ENGLISH, null, null));
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));
        when(workOrderService.generatePdfBytes(eq(order), eq(user), any(ReportConfig.class)))
                .thenReturn(new byte[]{1, 2, 3});
        when(storageFactory.getStorageService()).thenReturn(storage);
        when(storage.upload(any(byte[].class), anyString(), anyString())).thenReturn("issued-documents/7/work-orders/42.pdf");
        when(repository.save(any(GeneratedDocument.class))).thenAnswer(invocation -> {
            GeneratedDocument doc = invocation.getArgument(0);
            doc.setId(5L);
            return doc;
        });

        var result = service.issueWorkOrderReport(42L, new ReportConfig(), user);

        assertEquals(5L, result.getId());
        assertEquals("WORK_ORDER_REPORT", result.getDocumentType());
        assertEquals("WORK_ORDER", result.getSourceType());
        assertEquals(42L, result.getSourceId());
        assertEquals("work-order-report-v1", result.getTemplateVersion());
        var savedDocument = org.mockito.ArgumentCaptor.forClass(GeneratedDocument.class);
        verify(repository).save(savedDocument.capture());
        assertTrue(savedDocument.getValue().getRenderSnapshot().contains("Company"));
        assertTrue(savedDocument.getValue().getRenderSnapshot().contains("reportConfig"));
        assertEquals(64, result.getSha256().length());
    }
}
