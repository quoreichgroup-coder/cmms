package com.grash.controller;

import com.grash.dto.GeneralPreferencesPatchDTO;
import com.grash.exception.CustomException;
import com.grash.model.CompanySettings;
import com.grash.model.GeneralPreferences;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.service.CompanyConfigurationAuditService;
import com.grash.service.GeneralPreferencesService;
import com.grash.service.UserService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.Collection;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/general-preferences")
@Tag(name = "General Preferences", description = "Operations on general preferences")
@RequiredArgsConstructor
public class GeneralPreferencesController {


    private final GeneralPreferencesService generalPreferencesService;
    private final UserService userService;
    private final CompanyConfigurationAuditService configurationAuditService;

    @GetMapping("")
    @PreAuthorize("permitAll()")
    public Collection<GeneralPreferences> getAll(HttpServletRequest req) {
        User user = userService.whoami(req);
        CompanySettings companySettings = user.getCompany().getCompanySettings();
        return generalPreferencesService.findByCompanySettings(companySettings.getId());
    }

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public GeneralPreferences getById(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<GeneralPreferences> optionalGeneralPreferences = generalPreferencesService.findById(id);
        if (optionalGeneralPreferences.isPresent()) {
            GeneralPreferences savedGeneralPreferences = optionalGeneralPreferences.get();
            if (!savedGeneralPreferences.getCompanySettings().getCompany().getId().equals(user.getCompany().getId())) {
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            }
            return savedGeneralPreferences;
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public GeneralPreferences patch(@Parameter(description = "General preferences fields to update") @Valid @RequestBody GeneralPreferencesPatchDTO generalPreferences,
                                    @Parameter(description = "General preferences ID") @PathVariable("id") Long id,
                                    HttpServletRequest req) {
        User user = userService.whoami(req);

        Optional<GeneralPreferences> optionalGeneralPreferences = generalPreferencesService.findById(id);

        if (optionalGeneralPreferences.isPresent()) {
            GeneralPreferences savedGeneralPreferences = optionalGeneralPreferences.get();
            if (savedGeneralPreferences.getCompanySettings().getId().equals(user.getCompany().getCompanySettings().getId())
                    && (user.isOwnsCompany() || (user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)
                    && user.getRole().getEditOtherPermissions().contains(PermissionEntity.SETTINGS)))) {
                List<String> changed = new ArrayList<>();
                var before = PreferenceSnapshot.from(savedGeneralPreferences);
                GeneralPreferences updated = generalPreferencesService.update(id, generalPreferences, user);
                addIfChanged(changed, "language", before.language(), updated.getLanguage());
                addIfChanged(changed, "dateFormat", before.dateFormat(), updated.getDateFormat());
                addIfChanged(changed, "currency", before.currencyId(), updated.getCurrency() == null ? null : updated.getCurrency().getId());
                addIfChanged(changed, "timeZone", before.timeZone(), updated.getTimeZone());
                addIfChanged(changed, "businessType", before.businessType(), updated.getBusinessType());
                addIfChanged(changed, "color", before.color(), updated.getColor());
                addIfChanged(changed, "autoAssignWorkOrders", before.autoAssignWorkOrders(), updated.isAutoAssignWorkOrders());
                addIfChanged(changed, "autoAssignRequests", before.autoAssignRequests(), updated.isAutoAssignRequests());
                addIfChanged(changed, "disableClosedWorkOrdersNotif", before.disableClosedWorkOrdersNotif(), updated.isDisableClosedWorkOrdersNotif());
                addIfChanged(changed, "askFeedBackOnWOClosed", before.askFeedBackOnWOClosed(), updated.isAskFeedBackOnWOClosed());
                addIfChanged(changed, "laborCostInTotalCost", before.laborCostInTotalCost(), updated.isLaborCostInTotalCost());
                addIfChanged(changed, "woUpdateForRequesters", before.woUpdateForRequesters(), updated.isWoUpdateForRequesters());
                addIfChanged(changed, "simplifiedWorkOrder", before.simplifiedWorkOrder(), updated.isSimplifiedWorkOrder());
                addIfChanged(changed, "daysBeforePrevMaintNotification", before.daysBeforePrevMaintNotification(), updated.getDaysBeforePrevMaintNotification());
                addIfChanged(changed, "autoGenerateAssetBarcode", before.autoGenerateAssetBarcode(), updated.getAutoGenerateAssetBarcode());
                addIfChanged(changed, "csvSeparator", before.csvSeparator(), updated.getCsvSeparator());
                configurationAuditService.record(user.getCompany(), user, "GENERAL_PREFERENCES", id, "UPDATED", changed);
                return updated;
            } else {
                throw new CustomException("You don't have permission", HttpStatus.NOT_ACCEPTABLE);
            }
        } else {
            throw new CustomException("Can't get someone else's generalPreferences", HttpStatus.NOT_ACCEPTABLE);
        }

    }

    private static void addIfChanged(List<String> changed, String field, Object before, Object after) {
        if (!Objects.equals(before, after)) changed.add(field);
    }

    private record PreferenceSnapshot(com.grash.model.enums.Language language,
                                      com.grash.model.enums.DateFormat dateFormat, Long currencyId,
                                      String timeZone, com.grash.model.enums.BusinessType businessType,
                                      String color, boolean autoAssignWorkOrders, boolean autoAssignRequests,
                                      boolean disableClosedWorkOrdersNotif, boolean askFeedBackOnWOClosed,
                                      boolean laborCostInTotalCost, boolean woUpdateForRequesters,
                                      boolean simplifiedWorkOrder, int daysBeforePrevMaintNotification,
                                      Boolean autoGenerateAssetBarcode, String csvSeparator) {
        static PreferenceSnapshot from(GeneralPreferences preferences) {
            return new PreferenceSnapshot(preferences.getLanguage(), preferences.getDateFormat(),
                    preferences.getCurrency() == null ? null : preferences.getCurrency().getId(),
                    preferences.getTimeZone(), preferences.getBusinessType(), preferences.getColor(),
                    preferences.isAutoAssignWorkOrders(), preferences.isAutoAssignRequests(),
                    preferences.isDisableClosedWorkOrdersNotif(), preferences.isAskFeedBackOnWOClosed(),
                    preferences.isLaborCostInTotalCost(), preferences.isWoUpdateForRequesters(),
                    preferences.isSimplifiedWorkOrder(), preferences.getDaysBeforePrevMaintNotification(),
                    preferences.getAutoGenerateAssetBarcode(), preferences.getCsvSeparator());
        }
    }

}


