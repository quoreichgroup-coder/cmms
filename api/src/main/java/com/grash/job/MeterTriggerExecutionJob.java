package com.grash.job;

import com.grash.service.ReadingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.quartz.DisallowConcurrentExecution;
import org.springframework.scheduling.quartz.QuartzJobBean;
import org.springframework.stereotype.Component;

@Component
@DisallowConcurrentExecution
@RequiredArgsConstructor
@Slf4j
public class MeterTriggerExecutionJob extends QuartzJobBean {
    private final ReadingService readingService;

    @Override
    protected void executeInternal(JobExecutionContext context) throws JobExecutionException {
        long triggerId = context.getMergedJobDataMap().getLong("meterTriggerId");
        long pendingSince = context.getMergedJobDataMap().getLong("pendingSince");
        long userId = context.getMergedJobDataMap().getLong("userId");
        try {
            readingService.executePendingMeterTrigger(triggerId, pendingSince, userId);
        } catch (RuntimeException e) {
            log.error("Failed to execute pending meter trigger {}", triggerId, e);
            throw new JobExecutionException(e, context.getRefireCount() < 2);
        }
    }
}
