package com.grash.controller;

import com.grash.dto.license.LicensingState;
import com.grash.service.LicenseService;
import com.grash.model.User;
import com.grash.model.enums.RoleType;
import com.grash.security.CurrentUser;
import com.grash.exception.CustomException;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.Map;
import io.swagger.v3.oas.annotations.Hidden;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/license")
@RequiredArgsConstructor
@Hidden
public class LicenseController {

    private final LicenseService licenseService;

    @GetMapping("/state")
    public LicensingState getValidity(HttpServletRequest req) {
        return licenseService.getLicensingState();
    }
    public record ActivationRequest(@NotBlank @Size(max = 256) String licenseKey) { }

    @GetMapping("/activation-config")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Boolean> activationConfig(@CurrentUser User user) {
        requireOwner(user);
        return Map.of("available", licenseService.isActivationAvailable());
    }

    @PostMapping("/activate")
    @PreAuthorize("isAuthenticated()")
    public LicensingState activate(@CurrentUser User user, @Valid @RequestBody ActivationRequest request) {
        requireOwner(user);
        return licenseService.activate(request.licenseKey());
    }

    private void requireOwner(User user) {
        if (user == null || !(user.isOwnsCompany() ||
                (user.getRole() != null && user.getRole().getRoleType() == RoleType.ROLE_SUPER_ADMIN)))
            throw new CustomException("Seul le propriétaire de l’entreprise ou le superadmin peut activer une licence.", HttpStatus.FORBIDDEN);
    }
}


