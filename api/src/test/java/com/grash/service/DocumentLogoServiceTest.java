package com.grash.service;

import com.grash.factory.StorageServiceFactory;
import com.grash.model.Company;
import com.grash.model.File;
import com.grash.model.Site;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DocumentLogoServiceTest {
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a, 0};

    private final StorageServiceFactory storageFactory = mock(StorageServiceFactory.class, RETURNS_DEEP_STUBS);
    private final DocumentLogoService service = new DocumentLogoService(storageFactory);

    private Company company(long id) {
        Company company = new Company();
        company.setId(id);
        return company;
    }

    private File file(Company owner) {
        File file = new File();
        file.setCompany(owner);
        return file;
    }

    private Site site(Company company, File logo) {
        Site site = new Site();
        site.setId(5L);
        site.setCompany(company);
        site.setLogo(logo);
        return site;
    }

    @Test
    void siteLogoWinsOverTheCompanyLogo() {
        Company company = company(1);
        File companyLogo = file(company);
        company.setLogo(companyLogo);
        File siteLogo = file(company);

        assertSame(siteLogo, service.logoFor(company, site(company, siteLogo)));
        assertSame(companyLogo, service.logoFor(company, site(company, null)));
        assertSame(companyLogo, service.logoFor(company, null));
    }

    @Test
    void aLogoFromAnotherCompanyIsNeverPrinted() {
        Company company = company(1);
        Company other = company(2);
        company.setLogo(file(company));

        assertSame(company.getLogo(), service.logoFor(company, site(company, file(other))),
                "falls back to the company logo");
        company.setLogo(file(other));
        assertNull(service.logoFor(company, null));
    }

    @Test
    void dataUriAcceptsOnlySmallPngOrJpeg() {
        Company company = company(1);
        File logo = file(company);
        company.setLogo(logo);

        when(storageFactory.getStorageService().download(logo)).thenReturn(PNG);
        assertTrue(service.logoDataUri(company, null).startsWith("data:image/png;base64,"));

        when(storageFactory.getStorageService().download(logo)).thenReturn("<svg/>".getBytes());
        assertNull(service.logoDataUri(company, null), "SVG or HTML is refused whatever its declared type");

        when(storageFactory.getStorageService().download(logo))
                .thenReturn(new byte[DocumentLogoService.MAX_LOGO_BYTES + 1]);
        assertNull(service.logoDataUri(company, null));
    }
}
