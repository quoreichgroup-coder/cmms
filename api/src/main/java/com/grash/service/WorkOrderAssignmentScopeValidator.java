package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.*;
import com.grash.model.abstracts.WorkOrderBase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/** Resolves and scopes direct assignment references on OT and request records. */
@Service
@RequiredArgsConstructor
public class WorkOrderAssignmentScopeValidator {
    private final TeamService teamService;
    private final UserService userService;
    private final AssetService assetService;

    public void validateAndResolve(WorkOrderBase target, User actor) {
        if (target == null || actor == null || actor.getCompany() == null) deny();

        Site effectiveSite = target.getSite();
        if (target.getAsset() != null) {
            Asset asset = assetService.findByIdAndCompany(target.getAsset().getId(), actor.getCompany().getId())
                    .orElseThrow(this::forbidden);
            if (!actor.canAccessSite(asset.getSite())) deny();
            target.setAsset(asset);
            if (effectiveSite == null) effectiveSite = asset.getSite();
        }
        final Site assignmentSite = effectiveSite;

        if (target.getTeam() != null) {
            Team team = teamService.findById(target.getTeam().getId())
                    .filter(candidate -> candidate.getCompany() != null
                            && candidate.getCompany().getId().equals(actor.getCompany().getId()))
                    .orElseThrow(this::forbidden);
            if (team.getUsers() != null && team.getUsers().stream()
                    .anyMatch(member -> member == null || !isAssignableTo(member, actor, assignmentSite))) deny();
            target.setTeam(team);
        }

        if (target.getPrimaryUser() != null) {
            target.setPrimaryUser(resolveAssignableUser(target.getPrimaryUser(), actor, assignmentSite));
        }

        if (target.getAssignedTo() != null) {
            List<User> resolved = new ArrayList<>();
            for (User reference : target.getAssignedTo()) {
                if (reference == null) deny();
                resolved.add(resolveAssignableUser(reference, actor, assignmentSite));
            }
            target.setAssignedTo(new ArrayList<>(resolved.stream().distinct().toList()));
        }
    }

    private User resolveAssignableUser(User reference, User actor, Site site) {
        User assigned = userService.findByIdAndCompany(reference.getId(), actor.getCompany().getId())
                .orElseThrow(this::forbidden);
        if (!isAssignableTo(assigned, actor, site)) deny();
        return assigned;
    }

    private boolean isAssignableTo(User assigned, User actor, Site site) {
        if (!assigned.getCompany().getId().equals(actor.getCompany().getId())) return false;
        if (site != null) return actor.canAccessSite(site) && assigned.canAccessSite(site);
        if (actor.isAllSitesAccess() || assigned.isAllSitesAccess()) return true;
        return assigned.getSites().stream().anyMatch(assignedSite -> actor.getSites().stream()
                .anyMatch(actorSite -> actorSite.getId().equals(assignedSite.getId())));
    }

    private void deny() {
        throw forbidden();
    }

    private CustomException forbidden() {
        return new CustomException("Access denied for the selected team, assignee, or asset", HttpStatus.FORBIDDEN);
    }
}
