package com.grash.service;

import com.grash.dto.SchedulePatchDTO;
import com.grash.exception.CustomException;
import com.grash.job.PreventiveMaintenanceNotificationJob;
import com.grash.job.WorkOrderCreationJob;
import com.grash.mapper.ScheduleMapper;
import com.grash.model.PreventiveMaintenance;
import com.grash.model.PreventiveMaintenanceMeterCall;
import com.grash.model.PreventiveMaintenancePlanConfiguration;
import com.grash.model.Schedule;
import com.grash.model.WorkOrder;
import com.grash.model.enums.PreventiveMaintenanceCallStatus;
import com.grash.model.enums.RecurrenceType;
import com.grash.model.enums.ScheduleTriggerType;
import com.grash.model.enums.Status;
import com.grash.repository.ScheduleRepository;
import com.grash.repository.PreventiveMaintenanceMeterCallRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

import com.grash.model.enums.RecurrenceBasedOn;
import org.quartz.CronScheduleBuilder;
import org.quartz.SimpleScheduleBuilder; // Added import for SimpleScheduleBuilder

import java.util.Calendar;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ScheduleService {
    private final ScheduleRepository scheduleRepository;
    private final ScheduleMapper scheduleMapper;
    private final WorkOrderService workOrderService;
    private final PreventiveMaintenanceMeterCallRepository callRepository;

    // Quartz Scheduler
    private final Scheduler scheduler;

    public Schedule create(Schedule Schedule) {
        return scheduleRepository.save(Schedule);
    }

    public Schedule update(Long id, SchedulePatchDTO schedule) {
        if (scheduleRepository.existsById(id)) {
            Schedule savedSchedule = scheduleRepository.findById(id).get();
            return scheduleRepository.save(scheduleMapper.updateSchedule(savedSchedule, schedule));
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    public Collection<Schedule> getAll() {
        return scheduleRepository.findAll();
    }

    public void delete(Long id) {
        // Ensure jobs are killed before deleting data
        stopScheduleJobs(id);
        scheduleRepository.deleteById(id);
    }

    public Optional<Schedule> findById(Long id) {
        return scheduleRepository.findById(id);
    }

    public Collection<Schedule> findByCompany(Long id) {
        return scheduleRepository.findByCompany_Id(id);
    }

    public void scheduleWorkOrder(Schedule schedule) {
        if (schedule.getTriggerType() == ScheduleTriggerType.METER) {
            stopScheduleJobs(schedule.getId());
            syncCalendarCallRegister(schedule, Collections.emptyList());
            return;
        }
        // A plan can be switched from meter-driven to calendar-driven. Preserve its
        // meter history, but retire the old upcoming meter thresholds.
        callRepository.findBySchedule_IdAndCallTypeAndStatus(schedule.getId(), ScheduleTriggerType.METER,
                        PreventiveMaintenanceCallStatus.PLANNED)
                .forEach(call -> {
                    call.setStatus(PreventiveMaintenanceCallStatus.IGNORED);
                    callRepository.save(call);
                });
        int limit = 5;
        PreventiveMaintenance preventiveMaintenance = schedule.getPreventiveMaintenance();
        Page<WorkOrder> workOrdersPage = workOrderService.findLastByPM(preventiveMaintenance.getId(), limit);
        TimeZone timeZone = TimeZone.getTimeZone(preventiveMaintenance.getCompany()
                .getCompanySettings().getGeneralPreferences().getTimeZone());
        boolean isStale = false;
        if (workOrdersPage.getTotalElements() >= limit && workOrdersPage.getContent().stream().allMatch(workOrder -> workOrder.getFirstTimeToReact() == null)) {
            isStale = true;
            schedule.setDisabled(true);
            scheduleRepository.save(schedule);
        }

        boolean shouldSchedule =
                !schedule.isDisabled() && (schedule.getEndsOn() == null || schedule.getEndsOn().after(new Date())) && !isStale;
        if (!shouldSchedule) syncCalendarCallRegister(schedule, Collections.emptyList());

        if (shouldSchedule) {
            try {
                ScheduleBuilder<?> scheduleBuilder = null;
                Date startsOn = schedule.getStartsOn();

                if (schedule.getRecurrenceBasedOn() == RecurrenceBasedOn.COMPLETED_DATE) {
                    if (workOrdersPage.isEmpty()) {
                        scheduleBuilder = SimpleScheduleBuilder.simpleSchedule()
                                .withRepeatCount(0);
                    } else {
                        WorkOrder lastCompletedWorkOrder =
                                workOrdersPage.stream()
                                        .filter(w -> Status.COMPLETE.equals(w.getStatus()))
                                        .max(Comparator.comparing(WorkOrder::getCompletedOn))
                                        .orElse(null);
                        if (lastCompletedWorkOrder == null) {
                            syncCalendarCallRegister(schedule, Collections.emptyList());
                            return;
                        }
                        scheduleNextWorkOrderJobAfterCompletion(schedule.getId(),
                                lastCompletedWorkOrder.getCompletedOn());
                        return; // Exit after scheduling completion-based job
                    }
                } else { // SCHEDULED_DATE
                    Calendar cal = Calendar.getInstance(timeZone);
                    cal.setTime(startsOn);
                    int hour = cal.get(Calendar.HOUR_OF_DAY);
                    int minute = cal.get(Calendar.MINUTE);

                    switch (schedule.getRecurrenceType()) {
                        case DAILY:
                            scheduleBuilder = CalendarIntervalScheduleBuilder.calendarIntervalSchedule()
                                    .withIntervalInDays(schedule.getFrequency())
                                    .withMisfireHandlingInstructionFireAndProceed()
                                    .preserveHourOfDayAcrossDaylightSavings(true)
                                    .inTimeZone(timeZone);
                            break;

                        case WEEKLY:
                            if (schedule.getDaysOfWeek() == null || schedule.getDaysOfWeek().isEmpty()) {
                                throw new CustomException("Days of week are required for weekly recurrence.",
                                        HttpStatus.BAD_REQUEST);
                            }

                            // Convert ISO days to Quartz format
                            String daysOfWeekCron = schedule.getDaysOfWeek().stream()
                                    .map(d -> (d + 1) % 7 + 1) // 0-based (Mon=0) to Calendar (Sun=1, Mon=2)
                                    .map(String::valueOf)
                                    .collect(Collectors.joining(","));

                            String cronExpression = String.format("0 %d %d ? * %s", minute, hour, daysOfWeekCron);
                            scheduleBuilder = CronScheduleBuilder.cronSchedule(cronExpression)
                                    .withMisfireHandlingInstructionFireAndProceed()
                                    .inTimeZone(timeZone);

                            // Store the frequency in the job data so the job can handle it
                            // The cron will fire every week on specified days, but the job will check frequency
                            break;

                        case MONTHLY:
                            scheduleBuilder = CalendarIntervalScheduleBuilder.calendarIntervalSchedule()
                                    .withIntervalInMonths(schedule.getFrequency())
                                    .withMisfireHandlingInstructionFireAndProceed()
                                    .preserveHourOfDayAcrossDaylightSavings(true)
                                    .inTimeZone(timeZone);
                            break;

                        case YEARLY:
                            scheduleBuilder = CalendarIntervalScheduleBuilder.calendarIntervalSchedule()
                                    .withIntervalInYears(schedule.getFrequency())
                                    .withMisfireHandlingInstructionFireAndProceed()
                                    .preserveHourOfDayAcrossDaylightSavings(true)
                                    .inTimeZone(timeZone);
                            break;

                        default:
                            throw new CustomException("Unsupported recurrence type: " + schedule.getRecurrenceType(),
                                    HttpStatus.BAD_REQUEST);
                    }
                }

                // ---------------------------------------------------------
                // JOB 1: Work Order Creation (FIXED)
                // ---------------------------------------------------------

                // Validate that end date is after start date
                if (schedule.getEndsOn() != null && !schedule.getEndsOn().after(startsOn)) {
                    log.warn("Schedule {} has endsOn date {} that is not after effective start date {}. Skipping " +
                                    "scheduling.",
                            schedule.getId(), schedule.getEndsOn(), startsOn);
                    syncCalendarCallRegister(schedule, Collections.emptyList());
                    return;
                }

                JobDetail woJob = JobBuilder.newJob(WorkOrderCreationJob.class)
                        .withIdentity("wo-job-" + schedule.getId(), "wo-group")
                        .usingJobData("scheduleId", schedule.getId())
                        .storeDurably()
                        .build();

                Trigger woTrigger = TriggerBuilder.newTrigger()
                        .withIdentity("wo-trigger-" + schedule.getId(), "wo-group")
                        .startAt(startsOn) // Now points to the original startsOn
                        .withSchedule(scheduleBuilder)
                        .endAt(schedule.getEndsOn())
                        .build();

                scheduler.scheduleJob(woJob, woTrigger);
                if (schedule.getRecurrenceBasedOn() == RecurrenceBasedOn.SCHEDULED_DATE) {
                    syncCalendarCallRegister(schedule, forecastFromTrigger(schedule, woTrigger, timeZone,
                            calendarForecastLimit(schedule)));
                } else {
                    syncCalendarCallRegister(schedule, forecastFromCompletion(schedule, startsOn, timeZone, 12));
                }

                // ---------------------------------------------------------
                // JOB 2: Notification (Shared Method Call - FIXED CALL SITE)
                // ---------------------------------------------------------
                int daysBeforePMNotification = preventiveMaintenance.getCompany()
                        .getCompanySettings().getGeneralPreferences().getDaysBeforePrevMaintNotification();

                if (daysBeforePMNotification > 0) {
                    Date trueStartsOnForNotif = preventiveMaintenance.getEstimatedStartDate() == null ? startsOn :
                            preventiveMaintenance.getEstimatedStartDate();

                    scheduleNotificationJob(
                            trueStartsOnForNotif, // Pass the date the WO is scheduled to run
                            scheduleBuilder,
                            schedule,
                            daysBeforePMNotification,
                            timeZone
                    );
                }

            } catch (SchedulerException e) {
                throw new CustomException("Error scheduling quartz job for schedule " + schedule.getId(),
                        HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
    }

    public void reScheduleWorkOrder(Schedule newSchedule) {
        // Quartz "reschedule" is best handled by deleting and recreating
        // to ensure all parameters (trigger times, data map) are fresh.
        stopScheduleJobs(newSchedule.getId());
        scheduleWorkOrder(newSchedule);
    }

    public void ensureWorkOrderScheduled(Schedule schedule) {
        if (schedule.getTriggerType() == ScheduleTriggerType.METER) return;
        TriggerKey triggerKey = new TriggerKey("wo-trigger-" + schedule.getId(), "wo-group");
        try {
            if (scheduler.checkExists(triggerKey)) {
                Trigger trigger = scheduler.getTrigger(triggerKey);
                if (trigger != null && schedule.getRecurrenceBasedOn() == RecurrenceBasedOn.SCHEDULED_DATE) {
                    TimeZone timeZone = TimeZone.getTimeZone(schedule.getPreventiveMaintenance().getCompany()
                            .getCompanySettings().getGeneralPreferences().getTimeZone());
                    syncCalendarCallRegister(schedule, forecastFromTrigger(schedule, trigger, timeZone,
                            calendarForecastLimit(schedule)));
                }
                return;
            }
            scheduleWorkOrder(schedule);
        } catch (SchedulerException e) {
            throw new CustomException("Error checking quartz trigger for schedule " + schedule.getId(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public void stopScheduleJobs(Long scheduleId) {
        try {
            // Delete Work Order Job
            scheduler.deleteJob(new JobKey("wo-job-" + scheduleId, "wo-group"));

            // Delete Notification Job (it might not exist, but Quartz handles that gracefully usually, or returns
            // false)
            scheduler.deleteJob(new JobKey("notif-job-" + scheduleId, "notif-group"));

        } catch (SchedulerException e) {
            log.error("Error stopping quartz jobs for schedule " + scheduleId, e);
        }
    }

    private void scheduleNotificationJob(
            Date woStartOn,
            ScheduleBuilder<?> woScheduleBuilder,
            Schedule schedule,
            int daysBeforeNotification, TimeZone timeZone) throws SchedulerException {
        Long scheduleId = schedule.getId();
        Date endsOn = schedule.getEndsOn();
        // 1. Calculate the actual start date for the FIRST notification
        Calendar notifCal = Calendar.getInstance(timeZone);
        notifCal.setTime(woStartOn);
        notifCal.add(Calendar.DATE, -daysBeforeNotification);
        Date notificationStart = notifCal.getTime();

        // 2. Determine if we should schedule
        boolean shouldScheduleNotification = endsOn == null || notificationStart.before(endsOn);

        if (!shouldScheduleNotification) {
            log.debug("Skipping notification scheduling for schedule {}. First trigger date {} is after endsOn date " +
                            "{}.",
                    scheduleId, notificationStart, endsOn);
            return;
        }

        ScheduleBuilder<?> notificationScheduleBuilder;
        if (schedule.getRecurrenceBasedOn() == RecurrenceBasedOn.COMPLETED_DATE) {
            notificationScheduleBuilder = SimpleScheduleBuilder.simpleSchedule().withRepeatCount(0);
        } else if (schedule.getRecurrenceType() == RecurrenceType.WEEKLY) {
            // WEEKLY needs special handling because notification days differ from WO days
            if (schedule.getDaysOfWeek() == null || schedule.getDaysOfWeek().isEmpty()) {
                throw new CustomException("Days of week are required for weekly recurrence.",
                        HttpStatus.BAD_REQUEST);
            }

            // Extract hour and minute from the notification start date
            Calendar notifTimeCal = Calendar.getInstance(timeZone);
            notifTimeCal.setTime(notificationStart);
            int notifHour = notifTimeCal.get(Calendar.HOUR_OF_DAY);
            int notifMinute = notifTimeCal.get(Calendar.MINUTE);

            // Calculate notification days by subtracting daysBeforeNotification from each WO day
            Set<Integer> notificationDays = new HashSet<>();
            for (Integer woDay : schedule.getDaysOfWeek()) {
                // Subtract the notification offset
                int notifDay = (woDay - daysBeforeNotification) % 7;
                // Handle negative wraparound (e.g., Mon-3days = Fri of previous week)
                if (notifDay < 0) {
                    notifDay += 7;
                }
                notificationDays.add(notifDay);
            }

            // Convert to Quartz cron format (Sun=1, Mon=2, ..., Sat=7)
            String notifDaysOfWeekCron = notificationDays.stream()
                    .map(d -> (d + 1) % 7 + 1)
                    .sorted()
                    .map(String::valueOf)
                    .collect(Collectors.joining(","));

            String cronExpression = String.format("0 %d %d ? * %s", notifMinute, notifHour, notifDaysOfWeekCron);
            notificationScheduleBuilder = CronScheduleBuilder.cronSchedule(cronExpression)
                    .withMisfireHandlingInstructionFireAndProceed()
                    .inTimeZone(timeZone);
        } else {
            // For DAILY, MONTHLY, YEARLY: use the same recurrence pattern as the WO
            // The different startAt() date will handle the offset
            notificationScheduleBuilder = woScheduleBuilder;
        }

        JobDetail notifJob = JobBuilder.newJob(PreventiveMaintenanceNotificationJob.class)
                .withIdentity("notif-job-" + scheduleId, "notif-group")
                .usingJobData("scheduleId", scheduleId)
                .build();

        Trigger notifTrigger = TriggerBuilder.newTrigger()
                .withIdentity("notif-trigger-" + scheduleId, "notif-group")
                .startAt(notificationStart) // Offset start date for all types
                .withSchedule(notificationScheduleBuilder)
                .endAt(endsOn)
                .build();

        scheduler.scheduleJob(notifJob, notifTrigger);
    }

    // =========================================================================================
    // CHAINING METHOD (Updated to use the shared notification method)
    // =========================================================================================

    public void scheduleNextWorkOrderJobAfterCompletion(Long scheduleId, Date completedDate) {
        Optional<Schedule> scheduleOpt = scheduleRepository.findById(scheduleId);
        if (scheduleOpt.isEmpty()) return;

        Schedule schedule = scheduleOpt.get();
        PreventiveMaintenance pm = schedule.getPreventiveMaintenance();
        TimeZone timeZone = TimeZone.getTimeZone(pm.getCompany()
                .getCompanySettings().getGeneralPreferences().getTimeZone());

        // Only applies to COMPLETED_DATE schedules
        if (schedule.getRecurrenceBasedOn() != RecurrenceBasedOn.COMPLETED_DATE) return;

        // 1. Calculate the next run date based on Frequency
        Date nextRunDate = getNextCompletionDate(schedule, completedDate, timeZone);

        // The one-shot schedule for the chained job
        ScheduleBuilder<SimpleTrigger> oneShotSchedule = SimpleScheduleBuilder.simpleSchedule().withRepeatCount(0);

        // 2. Schedule a "One-Shot" Job for that date
        try {
            JobKey jobKey = new JobKey("wo-job-chained-" + schedule.getId() + "-" + nextRunDate.getTime(), "wo-group");

            JobDetail woJob = JobBuilder.newJob(WorkOrderCreationJob.class)
                    .withIdentity(jobKey)
                    .usingJobData("scheduleId", schedule.getId())
                    .usingJobData("occurrenceTimestamp", nextRunDate.getTime())
                    .storeDurably()
                    .build();

            Trigger woTrigger = TriggerBuilder.newTrigger()
                    .startAt(generationDate(schedule, nextRunDate, timeZone))
                    .withSchedule(oneShotSchedule) // Run Once
                    .build();

            scheduler.scheduleJob(woJob, woTrigger);
            syncCalendarCallRegister(schedule, forecastFromCompletion(schedule, nextRunDate, timeZone, 12));
            log.info("Chained next schedule for Schedule ID {} at {}", schedule.getId(), nextRunDate);

            int daysBeforePMNotification = pm.getCompany()
                    .getCompanySettings().getGeneralPreferences().getDaysBeforePrevMaintNotification();

            if (daysBeforePMNotification > 0) {
                scheduleNotificationJob(
                        nextRunDate, // The calculated WO start date
                        oneShotSchedule,
                        schedule,
                        daysBeforePMNotification,
                        timeZone);
            }

        } catch (SchedulerException e) {
            log.error("Failed to chain next schedule for ID " + schedule.getId(), e);
        }
    }

    public Schedule save(Schedule schedule) {
        return scheduleRepository.saveAndFlush(schedule);
    }

    public void deleteByCompanyIdAndIsDemoTrue(Long companyId) {
        scheduleRepository.deleteByPreventiveMaintenanceCompany_IdAndIsDemoTrue(companyId);
    }

    public boolean checkIfWeeklyShouldRun(Schedule schedule) {
        return checkIfWeeklyShouldRun(schedule, new Date());
    }

    public boolean checkIfWeeklyShouldRun(Schedule schedule, Date occurrence) {
        // Completion-based schedules are already chained from the previous completion date.
        // Re-applying the scheduled-date week index can skip valid chained occurrences.
        if (schedule.getRecurrenceBasedOn() != RecurrenceBasedOn.SCHEDULED_DATE) return true;
        if (schedule.getRecurrenceType() == RecurrenceType.WEEKLY && schedule.getFrequency() > 1) {
            String tzId = schedule.getPreventiveMaintenance()
                    .getCompany().getCompanySettings()
                    .getGeneralPreferences().getTimeZone();
            ZoneId zoneId = ZoneId.of(tzId);

            long daysSinceStart = ChronoUnit.DAYS.between(
                    schedule.getStartsOn().toInstant().atZone(zoneId).toLocalDate(),
                    occurrence.toInstant().atZone(zoneId).toLocalDate()
            );
            long weeksSinceStart = daysSinceStart / 7;

            if (weeksSinceStart % schedule.getFrequency() != 0) {
                log.info("Skipping execution - not on correct week interval for schedule {}", schedule.getId());
                return false;
            }
        }
        return true;
    }

    public void refreshCalendarCallRegister(Schedule schedule) {
        if (schedule == null || schedule.getTriggerType() != ScheduleTriggerType.CALENDAR
                || schedule.getRecurrenceBasedOn() != RecurrenceBasedOn.SCHEDULED_DATE) return;
        try {
            Trigger trigger = scheduler.getTrigger(new TriggerKey("wo-trigger-" + schedule.getId(), "wo-group"));
            if (trigger == null) return;
            TimeZone timeZone = TimeZone.getTimeZone(schedule.getPreventiveMaintenance().getCompany()
                    .getCompanySettings().getGeneralPreferences().getTimeZone());
            syncCalendarCallRegister(schedule, forecastFromTrigger(schedule, trigger, timeZone,
                    calendarForecastLimit(schedule)));
        } catch (SchedulerException e) {
            throw new CustomException("Unable to refresh preventive maintenance calls.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public void scheduleDeferredOccurrence(PreventiveMaintenanceMeterCall call) {
        if (call == null || call.getId() == null || call.getSchedule() == null
                || call.getCallType() != ScheduleTriggerType.CALENDAR
                || call.getStatus() != PreventiveMaintenanceCallStatus.RESCHEDULED
                || call.getRescheduledFor() == null || call.getDueDate() == null) return;
        JobKey jobKey = new JobKey("wo-deferred-job-" + call.getId(), "wo-group");
        TriggerKey triggerKey = new TriggerKey("wo-deferred-trigger-" + call.getId(), "wo-group");
        try {
            JobDetail job = JobBuilder.newJob(WorkOrderCreationJob.class)
                    .withIdentity(jobKey)
                    .usingJobData("scheduleId", call.getSchedule().getId())
                    .usingJobData("occurrenceTimestamp", call.getDueDate().getTime())
                    .usingJobData("deferredOccurrence", true)
                    .build();
            Trigger trigger = TriggerBuilder.newTrigger()
                    .withIdentity(triggerKey)
                    .forJob(jobKey)
                    .startAt(generationDate(call.getSchedule(), call.getRescheduledFor(), TimeZone.getTimeZone(
                            call.getSchedule().getPreventiveMaintenance().getCompany().getCompanySettings()
                                    .getGeneralPreferences().getTimeZone())))
                    .withSchedule(SimpleScheduleBuilder.simpleSchedule()
                            .withRepeatCount(0)
                            .withMisfireHandlingInstructionFireNow())
                    .build();
            if (scheduler.checkExists(triggerKey)) {
                scheduler.rescheduleJob(triggerKey, trigger);
            } else if (scheduler.checkExists(jobKey)) {
                scheduler.scheduleJob(trigger);
            } else {
                scheduler.scheduleJob(job, trigger);
            }
        } catch (SchedulerException e) {
            throw new CustomException("Unable to schedule the deferred preventive maintenance call.",
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public void recoverDeferredOccurrences() {
        callRepository.findByStatusAndCallTypeAndRescheduledForNotNull(
                        PreventiveMaintenanceCallStatus.RESCHEDULED, ScheduleTriggerType.CALENDAR)
                .forEach(call -> {
                    try {
                        scheduleDeferredOccurrence(call);
                    } catch (RuntimeException e) {
                        log.error("Unable to restore deferred PM call {}", call.getId(), e);
                    }
                });
    }

    private List<Date> forecastFromTrigger(Schedule schedule, Trigger trigger, TimeZone timeZone, int limit) {
        List<Date> result = new ArrayList<>();
        Date now = new Date();
        Date cursor = new Date(now.getTime() - 1);
        if (trigger.getStartTime().after(cursor)) cursor = new Date(trigger.getStartTime().getTime() - 1);
        int attempts = 0;
        while (result.size() < limit && attempts++ < 1200) {
            Date occurrence = trigger.getFireTimeAfter(cursor);
            if (occurrence == null || (schedule.getEndsOn() != null && occurrence.after(schedule.getEndsOn()))) break;
            cursor = occurrence;
            if (schedule.getRecurrenceType() == RecurrenceType.WEEKLY
                    && !isValidWeeklyOccurrence(schedule, occurrence, timeZone)) continue;
            result.add(occurrence);
        }
        return result;
    }

    private boolean isValidWeeklyOccurrence(Schedule schedule, Date occurrence, TimeZone timeZone) {
        ZoneId zone = timeZone.toZoneId();
        java.time.LocalDate startWeek = schedule.getStartsOn().toInstant().atZone(zone).toLocalDate()
                .with(java.time.DayOfWeek.MONDAY);
        java.time.LocalDate occurrenceWeek = occurrence.toInstant().atZone(zone).toLocalDate()
                .with(java.time.DayOfWeek.MONDAY);
        long week = ChronoUnit.WEEKS.between(startWeek, occurrenceWeek);
        return week >= 0 && week % schedule.getFrequency() == 0;
    }

    private List<Date> forecastFromCompletion(Schedule schedule, Date firstDate, TimeZone timeZone, int limit) {
        List<Date> result = new ArrayList<>();
        if (firstDate == null) return result;
        Calendar cursor = Calendar.getInstance(timeZone);
        cursor.setTime(firstDate);
        while (result.size() < limit) {
            Date occurrence = cursor.getTime();
            if (schedule.getEndsOn() != null && occurrence.after(schedule.getEndsOn())) break;
            result.add(occurrence);
            cursor.setTime(getNextCompletionDate(schedule, occurrence, timeZone));
        }
        return result;
    }

    private Date getNextCompletionDate(Schedule schedule, Date completedDate, TimeZone timeZone) {
        Calendar cursor = Calendar.getInstance(timeZone);
        cursor.setTime(completedDate);
        switch (schedule.getRecurrenceType()) {
            case DAILY -> cursor.add(Calendar.DAY_OF_YEAR, schedule.getFrequency());
            case WEEKLY -> cursor.add(Calendar.WEEK_OF_YEAR, schedule.getFrequency());
            case MONTHLY -> cursor.add(Calendar.MONTH, schedule.getFrequency());
            case YEARLY -> cursor.add(Calendar.YEAR, schedule.getFrequency());
        }
        return cursor.getTime();
    }

    private void syncCalendarCallRegister(Schedule schedule, List<Date> dueDates) {
        if (schedule.getId() == null || schedule.getTriggerType() != ScheduleTriggerType.CALENDAR) return;
        PreventiveMaintenancePlanConfiguration plan = schedule.getPlanConfiguration();
        if (plan != null && plan.getMode() == PreventiveMaintenancePlanConfiguration.Mode.STRATEGY) {
            ZoneId zone = ZoneId.of(schedule.getPreventiveMaintenance().getCompany().getCompanySettings()
                    .getGeneralPreferences().getTimeZone());
            dueDates = dueDates.stream()
                    .filter(date -> !PreventiveMaintenancePlanPolicy.duePackages(plan,
                            PreventiveMaintenancePlanPolicy.calendarCycleNumber(schedule, date, zone)).isEmpty())
                    .toList();
        }
        Set<Long> dueEpochs = dueDates.stream().map(Date::getTime).collect(Collectors.toSet());
        List<PreventiveMaintenanceMeterCall> reservedCalls = dueDates.isEmpty() ? Collections.emptyList()
                : callRepository.findBySchedule_IdAndCallTypeAndDueDateIn(
                        schedule.getId(), ScheduleTriggerType.CALENDAR, dueDates);
        Set<Long> reservedEpochs = reservedCalls.stream()
                .filter(call -> call.getDueDate() != null)
                .map(call -> call.getDueDate().getTime())
                .collect(Collectors.toSet());
        List<PreventiveMaintenanceMeterCall> existing = callRepository.findBySchedule_IdAndCallTypeAndStatus(
                schedule.getId(), ScheduleTriggerType.CALENDAR, PreventiveMaintenanceCallStatus.PLANNED);
        Set<Long> existingEpochs = new HashSet<>();
        for (PreventiveMaintenanceMeterCall call : existing) {
            if (call.getDueDate() != null && dueEpochs.contains(call.getDueDate().getTime())) {
                existingEpochs.add(call.getDueDate().getTime());
            } else {
                call.setStatus(PreventiveMaintenanceCallStatus.IGNORED);
                callRepository.save(call);
                cancelLeadGenerationJob(call.getId());
            }
        }
        for (Date dueDate : dueDates) {
            if (existingEpochs.contains(dueDate.getTime()) || reservedEpochs.contains(dueDate.getTime())) continue;
            PreventiveMaintenanceMeterCall call = new PreventiveMaintenanceMeterCall();
            call.setSchedule(schedule);
            call.setDueDate(dueDate);
            call.setCallType(ScheduleTriggerType.CALENDAR);
            call.setStatus(PreventiveMaintenanceCallStatus.PLANNED);
            call = callRepository.save(call);
            scheduleLeadGenerationJob(schedule, call);
        }
        // Existing forecast calls also need their one-shot lead job after a restart or edit.
        List<PreventiveMaintenanceMeterCall> currentCalls = callRepository
                .findBySchedule_IdAndCallTypeAndDueDateIn(schedule.getId(), ScheduleTriggerType.CALENDAR, dueDates);
        for (PreventiveMaintenanceMeterCall call : currentCalls) {
            if (call.getStatus() == PreventiveMaintenanceCallStatus.PLANNED) {
                if (schedule.getRecurrenceBasedOn() == RecurrenceBasedOn.SCHEDULED_DATE) {
                    scheduleLeadGenerationJob(schedule, call);
                } else {
                    cancelLeadGenerationJob(call.getId());
                }
            }
        }
    }

    private Date generationDate(Schedule schedule, Date dueDate, TimeZone timeZone) {
        if (schedule.getWorkOrderGenerationLeadDays() <= 0) return dueDate;
        Calendar calendar = Calendar.getInstance(timeZone);
        calendar.setTime(dueDate);
        calendar.add(Calendar.DAY_OF_YEAR, -schedule.getWorkOrderGenerationLeadDays());
        return calendar.getTime();
    }

    private int calendarForecastLimit(Schedule schedule) {
        int leadDays = schedule.getWorkOrderGenerationLeadDays();
        int intervalDays = switch (schedule.getRecurrenceType()) {
            case DAILY -> schedule.getFrequency();
            case WEEKLY -> 7 * schedule.getFrequency();
            case MONTHLY -> 30 * schedule.getFrequency();
            case YEARLY -> 365 * schedule.getFrequency();
        };
        int occurrencesInLeadWindow = (leadDays + intervalDays - 1) / intervalDays;
        return Math.min(400, 12 + occurrencesInLeadWindow * (schedule.getRecurrenceType() == RecurrenceType.WEEKLY
                ? Math.max(1, schedule.getDaysOfWeek().size()) : 1));
    }

    private void scheduleLeadGenerationJob(Schedule schedule, PreventiveMaintenanceMeterCall call) {
        if (call == null) return;
        if (schedule.getWorkOrderGenerationLeadDays() <= 0 || call.getId() == null
                || call.getDueDate() == null || schedule.getRecurrenceBasedOn() != RecurrenceBasedOn.SCHEDULED_DATE) {
            cancelLeadGenerationJob(call.getId());
            return;
        }
        TimeZone timeZone = TimeZone.getTimeZone(schedule.getPreventiveMaintenance().getCompany()
                .getCompanySettings().getGeneralPreferences().getTimeZone());
        JobKey jobKey = new JobKey("wo-lead-job-" + call.getId(), "wo-group");
        TriggerKey triggerKey = new TriggerKey("wo-lead-trigger-" + call.getId(), "wo-group");
        try {
            JobDetail job = JobBuilder.newJob(WorkOrderCreationJob.class).withIdentity(jobKey)
                    .usingJobData("scheduleId", schedule.getId())
                    .usingJobData("occurrenceTimestamp", call.getDueDate().getTime())
                    .build();
            Trigger trigger = TriggerBuilder.newTrigger().withIdentity(triggerKey).forJob(jobKey)
                    .startAt(generationDate(schedule, call.getDueDate(), timeZone))
                    .withSchedule(SimpleScheduleBuilder.simpleSchedule().withRepeatCount(0)
                            .withMisfireHandlingInstructionFireNow()).build();
            if (scheduler.checkExists(triggerKey)) scheduler.rescheduleJob(triggerKey, trigger);
            else if (scheduler.checkExists(jobKey)) scheduler.scheduleJob(trigger);
            else scheduler.scheduleJob(job, trigger);
        } catch (SchedulerException e) {
            throw new CustomException("Unable to schedule early preventive maintenance work order.",
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private void cancelLeadGenerationJob(Long callId) {
        if (callId == null) return;
        try {
            scheduler.deleteJob(new JobKey("wo-lead-job-" + callId, "wo-group"));
        } catch (SchedulerException e) {
            log.warn("Unable to cancel lead generation job for PM call {}", callId, e);
        }
    }

    public Collection<Schedule> findActive() {
        return scheduleRepository.findByActive();
    }

    public void disableByCompany(Long companyId) {
        scheduleRepository.updateDisabledTrueByCompanyId(companyId);
    }
}
