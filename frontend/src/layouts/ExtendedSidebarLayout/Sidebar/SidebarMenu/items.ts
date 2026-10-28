import type { ReactNode } from 'react';

import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import { PermissionEntity } from '../../../../models/owns/role';
import { PlanFeature } from '../../../../models/owns/subscriptionPlan';
import { IS_LOCALHOST } from '../../../../config';
import { UiConfiguration } from '../../../../models/owns/uiConfiguration';

export interface MenuItem {
  link?: string;
  icon?: ReactNode;
  badge?: string;
  badgeTooltip?: string;
  permission?: PermissionEntity;
  permissionFallback?: PermissionEntity;
  createPermission?: PermissionEntity;
  planFeature?: PlanFeature;
  uiConfigKey?: keyof Omit<UiConfiguration, 'id'>;

  items?: MenuItem[];
  name: string;
}

export interface MenuItems {
  items: MenuItem[];
  heading: string;
  hidden?: PermissionEntity;
}

const ownMenuItems: MenuItems[] = [
  {
    heading: '',
    items: [
      {
        name: 'maintenance_dashboard',
        link: '/app/dashboard',
        icon: DashboardOutlinedIcon,
        permission: PermissionEntity.ANALYTICS,
        planFeature: PlanFeature.ANALYTICS
      },
      {
        name: 'work_orders',
        link: '/app/work-orders',
        icon: AssignmentOutlinedIcon
      },
      {
        name: 'preventive_maintenance',
        link: '/app/preventive-maintenances',
        icon: PendingActionsOutlinedIcon,
        permission: PermissionEntity.PREVENTIVE_MAINTENANCES
      },
      {
        name: 'Statistics',
        icon: InsertChartOutlinedIcon,
        permission: PermissionEntity.ANALYTICS,
        planFeature: PlanFeature.ANALYTICS,
        items: [
          {
            name: 'capacity_planned_vs_allocated',
            link: '/app/analytics/capacity',
            icon: InsertChartOutlinedIcon
          },
          {
            name: 'preventive_maintenance_analytics',
            link: '/app/analytics/preventive-maintenance',
            icon: PendingActionsOutlinedIcon
          },
          {
            name: 'work_orders',
            icon: AssignmentOutlinedIcon,
            items: [
              {
                name: 'status_report',
                link: '/app/analytics/work-orders/status'
              },
              {
                name: 'wo_analysis',
                link: '/app/analytics/work-orders/analysis'
              },
              {
                name: 'wo_aging',
                link: '/app/analytics/work-orders/aging'
              },
              {
                name: 'time_and_cost',
                link: '/app/analytics/work-orders/time-cost'
              }
            ]
          },
          {
            name: 'assets',
            icon: Inventory2OutlinedIcon,
            items: [
              {
                name: 'reliability_dashboard',
                link: '/app/analytics/assets/reliability'
              },
              {
                name: 'total_maintenance_cost',
                link: '/app/analytics/assets/cost'
              }
              // {
              //   name: 'useful_life',
              //   link: '/app/analytics/assets/useful-life'
              // }
            ]
          },
          {
            name: 'parts',
            icon: HandymanOutlinedIcon,
            items: [
              {
                name: 'parts_consumption',
                link: '/app/analytics/parts/consumption'
              }
            ]
          },
          {
            name: 'requests',
            icon: MoveToInboxOutlinedIcon,
            items: [
              {
                name: 'requests_analysis',
                link: '/app/analytics/requests/analysis'
              }
            ]
          }
        ]
      },
      {
        name: 'requests',
        link: '/app/requests',
        icon: MoveToInboxOutlinedIcon,
        permission: PermissionEntity.REQUESTS,
        uiConfigKey: 'requests'
      },
      {
        name: 'assets',
        link: '/app/assets',
        icon: Inventory2OutlinedIcon,
        permission: PermissionEntity.ASSETS
      },
      {
        name: 'locations',
        link: '/app/locations',
        icon: LocationOnOutlinedIcon,
        permission: PermissionEntity.LOCATIONS,
        uiConfigKey: 'locations'
      },
      {
        name: 'parts_and_inventory',
        link: '/app/inventory',
        icon: HandymanOutlinedIcon,
        permission: PermissionEntity.PARTS_AND_MULTIPARTS,
        items: [
          {
            name: 'parts',
            link: '/app/inventory/parts'
          },
          {
            name: 'sets_of_parts',
            link: '/app/inventory/sets'
          }
        ]
      },
      {
        name: 'purchase_requisitions',
        link: '/app/purchase-requisitions',
        icon: PlaylistAddCheckOutlinedIcon,
        permission: PermissionEntity.PURCHASE_REQUISITIONS,
        createPermission: PermissionEntity.PURCHASE_REQUISITIONS,
        planFeature: PlanFeature.PURCHASE_ORDER
      },
      {
        name: 'purchase_orders',
        link: '/app/purchase-orders',
        icon: ReceiptOutlinedIcon,
        permission: PermissionEntity.PURCHASE_ORDERS,
        planFeature: PlanFeature.PURCHASE_ORDER
      },
      {
        name: 'meters',
        link: '/app/meters',
        icon: SpeedOutlinedIcon,
        permission: PermissionEntity.METERS,
        planFeature: PlanFeature.METER,
        uiConfigKey: 'meters'
      },
      {
        name: 'people_teams',
        link: '/app/people-teams',
        icon: PeopleOutlineIcon,
        permission: PermissionEntity.PEOPLE_AND_TEAMS,
        items: [
          {
            name: 'people',
            link: '/app/people-teams/people'
          },
          {
            name: 'teams',
            link: '/app/people-teams/teams'
          }
        ]
      },
      {
        name: 'vendors_customers',
        link: '/app/vendors-customers/vendors',
        icon: GroupsOutlinedIcon,
        permission: PermissionEntity.VENDORS_AND_CUSTOMERS,
        uiConfigKey: 'vendorsAndCustomers',
        items: [
          {
            name: 'vendors',
            link: '/app/vendors-customers/vendors'
          },
          {
            name: 'customers',
            link: '/app/vendors-customers/customers'
          }
        ]
      },
      {
        name: 'categories',
        link: '/app/categories',
        icon: CategoryOutlinedIcon,
        permission: PermissionEntity.CATEGORIES
      },
      {
        name: 'files',
        link: '/app/files',
        icon: AttachFileOutlinedIcon,
        permission: PermissionEntity.FILES,
        planFeature: PlanFeature.FILE
      },
      {
        name: 'report_management',
        link: '/app/settings/documents',
        icon: ReceiptOutlinedIcon,
        permission: PermissionEntity.DOCUMENT_TEMPLATES,
        permissionFallback: PermissionEntity.SETTINGS
      },
      {
        name: 'settings',
        link: '/app/settings',
        icon: SettingsOutlinedIcon,
        permission: PermissionEntity.SETTINGS
      }
    ]
  }
];

export default ownMenuItems;
