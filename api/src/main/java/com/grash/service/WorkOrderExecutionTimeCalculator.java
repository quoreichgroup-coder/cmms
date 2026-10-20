package com.grash.service;

import com.grash.model.WorkOrderLifecycleEvent;
import com.grash.model.enums.Status;

import java.util.Date;
import java.util.List;

/** Calculates active WO elapsed time from recorded status transitions, excluding ON_HOLD. */
final class WorkOrderExecutionTimeCalculator {
    private WorkOrderExecutionTimeCalculator() {}

    static Result calculate(Status currentStatus, Date now, List<WorkOrderLifecycleEvent> events) {
        if (events == null || events.isEmpty() || events.get(0).getPreviousStatus() != Status.OPEN) {
            return Result.unmeasured();
        }

        long elapsedMillis = 0;
        Date activeSince = null;
        Status expectedPreviousStatus = Status.OPEN;
        boolean observedExecution = false;

        for (WorkOrderLifecycleEvent event : events) {
            if (event.getPreviousStatus() != expectedPreviousStatus || event.getOccurredAt() == null) {
                return Result.unmeasured();
            }

            if (event.getNewStatus() == Status.IN_PROGRESS) {
                if (event.getPreviousStatus() != Status.IN_PROGRESS) {
                    activeSince = event.getOccurredAt();
                    observedExecution = true;
                }
            } else if (event.getPreviousStatus() == Status.IN_PROGRESS) {
                if (activeSince == null || event.getOccurredAt().before(activeSince)) {
                    return Result.unmeasured();
                }
                elapsedMillis += event.getOccurredAt().getTime() - activeSince.getTime();
                activeSince = null;
            }

            expectedPreviousStatus = event.getNewStatus();
        }

        if (expectedPreviousStatus != currentStatus || !observedExecution) {
            return Result.unmeasured();
        }

        boolean running = currentStatus == Status.IN_PROGRESS;
        if (running) {
            if (activeSince == null || now.before(activeSince)) return Result.unmeasured();
            elapsedMillis += now.getTime() - activeSince.getTime();
        } else if (activeSince != null) {
            return Result.unmeasured();
        }

        return new Result(true, running, elapsedMillis / 1000L);
    }

    record Result(boolean measured, boolean running, Long elapsedSeconds) {
        static Result unmeasured() {
            return new Result(false, false, null);
        }
    }
}
