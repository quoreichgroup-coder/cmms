export type ApprovalDocumentType = 'PR' | 'PO';
export interface ApprovalLevel {
  name: string;
  approverType: 'USER' | 'ROLE';
  approverId: number | null;
  /** Older policies omit this field and remain mandatory by default. */
  required?: boolean;
}
export type ApprovalConditionOperator = 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL';
export interface ApprovalCondition {
  field: 'ESTIMATED_NET_MATERIAL_AMOUNT';
  operator: ApprovalConditionOperator;
  value: string;
  currency: string;
}
export interface ApprovalPolicy {
  id?: number;
  version?: number;
  name: string;
  description: string;
  documentType: ApprovalDocumentType;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  priority?: number;
  conditions?: ApprovalCondition[];
  levels: ApprovalLevel[];
  replacesPolicyId?: number;
}
export interface ApprovalTarget {
  id: number;
  name: string;
  approverType: 'USER' | 'ROLE';
  documentTypes: ApprovalDocumentType[];
}
export interface ApprovalSummary {
  policyName: string;
  policyVersion: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentLevel: number;
  levelCount: number;
  canDecide: boolean;
  estimatedNetAmount?: string;
  currency?: string;
  levels: { name: string; approverType: string; approverName: string; required: boolean }[];
  stepBlocked: boolean;
}
export interface ApprovalEvent {
  id: number;
  documentType: ApprovalDocumentType;
  documentId: number;
  documentName: string;
  policyName: string;
  policyVersion: number;
  levelNumber: number | null;
  levelName: string;
  actorName: string;
  action: 'APPROVED' | 'REJECTED' | 'REASSIGNED';
  decidedAt: string;
  comment?: string;
}
export interface ApprovalPage<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
}
