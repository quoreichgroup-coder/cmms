package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.PartQuantity;
import com.grash.model.PurchaseRequisitionLine;
import com.grash.model.Site;
import com.grash.model.User;
import com.grash.repository.SiteRepository;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProcurementSiteServiceTest {
    @Mock SiteRepository sites;
    ProcurementSiteService service;
    Company company;
    User user;
    Site first;
    Site second;

    @BeforeEach void setUp() {
        service = new ProcurementSiteService(sites);
        company = new Company(); company.setId(7L);
        user = new User(); user.setCompany(company); user.setAllSitesAccess(false);
        first = site(11L, company); second = site(12L, company);
    }

    @Test void usesTheOnlyAccessibleCompanySiteAsDefault() {
        user.setSites(List.of(first));
        when(sites.findByCompany_IdOrderByNameAsc(7L)).thenReturn(List.of(first, second));
        assertSame(first, service.resolveLineSite(null, null, user));
    }

    @Test void requiresExplicitSiteWhenSeveralSitesAreAccessible() {
        user.setSites(List.of(first, second));
        when(sites.findByCompany_IdOrderByNameAsc(7L)).thenReturn(List.of(first, second));
        CustomException error = assertThrows(CustomException.class,
                () -> service.resolveLineSite(null, null, user));
        assertEquals("procurement_site_required", error.getMessage());
    }

    @Test void rejectsSitesFromAnotherCompanyEvenWhenUserHasAccess() {
        user.setAllSitesAccess(true);
        when(sites.findByIdAndCompany_Id(21L, 7L)).thenReturn(Optional.empty());
        assertThrows(CustomException.class, () -> service.resolveLineSite(21L, null, user));
    }

    @Test void siteForeignKeysMatchTheDeleteRestrictionInTheLiquibaseMigration() throws Exception {
        assertEquals(OnDeleteAction.RESTRICT,
                PurchaseRequisitionLine.class.getDeclaredField("site").getAnnotation(OnDelete.class).action());
        assertEquals(OnDeleteAction.RESTRICT,
                PartQuantity.class.getDeclaredField("site").getAnnotation(OnDelete.class).action());
    }

    private Site site(Long id, Company company) {
        Site site = new Site(); site.setId(id); site.setCompany(company); return site;
    }
}
