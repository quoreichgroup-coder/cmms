package com.grash.controller;

import com.grash.advancedsearch.FilterField;
import com.grash.advancedsearch.SearchCriteria;
import com.grash.dto.*;
import com.grash.exception.CustomException;
import com.grash.service.UserInvitationService;
import com.grash.mapper.UserMapper;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.RoleType;
import com.grash.security.CurrentUser;
import com.grash.service.UserService;


import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@Tag(name = "Users", description = "Operations on users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserMapper userMapper;
    private final UserInvitationService userInvitationService;

    @PostMapping("/search")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Page<UserResponseDTO>> search(@Parameter(description = "Search criteria for filtering " +
                                                                "users") @RequestBody SearchCriteria searchCriteria,
                                                        @Parameter(hidden = true) @CurrentUser User user,
                                                        @RequestParam(defaultValue = "true") @Parameter(description =
                                                                "show only enabled users") boolean enabledOnly) {
        if (user.getRole().getRoleType().equals(RoleType.ROLE_CLIENT)) {
            if (user.getRole().getViewPermissions().contains(PermissionEntity.PEOPLE_AND_TEAMS)) {
                searchCriteria.filterCompany(user);
            } else throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        if (!user.isAllSitesAccess()) {
            List<Object> siteIds = user.getSites().stream().map(site -> (Object) site.getId()).toList();
            List<FilterField> alternatives = new ArrayList<>();
            alternatives.add(FilterField.builder().field("id").value(user.getId()).operation("eq").build());
            if (!siteIds.isEmpty()) alternatives.add(FilterField.builder().field("sites").operation("inm")
                    .values(siteIds).build());
            searchCriteria.getFilterFields().add(FilterField.builder().field("allSitesAccess").value(true)
                    .operation("eq").alternatives(alternatives).build());
        }
        if (enabledOnly) searchCriteria.getFilterFields().add(FilterField.builder()
                .field("enabled").value(true).operation("eq").build());
        return ResponseEntity.ok(userService.findBySearchCriteria(searchCriteria).map(userMapper::toResponseDtoWithShift));
    }

    @PostMapping("/invite")
    @PreAuthorize("permitAll()")
    public SuccessResponse invite(@Parameter(description = "User invitation data") @RequestBody UserInvitationDTO invitation,
                                  @Parameter(hidden = true) @CurrentUser User user) {
        return userService.inviteUsers(invitation, user);
    }

    @GetMapping("/invitations/last-week")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Collection<UserInvitationMiniDTO> getLastWeekInvitations(@Parameter(hidden = true) @CurrentUser User user) {
        if (user.getRole().getViewPermissions().contains(PermissionEntity.PEOPLE_AND_TEAMS)) {
            return userInvitationService.getDistinctByCompanyInLastWeek(user.getCompany().getId());
        } else throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
    }

    @GetMapping("/mini")
    @PreAuthorize("hasAnyRole('ROLE_CLIENT', 'ROLE_SUPER_ADMIN')")
    public Collection<UserMiniDTO> getMini(@Parameter(hidden = true) @CurrentUser User user,
                                           @Parameter(description = "Include requesters in the response") @RequestParam(required = false) Boolean withRequesters) {
        return Boolean.TRUE.equals(withRequesters) ?
                userService.findByCompany(user.getCompany().getId()).stream()
                        .filter(candidate -> user.isAllSitesAccess() || candidate.isAllSitesAccess()
                                || candidate.getSites().stream().anyMatch(site -> user.getSites().stream()
                                .anyMatch(allowed -> allowed.getId().equals(site.getId())))
                                || user.getId().equals(candidate.getId()))
                        .filter(User::isEnabled).map(userMapper::toMiniDto).collect(Collectors.toList()) :
                userService.findWorkersByCompany(user.getCompany().getId()).stream()
                        .filter(candidate -> user.isAllSitesAccess() || candidate.isAllSitesAccess()
                                || candidate.getSites().stream().anyMatch(site -> user.getSites().stream()
                                .anyMatch(allowed -> allowed.getId().equals(site.getId())))
                                || user.getId().equals(candidate.getId()))
                        .filter(User::isEnabledInSubscription)
                        .filter(User::isEnabled)
                        .map(userMapper::toMiniDto).collect(Collectors.toList());
    }

    @GetMapping("/mini/disabled")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Collection<UserMiniDTO> getMiniDisabled(@Parameter(hidden = true) @CurrentUser User user) {
        return userService.findByCompany(user.getCompany().getId()).stream().filter(user1 -> !user1.isEnabledInSubscription()).map(userMapper::toMiniDto).collect(Collectors.toList());
    }


    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public UserResponseDTO patch(@Parameter(description = "User fields to update") @Valid @RequestBody UserPatchDTO userReq,
                                 @Parameter(description = "User ID") @PathVariable("id") Long id,
                                 @Parameter(hidden = true) @CurrentUser User requester) {
        Optional<User> optionalUser = userService.findByIdAndCompany(id, requester.getCompany().getId());

        if (optionalUser.isPresent()) {
            User savedUser = optionalUser.get();
            ensureVisibleWithinSiteScope(savedUser, requester);
            boolean changingSiteScope = userReq.getAllSitesAccess() != null || userReq.getSiteIds() != null;
            if (changingSiteScope && (requester.getId().equals(savedUser.getId()) || savedUser.isOwnsCompany()
                    || !requester.getRole().getEditOtherPermissions().contains(PermissionEntity.PEOPLE_AND_TEAMS)))
                throw new CustomException("You don't have permission to change this user's site access", HttpStatus.FORBIDDEN);
            if (savedUser.canBeEditedBy(requester)) {
                return userMapper.toResponseDto(userService.update(id, userReq, requester));
            } else {
                throw new CustomException("You don't have permission", HttpStatus.NOT_ACCEPTABLE);
            }
        } else {
            throw new CustomException("Can't get someone else's user", HttpStatus.NOT_ACCEPTABLE);
        }

    }

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public UserResponseDTO getById(@PathVariable("id") Long id, @Parameter(hidden = true) @CurrentUser User user) {
        Optional<User> optionalUser = userService.findByIdAndCompany(id, user.getCompany().getId());
        if (optionalUser.isPresent()) {
            User savedUser = optionalUser.get();
            ensureVisibleWithinSiteScope(savedUser, user);
            if (savedUser.canBeViewedBy(user)) {
                return userMapper.toResponseDtoWithShift(savedUser);
            } else throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public UserResponseDTO patchRole(@Parameter(description = "User ID") @PathVariable("id") Long id,
                                     @Parameter(description = "Role ID to assign") @RequestParam("role") Long roleId,
                                     @Parameter(hidden = true) @CurrentUser User requester) {
        User target = userService.findByIdAndCompany(id, requester.getCompany().getId())
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        ensureVisibleWithinSiteScope(target, requester);
        return userMapper.toResponseDto(userService.patchUserRole(id, roleId, requester));
    }

    @PatchMapping("/{id}/disable")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public UserResponseDTO disable(@PathVariable("id") Long id,
                                   @Parameter(hidden = true) @CurrentUser User requester) {
        User target = userService.findByIdAndCompany(id, requester.getCompany().getId())
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        ensureVisibleWithinSiteScope(target, requester);
        return userMapper.toResponseDto(userService.disableUser(id, requester));
    }

    @PatchMapping("/{id}/enable")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public UserResponseDTO enable(@PathVariable("id") Long id,
                                  @Parameter(hidden = true) @CurrentUser User requester) {
        if (!requester.getRole().getEditOtherPermissions().contains(PermissionEntity.PEOPLE_AND_TEAMS))
            throw new CustomException("You don't have permission", HttpStatus.NOT_ACCEPTABLE);
        User target = userService.findByIdAndCompany(id, requester.getCompany().getId())
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        ensureVisibleWithinSiteScope(target, requester);
        return userMapper.toResponseDto(userService.enableUser(target));
    }

    @PatchMapping("/soft-delete/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public UserResponseDTO softDelete(@PathVariable("id") Long id,
                                      @Parameter(hidden = true) @CurrentUser User requester) {
        User target = userService.findByIdAndCompany(id, requester.getCompany().getId())
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        ensureVisibleWithinSiteScope(target, requester);
        return userMapper.toResponseDto(userService.softDeleteUser(id, requester));
    }

    private void ensureVisibleWithinSiteScope(User target, User requester) {
        if (requester.isAllSitesAccess() || requester.getId().equals(target.getId())
                || target.isAllSitesAccess()) return;
        boolean overlaps = target.getSites().stream().anyMatch(targetSite -> requester.getSites().stream()
                .anyMatch(requesterSite -> requesterSite.getId().equals(targetSite.getId())));
        if (!overlaps) throw new CustomException("User is outside your site scope", HttpStatus.FORBIDDEN);
    }
}


