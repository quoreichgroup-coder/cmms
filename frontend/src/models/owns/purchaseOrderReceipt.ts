export interface PurchaseOrderReceiptLine {
  id: number;
  purchaseOrderLineId: number;
  partName: string;
  quantity: number;
  unit?: string;
}

export interface PurchaseOrderReceipt {
  id: number;
  purchaseOrderId: number;
  reference?: string;
  notes?: string;
  receivedAt: string;
  receivedById: number;
  receivedByName: string;
  lines: PurchaseOrderReceiptLine[];
}
