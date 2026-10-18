export interface PurchaseOrderCreationValues<TPartQuantity> {
  partQuantities?: TPartQuantity[];
  approveOnSubmit?: boolean;
}

export class PurchaseOrderPartsUpdateError extends Error {
  constructor(cause: unknown) {
    super(
      'Purchase order details were saved, but its part quantities were not.'
    );
    this.name = 'PurchaseOrderPartsUpdateError';
    Object.assign(this, { cause });
  }
}

export async function updatePurchaseOrderWorkflow(
  updatePurchaseOrder: () => Promise<unknown>,
  updatePartQuantities: () => Promise<unknown>
): Promise<void> {
  await updatePurchaseOrder();
  try {
    await updatePartQuantities();
  } catch (error) {
    throw new PurchaseOrderPartsUpdateError(error);
  }
}

export async function createPurchaseOrderWorkflow<TPartQuantity>(
  values: PurchaseOrderCreationValues<TPartQuantity>,
  create: () => Promise<number>,
  savePartQuantities: (
    purchaseOrderId: number,
    partQuantities: TPartQuantity[]
  ) => Promise<unknown>,
  approve: (purchaseOrderId: number) => Promise<unknown>,
  onCreated: (purchaseOrderId: number) => void
): Promise<number> {
  const purchaseOrderId = await create();
  onCreated(purchaseOrderId);
  await savePartQuantities(purchaseOrderId, values.partQuantities ?? []);

  if (values.approveOnSubmit) {
    await approve(purchaseOrderId);
  }

  return purchaseOrderId;
}
