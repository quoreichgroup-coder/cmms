package com.grash.model.enums;

public enum PermissionEntity {
    PEOPLE_AND_TEAMS,
    CATEGORIES,
    CATEGORIES_WEB,//unused
    WORK_ORDERS,
    PREVENTIVE_MAINTENANCES,
    ASSETS,
    PARTS_AND_MULTIPARTS,
    PURCHASE_ORDERS,
    METERS,
    VENDORS_AND_CUSTOMERS,
    FILES,
    LOCATIONS,
    SETTINGS,
    REQUESTS,
    ANALYTICS,
    REOPEN_WORK_ORDERS,
    DOCUMENT_TEMPLATES,
    // Append only: permissions are persisted as enum ordinals in legacy role tables.
    PURCHASE_REQUISITIONS,
    PURCHASE_RECEIPTS
}
