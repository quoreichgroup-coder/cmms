import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from '@mui/material';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { useTranslation } from 'react-i18next';
import Form from '../../components/form';
import * as Yup from 'yup';
import { IField } from '../../type';
import { useContext, useEffect, useState } from 'react';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import { StoreReturnType } from '../../../../store';
import { getErrorMessage } from '../../../../utils/api';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
import api from '../../../../utils/api';

interface SignatureProps {
  open: boolean;
  onClose: () => void;
  fieldsConfig: { feedback: boolean; signature: boolean };
  workOrder: {
    id: number;
    identifier: string;
    title: string;
    assetName?: string;
  };
  laborEntries: Array<{ label: string; seconds: number }>;
  onComplete: (
    signature: string | undefined,
    feedback: string
  ) => Promise<StoreReturnType>;
}
export default function CompleteWOModal({
  open,
  onClose,
  onComplete,
  fieldsConfig,
  workOrder,
  laborEntries
}: SignatureProps) {
  const { t }: { t: any } = useTranslation();
  const { uploadFiles } = useContext(CompanySettingsContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);
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
  const [loadingExecutionTime, setLoadingExecutionTime] = useState(false);
  const formatDuration = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  };

  useEffect(() => {
    if (!open || !reviewValues) {
      if (!open) {
        setReviewValues(null);
        setSaving(false);
      }
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
      }>(`work-orders/${workOrder.id}/execution-time`)
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
  }, [open, reviewValues, workOrder.id]);

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
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle
        sx={{
          p: 3
        }}
      >
        <Typography variant="h4" gutterBottom>
          {reviewValues
            ? t('work_order_completion_review_title')
            : t('close_wo')}
        </Typography>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: 3
        }}
      >
        {reviewValues ? (
          <Box>
            <Typography color="text.secondary" sx={{ mb: 2.5 }}>
              {t('work_order_completion_review_description')}
            </Typography>
            <Stack spacing={2}>
              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper'
                }}
              >
                <Typography variant="overline" color="primary.main">
                  {t('work_order')}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700}>
                  {workOrder.identifier} · {workOrder.title}
                </Typography>
                {workOrder.assetName && (
                  <Typography variant="body2" color="text.secondary">
                    {t('asset')}: {workOrder.assetName}
                  </Typography>
                )}
              </Box>
              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'action.hover'
                }}
                aria-live="polite"
                aria-busy={loadingExecutionTime}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 0.5 }}
                >
                  <TimerOutlinedIcon color="primary" fontSize="small" />
                  <Typography variant="overline" color="text.secondary">
                    {t('work_order_elapsed_execution_time')}
                  </Typography>
                </Stack>
                {loadingExecutionTime ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} aria-label={t('loading')} />
                    <Typography variant="body2" color="text.secondary">
                      {t('loading')}
                    </Typography>
                  </Stack>
                ) : executionTime?.measured &&
                  executionTime.elapsedSeconds != null ? (
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 0.25, sm: 1 }}
                    alignItems={{ xs: 'flex-start', sm: 'baseline' }}
                  >
                    <Typography
                      variant="h4"
                      color="primary.main"
                      fontWeight={700}
                    >
                      {formatDuration(executionTime.elapsedSeconds)}
                    </Typography>
                    {executionTime.running && (
                      <Typography variant="caption" color="text.secondary">
                        {t('work_order_execution_time_running')}
                      </Typography>
                    )}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t('work_order_execution_time_unavailable')}
                  </Typography>
                )}
              </Box>
              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper'
                }}
              >
                <Typography
                  variant="overline"
                  color="text.secondary"
                  display="block"
                  sx={{ mb: 1 }}
                >
                  {t('work_order_completion_tracked_time')}
                </Typography>
                {laborEntries.length ? (
                  <Stack spacing={0.5}>
                    {laborEntries.map((entry, index) => (
                      <Stack
                        key={`${entry.label}-${index}`}
                        direction="row"
                        justifyContent="space-between"
                        gap={2}
                      >
                        <Typography variant="body2">{entry.label}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDuration(entry.seconds)}
                        </Typography>
                      </Stack>
                    ))}
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      gap={2}
                      sx={{
                        pt: 1,
                        mt: 0.5,
                        borderTop: 1,
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {t('work_order_completion_total_labor')}
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {formatDuration(
                          laborEntries.reduce(
                            (sum, entry) => sum + entry.seconds,
                            0
                          )
                        )}
                      </Typography>
                    </Stack>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t('work_order_completion_no_time')}
                  </Typography>
                )}
              </Box>
              {fieldsConfig.feedback && (
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    display="block"
                    sx={{ mb: 0.5 }}
                  >
                    {t('feedback')}
                  </Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                    {reviewValues.feedback?.trim() || t('not_provided')}
                  </Typography>
                </Box>
              )}
              {fieldsConfig.signature && (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  gap={2}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Typography variant="body2">{t('signature')}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {reviewValues.signature
                      ? t('work_order_completion_signature_captured')
                      : t('not_provided')}
                  </Typography>
                </Stack>
              )}
            </Stack>
            <DialogActions sx={{ px: 0, pt: 3 }}>
              <Button
                disabled={saving}
                onClick={() => {
                  setFormValues(reviewValues ?? {});
                  setReviewValues(null);
                }}
              >
                {t('back_to_edit')}
              </Button>
              <Button
                variant="contained"
                disabled={saving || loadingExecutionTime}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onComplete(
                      reviewValues.signature,
                      reviewValues.feedback ?? ''
                    );
                    onClose();
                  } catch (err) {
                    showSnackBar(getErrorMessage(err), 'error');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? t('saving') : t('confirm_and_close_wo')}
              </Button>
            </DialogActions>
          </Box>
        ) : (
          <Form
            fields={getFieldsAndShape()[0]}
            validation={Yup.object().shape(getFieldsAndShape()[1])}
            submitText={t('review_completion')}
            values={formValues}
            onChange={({ field, e }) => {}}
            onSubmit={async (values) => {
              setFormValues(values);
              setReviewValues(values);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
