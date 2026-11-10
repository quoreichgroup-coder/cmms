const licenseEntitlements = [
  'SSO',
  'WORK_ORDER_HISTORY',
  'WORKFLOW',
  'MULTI_INSTANCE',
  'WEBHOOK',
  'BRANDING',
  'NFC_BARCODE',
  'CUSTOM_ROLES',
  'FILE_ATTACHMENTS',
  'TIME_TRACKING',
  'COST_TRACKING',
  'WORK_ORDER_LINKING',
  'SIGNATURE_CAPTURE',
  'PM_CALENDAR',
  'CONDITION_BASED_PM',
  'ASSET_HIERARCHY',
  'ASSET_DOWNTIME',
  'LOW_STOCK_ALERTS',
  'PARTS_COST_TRACKING',
  'CUSTOMER_VENDOR',
  'FIELD_CONFIGURATION',
  'VOICE_NOTES',
  'ADVANCED_ANALYTICS',
  'API_ACCESS',
  'UNLIMITED_ASSETS',
  'UNLIMITED_LOCATIONS',
  'UNLIMITED_PARTS',
  'UNLIMITED_PM_SCHEDULES',
  'UNLIMITED_ACTIVE_WORK_ORDERS',
  'UNLIMITED_CHECKLIST',
  'UNLIMITED_METERS',
  'RESOURCE_PLANNING',
  // QPM modules sold through the licence catalogue (version 2).
  'PROCUREMENT',
  'APPROVAL_WORKFLOWS',
  'MAINTENANCE_TASK_LISTS',
  'PM_STRATEGIES',
  'DOCUMENT_TEMPLATES',
  'VISUAL_DOCUMENT_DESIGNER',
  'MULTI_SITE'
] as const;

/** Restricted only by a QUOREICH catalogue licence (catalogVersion >= 2); kept otherwise, as on the server. */
export const CATALOG_MODULE_ENTITLEMENTS: readonly string[] = [
  'PROCUREMENT', 'APPROVAL_WORKFLOWS', 'MAINTENANCE_TASK_LISTS', 'PM_STRATEGIES',
  'DOCUMENT_TEMPLATES', 'VISUAL_DOCUMENT_DESIGNER', 'MULTI_SITE'
];
export type LicensingState = {
  hasLicense?: boolean;
  readOnly?: boolean;
  customerName?: string;
  environment?: string;
  seatsFull?: number;
  seatsLight?: number;
  valid: boolean;
  previewMode?: boolean;
  entitlements: LicenseEntitlement[];
  expirationDate: string;
  planName: string;
  /** Licence catalogue version from the lease; 1 (or absent) = licence issued before the catalogue. */
  catalogVersion?: number;
};
export type LicenseEntitlement = typeof licenseEntitlements[number];
