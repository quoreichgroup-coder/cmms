import { StyleSheet } from 'react-native';
import * as Yup from 'yup';
import { Text, useTheme } from 'react-native-paper';
import { View } from '../../components/Themed';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import { useContext, useEffect, useState } from 'react';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { IField } from '../../models/form';
import Form from '../../components/form';
import { getErrorMessage } from '../../utils/api';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { qpmLayoutTokens } from '../../custom-theme';
import { Button, Dialog, Divider, Portal } from 'react-native-paper';
import { ScrollView } from 'react-native';
import api from '../../utils/api';

export default function CompleteWorkOrderModal({
  navigation,
  route
}: RootStackScreenProps<'CompleteWorkOrder'>) {
  const { onComplete, fieldsConfig, workOrderContext } = route.params;
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [reviewValues, setReviewValues] = useState<{
    signature?: string;
    feedback?: string;
  } | null>(null);
  const [formValues, setFormValues] = useState<{
    signature?: string;
    feedback?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const [executionTime, setExecutionTime] = useState<{
    measured: boolean;
    running: boolean;
    elapsedSeconds: number | null;
  } | null>(null);
  const [loadingExecutionTime, setLoadingExecutionTime] = useState(true);
  const markFormClean = useUnsavedChanges(navigation, isFormDirty);
  const { uploadFiles } = useContext(CompanySettingsContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const formatDuration = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  };
  useEffect(() => {
    if (!reviewValues) {
      setExecutionTime(null);
      return;
    }
    let active = true;
    setLoadingExecutionTime(true);
    api
      .get<{
        measured: boolean;
        running: boolean;
        elapsedSeconds: number | null;
      }>(`work-orders/${workOrderContext.id}/execution-time`)
      .then((result) => active && setExecutionTime(result))
      .catch(
        () =>
          active &&
          setExecutionTime({
            measured: false,
            running: false,
            elapsedSeconds: null
          })
      )
      .finally(() => active && setLoadingExecutionTime(false));
    return () => {
      active = false;
    };
  }, [reviewValues, workOrderContext.id]);

  const getFieldsAndShape = (): [Array<IField>, { [key: string]: any }] => {
    let fields: IField[] = [];
    let shape = {};
    if (fieldsConfig.feedback) {
      fields.push({
        name: 'feedback',
        type: 'text',
        label: t('feedback'),
        placeholder: t('feedback_description'),
        multiple: true
      });
      shape = { feedback: Yup.string().required(t('required_feedback')) };
    }
    if (fieldsConfig.signature) {
      fields.push({
        name: 'signature',
        type: 'signature',
        label: t('signature')
      });
      shape = {
        ...shape,
        signature: Yup.string().required(t('required_signature'))
      };
    }
    return [fields, shape];
  };
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.workOrderContext,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant
          }
        ]}
      >
        <Text
          variant="labelLarge"
          style={{ color: theme.colors.primary }}
          accessibilityLabel={`${t('work_order')} ${
            workOrderContext.identifier
          }`}
        >
          {t('work_order')} · {workOrderContext.identifier}
        </Text>
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurface, marginTop: 4 }}
          accessibilityRole="header"
        >
          {workOrderContext.title}
        </Text>
        {workOrderContext.assetName ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
          >
            {t('asset')}: {workOrderContext.assetName}
          </Text>
        ) : null}
      </View>
      <Text
        variant="bodySmall"
        style={{
          color: theme.colors.onSurfaceVariant,
          marginHorizontal: 16,
          marginTop: 8
        }}
      >
        {t('work_order_completion_read_only_notice')}
      </Text>
      <Form
        fields={getFieldsAndShape()[0]}
        validation={Yup.object().shape(getFieldsAndShape()[1])}
        submitText={t('review_completion')}
        values={formValues}
        navigation={navigation}
        onChange={() => setIsFormDirty(true)}
        onSubmit={async (values) => {
          setFormValues(values);
          setReviewValues(values);
        }}
      />
      <Portal>
        <Dialog
          visible={Boolean(reviewValues)}
          onDismiss={() => !saving && setReviewValues(null)}
        >
          <Dialog.Title>{t('work_order_completion_review_title')}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 12
                }}
              >
                {t('work_order_completion_review_description')}
              </Text>
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.primary }}
              >
                {t('work_order')} · {workOrderContext.identifier}
              </Text>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface }}
              >
                {workOrderContext.title}
              </Text>
              {workOrderContext.assetName ? (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  {t('asset')}: {workOrderContext.assetName}
                </Text>
              ) : null}
              <Divider style={{ marginVertical: 14 }} />
              <Text variant="titleSmall">
                {t('work_order_elapsed_execution_time')}
              </Text>
              {loadingExecutionTime ? (
                <Text
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
                >
                  {t('loading')}
                </Text>
              ) : executionTime?.measured &&
                executionTime.elapsedSeconds != null ? (
                <View style={styles.summaryRow}>
                  <Text
                    style={{ color: theme.colors.onSurface, fontWeight: '700' }}
                  >
                    {formatDuration(executionTime.elapsedSeconds)}
                  </Text>
                  {executionTime.running ? (
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      {t('work_order_execution_time_running')}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
                >
                  {t('work_order_execution_time_unavailable')}
                </Text>
              )}
              <Divider style={{ marginVertical: 14 }} />
              <Text variant="titleSmall">
                {t('work_order_completion_tracked_time')}
              </Text>
              {workOrderContext.laborEntries.length ? (
                <>
                  {workOrderContext.laborEntries.map((entry, index) => (
                    <View
                      key={`${entry.label}-${index}`}
                      style={styles.summaryRow}
                    >
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          flex: 1
                        }}
                      >
                        {entry.label}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.onSurface,
                          fontWeight: '700'
                        }}
                      >
                        {formatDuration(entry.seconds)}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.summaryRow}>
                    <Text
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: '700',
                        flex: 1
                      }}
                    >
                      {t('work_order_completion_total_labor')}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: '700'
                      }}
                    >
                      {formatDuration(
                        workOrderContext.laborEntries.reduce(
                          (sum, entry) => sum + entry.seconds,
                          0
                        )
                      )}
                    </Text>
                  </View>
                </>
              ) : (
                <Text
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
                >
                  {t('work_order_completion_no_time')}
                </Text>
              )}
              {fieldsConfig.feedback ? (
                <>
                  <Divider style={{ marginVertical: 14 }} />
                  <Text variant="titleSmall">{t('feedback')}</Text>
                  <Text style={{ color: theme.colors.onSurface, marginTop: 4 }}>
                    {reviewValues?.feedback?.trim() || t('not_provided')}
                  </Text>
                </>
              ) : null}
              {fieldsConfig.signature ? (
                <>
                  <Divider style={{ marginVertical: 14 }} />
                  <View style={styles.summaryRow}>
                    <Text
                      style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}
                    >
                      {t('signature')}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: '700'
                      }}
                    >
                      {reviewValues?.signature
                        ? t('work_order_completion_signature_captured')
                        : t('not_provided')}
                    </Text>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              disabled={saving}
              onPress={() => {
                setFormValues(reviewValues ?? {});
                setReviewValues(null);
              }}
            >
              {t('back_to_edit')}
            </Button>
            <Button
              loading={saving}
              disabled={saving}
              onPress={async () => {
                if (!reviewValues) return;
                setSaving(true);
                markFormClean();
                try {
                  const completed = await onComplete(
                    reviewValues.signature,
                    reviewValues.feedback
                  );
                  if (!completed)
                    throw new Error('Work order completion was not accepted.');
                  setIsFormDirty(false);
                } catch (err) {
                  setIsFormDirty(true);
                  showSnackBar(getErrorMessage(err), 'error');
                } finally {
                  setSaving(false);
                }
              }}
            >
              {t('confirm_and_close_wo')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 'auto'
  },
  workOrderContext: {
    marginHorizontal: qpmLayoutTokens.space.md,
    marginTop: qpmLayoutTokens.space.md,
    padding: qpmLayoutTokens.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: qpmLayoutTokens.radius.card
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8
  }
});
