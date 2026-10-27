import { useCallback, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Button,
  Card,
  List,
  Text,
  useTheme
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { RootStackScreenProps } from '../types';
import { getMyShiftConfiguration } from '../utils/userApi';
import { getErrorMessage } from '../utils/api';
import { ShiftConfiguration } from '../models/shiftConfiguration';
import {
  formatAvailabilityDuration,
  getEffectiveShiftDay,
  isValidIsoCalendarDate,
  shiftDayOrder
} from '../utils/shiftAvailability';
import { logSafeError } from '../utils/safeErrorLog';
import { qpmLayoutTokens } from '../theme/tokens';
import { beginRequest, isCurrentRequest } from '../utils/requestSequence';
import useAuth from '../hooks/useAuth';
import { PlanFeature } from '../models/subscriptionPlan';
import { useLicenseEntitlement } from '../hooks/useLicenseEntitlement';

const dayTranslationKeys: Record<string, string> = {
  MONDAY: 'shift_day_monday',
  TUESDAY: 'shift_day_tuesday',
  WEDNESDAY: 'shift_day_wednesday',
  THURSDAY: 'shift_day_thursday',
  FRIDAY: 'shift_day_friday',
  SATURDAY: 'shift_day_saturday',
  SUNDAY: 'shift_day_sunday'
};

export default function MyShiftAvailabilityScreen(
  _props: RootStackScreenProps<'MyShiftAvailability'>
) {
  const theme = useTheme();
  const { hasFeature } = useAuth();
  const hasResourcePlanningLicense = useLicenseEntitlement('RESOURCE_PLANNING');
  const canUseResourcePlanning =
    hasFeature(PlanFeature.RESOURCE_PLANNING) && hasResourcePlanningLicense;
  const compactLayout = useWindowDimensions().width < 380;
  const { t, i18n } = useTranslation();
  const [configuration, setConfiguration] = useState<ShiftConfiguration | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRequestSequence = useRef(0);

  const load = useCallback(async () => {
    const requestId = beginRequest(loadRequestSequence);
    setLoading(true);
    setError(null);
    try {
      const nextConfiguration = await getMyShiftConfiguration();
      if (!isCurrentRequest(requestId, loadRequestSequence)) return;
      setConfiguration(nextConfiguration);
    } catch (loadError) {
      if (!isCurrentRequest(requestId, loadRequestSequence)) return;
      logSafeError('Could not load personal shift availability:', loadError);
      setError(getErrorMessage(loadError, t('shift_availability_load_error')));
    } finally {
      if (isCurrentRequest(requestId, loadRequestSequence)) {
        setLoading(false);
      }
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      if (canUseResourcePlanning) void load();
      return () => {
        // Ignore a response from a screen that has lost focus; the next focus
        // or pull-to-refresh starts a newer request and owns the visible state.
        beginRequest(loadRequestSequence);
      };
    }, [canUseResourcePlanning, load])
  );

  const renderState = () => {
    if (loading && !configuration) {
      return (
        <View style={styles.state}>
          <ActivityIndicator />
          <Text>{t('loading')}</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.state}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.error, textAlign: 'center' }}
          >
            {error}
          </Text>
          <Button mode="outlined" icon="refresh" onPress={() => void load()}>
            {t('retry')}
          </Button>
        </View>
      );
    }
    if (!configuration) {
      return (
        <View style={styles.state}>
          <List.Icon
            icon="calendar-question"
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="titleMedium" style={styles.centerText}>
            {t('shift_availability_not_configured')}
          </Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.centerText,
              { color: theme.colors.onSurfaceVariant }
            ]}
          >
            {t('shift_availability_not_configured_help')}
          </Text>
        </View>
      );
    }

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const upcomingExceptions = [...(configuration.exceptions ?? [])]
      .filter((exception) => isValidIsoCalendarDate(exception.exceptionDate))
      .filter((exception) => exception.exceptionDate >= todayIso)
      .sort((a, b) => a.exceptionDate.localeCompare(b.exceptionDate))
      .slice(0, 6);
    const weeklyCapacityMinutes = configuration.enabled
      ? shiftDayOrder.reduce((total, day) => {
          const entry = getEffectiveShiftDay(configuration, day);
          return total + (entry.enabled ? entry.availabilityMinutes : 0);
        }, 0)
      : 0;
    const weeklyCapacityHours = Math.floor(weeklyCapacityMinutes / 60);
    const weeklyCapacityRemainder = weeklyCapacityMinutes % 60;

    return (
      <>
        <Card
          mode="contained"
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
        >
          <Card.Content>
            <View style={styles.sectionHeading}>
              <List.Icon
                icon={
                  configuration.enabled ? 'calendar-check' : 'calendar-remove'
                }
                color={
                  configuration.enabled
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant
                }
              />
              <View style={styles.headingCopy}>
                <Text variant="titleMedium">
                  {t('shift_weekly_availability')}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {configuration.enabled
                    ? t('shift_availability_enabled')
                    : t('shift_availability_disabled')}
                </Text>
              </View>
            </View>
            <Text
              variant="bodyMedium"
              style={[
                styles.weeklyCapacity,
                { color: theme.colors.onSurfaceVariant }
              ]}
            >
              {t('shift_weekly_default_capacity', {
                hours: weeklyCapacityHours,
                minutes: weeklyCapacityRemainder
              })}
            </Text>
            {configuration.enabled &&
              !shiftDayOrder.some((day) => {
                const entry = getEffectiveShiftDay(configuration, day);
                return entry.enabled && entry.availabilityMinutes > 0;
              }) && (
                <Text
                  variant="bodySmall"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginBottom: 8
                  }}
                >
                  {t('shift_availability_not_configured_help')}
                </Text>
              )}
            {shiftDayOrder.map((day) => {
              const entry = getEffectiveShiftDay(configuration, day);
              const active =
                configuration.enabled &&
                entry.enabled &&
                entry.availabilityMinutes > 0;
              return (
                <View
                  key={day}
                  style={[
                    styles.dayRow,
                    compactLayout && styles.compactDayRow,
                    { borderBottomColor: theme.colors.outlineVariant }
                  ]}
                >
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.dayName,
                      compactLayout && styles.compactDayName
                    ]}
                  >
                    {t(dayTranslationKeys[day])}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      {
                        color: active
                          ? theme.colors.onSurface
                          : theme.colors.onSurfaceVariant
                      },
                      compactLayout && styles.compactAvailability
                    ]}
                  >
                    {active
                      ? t('shift_available_from_time', {
                          duration: formatAvailabilityDuration(
                            entry.availabilityMinutes
                          ),
                          time: entry.startTime ?? '08:00'
                        })
                      : t('shift_day_off')}
                  </Text>
                </View>
              );
            })}
          </Card.Content>
        </Card>

        {upcomingExceptions.length > 0 && (
          <Card
            mode="contained"
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant
              }
            ]}
          >
            <Card.Content>
              <Text variant="titleMedium" style={styles.exceptionsTitle}>
                {t('shift_date_exceptions')}
              </Text>
              {upcomingExceptions.map((exception) => {
                const date = new Date(`${exception.exceptionDate}T12:00:00`);
                const label = Number.isNaN(date.getTime())
                  ? exception.exceptionDate
                  : new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: 'medium'
                    }).format(date);
                const active =
                  configuration.enabled &&
                  exception.enabled &&
                  exception.availabilityMinutes > 0;
                const dayOfWeek =
                  shiftDayOrder[(date.getDay() + 6) % shiftDayOrder.length];
                const defaultStartTime =
                  getEffectiveShiftDay(configuration, dayOfWeek).startTime ??
                  '08:00';
                return (
                  <View
                    key={exception.exceptionDate}
                    style={[
                      styles.dayRow,
                      compactLayout && styles.compactDayRow,
                      { borderBottomColor: theme.colors.outlineVariant }
                    ]}
                  >
                    <Text
                      variant="bodyLarge"
                      style={[
                        styles.dayName,
                        compactLayout && styles.compactDayName
                      ]}
                    >
                      {label}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[
                        { color: theme.colors.onSurfaceVariant },
                        compactLayout && styles.compactAvailability
                      ]}
                    >
                      {active
                        ? t('shift_available_from_time', {
                            duration: formatAvailabilityDuration(
                              exception.availabilityMinutes
                            ),
                            time: exception.startTime ?? defaultStartTime
                          })
                        : t('shift_day_off')}
                    </Text>
                  </View>
                );
              })}
            </Card.Content>
          </Card>
        )}

        <Text
          variant="bodySmall"
          style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}
        >
          {t('shift_availability_disclaimer')}
        </Text>
      </>
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading && Boolean(configuration)}
          onRefresh={() => void load()}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.intro}>
        <Text variant="headlineSmall">{t('my_shift_availability')}</Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {t('my_shift_availability_description')}
        </Text>
      </View>
      {canUseResourcePlanning ? (
        renderState()
      ) : (
        <View style={styles.state}>
          <List.Icon
            icon="lock-outline"
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="bodyMedium" style={styles.centerText}>
            {t('resource_planning_unavailable')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 112, gap: 14 },
  intro: { gap: 5, marginBottom: 2 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
    marginBottom: 6
  },
  headingCopy: { flex: 1, gap: 2 },
  dayRow: {
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  compactDayRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 10
  },
  dayName: { flex: 1 },
  compactDayName: { flex: 0 },
  compactAvailability: { textAlign: 'left' },
  exceptionsTitle: { marginBottom: 4 },
  weeklyCapacity: { marginBottom: 12, marginLeft: 48 },
  state: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24
  },
  centerText: { textAlign: 'center' },
  disclaimer: { lineHeight: 19, paddingHorizontal: 2 }
});
