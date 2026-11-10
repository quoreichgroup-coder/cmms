package com.grash.controller;

import com.grash.dto.SchedulePatchDTO;
import com.grash.dto.SuccessResponse;
import com.grash.exception.CustomException;
import com.grash.model.User;
import com.grash.model.Schedule;
import com.grash.service.PreventiveMaintenanceService;
import com.grash.service.ScheduleService;
import com.grash.service.UserService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.Optional;

@RestController
@RequestMapping("/schedules")
@Tag(name = "Schedules", description = "Operations on schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;
    private final UserService userService;
    private final PreventiveMaintenanceService preventiveMaintenanceService;

//    @GetMapping("")
//    @PreAuthorize("permitAll()")
//    
//    public Collection<Schedule> getAll(HttpServletRequest req) {
//        OwnUser user = userService.whoami(req);
//        if (user.getRole().getRoleType().equals(RoleType.ROLE_CLIENT)) {
//            return scheduleService.findByCompany(user.getCompany().getId());
//        } else return scheduleService.getAll();
//    }

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public Schedule getById(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        Schedule savedSchedule = scheduleService.findById(id)
                .filter(schedule -> schedule.getPreventiveMaintenance() != null && schedule.getPreventiveMaintenance()
                        .getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        if (!savedSchedule.getPreventiveMaintenance().canBeViewedBy(user)
                || !user.canAccessSite(savedSchedule.getPreventiveMaintenance().getSite()))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return savedSchedule;
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Schedule patch(@Parameter(description = "Schedule fields to update") @Valid @RequestBody SchedulePatchDTO schedule,
                          @PathVariable("id") Long id,
                          HttpServletRequest req) {
        User user = userService.whoami(req);
        return preventiveMaintenanceService.patchSchedule(id, schedule, user);
    }

    /** A plan cannot exist without its schedule: delete or pause the preventive maintenance instead. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<SuccessResponse> delete(@PathVariable("id") Long id, HttpServletRequest req) {
        throw new CustomException("A schedule cannot be deleted on its own. Pause or delete the preventive "
                + "maintenance instead.", HttpStatus.CONFLICT);
    }

}


