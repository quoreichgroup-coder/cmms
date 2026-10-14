import { useCallback, useEffect, useContext } from 'react';
import { useDispatch, useSelector } from '../../../store';
import { useTranslation } from 'react-i18next';
import Part from '../../../models/part';
import { getWorkOrdersByPart } from '../../../slices/workOrder';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import RelatedWorkOrderList from '../../../components/RelatedWorkOrderList';
import useRelatedWorkOrdersLoad from '../../../hooks/useRelatedWorkOrdersLoad';

export default function PartWorkOrders({
  part,
  navigation
}: {
  part: Part;
  navigation: any;
}) {
  const dispatch = useDispatch();
  const { workOrdersByPart } = useSelector((state) => state.workOrders);
  const workOrders = workOrdersByPart[part.id] ?? [];
  const { loading, error, run } = useRelatedWorkOrdersLoad(part.id);
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const { t } = useTranslation();

  const refresh = useCallback(
    () => dispatch(getWorkOrdersByPart(part.id)),
    [dispatch, part.id]
  );

  useEffect(() => {
    if (part) void run(part.id, refresh);
  }, [part.id, refresh, run]);

  return (
    <RelatedWorkOrderList
      items={workOrders}
      loading={loading}
      error={error}
      emptyMessage={t('no_wo_linked_part')}
      onRefresh={() => run(part.id, refresh)}
      navigation={navigation}
      getFormattedDate={getFormattedDate}
    />
  );
}
