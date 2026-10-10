package com.grash.controller;

import com.grash.dto.SiteDTO;
import com.grash.dto.SuccessResponse;
import com.grash.exception.CustomException;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.service.SiteService;
import com.grash.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sites")
@RequiredArgsConstructor
public class SiteController {
    private final SiteService siteService;
    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<SiteDTO> list(HttpServletRequest request) {
        User user = userService.whoami(request);
        if (user.getCompany() == null) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return siteService.list(user);
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public SiteDTO create(@Valid @RequestBody SiteDTO body, HttpServletRequest request) {
        User user = userService.whoami(request);
        ensureSettingsAccess(user, true);
        return siteService.create(body, user);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public SiteDTO update(@PathVariable Long id, @Valid @RequestBody SiteDTO body, HttpServletRequest request) {
        User user = userService.whoami(request);
        ensureSettingsAccess(user, true);
        return siteService.update(id, body, user);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<SuccessResponse> delete(@PathVariable Long id, HttpServletRequest request) {
        User user = userService.whoami(request);
        ensureSettingsAccess(user, true);
        siteService.delete(id, user);
        return ResponseEntity.ok(new SuccessResponse(true, "Site deleted"));
    }

    private void ensureSettingsAccess(User user, boolean editing) {
        if (user.getCompany() == null || (!user.isOwnsCompany()
                && !user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        if (editing && !user.isOwnsCompany() &&
                !user.getRole().getEditOtherPermissions().contains(PermissionEntity.SETTINGS))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
    }
}
