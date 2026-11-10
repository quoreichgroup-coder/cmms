package com.grash.service;

import com.grash.dto.license.LicenseEntitlement;
import com.grash.dto.license.LicensingState;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/** QPM modules are restricted only by QUOREICH catalogue licences; nobody loses a module overnight. */
class LicenseCatalogEntitlementTest {

    private static LicensingState state(boolean hasLicense, boolean valid, int catalogVersion, String... entitlements) {
        return LicensingState.builder().hasLicense(hasLicense).valid(valid).catalogVersion(catalogVersion)
                .entitlements(new java.util.HashSet<>(Set.of(entitlements))).build();
    }

    @Test
    void withoutLicenceModulesStayAvailableButPaidEntitlementsDoNot() {
        LicensingState none = state(false, false, 1);
        for (LicenseEntitlement module : LicenseEntitlement.CATALOG_MODULES)
            assertTrue(LicenseService.hasEntitlement(none, module), module.name());
        assertFalse(LicenseService.hasEntitlement(none, LicenseEntitlement.SSO));
    }

    @Test
    void preCatalogueLicenceKeepsEveryModule() {
        LicensingState legacy = state(true, true, 1, "SSO");
        assertTrue(LicenseService.hasEntitlement(legacy, LicenseEntitlement.PROCUREMENT));
        assertTrue(LicenseService.hasEntitlement(legacy, LicenseEntitlement.MULTI_SITE));
        assertTrue(LicenseService.hasEntitlement(legacy, LicenseEntitlement.SSO));
        assertFalse(LicenseService.hasEntitlement(legacy, LicenseEntitlement.WEBHOOK));
    }

    @Test
    void catalogueLicenceGrantsOnlyTheModulesItLists() {
        LicensingState catalogue = state(true, true, 2, "PROCUREMENT", "PM_CALENDAR");
        assertTrue(LicenseService.hasEntitlement(catalogue, LicenseEntitlement.PROCUREMENT));
        assertFalse(LicenseService.hasEntitlement(catalogue, LicenseEntitlement.APPROVAL_WORKFLOWS));
        assertFalse(LicenseService.hasEntitlement(catalogue, LicenseEntitlement.VISUAL_DOCUMENT_DESIGNER));
        assertTrue(LicenseService.hasEntitlement(catalogue, LicenseEntitlement.PM_CALENDAR));
    }

    @Test
    void expiredCatalogueLicenceLosesItsModules() {
        LicensingState expired = state(true, false, 2, "PROCUREMENT");
        assertFalse(LicenseService.hasEntitlement(expired, LicenseEntitlement.PROCUREMENT));
    }

    @Test
    void moduleCodesMatchTheLicenceAuthorityCatalogue() throws Exception {
        String catalogue = java.nio.file.Files.readString(java.nio.file.Path.of(
                "../license-authority/src/main/java/group/quoreich/license/authority/EntitlementCatalog.java"));
        for (LicenseEntitlement entitlement : LicenseEntitlement.values()) {
            assertTrue(catalogue.contains("\"" + entitlement.name() + "\""),
                    entitlement.name() + " must be sellable in the licence console");
        }
    }
}
