import AnalyticsLayout from '../AnalyticsLayout';
import WOModal, { Filter } from './WOModal';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Status from './Status';
import Analysis from './Analysis';
import Aging from './Aging';
import TimeAndCost from './TimeAndCost';
import useAuth from '../../../../hooks/useAuth';
import { PermissionEntity } from '../../../../models/owns/role';

type DrilldownScope = { start: Date; end: Date; companyId?: number };

export default function Index() {
  const { t }: { t: any } = useTranslation();
  const { hasViewPermission } = useAuth();
  const canViewWorkOrders = hasViewPermission(PermissionEntity.WORK_ORDERS);
  const [woModalTitle, setWoModalTitle] = useState<string>(t('work_orders'));
  const [openWOModal, setOpenWOModal] = useState<boolean>(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [drilldownScope, setDrilldownScope] = useState<DrilldownScope | null>(
    null
  );
  const handleOpenWOModal = (
    columns: string[],
    filters: Filter[],
    title: string,
    scope?: DrilldownScope
  ) => {
    if (
      !canViewWorkOrders ||
      !scope ||
      filters.length !== 1 ||
      filters[0].key !== 'status' ||
      !['OPEN', 'IN_PROGRESS', 'ON_HOLD'].includes(String(filters[0].value))
    ) {
      return;
    }
    setColumns(columns);
    setFilters(filters);
    setDrilldownScope(scope);
    setWoModalTitle(title);
    setOpenWOModal(true);
  };
  const renderComponent = () => {
    const arr = location.pathname.split('/');
    switch (arr[arr.length - 1]) {
      case 'status':
        return <Status handleOpenWOModal={handleOpenWOModal} />;
      case 'analysis':
        return <Analysis handleOpenWOModal={handleOpenWOModal} />;
      case 'aging':
        return <Aging handleOpenWOModal={handleOpenWOModal} />;
      case 'time-cost':
        return <TimeAndCost handleOpenWOModal={handleOpenWOModal} />;
      default:
        return null;
    }
  };
  return (
    <AnalyticsLayout>
      {renderComponent()}
      <WOModal
        title={woModalTitle}
        open={openWOModal && canViewWorkOrders}
        onClose={() => setOpenWOModal(false)}
        columns={columns}
        filters={filters}
        start={drilldownScope?.start}
        end={drilldownScope?.end}
        companyId={drilldownScope?.companyId}
      />
    </AnalyticsLayout>
  );
}
