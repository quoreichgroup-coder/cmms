package com.grash.service;

import com.grash.model.WorkOrderMeterTrigger;
import com.grash.model.enums.WorkOrderMeterTriggerCondition;

import java.util.Date;

/** State transitions for a threshold trigger; persistence and work-order creation stay in ReadingService. */
public final class MeterTriggerPolicy {
    private MeterTriggerPolicy() {
    }

    public static boolean conditionMet(WorkOrderMeterTrigger trigger, double readingValue) {
        return trigger.getTriggerCondition() == WorkOrderMeterTriggerCondition.LESS_THAN
                ? readingValue < trigger.getValue()
                : readingValue > trigger.getValue();
    }

    public static boolean beginPending(WorkOrderMeterTrigger trigger, Date now) {
        if (!trigger.isArmed()) return false;
        trigger.setArmed(false);
        trigger.setPendingSince(now);
        return true;
    }

    public static void clearCondition(WorkOrderMeterTrigger trigger) {
        trigger.setPendingSince(null);
        if (trigger.isRecurrent() || !trigger.isHasTriggered()) trigger.setArmed(true);
    }

    public static void markTriggered(WorkOrderMeterTrigger trigger) {
        trigger.setPendingSince(null);
        trigger.setHasTriggered(true);
        trigger.setArmed(false);
    }
}
