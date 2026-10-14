import { UserMiniDTO } from './user';
import { Audit } from './audit';
import { PartMiniDTO } from './part';
import { TeamMiniDTO } from './team';
import { VendorMiniDTO } from './vendor';
import Location from './location';
import { CustomerMiniDTO } from './customer';
import File, { FileMiniDTO } from './file';
import Category from './category';
import { customTheme } from '../custom-theme';
import { CustomFieldValue } from './customField';

export default interface Asset extends Audit {
  id: number;
  name: string;
  description: string;
}

export type AssetStatus =
  | 'OPERATIONAL'
  | 'DOWN'
  | 'MODERNIZATION'
  | 'STANDBY'
  | 'INSPECTION_SCHEDULED'
  | 'COMMISSIONING'
  | 'EMERGENCY_SHUTDOWN';
export interface AssetDTO extends Audit {
  nfcId: string;
  id: number;
  name: string;
  image: File;
  location: Location;
  area: string;
  model: string;
  serialNumber: string;
  status: AssetStatus;
  barCode: string;
  category: Category;
  description: string;
  primaryUser: UserMiniDTO;
  assignedTo: UserMiniDTO[];
  teams: TeamMiniDTO[];
  vendors: VendorMiniDTO[];
  customers: CustomerMiniDTO[];
  parentAsset: AssetMiniDTO;
  openWorkOrders: number;
  additionalInfos: string;
  hasChildren?: boolean;
  warrantyExpirationDate?: string;
  acquisitionCost: number;
  inServiceDate?: string;
  parts: PartMiniDTO[];
  files: FileMiniDTO[];
  customId: string;
  manufacturer: string;
  power: string;
  customFieldValues: CustomFieldValue[];
}
export const assetStatuses: {
  status: AssetStatus;
  color: (theme: typeof customTheme) => string;
  foregroundColor: (theme: typeof customTheme) => string;
}[] = [
  {
    status: 'OPERATIONAL',
    color: (theme) => theme.colors.success,
    foregroundColor: (theme) => theme.colors.onSuccess
  },
  {
    status: 'MODERNIZATION',
    color: (theme) => theme.colors.assetModernization,
    foregroundColor: (theme) => theme.colors.onAssetModernization
  },
  {
    status: 'DOWN',
    color: (theme) => theme.colors.error,
    foregroundColor: (theme) => theme.colors.onError
  },
  {
    status: 'STANDBY',
    color: (theme) => theme.colors.primary,
    foregroundColor: (theme) => theme.colors.onPrimary
  },
  {
    status: 'INSPECTION_SCHEDULED',
    color: (theme) => theme.colors.warning,
    foregroundColor: (theme) => theme.colors.onWarning
  },
  {
    status: 'COMMISSIONING',
    color: (theme) => theme.colors.assetCommissioning,
    foregroundColor: (theme) => theme.colors.onAssetCommissioning
  },
  {
    status: 'EMERGENCY_SHUTDOWN',
    color: (theme) => theme.colors.error,
    foregroundColor: (theme) => theme.colors.onError
  },
] as const;

export interface AssetRow extends AssetDTO {
  hierarchy: number[];
  childrenFetched?: boolean;
}
export interface AssetMiniDTO {
  id: number;
  name: string;
  customId: string;
  parentId: number;
}

export const getAssetStatusConfig = (
  status: AssetStatus
): {
  status: AssetStatus;
  color: (theme: typeof customTheme) => string;
  foregroundColor: (theme: typeof customTheme) => string;
} => {
  const statusConfig = assetStatuses.find((s) => s.status === status);
  if (statusConfig) {
    return statusConfig;
  }
  return {
    status: 'OPERATIONAL',
    color: (theme) => theme.colors.success,
    foregroundColor: (theme) => theme.colors.onSuccess
  };
};
