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
    @Mock FileService files;
    @Mock com.grash.mapper.FileMapper fileMapper;
    @Mock(answer = org.mockito.Answers.RETURNS_DEEP_STUBS) com.grash.factory.StorageServiceFactory storage;
    @Mock LicenseService licenses;

    private SiteService service() {
        return new SiteService(sites, locations, assets, workOrders, preventiveMaintenances, documents,
                partQuantities, requisitionLines, configurationAudit, files, fileMapper, storage, licenses);
    }

    @Test void preventsDeletingASiteReferencedByARequisitionLine() {
        Company company = new Company(); company.setId(7L);
        User user = new User(); user.setCompany(company);
        Site site = new Site(); site.setId(11L); site.setCompany(company);
        when(sites.findById(11L)).thenReturn(Optional.of(site));
        when(requisitionLines.existsBySite_Id(11L)).thenReturn(true);
        SiteService service = service();

        CustomException error = assertThrows(CustomException.class, () -> service.delete(11L, user));

        assertEquals(org.springframework.http.HttpStatus.CONFLICT, error.getHttpStatus());
        verify(sites, never()).delete(site);
    }

    private User siteAdmin(Company company, Site site) {
        User user = new User(); user.setCompany(company);
        when(sites.findById(site.getId())).thenReturn(Optional.of(site));
        return user;
    }

    @Test void siteLogoMustBeASmallPngOrJpegOfTheSameCompany() {
        Company company = new Company(); company.setId(7L);
        Company other = new Company(); other.setId(8L);
        Site site = new Site(); site.setId(11L); site.setCompany(company); site.setName("Plant"); site.setCode("P1");
        User user = siteAdmin(company, site);
        com.grash.model.File foreign = new com.grash.model.File(); foreign.setCompany(other);
        com.grash.model.File svg = new com.grash.model.File(); svg.setCompany(company);
        when(files.findById(1L)).thenReturn(Optional.of(foreign));
        when(files.findById(2L)).thenReturn(Optional.of(svg));
        when(storage.getStorageService().download(svg)).thenReturn("<svg onload=alert(1)/>".getBytes());

        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND,
                assertThrows(CustomException.class, () -> service().setLogo(11L, 1L, user)).getHttpStatus());
        assertEquals("site_logo_invalid_format",
                assertThrows(CustomException.class, () -> service().setLogo(11L, 2L, user)).getMessage());
        verify(sites, never()).save(site);
    }

    @Test void validPngBecomesTheSiteLogoAndCanBeRemoved() {
        Company company = new Company(); company.setId(7L);
        Site site = new Site(); site.setId(11L); site.setCompany(company); site.setName("Plant"); site.setCode("P1");
        User user = siteAdmin(company, site);
        com.grash.model.File png = new com.grash.model.File(); png.setId(3L); png.setCompany(company);
        when(files.findById(3L)).thenReturn(Optional.of(png));
        when(storage.getStorageService().download(png))
                .thenReturn(new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a, 0});
        when(sites.save(site)).thenReturn(site);
        when(fileMapper.toShowDto(png)).thenReturn(new com.grash.dto.FileShowDTO());

        assertEquals(3L, service().setLogo(11L, 3L, user).getLogoId());
        assertSame(png, site.getLogo());

        service().removeLogo(11L, user);
        assertNull(site.getLogo());
    }

    @Test void secondSiteNeedsTheMultiSiteEntitlement() {
        Company company = new Company(); company.setId(7L);
        User user = new User(); user.setCompany(company);
        Site existing = new Site(); existing.setId(1L); existing.setCompany(company);
        when(sites.findByCompany_IdOrderByNameAsc(7L)).thenReturn(java.util.List.of(existing));
        doThrow(new CustomException("license_entitlement_required", org.springframework.http.HttpStatus.FORBIDDEN))
                .when(licenses).requireEntitlement(com.grash.dto.license.LicenseEntitlement.MULTI_SITE);
        com.grash.dto.SiteDTO input = new com.grash.dto.SiteDTO(); input.setName("Usine 2"); input.setCode("U2");

        assertThrows(CustomException.class, () -> service().create(input, user));
        verify(sites, never()).save(any());
    }
}
