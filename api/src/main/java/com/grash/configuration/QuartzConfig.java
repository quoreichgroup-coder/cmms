package com.grash.configuration;

import com.grash.job.DeleteDemoCompaniesJob;
import io.sentry.Sentry;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.quartz.listeners.JobListenerSupport;
import org.springframework.boot.autoconfigure.quartz.SchedulerFactoryBeanCustomizer;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.quartz.SpringBeanJobFactory;

@Configuration
public class QuartzConfig {

    @Bean
    public JobDetail deleteDemoCompaniesJobDetail() {
        return JobBuilder.newJob(DeleteDemoCompaniesJob.class)
                .withIdentity("deleteDemoCompaniesJob")
                .storeDurably()
                .build();
    }

    @Bean
    public Trigger deleteDemoCompaniesTrigger() {
        return TriggerBuilder.newTrigger()
                .forJob(deleteDemoCompaniesJobDetail())
                .withIdentity("deleteDemoCompaniesTrigger")
                .withSchedule(SimpleScheduleBuilder.simpleSchedule()
                        .withIntervalInHours(1)
                        .repeatForever())
                .build();
    }

    @Bean
    public SchedulerFactoryBeanCustomizer sentryQuartzSchedulerCustomizer(
            AutowireCapableBeanFactory beanFactory) {
        return schedulerFactoryBean -> {
            schedulerFactoryBean.setGlobalJobListeners(new SentryJobListener());
            schedulerFactoryBean.setJobFactory(new SpringBeanJobFactory() {
                @Override
                protected Object createJobInstance(org.quartz.spi.TriggerFiredBundle bundle) {
                    return beanFactory.createBean(bundle.getJobDetail().getJobClass());
                }
            });
        };
    }

    @Slf4j
    static class SentryJobListener extends JobListenerSupport {

        @Override
        public String getName() {
            return "SentryJobListener";
        }

        @Override
        public void jobWasExecuted(JobExecutionContext context, JobExecutionException jobException) {
            if (jobException == null) {
                return;
            }
            log.error("Quartz job {} of group {} failed", jobName(context), group(context), jobException);
            Sentry.captureException(jobException);
        }

        private static String jobName(JobExecutionContext context) {
            JobDetail jobDetail = context == null ? null : context.getJobDetail();
            return jobDetail == null ? "unknown" : jobDetail.getKey().getName();
        }

        private static String group(JobExecutionContext context) {
            JobDetail jobDetail = context == null ? null : context.getJobDetail();
            return jobDetail == null ? "unknown" : jobDetail.getKey().getGroup();
        }
    }
}
