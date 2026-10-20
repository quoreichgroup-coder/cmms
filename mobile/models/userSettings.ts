export default interface UserSettings {
  id: number;
  emailNotified: boolean;
  emailUpdatesForWorkOrders: boolean;
  emailUpdatesForRequests: boolean;
  emailUpdatesForPurchaseOrders: boolean;
  statsForAssignedWorkOrders: boolean;
  onboardingVersion: number;
  onboardingStatus: 'NOT_STARTED' | 'SKIPPED' | 'COMPLETED';
}
