import { useCallback, useEffect, useContext } from 'react';
import { useDispatch, useSelector } from '../../../store';
import { useTranslation } from 'react-i18next';
import Location from '../../../models/location';
import { getWorkOrdersByLocation } from '../../../slices/workOrder';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import RelatedWorkOrderList from '../../../components/RelatedWorkOrderList';
import useRelatedWorkOrdersLoad from '../../../hooks/useRelatedWorkOrdersLoad';

export default function LocationWorkOrders({
  location,
  navigation
}: {
  location: Location;
  navigation: any;
}) {
  const dispatch = useDispatch();
  const { workOrdersByLocation } = useSelector((state) => state.workOrders);
  const workOrders = workOrdersByLocation[location.id] ?? [];
  const { loading, error, run } = useRelatedWorkOrdersLoad(location.id);
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const { t } = useTranslation();

  const refresh = useCallback(
    () => dispatch(getWorkOrdersByLocation(location.id)),
    [dispatch, location.id]
  );

  useEffect(() => {
    if (location) void run(location.id, refresh);
  }, [location.id, refresh, run]);

  return (
    <RelatedWorkOrderList
      items={workOrders}
      loading={loading}
      error={error}
      emptyMessage={t('no_wo_linked_location')}
      onRefresh={() => run(location.id, refresh)}
      navigation={navigation}
      getFormattedDate={getFormattedDate}
    />
  );
}
