import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useAuth from '../../../hooks/useAuth';
import { ApprovalDocumentType, ApprovalSummary, ApprovalTarget } from '../../../models/owns/procurementApproval';
import { PermissionEntity } from '../../../models/owns/role';
import api, { getErrorMessage } from '../../../utils/api';
import useCompactDialog from '../../../hooks/useCompactDialog';

export function useApprovalSummary(type: ApprovalDocumentType, id?: number, revision?: unknown) {
  const { user, company } = useAuth();
  const [summary, setSummary] = useState<ApprovalSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const key = `${type}:${id}:${company?.id}:${user?.id}`;
  useEffect(() => {
    const controller = new AbortController();
    setSummary(null); setError(''); setLoadedKey('');
    if (!id) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    api.get<ApprovalSummary | null>(`approval-management/documents/${type}/${id}`, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) { setSummary(data ?? null); setLoadedKey(key); }
    }).catch(e => { if (!controller.signal.aborted) setError(getErrorMessage(e, 'error_loading_data')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [type, id, key, revision, retry]);
  return { summary, loading, error, ready: !loading && !error && loadedKey === key, reload: () => setRetry(value => value + 1) };
}

export default function ApprovalProgress({
  state,
  type,
  documentId
}: {
  state: ReturnType<typeof useApprovalSummary>;
  type: ApprovalDocumentType;
  documentId?: number;
}) {
  const isCompactDialog = useCompactDialog();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targets, setTargets] = useState<ApprovalTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<ApprovalTarget | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [targetError, setTargetError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const canManage = Boolean(user?.role?.viewPermissions?.includes(PermissionEntity.SETTINGS)
    && user?.role?.editOtherPermissions?.includes(PermissionEntity.SETTINGS));

  useEffect(() => {
    if (!dialogOpen || !documentId) return undefined;
    const controller = new AbortController();
    setTargets([]); setSelectedTarget(null); setTargetError(''); setSaveError(''); setSaved(false);
    setLoadingTargets(true);
    api.get<ApprovalTarget[]>(`approval-management/documents/${type}/${documentId}/reassignment-targets`, {
      signal: controller.signal
    }).then(result => {
      if (!controller.signal.aborted) setTargets(result.filter(target => target.approverType === 'USER' && target.documentTypes.includes(type)));
    }).catch(error => {
      if (!controller.signal.aborted) setTargetError(getErrorMessage(error, 'error_loading_data'));
    }).finally(() => { if (!controller.signal.aborted) setLoadingTargets(false); });
    return () => controller.abort();
  }, [dialogOpen, type, documentId]);

  const canReassign = useMemo(() => Boolean(canManage && state.ready && documentId
    && state.summary?.status === 'PENDING' && state.summary.stepBlocked), [canManage, state.ready, state.summary, documentId]);

  const submitReassignment = async () => {
    if (!documentId || !selectedTarget || !reason.trim() || saving) return;
    setSaving(true); setSaveError('');
    try {
      await api.post(`approval-management/documents/${type}/${documentId}/reassignment`, {
        targetUserId: selectedTarget.id,
        reason: reason.trim()
      });
      setDialogOpen(false); setReason(''); setSelectedTarget(null); setSaved(true); state.reload();
    } catch (error) {
      setSaveError(getErrorMessage(error, 'approval_reassignment_invalid'));
    } finally {
      setSaving(false);
    }
  };

  if (state.loading) return <CircularProgress size={20} aria-label={t('loading')} />;
  if (state.error) return <Alert severity="error" action={<Button onClick={state.reload}>{t('retry')}</Button>}>{t(state.error)}</Alert>;
  if (!state.summary) return null;
  const summary = state.summary;
  return <>
    <Alert severity={summary.status === 'REJECTED' ? 'warning' : 'info'}>
      <Typography variant="body2" fontWeight={600}>{t('ap_policy_progress', { name: summary.policyName, level: summary.currentLevel, count: summary.levelCount })}</Typography>
      {summary.estimatedNetAmount != null && summary.currency && <Typography variant="body2" sx={{ mt: 0.5 }}>{t('ap_approval_amount')}: {Number(summary.estimatedNetAmount).toLocaleString(i18n.language, { maximumFractionDigits: 4 })} {summary.currency}</Typography>}
      <Stack spacing={0.5} sx={{ mt: 1 }}>{summary.levels.map((level, index) => <Typography key={index} variant="body2" fontWeight={index + 1 === summary.currentLevel ? 600 : 400}>{index + 1}. {level.name} · {level.required === false ? t('ap_optional_level_skipped') : level.approverName}</Typography>)}</Stack>
      {summary.status === 'PENDING' && !summary.canDecide && <Typography variant="body2" sx={{ mt: 1 }}>{summary.stepBlocked ? t('ap_step_blocked') : t('waiting_for_approver')}</Typography>}
      {canReassign && <Button size="small" sx={{ mt: 1 }} onClick={() => setDialogOpen(true)}>{t('ap_reassign')}</Button>}
    </Alert>
    {saved && <Alert severity="success" sx={{ mt: 1 }}>{t('ap_reassign_success')}</Alert>}
    <Dialog fullScreen={isCompactDialog} open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{t('ap_reassign_dialog')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {targetError && <Alert severity="error">{t(targetError)}</Alert>}
          {loadingTargets && <CircularProgress size={20} aria-label={t('loading')} />}
          {!loadingTargets && !targetError && targets.length === 0 && <Alert severity="info">{t('ap_reassign_no_targets')}</Alert>}
          <Autocomplete<ApprovalTarget, false, false, false>
            options={targets}
            value={selectedTarget}
            onChange={(_, value) => setSelectedTarget(value)}
            getOptionLabel={option => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={params => <TextField {...params} label={t('ap_reassign_target')} required />}
            disabled={saving || loadingTargets || Boolean(targetError) || targets.length === 0}
          />
          <TextField
            label={t('ap_reassign_reason')}
            value={reason}
            onChange={event => setReason(event.target.value)}
            fullWidth
            multiline
            minRows={3}
            inputProps={{ maxLength: 1000 }}
            required
            error={Boolean(saveError) && !reason.trim()}
            helperText={saveError ? t(saveError) : `${reason.length}/1000`}
            disabled={saving}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialogOpen(false)} disabled={saving}>{t('cancel')}</Button>
        <Button variant="contained" onClick={() => void submitReassignment()}
          disabled={saving || loadingTargets || !selectedTarget || !reason.trim() || Boolean(targetError) || targets.length === 0}>
          {saving ? <CircularProgress size={18} color="inherit" /> : t('ap_reassign')}
        </Button>
      </DialogActions>
    </Dialog>
  </>;
}
