import React, { useContext, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItemButton, ListItemText, Pagination, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { getWorkOrderUrl } from '../../../utils/urlPaths';
import { Page } from '../../../models/owns/page';
import { WorkOrderMini } from '../../../models/owns/workOrder';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import useAuth from '../../../hooks/useAuth';
import {
  getDefaultRescheduleDate,
  getNextCompanyDateInput,
  getRescheduledCallDate,
  isRescheduledCallDateInFuture
} from '../../../utils/pmCallReschedule';

type MeterCall = {
  id: number;
  dueValue?: number | null;
  dueDate?: string | null;
  originalDueDate?: string | null;
  rescheduledFor?: string | null;
  callType?: 'CALENDAR' | 'METER';
  unit: string;
  readingValue?: number | null;
  triggeredCycleCodes?: string[];
  status: 'PLANNED' | 'DUE' | 'RESCHEDULED' | 'GENERATED' | 'COMPLETED' | 'IGNORED';
  workOrder?: WorkOrderMini | null;
  rescheduleHistory?: Array<{
    previousDueDate: string;
    rescheduledFor: string;
    reason: string;
    actorName: string;
    createdAt: string;
  }>;
};

const MeterCallRegister = ({ pmId }: { pmId: number }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const { companySettings } = useAuth();
  const timeZone = companySettings?.generalPreferences?.timeZone || 'UTC';
  const [calls, setCalls] = useState<Page<MeterCall> | null>(null);
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<MeterCall | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleError, setRescheduleError] = useState(false);
  const [rescheduleDateError, setRescheduleDateError] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const openReschedule = (call: MeterCall) => {
    setRescheduleTarget(call);
    setRescheduleDate(
      getDefaultRescheduleDate(call.dueDate || new Date(), new Date(), timeZone)
    );
    setRescheduleReason('');
    setRescheduleError(false);
    setRescheduleDateError(false);
  };

  const submitReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleReason.trim()) return;
    const originalDueDate = rescheduleTarget.dueDate || new Date();
    if (!isRescheduledCallDateInFuture(rescheduleDate, originalDueDate, timeZone)) {
      setRescheduleDateError(true);
      return;
    }
    const nextDate = getRescheduledCallDate(rescheduleDate, originalDueDate, timeZone);
    if (!nextDate) {
      setRescheduleDateError(true);
      return;
    }
    setRescheduling(true);
    setRescheduleError(false);
    setRescheduleDateError(false);
    try {
      await api.post(
        `preventive-maintenances/${pmId}/call-history/${rescheduleTarget.id}/reschedule`,
        { rescheduledFor: nextDate.toISOString(), reason: rescheduleReason.trim() }
      );
      setRescheduleTarget(null);
      setReloadKey((key) => key + 1);
    } catch (err) {
      console.error('Failed to reschedule preventive maintenance call:', err);
      setRescheduleError(true);
    } finally {
      setRescheduling(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const result = await api.get<Page<MeterCall>>(
          `preventive-maintenances/${pmId}/call-history?page=${page}&size=10`
        );
        if (!cancelled) setCalls(result);
      } catch (err) {
        console.error('Failed to load preventive maintenance meter call register:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [pmId, page, reloadKey]);

  if (loading) return <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>;
  if (error) return <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setReloadKey((key) => key + 1)}>{t('retry')}</Button>}>{t('pm_call_history_load_error')}</Alert>;

  return (
    <Box>
      <Typography variant="h6" sx={{ mt: 2 }}>{t('pm_call_register')}</Typography>
      {calls?.content.length ? (
        <>
          <List dense>
            {calls.content.map((call) => {
              const canReschedule = call.callType === 'CALENDAR' && !call.workOrder
                && ['PLANNED', 'DUE', 'RESCHEDULED'].includes(call.status);
              return (
                <Box key={call.id}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <ListItemButton sx={{ flex: 1 }} disabled={!call.workOrder} onClick={() => call.workOrder && navigate(getWorkOrderUrl(call.workOrder.id))}>
                      <ListItemText
                        primary={call.dueDate
                          ? `${t('pm_call_due_date')}: ${getFormattedDate(call.dueDate)}${call.rescheduledFor ? ` · ${t('pm_call_rescheduled')}` : ''}`
                          : `${t('pm_meter_due_at')} ${call.dueValue ?? ''} ${call.unit || ''}`}
                        secondary={call.workOrder
                          ? `${t(`pm_call_status_${call.status.toLowerCase()}`)} · ${call.workOrder.customId || call.workOrder.title}${call.readingValue != null ? ` · ${t('reading')}: ${call.readingValue} ${call.unit || ''}` : ''}${call.triggeredCycleCodes?.length ? ` · ${t('pm_triggered_cycles')}: ${call.triggeredCycleCodes.join(', ')}` : ''}`
                          : t(`pm_call_status_${call.status.toLowerCase()}`)}
                      />
                    </ListItemButton>
                    {canReschedule && <Button size="small" onClick={() => openReschedule(call)}>{t('pm_call_reschedule')}</Button>}
                  </Box>
                  {call.rescheduleHistory?.map((event) => (
                    <Typography key={event.createdAt} variant="caption" color="text.secondary" display="block" sx={{ pl: 2, pb: 1 }}>
                      {t('pm_call_reschedule_audit', {
                        from: getFormattedDate(event.previousDueDate),
                        to: getFormattedDate(event.rescheduledFor),
                        actor: event.actorName,
                        reason: event.reason,
                      })}
                    </Typography>
                  ))}
                </Box>
              );
            })}
          </List>
          {calls.totalPages > 1 && <Pagination count={calls.totalPages} page={page + 1} onChange={(_event, value) => setPage(value - 1)} color="primary" sx={{ display: 'flex', justifyContent: 'center' }} />}
        </>
      ) : <Typography color="text.secondary" sx={{ py: 1 }}>{t('no_pm_calls')}</Typography>}
      <Dialog open={Boolean(rescheduleTarget)} onClose={() => !rescheduling && setRescheduleTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('pm_call_reschedule_title')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="normal"
            type="date"
            label={t('pm_call_reschedule_date')}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: getNextCompanyDateInput(new Date(), timeZone) }}
            value={rescheduleDate}
            onChange={(event) => {
              setRescheduleDate(event.target.value);
              setRescheduleDateError(false);
            }}
          />
          {rescheduleDateError && <Alert severity="error" sx={{ mt: 1 }}>{t('pm_call_reschedule_future_date')}</Alert>}
          <TextField
            fullWidth
            required
            multiline
            minRows={2}
            margin="normal"
            label={t('pm_call_reschedule_reason')}
            value={rescheduleReason}
            onChange={(event) => setRescheduleReason(event.target.value)}
          />
          {rescheduleError && <Alert severity="error" sx={{ mt: 1 }}>{t('pm_call_reschedule_error')}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRescheduleTarget(null)} disabled={rescheduling}>{t('cancel')}</Button>
          <Button variant="contained" onClick={submitReschedule} disabled={rescheduling || !rescheduleDate || !rescheduleReason.trim()}>
            {rescheduling ? t('saving') : t('pm_call_reschedule')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MeterCallRegister;
