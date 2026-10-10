package com.grash.controller;

import com.grash.advancedsearch.SearchCriteria;
import com.grash.dto.PreventiveMaintenancePatchDTO;
import com.grash.dto.PreventiveMaintenanceCallDTO;
import com.grash.dto.PreventiveMaintenanceCallRescheduleRequest;
import com.grash.dto.PreventiveMaintenancePostDTO;
import com.grash.dto.PreventiveMaintenanceShowDTO;
import com.grash.dto.SuccessResponse;
import com.grash.dto.workOrder.WorkOrderMiniDTO;
import com.grash.mapper.PreventiveMaintenanceMapper;
import com.grash.mapper.WorkOrderMapper;
import com.grash.model.User;
import com.grash.security.CurrentUser;
import com.grash.service.PreventiveMaintenanceService;
import com.grash.utils.TenantAspectUtils;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/preventive-maintenances")
@Tag(name = "Preventive Maintenances", description = "Operations on preventive maintenances")
@RequiredArgsConstructor
public class PreventiveMaintenanceController {

    private final PreventiveMaintenanceService preventiveMaintenanceService;
    private final PreventiveMaintenanceMapper preventiveMaintenanceMapper;
    private final WorkOrderMapper workOrderMapper;

    @PostMapping("/search")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Page<PreventiveMaintenanceShowDTO>> search(@Parameter(description = "Search criteria for " +
                                                                             "filtering preventive maintenances") @RequestBody SearchCriteria searchCriteria,
                                                                     @Parameter(hidden = true) @CurrentUser User user) {
        return ResponseEntity.ok(TenantAspectUtils.executeWithDisabledCompanyCheck(() ->
                preventiveMaintenanceService.findBySearchCriteriaWithEntityGraph(
                                preventiveMaintenanceService.getSearchCriteria(user, searchCriteria))
                        .map(preventiveMaintenanceMapper::toShowDto)
        ));
    }

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public PreventiveMaintenanceShowDTO getById(@PathVariable("id") Long id,
                                                @Parameter(hidden = true) @CurrentUser User user) {
        return preventiveMaintenanceMapper.toShowDto(preventiveMaintenanceService.getById(id, user));
    }

    @GetMapping("/{id}/recent-work-orders")
    @PreAuthorize("permitAll()")
    public List<WorkOrderMiniDTO> getRecentWorkOrders(@PathVariable("id") Long id,
                                                      @Parameter(hidden = true) @CurrentUser User user) {
        return preventiveMaintenanceService.getRecentWorkOrders(id, user).stream()
                .map(workOrderMapper::toMiniDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}/work-order-history")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Page<WorkOrderMiniDTO> getWorkOrderHistory(@PathVariable("id") Long id,
                                                      @RequestParam(defaultValue = "0") int page,
                                                      @RequestParam(defaultValue = "10") int size,
                                                      @Parameter(hidden = true) @CurrentUser User user) {
        return preventiveMaintenanceService.getWorkOrderHistory(id, user, page, size)
                .map(workOrderMapper::toMiniDto);
    }

    @GetMapping("/{id}/call-history")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Page<PreventiveMaintenanceCallDTO> getCallHistory(@PathVariable("id") Long id,
                                                              @RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "10") int size,
                                                              @Parameter(hidden = true) @CurrentUser User user) {
        return preventiveMaintenanceService.getMeterCallHistory(id, user, page, size);
    }

    @PostMapping("/{id}/call-history/{callId}/reschedule")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public PreventiveMaintenanceCallDTO rescheduleCall(@PathVariable("id") Long pmId,
            @PathVariable Long callId, @Valid @RequestBody PreventiveMaintenanceCallRescheduleRequest request,
            @Parameter(hidden = true) @CurrentUser User user) {
        return preventiveMaintenanceService.rescheduleCalendarCall(pmId, callId, request, user);
    }

    @PostMapping("/{id}/trigger-work-order")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public WorkOrderMiniDTO triggerWorkOrder(@PathVariable("id") Long id,
                                             @Parameter(hidden = true) @CurrentUser User user) {
        return workOrderMapper.toMiniDto(preventiveMaintenanceService.triggerWorkOrder(id, user));
    }

    @PostMapping("")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    PreventiveMaintenanceShowDTO create(@Parameter(description = "Preventive maintenance data to create") @Valid @RequestBody PreventiveMaintenancePostDTO preventiveMaintenancePost,
                                        @Parameter(hidden = true) @CurrentUser User user) {
        return preventiveMaintenanceMapper.toShowDto(preventiveMaintenanceService.create(preventiveMaintenancePost, user));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public PreventiveMaintenanceShowDTO patch(@Parameter(description = "Preventive maintenance fields to update") @Valid @RequestBody PreventiveMaintenancePatchDTO preventiveMaintenance
            , @PathVariable("id") Long id,
                                              @Parameter(hidden = true) @CurrentUser User user) {
        return preventiveMaintenanceMapper.toShowDto(preventiveMaintenanceService.patch(id, preventiveMaintenance, user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<SuccessResponse> delete(@PathVariable("id") Long id,
                                                  @Parameter(hidden = true) @CurrentUser User user) {
        preventiveMaintenanceService.deleteByIdAndUser(id, user);
        return new ResponseEntity<>(new SuccessResponse(true, "Deleted successfully"),
                HttpStatus.OK);
    }

}
