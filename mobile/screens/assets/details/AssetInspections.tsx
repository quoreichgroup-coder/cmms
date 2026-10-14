import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme, qpmLayoutTokens } from '../../../custom-theme';
import { useDispatch, useSelector } from '../../../store';
import { AssetDTO } from '../../../models/asset';
import WorkOrder from '../../../models/workOrder';
import { Task } from '../../../models/tasks';
import { getAssetWorkOrders } from '../../../slices/asset';
import useRelatedWorkOrdersLoad from '../../../hooks/useRelatedWorkOrdersLoad';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/role';
import api from '../../../utils/api';
import AsyncStateFeedback from '../../../components/AsyncStateFeedback';
import Tag from '../../../components/Tag';
import {
  getStatusColor,
  getStatusForegroundColor
} from '../../../utils/overall';
import { getVisibleAssetWorkOrders } from '../../../utils/assetWorkOrderAccess';

type Props = {
  asset: AssetDTO;
  navigation: any;
};

function InspectionWorkOrderCard({
  workOrder,
  navigation
}: {
  workOrder: WorkOrder;
  navigation: any;
}) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!expanded || loaded) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setForbidden(false);
    api
      .get<Task[]>(`tasks/work-order/${workOrder.id}`, {
        signal: controller.signal
      })
      .then((result) => {
        if (!controller.signal.aborted) {
          setTasks(
            result.filter((task) => task.taskBase?.taskType === 'INSPECTION')
          );
          setLoaded(true);
        }
      })
      .catch((requestError: any) => {
        if (!controller.signal.aborted) {
          if (requestError?.status === 403) setForbidden(true);
          else setError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [expanded, loaded, retryKey, workOrder.id]);

  const resultColor = (value?: string | number) => {
    switch (String(value ?? '').toUpperCase()) {
      case 'PASS':
        return {
          background: theme.colors.success,
          foreground: theme.colors.onSuccess
        };
      case 'FAIL':
        return {
          background: theme.colors.error,
          foreground: theme.colors.onError
        };
      case 'FLAG':
      default:
        return {
          background: theme.colors.warning,
          foreground: theme.colors.onWarning
        };
    }
  };

  return (
    <Card
      mode="outlined"
      style={[
        styles.workOrderCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant
        }
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${workOrder.customId ?? ''}, ${
          workOrder.title
        }, ${t(workOrder.status)}`}
        accessibilityHint={t('related_work_order_open_hint')}
        onPress={() => navigation.push('WODetails', { id: workOrder.id })}
      >
        <Card.Content style={styles.workOrderHeading}>
          <View style={styles.workOrderText}>
            {!!workOrder.customId && (
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {workOrder.customId}
              </Text>
            )}
            <Text variant="titleSmall" style={styles.bold}>
              {workOrder.title}
            </Text>
          </View>
          <Tag
            text={t(workOrder.status)}
            color={getStatusForegroundColor(workOrder.status, theme)}
            backgroundColor={getStatusColor(workOrder.status, theme)}
          />
        </Card.Content>
      </Pressable>
      <Card.Actions>
        <Button
          compact
          icon={expanded ? 'chevron-up' : 'clipboard-list-outline'}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
        >
          {t(expanded ? 'hide_inspection_results' : 'show_inspection_results')}
        </Button>
      </Card.Actions>
      {expanded && (
        <Card.Content style={styles.inspectionList}>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : error ? (
            <AsyncStateFeedback
              mode="banner"
              message={t('inspection_results_load_error')}
              onRetry={() => {
                setLoaded(false);
                setRetryKey((value) => value + 1);
              }}
            />
          ) : forbidden ? (
            <AsyncStateFeedback
              mode="permissionDenied"
              message={t('no_access_wo')}
            />
          ) : tasks.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {t('no_inspection_tasks_for_work_order')}
            </Text>
          ) : (
            tasks.map((task) => {
              const result = resultColor(task.value);
              const hasResult =
                task.value !== undefined &&
                task.value !== null &&
                String(task.value).length > 0;
              const resultLabel = t(
                hasResult
                  ? String(task.value)
                  : 'inspection_result_not_recorded'
              );
              const accessibilityLabel = [
                task.taskBase.label,
                task.notes ? `${t('notes')}: ${task.notes}` : null,
                resultLabel
              ]
                .filter(Boolean)
                .join('. ');
              return (
                <View
                  key={task.id}
                  style={[
                    styles.inspectionRow,
                    { borderTopColor: theme.colors.outlineVariant }
                  ]}
                  accessible
                  accessibilityLabel={accessibilityLabel}
                >
                  <View style={styles.inspectionLabel}>
                    <Text variant="bodyMedium" style={styles.bold}>
                      {task.taskBase.label}
                    </Text>
                    {task.notes ? (
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {task.notes}
                      </Text>
                    ) : null}
                  </View>
                  {hasResult ? (
                    <Chip
                      compact
                      style={{ backgroundColor: result.background }}
                      textStyle={{
                        color: result.foreground,
                        fontWeight: '700'
                      }}
                    >
                      {resultLabel}
                    </Chip>
                  ) : (
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      {resultLabel}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </Card.Content>
      )}
    </Card>
  );
}

export default function AssetInspections({ asset, navigation }: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const dispatch = useDispatch();
  const { hasViewPermission } = useAuth();
  const canViewWorkOrders = hasViewPermission(PermissionEntity.WORK_ORDERS);
  const { assetInfos } = useSelector((state) => state.assets);
  const workOrders = getVisibleAssetWorkOrders(
    canViewWorkOrders,
    assetInfos[asset.id]?.workOrders
  );
  const {
    loading: relatedLoading,
    error: relatedError,
    run
  } = useRelatedWorkOrdersLoad(asset.id);
  const loading = canViewWorkOrders && relatedLoading;
  const error = canViewWorkOrders && relatedError;
  const refresh = useCallback(
    () =>
      canViewWorkOrders
        ? dispatch(getAssetWorkOrders(asset.id))
        : Promise.resolve(),
    [asset.id, canViewWorkOrders, dispatch]
  );

  useEffect(() => {
    if (!canViewWorkOrders) return;
    void run(asset.id, refresh);
  }, [asset.id, canViewWorkOrders, refresh, run]);

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={workOrders.length ? styles.list : styles.emptyList}
      data={workOrders}
      keyExtractor={(workOrder) => String(workOrder.id)}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => {
            if (canViewWorkOrders) void run(asset.id, refresh);
          }}
          colors={[theme.colors.primary]}
        />
      }
      ListHeaderComponent={
        <Text
          variant="bodySmall"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          {t('asset_inspections_description')}
        </Text>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : error ? (
            <AsyncStateFeedback
              mode="error"
              message={t('work_orders_load_error')}
              onRetry={() => {
                if (canViewWorkOrders) void run(asset.id, refresh);
              }}
            />
          ) : !canViewWorkOrders ? (
            <AsyncStateFeedback
              mode="permissionDenied"
              message={t('no_access_wo')}
            />
          ) : (
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center'
              }}
            >
              {t('no_wo_linked_asset')}
            </Text>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <InspectionWorkOrderCard workOrder={item} navigation={navigation} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: qpmLayoutTokens.space.lg,
    paddingTop: qpmLayoutTokens.space.sm,
    paddingBottom: qpmLayoutTokens.space.xl
  },
  emptyList: {
    flexGrow: 1,
    paddingHorizontal: qpmLayoutTokens.space.lg,
    paddingVertical: qpmLayoutTokens.space.lg
  },
  description: {
    marginBottom: qpmLayoutTokens.space.md
  },
  workOrderCard: {
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    marginBottom: qpmLayoutTokens.space.sm
  },
  workOrderHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: qpmLayoutTokens.space.sm
  },
  workOrderText: { flex: 1, gap: qpmLayoutTokens.space.xs },
  bold: { fontWeight: '700' },
  inspectionList: { gap: qpmLayoutTokens.space.sm },
  inspectionRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: qpmLayoutTokens.space.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: qpmLayoutTokens.space.sm
  },
  inspectionLabel: { flex: 1, gap: qpmLayoutTokens.space.xs },
  emptyState: {
    flex: 1,
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
    padding: qpmLayoutTokens.space.xl
  }
});
