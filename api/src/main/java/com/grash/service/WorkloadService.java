package com.grash.service;

import com.grash.dto.workOrder.WorkOrderPatchDTO;
import com.grash.dto.workload.*;
import com.grash.exception.CustomException;
import com.grash.mapper.WorkOrderMapper;
import com.grash.model.ShiftConfiguration;
import com.grash.model.ShiftDayConfiguration;
import com.grash.model.ShiftException;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.enums.Status;
import com.grash.repository.WorkOrderRepository;
import com.grash.repository.UserRepository;
import com.grash.utils.Helper;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkloadService {

    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;
    private final WorkOrderMapper workOrderMapper;
    private final WorkOrderService workOrderService;

    public WorkloadOverviewDTO getOverview(LocalDate startDate, LocalDate endDate, List<Long> userIds, Long companyId) {
        Map<Long, User> usersById = userRepository.findByIdInAndCompany_Id(
                        userIds.stream().distinct().toList(), companyId).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        List<User> users = userIds.stream().distinct()
                .map(usersById::get)
                .filter(Objects::nonNull)
                .toList();

        ZoneId companyZone = users.isEmpty() ? ZoneId.systemDefault() : getCompanyZone(users.get(0));
        Date start = Date.from(startDate.atStartOfDay(companyZone).toInstant());
        Date end = Date.from(endDate.plusDays(1).atStartOfDay(companyZone).toInstant().minusMillis(1));

        Map<Long, Map<LocalDate, List<WorkOrder>>> userWorkOrdersByDate = new HashMap<>();
        for (User user : users) {
            userWorkOrdersByDate.put(user.getId(), new HashMap<>());
        }
        List<Object[]> userWorkOrders = users.isEmpty() ? List.of()
                : workOrderRepository.findByUsersAndEstimatedStartDateBetween(
                        users.stream().map(User::getId).toList(), start, end, companyId);
        for (Object[] row : userWorkOrders) {
            Long userId = (Long) row[0];
            WorkOrder workOrder = (WorkOrder) row[1];
            LocalDate localDate = workOrder.getEstimatedStartDate().toInstant()
                    .atZone(companyZone).toLocalDate();
            userWorkOrdersByDate.get(userId)
                    .computeIfAbsent(localDate, ignored -> new ArrayList<>())
                    .add(workOrder);
        }

        List<WorkloadDayDTO> days = new ArrayList<>();
        int totalTeamCapacity = 0;
        double totalTeamAllocated = 0;

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            WorkloadDayDTO dayDTO = new WorkloadDayDTO();
            dayDTO.setDate(current);
            dayDTO.setDayOfWeek(current.getDayOfWeek());

            int dayCapacity = 0;
            double dayAllocated = 0;
            List<WorkloadUserDayDTO> userDays = new ArrayList<>();

            for (User user : users) {
                DailyCapacity dailyCapacity = resolveUserCapacityForDay(user, current);
                int capacityMinutes = dailyCapacity.minutes();
                List<WorkOrder> userWOs = userWorkOrdersByDate
                        .getOrDefault(user.getId(), Collections.emptyMap())
                        .getOrDefault(current, Collections.emptyList());

                double allocatedMinutes = userWOs.stream()
                        .mapToDouble(wo -> wo.getEstimatedDuration() * 60)
                        .sum();

                WorkloadUserDayDTO userDay = new WorkloadUserDayDTO();
                userDay.setUserId(user.getId());
                userDay.setFullName(user.getFullName());
                userDay.setCapacityMinutes(capacityMinutes);
                userDay.setCapacityStatus(dailyCapacity.status());
                userDay.setStartTime(dailyCapacity.startTime());
                userDay.setAllocatedMinutes(allocatedMinutes);
                userDay.setWorkOrders(userWOs.stream().map(workOrderMapper::toWorkloadDto).toList());

                userDays.add(userDay);
                dayCapacity += capacityMinutes;
                dayAllocated += allocatedMinutes;
            }

            dayDTO.setTeamCapacityMinutes(dayCapacity);
            dayDTO.setTeamAllocatedMinutes(dayAllocated);
            dayDTO.setUsers(userDays);
            days.add(dayDTO);

            totalTeamCapacity += dayCapacity;
            totalTeamAllocated += dayAllocated;

            current = current.plusDays(1);
        }

        WorkloadOverviewDTO overview = new WorkloadOverviewDTO();
        overview.setStartDate(startDate);
        overview.setEndDate(endDate);
        overview.setTeamCapacityMinutes(totalTeamCapacity);
        overview.setTeamAllocatedMinutes(totalTeamAllocated);
        overview.setDays(days);
        return overview;
    }

    public UnscheduledWorkOrdersDTO getUnscheduled(Long companyId, List<Status> statuses) {
        Collection<WorkOrder> unscheduled = workOrderRepository.findUnscheduledByCompany(companyId);

        if (statuses != null && !statuses.isEmpty()) {
            unscheduled = unscheduled.stream()
                    .filter(wo -> statuses.contains(wo.getStatus()))
                    .toList();
        }

        Map<Status, Integer> statusCounts = new HashMap<>();
        for (Status status : Status.values()) {
            if (status == Status.COMPLETE) continue;
            int count = (int) unscheduled.stream().filter(wo -> wo.getStatus() == status).count();
            if (count > 0) {
                statusCounts.put(status, count);
            }
        }

        Date now = new Date();
        Date soon = Helper.addSeconds(now, 2 * 24 * 3600);
        int overdueCount = (int) unscheduled.stream()
                .filter(wo -> wo.getDueDate() != null && wo.getDueDate().before(now))
                .count();
        int dueSoonCount = (int) unscheduled.stream()
                .filter(wo -> wo.getDueDate() != null && !wo.getDueDate().before(now) && wo.getDueDate().before(soon))
                .count();

        UnscheduledWorkOrdersDTO result = new UnscheduledWorkOrdersDTO();
        result.setStatusCounts(statusCounts);
        result.setOverdueCount(overdueCount);
        result.setDueSoonCount(dueSoonCount);
        result.setWorkOrders(unscheduled.stream().map(workOrderMapper::toWorkloadDto).toList());
        return result;
    }

    @Transactional
    public WorkOrder scheduleWorkOrder(Long workOrderId, WorkloadScheduleDTO dto, User user) {
        if (dto.getEstimatedDuration() != null
                && (!Double.isFinite(dto.getEstimatedDuration()) || dto.getEstimatedDuration() <= 0)) {
            throw new CustomException("Estimated duration must be greater than 0", HttpStatus.BAD_REQUEST);
        }

        WorkOrder workOrder = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new CustomException("WorkOrder not found", HttpStatus.NOT_FOUND));

        boolean assigningUser = dto.getLocalDate() != null;
        if (!workOrder.canBeEditedBy(user)) {
            throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
        }

        if (assigningUser && workOrder.getEstimatedDuration() <= 0 && dto.getEstimatedDuration() == null) {
            throw new CustomException("Estimated duration must be set and greater than 0 before scheduling",
                    HttpStatus.BAD_REQUEST);
        }
        if (assigningUser && dto.getPrimaryUserId() == null) {
            throw new CustomException("Primary user must be assigned before scheduling",
                    HttpStatus.BAD_REQUEST);
        }

        User assignedUser = null;
        if (dto.getPrimaryUserId() != null) {
            assignedUser = userRepository.findByIdAndCompany_IdForUpdate(
                            dto.getPrimaryUserId(), user.getCompany().getId())
                    .orElseThrow(() -> new CustomException("Assigned user not found", HttpStatus.NOT_FOUND));
        }
        workOrder.setPrimaryUser(assignedUser);
        if (assigningUser && dto.getEstimatedDuration() != null) {
            workOrder.setEstimatedDuration(dto.getEstimatedDuration());
        }

        if (assigningUser) {
            LocalDate date = dto.getLocalDate();
            DailyCapacity dailyCapacity = resolveUserCapacityForDay(assignedUser, date);
            int capacityMinutes = dailyCapacity.minutes();

            ZoneId companyZone = getCompanyZone(user);
            Date dayStart = Date.from(date.atStartOfDay(companyZone).toInstant());
            Date dayEnd = Date.from(date.plusDays(1).atStartOfDay(companyZone).toInstant().minusMillis(1));

            Collection<WorkOrder> existingWOs = workOrderRepository
                    .findByUserAndEstimatedStartDateBetween(assignedUser.getId(), dayStart, dayEnd,
                            user.getCompany().getId());

            double requiredMinutes = workOrder.getEstimatedDuration() * 60;
            double allocatedMinutes = existingWOs.stream()
                    .filter(wo -> !wo.getId().equals(workOrderId))
                    .mapToDouble(wo -> wo.getEstimatedDuration() * 60)
                    .sum();

            if (allocatedMinutes + requiredMinutes > capacityMinutes) {
                throw new CustomException("User capacity would be exceeded on " + date
                        + ". Required: " + String.format("%.0f", requiredMinutes)
                        + " min, Available: " + String.format("%.0f", Math.max(0, capacityMinutes - allocatedMinutes))
                        + " min", HttpStatus.BAD_REQUEST);
            }

            long requiredMillis = (long) (workOrder.getEstimatedDuration() * 3600 * 1000L);

            LocalTime workdayStart;
            try {
                workdayStart = LocalTime.parse(dailyCapacity.startTime());
            } catch (RuntimeException exception) {
                workdayStart = LocalTime.of(8, 0);
            }
            long shiftStartMillis = Date.from(date.atTime(workdayStart)
                    .atZone(companyZone).toInstant()).getTime();

            long shiftEndMillis = shiftStartMillis + (long) capacityMinutes * 60 * 1000L;

            List<WorkOrder> otherWOs = existingWOs.stream()
                    .filter(wo -> !wo.getId().equals(workOrderId) && wo.getEstimatedStartDate() != null)
                    .sorted(Comparator.comparing(WorkOrder::getEstimatedStartDate))
                    .toList();

            long cursor = shiftStartMillis;
            if (date.equals(LocalDate.now(companyZone))) {
                cursor = Math.max(cursor, System.currentTimeMillis());
            }
            Date foundStart = null;

            if (otherWOs.isEmpty()) {
                if (cursor + requiredMillis <= shiftEndMillis) {
                    foundStart = new Date(cursor);
                }
            } else {
                for (WorkOrder wo : otherWOs) {
                    long woStart = wo.getEstimatedStartDate().getTime();
                    long woEnd = woStart + (long) (wo.getEstimatedDuration() * 3600 * 1000L);

                    if (woEnd <= cursor) continue;

                    if (cursor + requiredMillis <= woStart
                            && cursor + requiredMillis <= shiftEndMillis) {
                        foundStart = new Date(cursor);
                        break;
                    }

                    cursor = woEnd;
                }

                if (foundStart == null && cursor + requiredMillis <= shiftEndMillis) {
                    foundStart = new Date(cursor);
                }

                if (foundStart == null) {
                    throw new CustomException("User is not available on " + date
                            + " for the required duration", HttpStatus.BAD_REQUEST);
                }
            }

            workOrder.setEstimatedStartDate(foundStart);
        } else {
            workOrder.setEstimatedStartDate(null);
        }

        return workOrderService.save(workOrder);
    }

    public int getUserCapacityForDay(User user, LocalDate date) {
        return resolveUserCapacityForDay(user, date).minutes();
    }

    private DailyCapacity resolveUserCapacityForDay(User user, LocalDate date) {
        ShiftConfiguration config = user.getShiftConfiguration();
        if (config == null) return new DailyCapacity(0, "NOT_CONFIGURED", "08:00");
        if (!config.isEnabled()) return new DailyCapacity(0, "SCHEDULE_DISABLED", "08:00");

        for (ShiftException exception : config.getExceptions()) {
            if (exception.getExceptionDate().equals(date)) {
                if (exception.isEnabled() && exception.getAvailabilityMinutes() > 0) {
                    return new DailyCapacity(exception.getAvailabilityMinutes(), "AVAILABLE",
                            safeStartTime(exception.getStartTime()));
                }
                return new DailyCapacity(0, "NON_WORKING_DAY", safeStartTime(exception.getStartTime()));
            }
        }

        for (ShiftDayConfiguration dayConfig : config.getDays()) {
            if (dayConfig.getDayOfWeek().equals(date.getDayOfWeek())) {
                if (dayConfig.isEnabled() && dayConfig.getAvailabilityMinutes() > 0) {
                    return new DailyCapacity(dayConfig.getAvailabilityMinutes(), "AVAILABLE",
                            safeStartTime(dayConfig.getStartTime()));
                }
                return new DailyCapacity(0, "NON_WORKING_DAY", safeStartTime(dayConfig.getStartTime()));
            }
        }

        return new DailyCapacity(0, "DAY_NOT_CONFIGURED", "08:00");
    }

    private String safeStartTime(String startTime) {
        return startTime == null ? "08:00" : startTime;
    }

    private record DailyCapacity(int minutes, String status, String startTime) {}

    private ZoneId getCompanyZone(User user) {
        String timeZone = user.getCompany() == null || user.getCompany().getCompanySettings() == null
                || user.getCompany().getCompanySettings().getGeneralPreferences() == null
                ? null : user.getCompany().getCompanySettings().getGeneralPreferences().getTimeZone();
        try {
            return ZoneId.of(timeZone);
        } catch (RuntimeException exception) {
            return ZoneId.systemDefault();
        }
    }
}
