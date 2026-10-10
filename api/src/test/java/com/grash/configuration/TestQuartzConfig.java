package com.grash.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;
import org.springframework.scheduling.quartz.SpringBeanJobFactory;
import org.springframework.scheduling.quartz.SchedulerFactoryBean;

import java.util.Properties;

@Configuration
public class TestQuartzConfig {

    @Bean
    @Primary
    public SchedulerFactoryBean schedulerFactoryBean(AutowireCapableBeanFactory beanFactory) {
        SchedulerFactoryBean factory = new SchedulerFactoryBean();
        Properties props = new Properties();
        props.setProperty("org.quartz.scheduler.instanceName", "TestScheduler");
        props.setProperty("org.quartz.threadPool.threadCount", "1");
        props.setProperty("org.quartz.jobStore.class", "org.quartz.simpl.RAMJobStore");
        factory.setQuartzProperties(props);
        factory.setJobFactory(new SpringBeanJobFactory() {
            @Override
            protected Object createJobInstance(org.quartz.spi.TriggerFiredBundle bundle) {
                return beanFactory.createBean(bundle.getJobDetail().getJobClass());
            }
        });
        return factory;
    }
}
