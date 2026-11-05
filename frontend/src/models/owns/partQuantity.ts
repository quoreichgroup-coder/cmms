import { Audit } from './audit';
import Part, { PartMiniDTO } from './part';

export default interface PartQuantity extends Audit {
  id: number;
  quantity: number;
  part: Part;
}

export interface PartQuantityMiniDTO {
  id: number;
  quantity: number;
  part: PartMiniDTO;
  purchaseRequisitionId?: number;
  receivedQuantity?: number;
  remainingToReceive?: number;
  purchaseUnitCostSnapshot?: number | null;
  purchaseCurrencySnapshot?: string | null;
  purchaseUnitPrice?: number | null;
  purchasePriceCurrency?: string | null;
  siteId?: number | null;
  siteName?: string | null;
}
