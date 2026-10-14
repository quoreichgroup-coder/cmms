import { useCallback } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { qpmLayoutTokens, useAppTheme } from '../custom-theme';
import { Priority } from '../models/workOrder';
import {
  ExtendedWorkOrderStatus,
  getPriorityColor,
  getStatusColor,
  getStatusForegroundColor
} from '../utils/overall';
import Tag from './Tag';
import AsyncStateFeedback from './AsyncStateFeedback';

type RelatedWorkOrder = {
  id: number;
  title: string;
  status: ExtendedWorkOrderStatus;
  priority?: Priority;
  customId?: string | null;
  dueDate?: string | null;
};

type Props = {
  items: RelatedWorkOrder[];
  loading: boolean;
  error: boolean;
  emptyMessage: string;
  onRefresh: () => void;
  navigation: any;
  getFormattedDate: (date: string) => string;
};

export default function RelatedWorkOrderList({
  items,
  loading,
  error,
  emptyMessage,
  onRefresh,
  navigation,
  getFormattedDate
}: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  const openWorkOrder = useCallback(
    (id: number) => navigation.push('WODetails', { id }),
    [navigation]
  );

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={items.length ? styles.list : styles.emptyList}
      data={items}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
        />
      }
      ListHeaderComponent={
        error && items.length > 0 ? (
          <AsyncStateFeedback
            mode="banner"
            message={t('work_orders_load_error')}
            onRetry={onRefresh}
          />
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => openWorkOrder(item.id)}
          accessibilityRole="button"
          accessibilityLabel={[
            item.customId,
            item.title,
            t(item.status),
            item.priority && item.priority !== 'NONE'
              ? t('priority_label', { priority: t(item.priority) })
              : undefined,
            item.dueDate
              ? `${t('due_date')}: ${getFormattedDate(item.dueDate)}`
              : undefined
          ]
            .filter(Boolean)
            .join(', ')}
          accessibilityHint={t('related_work_order_open_hint')}
          style={({ pressed }) => [
            styles.card,
            {
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
              opacity: pressed ? 0.76 : 1
            }
          ]}
        >
          <View style={styles.heading}>
            <View style={styles.identity}>
              {!!item.customId && (
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {item.customId}
                </Text>
              )}
              <Text variant="titleSmall" style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            <Tag
              text={t(item.status)}
              color={getStatusForegroundColor(item.status, theme)}
              backgroundColor={getStatusColor(item.status, theme)}
            />
          </View>
          {item.priority && item.priority !== 'NONE' && (
            <Text
              variant="labelMedium"
              style={{
                color: getPriorityColor(item.priority, theme),
                fontWeight: '700'
              }}
            >
              {t('priority_label', { priority: t(item.priority) })}
            </Text>
          )}
          {!!item.dueDate && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t('due_date')}: {getFormattedDate(item.dueDate)}
            </Text>
          )}
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : error ? (
            <AsyncStateFeedback
              mode="error"
              message={t('work_orders_load_error')}
              onRetry={onRefresh}
            />
          ) : (
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center'
              }}
            >
              {emptyMessage}
            </Text>
          )}
        </View>
      }
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
  card: {
    marginBottom: qpmLayoutTokens.space.sm,
    padding: qpmLayoutTokens.space.md,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    gap: qpmLayoutTokens.space.sm
  },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: qpmLayoutTokens.space.sm
  },
  identity: { flex: 1, minWidth: 0, gap: qpmLayoutTokens.space.xs },
  title: { fontWeight: '700' },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: qpmLayoutTokens.space.xl
  }
});
