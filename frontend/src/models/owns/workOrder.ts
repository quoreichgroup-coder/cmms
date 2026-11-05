import { Audit } from './audit';
import Request from './request';
import Team from './team';
import Asset from './asset';
import File from './file';
import Location from './location';
import Category from './category';
import { OwnUser, UserMiniDTO } from '../user';
import { CustomerMiniDTO } from './customer';
import PreventiveMaintenance from './preventiveMaintenance';
import { WorkOrderBase } from './workOrderBase';
import { CustomField } from './customField';

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export default interface WorkOrder extends WorkOrderBase {
  maintenanceTaskListId?: number | null;
  maintenanceTaskListReference?: string | null;
  plannedOperations?: Array<{
    operationNumber: string;
    shortDescription: string;
    longText?: string | null;
    workCenter?: string | null;
    workers?: number | null;
    plannedWork?: number | null;
    workUnit?: string | null;
    duration?: number | null;
    durationUnit?: string | null;
    systemCondition?: string | null;
    operationOrder: number;
    materials: Array<{
      partId?: number | null;
      partName?: string | null;
      quantity: number;
      unit?: string | null;
      storageLocation?: string | null;
      estimatedUnitCost?: number | null;
    }>;
  }>;
  category: Category | null;
  id: number;
  completedBy: OwnUser;
  completedOn: string;
  archived: boolean;
  parentRequest: Request;
  parentPreventiveMaintenance: PreventiveMaintenance;
  signature: string;
  feedback: string;
  requiredSignature: boolean;
  status: string;
  actualLaborSeconds?: number | null;
  actualStartAt?: string | null;
  actualLaborCost?: number | null;
  actualPartCost?: number | null;
  actualAdditionalCost?: number | null;
  actualTotalCost?: number | null;
  audioDescription: File;
  customId: string;
  //parentPreventiveMaintenance:
}

export interface WorkOrderMini {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  dueDate?: string | null;
  customId?: string | null;
}
