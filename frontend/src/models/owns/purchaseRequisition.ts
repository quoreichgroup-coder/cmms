export type PurchaseRequisitionStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PARTIALLY_ORDERED'
  | 'ORDERED'
  | 'REJECTED'
  | 'CANCELLED';

export interface PurchaseRequisitionLine {
  id: number;
  partId: number;
  partName: string;
  unit?: string;
  quantity: number;
  orderedQuantity: number;
  notes?: string;
  siteId?: number | null;
  siteName?: string | null;
}

export interface PurchaseRequisition {
  id: number;
  title: string;
  justification?: string;
  requiredDate?: string;
  status: PurchaseRequisitionStatus;
  requesterId?: number;
  requesterName?: string;
  sourceWorkOrderId?: number;
  sourceWorkOrderName?: string;
  decisionById?: number;
  decisionAt?: string;
  decisionNote?: string;
  approvalStep?: number;
  approvalLevelCount?: number;
  approvalConfigVersion?: number;
  currentApproverId?: number;
  approvalHistory?: string;
  lines: PurchaseRequisitionLine[];
}
