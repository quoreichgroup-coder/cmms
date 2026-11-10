package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.User;
import com.grash.model.enums.PlanFeatures;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Shared server-side entitlement checks for mutations of purchase orders and their lines. */
@Service
public class PurchaseOrderPolicyService {
    private final LicenseService licenseService;

    public PurchaseOrderPolicyService(LicenseService licenseService) {
        this.licenseService = licenseService;
    }

    public void requireModuleEnabled(User user) {
        boolean enabled = user != null
                && user.getCompany() != null
                && user.getCompany().getSubscription() != null
                && user.getCompany().getSubscription().getSubscriptionPlan() != null
                && user.getCompany().getSubscription().getSubscriptionPlan().getFeatures() != null
                && user.getCompany().getSubscription().getSubscriptionPlan().getFeatures()
                .contains(PlanFeatures.PURCHASE_ORDER);
        if (!enabled) {
            throw new CustomException("Purchase order module is not enabled for this company",
                    HttpStatus.FORBIDDEN);
        }
        // Licence catalogue: purchasing is sold as a module (always granted to pre-catalogue licences).
        licenseService.requireEntitlement(com.grash.dto.license.LicenseEntitlement.PROCUREMENT);
    }
}
