import { useCallback, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from '../../../store';
import { AssetDTO } from '../../../models/asset';
import { getAssetWorkOrders } from '../../../slices/asset';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import RelatedWorkOrderList from '../../../components/RelatedWorkOrderList';
import { useTranslation } from 'react-i18next';
import useRelatedWorkOrdersLoad from '../../../hooks/useRelatedWorkOrdersLoad';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/role';
import { Text } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { useAppTheme, qpmLayoutTokens } from '../../../custom-theme';
import { getVisibleAssetWorkOrders } from '../../../utils/assetWorkOrderAccess';

export default function AssetWorkOrders({
  asset,
  navigation
}: {
  asset: AssetDTO;
  navigation: any;
}) {
  const dispatch = useDispatch();
  const { hasViewPermission } = useAuth();
  const canViewWorkOrders = hasViewPermission(PermissionEntity.WORK_ORDERS);
  const { assetInfos } = useSelector((state) => state.assets);
  const workOrders = getVisibleAssetWorkOrders(
    canViewWorkOrders,
    assetInfos[asset?.id]?.workOrders
  );
  const {
    loading: relatedLoading,
    error: relatedError,
    run
  } = useRelatedWorkOrdersLoad(asset.id);
  const loading = canViewWorkOrders && relatedLoading;
  const error = canViewWorkOrders && relatedError;
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const { t } = useTranslation();
  const theme = useAppTheme();
  const refresh = useCallback(
    () =>
      canViewWorkOrders
        ? dispatch(getAssetWorkOrders(asset.id))
        : Promise.resolve(),
    [asset.id, canViewWorkOrders, dispatch]
  );

  useEffect(() => {
    if (canViewWorkOrders) void run(asset.id, refresh);
  }, [asset.id, canViewWorkOrders, refresh, run]);

  if (!canViewWorkOrders) {
    return (
      <View
        style={[
          styles.accessMessage,
          { backgroundColor: theme.colors.background }
        ]}
      >
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          {t('no_access_wo')}
        </Text>
      </View>
    );
  }

  return (
    <RelatedWorkOrderList
      items={workOrders}
      loading={loading}
      error={error}
      emptyMessage={t('no_wo_linked_asset')}
      onRefresh={() =>
        canViewWorkOrders ? run(asset.id, refresh) : Promise.resolve()
      }
      navigation={navigation}
      getFormattedDate={getFormattedDate}
    />
  );
}

const styles = StyleSheet.create({
  accessMessage: {
    flex: 1,
    padding: qpmLayoutTokens.space.lg
  }
});
