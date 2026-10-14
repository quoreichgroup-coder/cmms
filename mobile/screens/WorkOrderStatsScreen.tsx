import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { View } from '../components/Themed';
import { useDispatch, useSelector } from '../store';
import { useEffect } from 'react';
import { getMobileExtendedStats } from '../slices/analytics/workOrder';
import { RootStackScreenProps } from '../types';
import { useTranslation } from 'react-i18next';
import { Text, useTheme } from 'react-native-paper';
import AsyncStateFeedback from '../components/AsyncStateFeedback';
import { qpmLayoutTokens } from '../theme/tokens';

type StatGroupProps = {
  title: string;
  weekValue: string | number;
  totalValue: string | number;
};

function StatGroup({ title, weekValue, totalValue }: StatGroupProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant
        }
      ]}
    >
      <Text
        variant="titleMedium"
        style={[styles.groupTitle, { color: theme.colors.onSurface }]}
      >
        {title}
      </Text>
      <View style={styles.metrics}>
        <View
          style={[
            styles.metric,
            { backgroundColor: theme.colors.secondaryContainer }
          ]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${t('this_week')}: ${weekValue}`}
        >
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSecondaryContainer }}
          >
            {t('this_week')}
          </Text>
          <Text
            variant="headlineMedium"
            style={[styles.value, { color: theme.colors.onSecondaryContainer }]}
          >
            {weekValue}
          </Text>
        </View>
        <View
          style={[
            styles.metric,
            { backgroundColor: theme.colors.surfaceVariant }
          ]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${t('all_time')}: ${totalValue}`}
        >
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {t('all_time')}
          </Text>
          <Text
            variant="headlineMedium"
            style={[styles.value, { color: theme.colors.onSurface }]}
          >
            {totalValue}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function WorkOrderStatsScreen({}: RootStackScreenProps<'WorkOrderStats'>) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const theme = useTheme();
  const { mobileExtended, mobileExtendedLoaded, loading, errors } = useSelector(
    (state) => state.woAnalytics
  );

  useEffect(() => {
    dispatch(getMobileExtendedStats());
  }, [dispatch]);

  if (!mobileExtendedLoaded && errors.mobileExtended) {
    return (
      <AsyncStateFeedback
        mode="error"
        message={errors.mobileExtended}
        onRetry={() => dispatch(getMobileExtendedStats())}
      />
    );
  }

  if (!mobileExtendedLoaded) {
    return <AsyncStateFeedback mode="loading" message={t('please_wait')} />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => dispatch(getMobileExtendedStats())}
          refreshing={loading.mobileExtended}
          colors={[theme.colors.primary]}
        />
      }
    >
      {errors.mobileExtended && (
        <AsyncStateFeedback
          mode="banner"
          message={errors.mobileExtended}
          onRetry={() => dispatch(getMobileExtendedStats())}
        />
      )}
      <StatGroup
        title={t('complete_work_orders')}
        weekValue={mobileExtended.completeWeek}
        totalValue={mobileExtended.complete}
      />
      <StatGroup
        title={t('compliant_work_orders')}
        weekValue={`${(mobileExtended.compliantRateWeek * 100).toFixed(2)}%`}
        totalValue={`${(mobileExtended.compliantRate * 100).toFixed(2)}%`}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  group: {
    padding: 16,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    gap: 14
  },
  groupTitle: { fontWeight: '700' },
  metrics: { flexDirection: 'row', gap: 10 },
  metric: {
    flex: 1,
    minWidth: 0,
    borderRadius: qpmLayoutTokens.radius.card,
    padding: 12,
    gap: 6
  },
  value: { fontWeight: '700' }
});
