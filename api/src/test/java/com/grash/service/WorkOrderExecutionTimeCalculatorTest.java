package com.grash.service;

import com.grash.model.User;
import com.grash.model.Company;
import com.grash.model.WorkOrder;
import com.grash.model.WorkOrderLifecycleEvent;
import com.grash.model.enums.Status;
import org.junit.jupiter.api.Test;

import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class WorkOrderExecutionTimeCalculatorTest {
    private final User actor = new User();
    private final WorkOrder workOrder = new WorkOrder();

    WorkOrderExecutionTimeCalculatorTest() {
        Company company = new Company("TestCo", 10, null);
        company.setId(7L);
        workOrder.setCompany(company);
        actor.setId(9L);
        actor.setFirstName("Test");
        actor.setLastName("Technician");
    }

    @Test
    void sumsActiveIntervalsAndExcludesOnHoldTime() {
        List<WorkOrderLifecycleEvent> events = List.of(
                event(Status.OPEN, Status.IN_PROGRESS, 1_000),
                event(Status.IN_PROGRESS, Status.ON_HOLD, 11_000),
                event(Status.ON_HOLD, Status.IN_PROGRESS, 101_000),
                event(Status.IN_PROGRESS, Status.COMPLETE, 121_000));

        var result = WorkOrderExecutionTimeCalculator.calculate(Status.COMPLETE, new Date(130_000), events);

        assertTrue(result.measured());
        assertFalse(result.running());
        assertEquals(30L, result.elapsedSeconds());
    }

    @Test
    void includesTheCurrentActiveIntervalInPreview() {
        List<WorkOrderLifecycleEvent> events = List.of(
                event(Status.OPEN, Status.IN_PROGRESS, 10_000));

        var result = WorkOrderExecutionTimeCalculator.calculate(Status.IN_PROGRESS, new Date(75_500), events);

        assertTrue(result.measured());
        assertTrue(result.running());
        assertEquals(65L, result.elapsedSeconds());
    }

    @Test
    void refusesToGuessForLegacyOrBrokenTransitionHistory() {
        var legacy = WorkOrderExecutionTimeCalculator.calculate(
                Status.COMPLETE, new Date(50_000), List.of(event(Status.IN_PROGRESS, Status.COMPLETE, 50_000)));
        var gap = WorkOrderExecutionTimeCalculator.calculate(
                Status.COMPLETE, new Date(50_000), List.of(
                        event(Status.OPEN, Status.IN_PROGRESS, 10_000),
                        event(Status.ON_HOLD, Status.COMPLETE, 50_000)));

        assertFalse(legacy.measured());
        assertNull(legacy.elapsedSeconds());
        assertFalse(gap.measured());
        assertNull(gap.elapsedSeconds());
    }

    private WorkOrderLifecycleEvent event(Status from, Status to, long millis) {
        return new WorkOrderLifecycleEvent(workOrder, from, to, actor, new Date(millis), null);
    }
}
