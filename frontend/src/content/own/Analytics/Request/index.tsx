import AnalyticsLayout from '../AnalyticsLayout';
import { Filter } from './WOModal';
import RequestAnalyticsModal from './RequestAnalyticsModal';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Analysis from './Analysis';

export default function Index() {
  const { t }: { t: any } = useTranslation();
  const [woModalTitle, setWoModalTitle] = useState<string>(t('parts'));
  const [openWOModal, setOpenWOModal] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [modalRange, setModalRange] = useState({
    start: new Date(),
    end: new Date(),
    companyId: undefined as number | undefined
  });
  const handleOpenWOModal = (
    _columns: string[],
    filters: Filter[],
    title: string,
    start?: Date,
    end?: Date,
    companyId?: number
  ) => {
    if (filters.length === 0 || !start || !end) return;
    setFilters(filters);
    setWoModalTitle(title);
    setModalRange({ start, end, companyId });
    setOpenWOModal(true);
  };
  const renderComponent = () => {
    const arr = location.pathname.split('/');
    switch (arr[arr.length - 1]) {
      case 'analysis':
        return <Analysis handleOpenWOModal={handleOpenWOModal} />;
      default:
        return null;
    }
  };
  return (
    <AnalyticsLayout>
      {renderComponent()}
      <RequestAnalyticsModal
        title={woModalTitle}
        open={openWOModal}
        onClose={() => setOpenWOModal(false)}
        filters={filters}
        start={modalRange.start}
        end={modalRange.end}
        companyId={modalRange.companyId}
      />
    </AnalyticsLayout>
  );
}
