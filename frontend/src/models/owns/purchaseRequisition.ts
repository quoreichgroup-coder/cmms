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
}

export interface PurchaseRequisition {
  id: number;
  title: string;
  justification?: string;
  requiredDate?: string;
  status: PurchaseRequisitionStatus;
  requesterId?: number;
  requesterName?: string;
  decisionById?: number;
  decisionAt?: string;
  decisionNote?: string;
  lines: PurchaseRequisitionLine[];
}
