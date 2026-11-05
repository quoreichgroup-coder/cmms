package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.Site;
import com.grash.model.User;
import com.grash.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SiteServiceProcurementReferenceTest {
    @Mock SiteRepository sites;
    @Mock LocationRepository locations;
    @Mock AssetRepository assets;
    @Mock WorkOrderRepository workOrders;
    @Mock PreventiveMaintenanceRepository preventiveMaintenances;
    @Mock GeneratedDocumentRepository documents;
    @Mock PartQuantityRepository partQuantities;
    @Mock PurchaseRequisitionLineRepository requisitionLines;
    @Mock CompanyConfigurationAuditService configurationAudit;

    @Test void preventsDeletingASiteReferencedByARequisitionLine() {
        Company company = new Company(); company.setId(7L);
        User user = new User(); user.setCompany(company);
        Site site = new Site(); site.setId(11L); site.setCompany(company);
        when(sites.findById(11L)).thenReturn(Optional.of(site));
        when(requisitionLines.existsBySite_Id(11L)).thenReturn(true);
        SiteService service = new SiteService(sites, locations, assets, workOrders,
                preventiveMaintenances, documents, partQuantities, requisitionLines, configurationAudit);

        CustomException error = assertThrows(CustomException.class, () -> service.delete(11L, user));

        assertEquals(org.springframework.http.HttpStatus.CONFLICT, error.getHttpStatus());
        verify(sites, never()).delete(site);
    }
}
