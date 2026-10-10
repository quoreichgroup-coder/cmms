package com.grash.service;

import com.grash.model.WorkOrderMeterTrigger;
import com.grash.model.enums.WorkOrderMeterTriggerCondition;
import org.junit.jupiter.api.Test;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class MeterTriggerPolicyTest {
    @Test
    void thresholdComparisonIsStrictForBothDirections() {
        WorkOrderMeterTrigger trigger = new WorkOrderMeterTrigger();
        trigger.setValue(100);
        trigger.setTriggerCondition(WorkOrderMeterTriggerCondition.MORE_THAN);
        assertFalse(MeterTriggerPolicy.conditionMet(trigger, 100));
        assertTrue(MeterTriggerPolicy.conditionMet(trigger, 101));

        trigger.setTriggerCondition(WorkOrderMeterTriggerCondition.LESS_THAN);
        assertFalse(MeterTriggerPolicy.conditionMet(trigger, 100));
        assertTrue(MeterTriggerPolicy.conditionMet(trigger, 99));
    }

    @Test
    void pendingCrossingIsConsumedUntilConditionClears() {
        WorkOrderMeterTrigger trigger = new WorkOrderMeterTrigger();
        Date startedAt = new Date();

        assertTrue(MeterTriggerPolicy.beginPending(trigger, startedAt));
        assertEquals(startedAt, trigger.getPendingSince());
        assertFalse(trigger.isArmed());
        assertFalse(MeterTriggerPolicy.beginPending(trigger, new Date(startedAt.getTime() + 1)));

        MeterTriggerPolicy.clearCondition(trigger);
        assertNull(trigger.getPendingSince());
        assertTrue(trigger.isArmed());
    }

    @Test
    void nonRecurrentTriggerDoesNotRearmAfterItsOrderWasCreated() {
        WorkOrderMeterTrigger trigger = new WorkOrderMeterTrigger();
        MeterTriggerPolicy.beginPending(trigger, new Date());
        MeterTriggerPolicy.markTriggered(trigger);

        MeterTriggerPolicy.clearCondition(trigger);

        assertTrue(trigger.isHasTriggered());
        assertFalse(trigger.isArmed());
    }

    @Test
    void recurrentTriggerRearmsOnlyAfterConditionClears() {
        WorkOrderMeterTrigger trigger = new WorkOrderMeterTrigger();
        trigger.setRecurrent(true);
        MeterTriggerPolicy.beginPending(trigger, new Date());
        MeterTriggerPolicy.markTriggered(trigger);

        assertFalse(trigger.isArmed());
        MeterTriggerPolicy.clearCondition(trigger);

        assertTrue(trigger.isArmed());
        assertTrue(trigger.isHasTriggered());
    }
}
