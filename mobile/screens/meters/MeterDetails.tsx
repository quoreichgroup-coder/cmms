import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View as RNView
} from 'react-native';
import * as React from 'react';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from '../../store';
import { RootStackScreenProps } from '../../types';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  Icon,
  IconButton,
  Portal,
  Text,
  TextInput
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { View } from '../../components/Themed';
import ListField from '../../components/ListField';
import { UserMiniDTO } from '../../models/user';
import { getUserUrl } from '../../utils/urlPaths';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import { deleteMeter, getMeterDetails } from '../../slices/meter';
import { getWorkOrderMeterTriggers } from '../../slices/workOrderMeterTrigger';
import {
  createReading,
  deleteReading,
  getReadings,
  updateReading
} from '../../slices/reading';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { SheetManager } from 'react-native-actions-sheet';
import { canAddReading } from '../../utils/overall';
import BasicField from '../../components/BasicField';
import useAuth from '../../hooks/useAuth';
import { getCustomFieldValuesForDetails } from '../../models/form';
import { PermissionEntity } from '../../models/role';
import Reading from '../../models/reading';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import { getErrorMessage } from '../../utils/api';
import { createAsyncActionLock } from '../../utils/asyncActionLock';

const isValidReading = (value: string) =>
  value.trim().length > 0 && Number.isFinite(Number(value.replace(',', '.')));

export default function MeterDetails({
  navigation,
  route
}: RootStackScreenProps<'MeterDetails'>) {
  const { id, meterProp, onNewReading } = route.params;
  const { meterInfos } = useSelector((state) => state.meters);
  const { readingsByMeter } = useSelector((state) => state.readings);
  const { metersTriggers } = useSelector(
    (state) => state.workOrderMeterTriggers
  );
  const currentMeterTriggers = metersTriggers[id] ?? [];
  const currentMeterReadings = readingsByMeter[id] ?? [];
  const latestReading = currentMeterReadings.reduce<Reading | null>(
    (latest, reading) =>
      !latest ||
      new Date(reading.createdAt).getTime() >
        new Date(latest.createdAt).getTime()
        ? reading
        : latest,
    null
  );
  const [openModal, setOpenModal] = useState<boolean>(false);
  const meter = meterInfos[id]?.meter ?? meterProp;
  const [meterLoading, setMeterLoading] = useState(!meter);
  const [meterLoadError, setMeterLoadError] = useState(false);
  const [readingsLoading, setReadingsLoading] = useState(true);
  const [readingsLoadError, setReadingsLoadError] = useState(false);
  const [triggersLoading, setTriggersLoading] = useState(true);
  const [triggersLoadError, setTriggersLoadError] = useState(false);
  const theme = useAppTheme();
  const [readingValue, setReadingValue] = useState<string>('');
  const [addedReading, setAddedReading] = useState<boolean>(false);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const addReadingLockRef = React.useRef<ReturnType<
    typeof createAsyncActionLock
  > | null>(null);
  const addReadingLock =
    addReadingLockRef.current ??
    (addReadingLockRef.current = createAsyncActionLock());
  const { t } = useTranslation();
  const { user, hasEditPermission, hasDeletePermission } = useAuth();
  const canOpenMeterActions = Boolean(
    meter &&
      (hasEditPermission(PermissionEntity.METERS, meter) ||
        hasDeletePermission(PermissionEntity.METERS, meter))
  );
  const dispatch = useDispatch();
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = React.useRef(false);
  const [editingReading, setEditingReading] = useState<Reading | null>(null);
  const [editReadingValue, setEditReadingValue] = useState<string>('0');
  const [isUpdatingReading, setIsUpdatingReading] = useState(false);
  const [deletingReadingIds, setDeletingReadingIds] = useState<number[]>([]);
  const deletingReadingIdsRef = React.useRef(new Set<number>());
  const fieldsToRender = [
    {
      label: t('location_name'),
      value: meter?.location?.name
    },
    {
      label: t('asset_name'),
      value: meter?.asset?.name
    },
    {
      label: t('reading_frequency'),
      value: t('every_frequency_days', { frequency: meter?.updateFrequency })
    },
    {
      label: t('category'),
      value: meter?.meterCategory?.name
    },
    ...getCustomFieldValuesForDetails(
      meter?.customFieldValues,
      getFormattedDate
    )
  ];
  const onDeleteSuccess = () => {
    showSnackBar(t('meter_delete_success'), 'success');
    navigation.goBack();
  };
  const onDeleteFailure = (err) =>
    showSnackBar(t('meter_delete_failure'), 'error');

  const handleDelete = async () => {
    if (deletingRef.current || !meter) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await dispatch(deleteMeter(meter.id));
      setOpenDelete(false);
      onDeleteSuccess();
    } catch (err) {
      onDeleteFailure(err);
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };
  const renderConfirmDelete = () => {
    return (
      <Portal>
        <Dialog
          visible={openDelete}
          onDismiss={() => {
            if (!deleting) setOpenDelete(false);
          }}
        >
          <Dialog.Title>{t('confirmation')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('confirm_delete_meter')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={deleting} onPress={() => setOpenDelete(false)}>
              {t('cancel')}
            </Button>
            <Button
              loading={deleting}
              disabled={deleting}
              accessibilityState={{ disabled: deleting, busy: deleting }}
              onPress={handleDelete}
            >
              {t('to_delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  const handleDeleteReading = (reading: Reading) => {
    if (deletingReadingIdsRef.current.has(reading.id)) return;
    Alert.alert(t('confirmation'), t('are_you_sure_delete_reading'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('to_delete'),
        style: 'destructive',
        onPress: async () => {
          if (deletingReadingIdsRef.current.has(reading.id)) return;
          deletingReadingIdsRef.current.add(reading.id);
          setDeletingReadingIds([...deletingReadingIdsRef.current]);
          try {
            await dispatch(deleteReading(meter.id, reading.id));
            showSnackBar(t('operation_success'), 'success');
          } catch (err) {
            showSnackBar(
              getErrorMessage(err) || t('an_error_occured'),
              'error'
            );
          } finally {
            deletingReadingIdsRef.current.delete(reading.id);
            setDeletingReadingIds([...deletingReadingIdsRef.current]);
          }
        }
      }
    ]);
  };

  const handleEditReading = async () => {
    if (
      !editingReading ||
      isUpdatingReading ||
      !isValidReading(editReadingValue)
    )
      return;
    setIsUpdatingReading(true);
    try {
      await dispatch(
        updateReading(meter.id, editingReading.id, {
          value: Number(editReadingValue.replace(',', '.'))
        })
      );
      showSnackBar(t('reading_update_success'), 'success');
      setEditingReading(null);
    } catch (err) {
      showSnackBar(t('reading_update_failure'), 'error');
    } finally {
      setIsUpdatingReading(false);
    }
  };

  const renderEditReading = () => {
    return (
      <Portal>
        <Dialog
          visible={!!editingReading}
          onDismiss={() => !isUpdatingReading && setEditingReading(null)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>{t('edit_reading')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              style={{ width: '100%' }}
              mode="outlined"
              label={t('reading')}
              value={editReadingValue}
              placeholder={t('meter_reading')}
              keyboardType="decimal-pad"
              onChangeText={(newValue) => setEditReadingValue(newValue)}
              disabled={isUpdatingReading}
              error={!isValidReading(editReadingValue)}
              multiline={false}
            />
            {!isValidReading(editReadingValue) && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                {t('invalid_reading_value')}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={isUpdatingReading}
              onPress={() => setEditingReading(null)}
            >
              {t('cancel')}
            </Button>
            <Button
              onPress={handleEditReading}
              loading={isUpdatingReading}
              disabled={isUpdatingReading || !isValidReading(editReadingValue)}
            >
              {t('save')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  const loadMeter = useCallback(async () => {
    setMeterLoading(true);
    setMeterLoadError(false);
    try {
      await dispatch(getMeterDetails(id));
    } catch (_error) {
      setMeterLoadError(true);
    } finally {
      setMeterLoading(false);
    }
  }, [dispatch, id]);

  const loadReadings = useCallback(async () => {
    setReadingsLoading(true);
    setReadingsLoadError(false);
    try {
      await dispatch(getReadings(id));
    } catch (_error) {
      setReadingsLoadError(true);
    } finally {
      setReadingsLoading(false);
    }
  }, [dispatch, id]);

  const loadTriggers = useCallback(async () => {
    setTriggersLoading(true);
    setTriggersLoadError(false);
    try {
      await dispatch(getWorkOrderMeterTriggers(id));
    } catch (_error) {
      setTriggersLoadError(true);
    } finally {
      setTriggersLoading(false);
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!meterProp) void loadMeter();
    void loadTriggers();
    void loadReadings();
  }, [loadMeter, loadReadings, loadTriggers, meterProp]);

  useEffect(() => {
    navigation.setOptions({
      title: meter?.name ?? t('loading'),
      headerRight: () =>
        canOpenMeterActions && meter ? (
          <IconButton
            icon="dots-vertical"
            accessibilityLabel={t('more_options')}
            onPress={() => {
              SheetManager.show('meter-details-sheet', {
                payload: {
                  onEdit: () => navigation.navigate('EditMeter', { meter }),
                  onDelete: () => setOpenDelete(true),
                  meter
                }
              });
            }}
          />
        ) : null
    });
  }, [canOpenMeterActions, meter, navigation, t]);

  const onAddReading = () => {
    if (!isValidReading(readingValue)) return;
    const parsedValue = Number(readingValue.replace(',', '.'));
    return addReadingLock(async () => {
      setIsSubmitting(true);
      try {
        await dispatch(createReading(meter.id, { value: parsedValue }));
        setAddedReading(true);
        setOpenModal(false);
        showSnackBar(t('reading_create_success'), 'success');
        onNewReading?.(parsedValue);
      } catch {
        showSnackBar(t('reading_create_failure'), 'error');
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const renderAddReading = () => {
    return (
      <Portal>
        <Dialog
          visible={openModal}
          onDismiss={() => setOpenModal(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>{t('add_reading')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              style={{ width: '100%' }}
              mode="outlined"
              label={t('reading')}
              value={readingValue}
              placeholder={t('meter_reading')}
              onChangeText={(newValue) => {
                setReadingValue(newValue);
              }}
              disabled={isSubmitting}
              keyboardType="decimal-pad"
              error={readingValue.length > 0 && !isValidReading(readingValue)}
              multiline={false}
            />
            {readingValue.length > 0 && !isValidReading(readingValue) && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                {t('invalid_reading_value')}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOpenModal(false)}>{t('cancel')}</Button>
            <Button
              onPress={onAddReading}
              loading={isSubmitting}
              disabled={isSubmitting || !isValidReading(readingValue)}
            >
              {t('add')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };
  if (meter)
    return (
      <>
        {renderConfirmDelete()}
        {renderAddReading()}
        {renderEditReading()}
        <FlatList<Reading>
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          contentContainerStyle={styles.content}
          data={[...currentMeterReadings].reverse()}
          keyExtractor={(reading) => String(reading.id)}
          initialNumToRender={10}
          windowSize={7}
          ListHeaderComponent={
            <>
              {meterLoadError && (
                <AsyncStateFeedback
                  mode="banner"
                  message={t('meter_details_load_error')}
                  onRetry={() => void loadMeter()}
                />
              )}
              {meter.image && (
                <Image
                  style={styles.meterImage}
                  source={{ uri: meter.image.url }}
                />
              )}
              <Card
                mode="outlined"
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant
                  }
                ]}
              >
                <Card.Content>
                  <View style={styles.summaryHeading}>
                    <View style={styles.summaryTitle}>
                      <Text variant="titleLarge" style={styles.meterName}>
                        {meter.name}
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {meter.asset?.name || '—'}
                      </Text>
                    </View>
                    <Chip
                      compact
                      icon="gauge"
                      style={{ backgroundColor: theme.colors.primaryContainer }}
                      textStyle={{ color: theme.colors.onPrimaryContainer }}
                    >
                      {meter.unit}
                    </Chip>
                  </View>
                  <View
                    style={[
                      styles.readingSummary,
                      { backgroundColor: theme.colors.surfaceVariant }
                    ]}
                  >
                    <Text
                      variant="labelMedium"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {t('last_reading')}
                    </Text>
                    <Text variant="headlineSmall" style={styles.latestValue}>
                      {latestReading
                        ? `${latestReading.value} ${meter.unit}`
                        : readingsLoading
                        ? t('loading')
                        : readingsLoadError
                        ? '—'
                        : t('meter_no_readings')}
                    </Text>
                    {latestReading && (
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {getFormattedDate(latestReading.createdAt)}
                      </Text>
                    )}
                    {meter.nextReading && (
                      <Text
                        variant="bodySmall"
                        style={{
                          color: canAddReading(meter)
                            ? theme.colors.error
                            : theme.colors.onSurfaceVariant,
                          marginTop: 6
                        }}
                      >
                        {t('next_reading_due')}:{' '}
                        {getFormattedDate(meter.nextReading)}
                      </Text>
                    )}
                  </View>
                </Card.Content>
              </Card>
              <Card
                mode="outlined"
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant
                  }
                ]}
              >
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t('meter_details')}
                  </Text>
                  {fieldsToRender.map((field) => (
                    <BasicField
                      key={field.label}
                      label={field.label}
                      value={field.value}
                      isLink={(field as any).isLink}
                    />
                  ))}
                  <ListField
                    values={meter?.users}
                    label={t('assigned_to')}
                    getHref={(user: UserMiniDTO) => getUserUrl(user.id)}
                    getValueLabel={(user: UserMiniDTO) =>
                      `${user.firstName} ${user.lastName}`
                    }
                  />
                </Card.Content>
              </Card>
              {canAddReading(meter) &&
                !addedReading &&
                user.role.code !== 'VIEW_ONLY' && (
                  <Button
                    onPress={() => {
                      setReadingValue('');
                      setOpenModal(true);
                    }}
                    mode={'contained'}
                    style={styles.addReadingButton}
                  >
                    {t('add_reading')}
                  </Button>
                )}
              {(triggersLoading ||
                triggersLoadError ||
                !!currentMeterTriggers.length) && (
                <Card
                  mode="outlined"
                  style={[
                    styles.sectionCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant
                    }
                  ]}
                >
                  <Card.Content>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      {t('wo_triggers')}
                    </Text>
                    {triggersLoadError && (
                      <AsyncStateFeedback
                        mode="banner"
                        message={t('meter_triggers_load_error')}
                        onRetry={() => void loadTriggers()}
                      />
                    )}
                    {triggersLoading && !currentMeterTriggers.length && (
                      <ActivityIndicator color={theme.colors.primary} />
                    )}
                    {currentMeterTriggers.map((trigger) => (
                      <View
                        style={[
                          styles.triggerRow,
                          { borderTopColor: theme.colors.outlineVariant }
                        ]}
                        key={trigger.id}
                      >
                        <Text variant="bodyMedium" style={styles.triggerName}>
                          {trigger.name}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >{`${
                          trigger.triggerCondition === 'MORE_THAN'
                            ? t('greater_than')
                            : t('lower_than')
                        } ${trigger.value} ${meter.unit}`}</Text>
                      </View>
                    ))}
                  </Card.Content>
                </Card>
              )}
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {t('reading_history')}
              </Text>
              {readingsLoadError && (
                <AsyncStateFeedback
                  mode="banner"
                  message={t('meter_readings_load_error')}
                  onRetry={() => void loadReadings()}
                />
              )}
              {readingsLoading && !currentMeterReadings.length && (
                <RNView
                  style={styles.readingsLoading}
                  accessibilityRole="progressbar"
                  accessibilityLabel={t('please_wait')}
                >
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {t('please_wait')}
                  </Text>
                </RNView>
              )}
            </>
          }
          renderItem={({ item: reading }) => (
            <Card
              mode="outlined"
              style={[
                styles.readingCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant
                }
              ]}
            >
              <Card.Content style={styles.readingRow}>
                <View style={styles.readingInfo}>
                  <Text variant="titleSmall">
                    {reading.value} {meter.unit}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {getFormattedDate(reading.createdAt)}
                  </Text>
                </View>
                <RNView style={{ flexDirection: 'row' }}>
                  {hasEditPermission(PermissionEntity.METERS, meter) && (
                    <IconButton
                      icon="pencil"
                      iconColor={theme.colors.primary}
                      size={20}
                      disabled={deletingReadingIds.includes(reading.id)}
                      accessibilityLabel={`${t('edit_reading')}: ${
                        reading.value
                      }`}
                      onPress={() => {
                        setEditReadingValue(String(reading.value));
                        setEditingReading(reading);
                      }}
                    />
                  )}
                  {hasDeletePermission(PermissionEntity.METERS, meter) &&
                    (deletingReadingIds.includes(reading.id) ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.primary}
                        accessibilityRole="progressbar"
                        accessibilityLabel={t('loading')}
                        style={{ marginHorizontal: 12 }}
                      />
                    ) : (
                      <IconButton
                        icon="delete"
                        iconColor={theme.colors.error}
                        size={20}
                        accessibilityLabel={`${t('to_delete')}: ${
                          reading.value
                        }`}
                        onPress={() => handleDeleteReading(reading)}
                      />
                    ))}
                </RNView>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            !readingsLoading && !readingsLoadError ? (
              <RNView
                style={[
                  styles.emptyReadingsCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant
                  }
                ]}
              >
                <Icon
                  source="chart-box-outline"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    textAlign: 'center'
                  }}
                >
                  {t('meter_no_readings')}
                </Text>
              </RNView>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={(meterLoading && !!meter) || readingsLoading}
              onRefresh={() => {
                void loadMeter();
                void loadTriggers();
                void loadReadings();
              }}
            />
          }
        />
      </>
    );
  else if (meterLoading)
    return <AsyncStateFeedback mode="loading" message={t('please_wait')} />;
  else
    return (
      <AsyncStateFeedback
        mode="error"
        message={t('meter_details_load_error')}
        onRetry={() => void loadMeter()}
      />
    );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 112 },
  meterImage: {
    height: 200,
    borderRadius: qpmLayoutTokens.radius.card,
    marginBottom: 12
  },
  summaryCard: {
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    borderWidth: 1,
    marginBottom: 12
  },
  summaryHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  summaryTitle: { flex: 1, gap: 4 },
  meterName: { fontWeight: '700' },
  readingSummary: {
    borderRadius: qpmLayoutTokens.radius.card,
    padding: 14,
    marginTop: 16
  },
  latestValue: { fontWeight: '700', marginTop: 3 },
  sectionCard: {
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    borderWidth: 1,
    marginBottom: 12
  },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  addReadingButton: {
    marginHorizontal: 2,
    marginVertical: 8,
    minHeight: 50,
    justifyContent: 'center',
    borderRadius: qpmLayoutTokens.radius.control
  },
  triggerRow: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  triggerName: { fontWeight: '600', marginBottom: 3 },
  readingCard: {
    borderRadius: qpmLayoutTokens.radius.card,
    borderWidth: 1,
    marginBottom: 8
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  readingInfo: { flex: 1, gap: 4 },
  readingsLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: qpmLayoutTokens.space.sm,
    justifyContent: 'center',
    padding: qpmLayoutTokens.space.lg
  },
  emptyReadingsCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    gap: qpmLayoutTokens.space.sm,
    justifyContent: 'center',
    marginBottom: qpmLayoutTokens.space.md,
    padding: qpmLayoutTokens.space.xl
  }
});
