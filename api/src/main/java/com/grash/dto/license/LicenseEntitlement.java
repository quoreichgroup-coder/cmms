package com.grash.dto.license;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Enumeration of all available license entitlements representing features
 * that can be enabled or disabled based on the license plan.
 */
@Schema(description = "Enumeration of all available CMMS license entitlements and features")
public enum LicenseEntitlement {
    @Schema(description = "Single Sign-On authentication support")
    SSO,
    @Schema(description = "Access to work order history")
    WORK_ORDER_HISTORY,
    @Schema(description = "Workflow automation capabilities")
    WORKFLOW,
    @Schema(description = "Multi-instance deployment support")
    MULTI_INSTANCE,
    @Schema(description = "Webhook integration support")
    WEBHOOK,
    @Schema(description = "Custom branding options")
    BRANDING,
    @Schema(description = "NFC barcode scanning and integration")
    NFC_BARCODE,
    @Schema(description = "Custom user roles and permissions")
    CUSTOM_ROLES,
    @Schema(description = "File attachments on work orders and assets")
    FILE_ATTACHMENTS,
    @Schema(description = "Time tracking for work orders")
    TIME_TRACKING,
    @Schema(description = "Cost tracking for maintenance operations")
    COST_TRACKING,
    @Schema(description = "Work order linking capabilities")
    WORK_ORDER_LINKING,
    @Schema(description = "Signature capture for work order completion")
    SIGNATURE_CAPTURE,
    @Schema(description = "Preventive maintenance calendar view")
    PM_CALENDAR,
    @Schema(description = "Condition-based preventive maintenance triggers")
    CONDITION_BASED_PM,
    @Schema(description = "Asset hierarchy and parent-child relationships")
    ASSET_HIERARCHY,
    @Schema(description = "Asset downtime tracking and reporting")
    ASSET_DOWNTIME,
    @Schema(description = "Low stock alerts for parts and inventory")
    LOW_STOCK_ALERTS,
    @Schema(description = "Parts cost tracking for inventory management")
    PARTS_COST_TRACKING,
    @Schema(description = "Customer and vendor management")
    CUSTOMER_VENDOR,
    @Schema(description = "Custom field configuration")
    FIELD_CONFIGURATION,
    @Schema(description = "Voice notes on work orders and assets")
    VOICE_NOTES,
    @Schema(description = "Advanced analytics and reporting")
    ADVANCED_ANALYTICS,
    @Schema(description = "API access for integrations")
    API_ACCESS,
    @Schema(description = "Unlimited number of assets")
    UNLIMITED_ASSETS,
    @Schema(description = "Unlimited number of locations")
    UNLIMITED_LOCATIONS,
    @Schema(description = "Unlimited number of parts")
    UNLIMITED_PARTS,
    @Schema(description = "Unlimited preventive maintenance schedules")
    UNLIMITED_PM_SCHEDULES,
    @Schema(description = "Unlimited active work orders")
    UNLIMITED_ACTIVE_WORK_ORDERS,
    @Schema(description = "Unlimited checklist templates")
    UNLIMITED_CHECKLISTS,
    @Schema(description = "Unlimited meter readings")
    UNLIMITED_METERS,
    @Schema(description = "Unlimited user accounts")
    UNLIMITED_USERS,
    @Schema(description = "Request portal for submitting maintenance requests")
    REQUEST_PORTAL,
    @Schema(description = "Resource planning and workload view")
    RESOURCE_PLANNING,
    // ---- QPM modules (licence catalogue version 2). Appended at the end: the order of earlier values is kept.
    @Schema(description = "Purchase requisitions, purchase orders and receipts")
    PROCUREMENT,
    @Schema(description = "Multi-level approval policies for requisitions and purchase orders")
    APPROVAL_WORKFLOWS,
    @Schema(description = "Structured maintenance task lists (operations, components, counters)")
    MAINTENANCE_TASK_LISTS,
    @Schema(description = "PM strategy packages and multi-counter plans")
    PM_STRATEGIES,
    @Schema(description = "Custom document templates for work orders, requests, requisitions and purchase orders")
    DOCUMENT_TEMPLATES,
    @Schema(description = "Visual (PDFME) document designer")
    VISUAL_DOCUMENT_DESIGNER,
    @Schema(description = "Several sites with their own logo, language and time zone")
    MULTI_SITE;

    /**
     * Modules added with licence catalogue version 2. Licences issued before it (no catalogVersion in the lease),
     * instances without a QUOREICH licence and preview mode keep them, exactly as before the catalogue existed.
     */
    public static final java.util.Set<LicenseEntitlement> CATALOG_MODULES = java.util.EnumSet.of(PROCUREMENT,
            APPROVAL_WORKFLOWS, MAINTENANCE_TASK_LISTS, PM_STRATEGIES, DOCUMENT_TEMPLATES, VISUAL_DOCUMENT_DESIGNER,
            MULTI_SITE);

    public static final int MODULE_CATALOG_VERSION = 2;
}
