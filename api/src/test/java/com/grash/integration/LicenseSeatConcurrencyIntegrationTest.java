package com.grash.integration;

import com.grash.dto.license.LicensingState;
import com.grash.exception.CustomException;
import com.grash.repository.LicenseSeatRepository;
import com.grash.service.LicenseSeatService;
import com.grash.service.LicenseService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.test.context.TestConfiguration;
import group.quoreich.testsupport.SeatUserFixture;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.DriverManager;
import java.util.UUID;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real PostgreSQL transactions and repository; minimal fixtures for the seat-count queries. */
@SpringJUnitConfig(LicenseSeatConcurrencyIntegrationTest.Config.class)
@TestPropertySource(properties = "license-provider=QUOREICH")
@EnabledIfEnvironmentVariable(named = "QPM_LICENSE_TEST_DB_URL", matches = ".+")
class LicenseSeatConcurrencyIntegrationTest {
    static final String SCHEMA = "qpm_seats_" + UUID.randomUUID().toString().replace("-", "");
    @Autowired JdbcTemplate jdbc;
    @Autowired LicenseSeatService seats;
    @Autowired PlatformTransactionManager manager;
    @Autowired EntityManager entityManager;

    @TestConfiguration
    @EnableTransactionManagement(proxyTargetClass = true)
    static class Config {
        @Bean DataSource dataSource() throws Exception {
            try (var connection = DriverManager.getConnection(url(), user(), password());
                 var statement = connection.createStatement()) {
                statement.execute("CREATE SCHEMA " + SCHEMA);
            }
            var source = new DriverManagerDataSource(url() + (url().contains("?") ? "&" : "?") +
                    "currentSchema=" + SCHEMA, user(), password());
            var jdbc = new JdbcTemplate(source);
            jdbc.execute("CREATE TABLE company(id BIGINT PRIMARY KEY, demo BOOLEAN NOT NULL)");
            jdbc.execute("CREATE TABLE role(id BIGINT PRIMARY KEY, paid BOOLEAN NOT NULL, role_type INTEGER NOT NULL)");
            jdbc.execute("CREATE TABLE own_user(id BIGSERIAL PRIMARY KEY, enabled BOOLEAN NOT NULL, " +
                    "role_id BIGINT REFERENCES role(id), company_id BIGINT REFERENCES company(id))");
            return source;
        }
        @Bean JdbcTemplate jdbc(DataSource dataSource) { return new JdbcTemplate(dataSource); }
        @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setManagedTypes(PersistenceManagedTypes.of(SeatUserFixture.class.getName()));
            return factory;
        }
        @Bean PlatformTransactionManager manager(EntityManagerFactory factory) { return new JpaTransactionManager(factory); }
        @Bean EntityManager entityManager(EntityManagerFactory factory) { return SharedEntityManagerCreator.createSharedEntityManager(factory); }
        @Bean LicenseSeatRepository repository(JdbcTemplate jdbc) { return new LicenseSeatRepository(jdbc); }
        @Bean LicenseSeatService seats(LicenseSeatRepository repository, EntityManager entityManager) {
            LicenseService licenses = mock(LicenseService.class);
            when(licenses.getLicensingState()).thenReturn(LicensingState.builder()
                    .valid(true).hasLicense(true).seatsFull(1).seatsLight(1).build());
            var guard = new LicenseSeatService(repository, licenses, entityManager);
            return guard;
        }
    }

    @BeforeEach
    void fixtures() {
        jdbc.execute("TRUNCATE own_user, role, company RESTART IDENTITY");
        jdbc.update("INSERT INTO company VALUES (1, false), (2, true)");
        jdbc.update("INSERT INTO role VALUES (1, true, 1), (2, false, 1), (3, true, 0)");
    }

    @AfterAll
    static void cleanup() throws Exception {
        try (var connection = DriverManager.getConnection(url(), user(), password());
             var statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA " + SCHEMA + " CASCADE");
        }
    }

    @Test
    void competingAllocationsCannotBothTakeTheLastFullSeat() throws Exception {
        competingAllocations(true);
    }

    @Test
    void competingAllocationsCannotBothTakeTheLastLightSeat() throws Exception {
        competingAllocations(false);
    }

    private void competingAllocations(boolean full) throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        var firstChecked = new CountDownLatch(1);
        var secondAttempted = new CountDownLatch(1);
        var releaseFirst = new CountDownLatch(1);
        try {
            Future<?> first = executor.submit(() -> new TransactionTemplate(manager).execute(status -> {
                seats.lockForUserChanges();
                seats.checkAdditionalSeats(full ? 1 : 0, full ? 0 : 1);
                firstChecked.countDown();
                await(releaseFirst);
                jdbc.update("INSERT INTO own_user(enabled, role_id, company_id) VALUES (true, ?, 1)", full ? 1 : 2);
                return null;
            }));
            assertTrue(firstChecked.await(5, TimeUnit.SECONDS));
            Future<Boolean> second = executor.submit(() -> {
                secondAttempted.countDown();
                try {
                    new TransactionTemplate(manager).execute(status -> {
                        seats.lockForUserChanges();
                        seats.checkAdditionalSeats(full ? 1 : 0, full ? 0 : 1);
                        jdbc.update("INSERT INTO own_user(enabled, role_id, company_id) VALUES (true, ?, 1)", full ? 1 : 2);
                        return null;
                    });
                    return true;
                } catch (CustomException rejected) {
                    return false;
                }
            });
            assertTrue(secondAttempted.await(5, TimeUnit.SECONDS));
            assertThrows(TimeoutException.class, () -> second.get(150, TimeUnit.MILLISECONDS));
            releaseFirst.countDown();
            first.get(5, TimeUnit.SECONDS);
            assertFalse(second.get(5, TimeUnit.SECONDS));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM own_user WHERE enabled", Integer.class));
        } finally {
            releaseFirst.countDown();
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));
        }
    }

    @Test
    void rollbackReleasesLockAndDoesNotConsumeSeat() {
        new TransactionTemplate(manager).execute(status -> {
            seats.checkAdditionalSeats(1, 0);
            jdbc.update("INSERT INTO own_user(enabled, role_id, company_id) VALUES (true, 1, 1)");
            status.setRollbackOnly();
            return null;
        });
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM own_user", Integer.class));
        assertDoesNotThrow(() -> new TransactionTemplate(manager).execute(status -> {
            seats.checkAdditionalSeats(1, 0);
            jdbc.update("INSERT INTO own_user(enabled, role_id, company_id) VALUES (true, 1, 1)");
            return null;
        }));
    }

    @Test
    void disabledDemoAndSuperadminUsersDoNotUseCustomerSeats() {
        jdbc.update("INSERT INTO own_user(enabled, role_id, company_id) VALUES " +
                "(false, 1, 1), (true, 1, 2), (true, 3, 1)");
        assertDoesNotThrow(() -> new TransactionTemplate(manager).execute(status -> {
            seats.checkAdditionalSeats(1, 1);
            return null;
        }));
    }

    @Test
    void deferredJpaInsertIsIncludedInNextQuotaCheck() {
        assertThrows(CustomException.class, () -> new TransactionTemplate(manager).execute(status -> {
            seats.checkAdditionalSeats(1, 0);
            entityManager.persist(new SeatUserFixture());
            seats.checkAdditionalSeats(1, 0);
            return null;
        }));
        entityManager.clear();
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM own_user", Integer.class));
    }

    @Test
    void quotaCheckRequiresTheCallersTransaction() {
        assertThrows(IllegalTransactionStateException.class, () -> seats.checkAdditionalSeats(1, 0));
    }

    static void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Timed out waiting for transaction");
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }

    static String url() { return System.getenv("QPM_LICENSE_TEST_DB_URL"); }
    static String user() { return System.getenv().getOrDefault("QPM_LICENSE_TEST_DB_USER", "qpm_test"); }
    static String password() { return System.getenv().getOrDefault("QPM_LICENSE_TEST_DB_PASSWORD", ""); }
}
