import AnalyticsLayout from '../AnalyticsLayout';
import type { Filter } from './WOModal';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Consumption from './Consumption';
import { getAnalyticsRecordPath } from '../recordNavigation';

export default function Index() {
  const { t }: { t: any } = useTranslation();
  const navigate = useNavigate();
  const handleOpenAnalyticsRecord = (
    _columns: string[],
    filters: Filter[],
    _title: string
  ) => {
    const path = getAnalyticsRecordPath(filters);
    if (path) navigate(path);
  };
  const renderComponent = () => {
    const arr = location.pathname.split('/');
    switch (arr[arr.length - 1]) {
      case 'consumption':
        return <Consumption handleOpenWOModal={handleOpenAnalyticsRecord} />;
      default:
        return null;
    }
  };
  return <AnalyticsLayout>{renderComponent()}</AnalyticsLayout>;
}
