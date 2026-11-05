package com.grash.integration;

import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.DirectoryResourceAccessor;
import org.junit.jupiter.api.*;
import org.testcontainers.containers.PostgreSQLContainer;
import java.nio.file.Path;
import java.sql.*;
import static org.junit.jupiter.api.Assertions.*;

/** Infrastructure-only test: the container owns this schema; no application database is used. */
class ProcurementApprovalMigrationIntegrationTest {
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");
    Connection connection;
    @BeforeAll static void start() { POSTGRES.start(); }
    @AfterAll static void stop() { POSTGRES.stop(); }
    @BeforeEach void migrate() throws Exception {
        connection = DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        sql("DROP SCHEMA public CASCADE"); sql("CREATE SCHEMA public");
        sql("CREATE TABLE company(id BIGINT PRIMARY KEY)"); sql("INSERT INTO company VALUES (1),(2)");
        var liquibase = new Liquibase("db/changelog/2026_10_28_00000000010_procurement_approval_policies.xml",
                new DirectoryResourceAccessor(Path.of("src/main/resources")), new JdbcConnection(connection));
        liquibase.update(new Contexts(), new LabelExpression());
        // Liquibase may leave this connection transactional. Keep the direct SQL
        // assertions isolated so an expected constraint violation does not abort
        // every subsequent assertion on the same PostgreSQL connection.
        connection.setAutoCommit(true);
    }
    @AfterEach void close() throws Exception { if (connection != null) connection.close(); }
    void sql(String sql) throws SQLException { try (var statement = connection.createStatement()) { statement.execute(sql); } }
    void policy(long id, long company, String status) throws SQLException {
        sql("INSERT INTO procurement_approval_policy(id,company_id,name,document_type,status) VALUES (" + id + "," + company + ",'Policy','PR','" + status + "')");
    }
    @Test void activePoliciesMayCoexistAtDistinctPrioritiesButNotTheSamePriority() throws Exception {
        policy(1, 1, "ACTIVE"); policy(2, 1, "DRAFT"); policy(3, 2, "ACTIVE");
        var error = assertThrows(SQLException.class, () -> sql("UPDATE procurement_approval_policy SET status='ACTIVE' WHERE id=2"));
        assertEquals("23505", error.getSQLState());
        sql("UPDATE procurement_approval_policy SET priority=200,status='ACTIVE' WHERE id=2");
        policy(4, 1, "DRAFT");
        assertEquals("23505", assertThrows(SQLException.class, () -> sql("UPDATE procurement_approval_policy SET status='ACTIVE' WHERE id=4")).getSQLState());
        policy(5, 2, "DRAFT");
        sql("UPDATE procurement_approval_policy SET priority=200,status='ACTIVE' WHERE id=5");
    }
    @Test void documentInstanceAndDecisionStepAreUniqueAndUsedPolicyCannotBeDeleted() throws Exception {
        policy(1, 1, "ACTIVE");
        String values = "1,'PR',10,'Document',1,0,'Policy','[]'";
        sql("INSERT INTO procurement_approval_instance(id,company_id,document_type,document_id,document_name,policy_id,policy_version,policy_name,steps) VALUES (1," + values + ")");
        assertEquals("23505", assertThrows(SQLException.class, () -> sql("INSERT INTO procurement_approval_instance(id,company_id,document_type,document_id,document_name,policy_id,policy_version,policy_name,steps) VALUES (2," + values + ")")).getSQLState());
        sql("INSERT INTO procurement_approval_event(id,company_id,instance_id,level_number,policy_version,action) VALUES (1,1,1,1,0,'APPROVED')");
        assertEquals("23505", assertThrows(SQLException.class, () -> sql("INSERT INTO procurement_approval_event(id,company_id,instance_id,level_number,policy_version,action) VALUES (2,1,1,1,0,'APPROVED')")).getSQLState());
        assertEquals("23503", assertThrows(SQLException.class, () -> sql("DELETE FROM procurement_approval_policy WHERE id=1")).getSQLState());
    }
    @Test void configurationAuditSurvivesDeletionOfUnusedDraft() throws Exception {
        policy(1, 1, "DRAFT");
        sql("INSERT INTO procurement_approval_event(id,company_id,policy_id,policy_version,policy_name,action) VALUES (1,1,1,0,'Original name','CREATED')");
        sql("DELETE FROM procurement_approval_policy WHERE id=1");
        try (var statement = connection.createStatement(); var result = statement.executeQuery("SELECT policy_name FROM procurement_approval_event WHERE id=1")) {
            assertTrue(result.next()); assertEquals("Original name", result.getString(1));
        }
    }

    @Test void generatedDocumentAccessAuditMigrationStoresOutcomeAndEnforcesDocumentReference() throws Exception {
        sql("CREATE TABLE generated_document(id BIGINT PRIMARY KEY)");
        sql("INSERT INTO generated_document VALUES (57)");
        var liquibase = new Liquibase("db/changelog/2026_11_04_00000000001_generated_document_access_audit.xml",
                new DirectoryResourceAccessor(Path.of("src/main/resources")), new JdbcConnection(connection));
        liquibase.update(new Contexts(), new LabelExpression());
        connection.setAutoCommit(true);

        try (var statement = connection.createStatement(); var result = statement.executeQuery(
                "SELECT to_regclass('public.generated_document_access_event_seq') IS NOT NULL")) {
            assertTrue(result.next());
            assertTrue(result.getBoolean(1), "Hibernate's PostgreSQL ID sequence must be created by the migration");
        }

        sql("INSERT INTO generated_document_access_event(id,company_id,generated_document_id,source_type,source_id,actor_id,actor_name,outcome) " +
                "VALUES (1,1,57,'PURCHASE_ORDER',42,9,'Buyer','SUCCESS')");
        assertEquals("23503", assertThrows(SQLException.class, () -> sql(
                "INSERT INTO generated_document_access_event(id,company_id,generated_document_id,source_type,source_id,actor_id,actor_name,outcome) " +
                        "VALUES (2,1,999,'PURCHASE_ORDER',42,9,'Buyer','FAILED')")).getSQLState());
        try (var statement = connection.createStatement(); var result = statement.executeQuery(
                "SELECT source_type,source_id,actor_id,outcome FROM generated_document_access_event WHERE id=1")) {
            assertTrue(result.next());
            assertEquals("PURCHASE_ORDER", result.getString("source_type"));
            assertEquals(42L, result.getLong("source_id"));
            assertEquals(9L, result.getLong("actor_id"));
            assertEquals("SUCCESS", result.getString("outcome"));
        }
    }

    @Test void purchaseOrderPriceMigrationAddsNullableLegacyCompatibleSnapshots() throws Exception {
        sql("CREATE TABLE part_quantity(id BIGINT PRIMARY KEY)");
        var liquibase = new Liquibase("db/changelog/2026_11_04_00000000003_purchase_order_supplier_price.xml",
                new DirectoryResourceAccessor(Path.of("src/main/resources")), new JdbcConnection(connection));
        liquibase.update(new Contexts(), new LabelExpression());
        connection.setAutoCommit(true);
        try (var statement = connection.createStatement(); var result = statement.executeQuery(
                "SELECT column_name, is_nullable, numeric_precision, numeric_scale FROM information_schema.columns " +
                        "WHERE table_schema='public' AND table_name='part_quantity' AND column_name IN ('purchase_unit_price','purchase_price_currency') ORDER BY column_name")) {
            assertTrue(result.next());
            assertEquals("purchase_price_currency", result.getString("column_name"));
            assertEquals("YES", result.getString("is_nullable"));
            assertTrue(result.next());
            assertEquals("purchase_unit_price", result.getString("column_name"));
            assertEquals("YES", result.getString("is_nullable"));
            assertEquals(19, result.getInt("numeric_precision"));
            assertEquals(4, result.getInt("numeric_scale"));
            assertFalse(result.next());
        }
    }

    @Test void procurementLineSiteMigrationBackfillsKnownSitesAndRestrictsDeletion() throws Exception {
        sql("CREATE TABLE site(id BIGINT PRIMARY KEY, company_id BIGINT NOT NULL, name VARCHAR(255))");
        sql("CREATE TABLE work_order(id BIGINT PRIMARY KEY, site_id BIGINT)");
        sql("CREATE TABLE purchase_requisition(id BIGINT PRIMARY KEY, source_work_order_id BIGINT)");
        sql("CREATE TABLE purchase_requisition_line(id BIGINT PRIMARY KEY, requisition_id BIGINT)");
        sql("CREATE TABLE part_quantity(id BIGINT PRIMARY KEY, requisition_line_id BIGINT)");
        sql("INSERT INTO site VALUES (5,1,'Plant A')");
        sql("INSERT INTO work_order VALUES (6,5)");
        sql("INSERT INTO purchase_requisition VALUES (7,6)");
        sql("INSERT INTO purchase_requisition_line VALUES (8,7)");
        sql("INSERT INTO part_quantity VALUES (9,8)");

        var liquibase = new Liquibase("db/changelog/2026_11_05_00000000001_procurement_line_sites.xml",
                new DirectoryResourceAccessor(Path.of("src/main/resources")), new JdbcConnection(connection));
        liquibase.update(new Contexts(), new LabelExpression());
        connection.setAutoCommit(true);

        try (var statement = connection.createStatement(); var result = statement.executeQuery(
                "SELECT (SELECT site_id FROM purchase_requisition_line WHERE id=8) AS pr_site, " +
                        "(SELECT site_id FROM part_quantity WHERE id=9) AS po_site")) {
            assertTrue(result.next());
            assertEquals(5L, result.getLong("pr_site"));
            assertEquals(5L, result.getLong("po_site"));
        }
        assertEquals("23503", assertThrows(SQLException.class, () -> sql("DELETE FROM site WHERE id=5")).getSQLState());
    }
}
