import { useContext, useEffect, useRef, useState } from 'react';
import { UNSAFE_NavigationContext, useLocation, useNavigate } from 'react-router-dom';
import type { History, Transition } from 'history';
import { useTranslation } from 'react-i18next';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Collapse, FormControlLabel, IconButton,
  MenuItem, Paper, Stack, Switch, TextField, Typography
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api, { getErrorMessage } from '../../../utils/api';
import useAuth from '../../../hooks/useAuth';
import { ApprovalCondition, ApprovalConditionOperator, ApprovalLevel, ApprovalPolicy, ApprovalTarget } from '../../../models/owns/procurementApproval';
import ConfirmDialog from '../components/ConfirmDialog';
import WorkflowPreview from './WorkflowPreview';

const base = 'approval-management/policies';
const emptyPolicy = (): ApprovalPolicy => ({ name: '', description: '', documentType: 'PR', status: 'DRAFT', priority: 100, conditions: [], levels: [] });
const conditionOperators: ApprovalConditionOperator[] = ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN', 'LESS_THAN_OR_EQUAL'];

export default function ApprovalPolicyEditor({ id, targets, canEdit }: { id: string; targets: ApprovalTarget[]; canEdit: boolean }) {
  const { t } = useTranslation();
  const { companySettings } = useAuth();
  const companyCurrency = companySettings?.generalPreferences?.currency?.code || '';
  const navigate = useNavigate();
  const location = useLocation();
  const policiesPath = location.pathname.includes('/settings/approval-management')
    ? '/app/settings/approval-management/policies'
    : '/app/approval-management/policies';
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const listPath = returnTo?.startsWith(policiesPath) ? returnTo : policiesPath;
  const [policy, setPolicy] = useState<ApprovalPolicy>(emptyPolicy);
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(id !== 'new');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [preview, setPreview] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);
  const [activate, setActivate] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [remove, setRemove] = useState<number | null>(null);
  const [validation, setValidation] = useState(false);
  const [retry, setRetry] = useState(0);
  const [pendingNavigation, setPendingNavigation] = useState<Transition | null>(null);
  const unblock = useRef<(() => void) | null>(null);
  const dirty = JSON.stringify(policy) !== saved;
  const editable = canEdit && policy.status === 'DRAFT' && !busy;

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    if (id === 'new') { const initial = emptyPolicy(); setPolicy(initial); setSaved(JSON.stringify(initial)); setLoading(false); return () => controller.abort(); }
    setLoading(true);
    api.get<ApprovalPolicy>(`${base}/${id}`, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) { setPolicy(data); setSaved(JSON.stringify(data)); }
    }).catch(e => { if (!controller.signal.aborted) setError(getErrorMessage(e, 'error_loading_data')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, retry]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty && !loading) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty, loading]);

  useEffect(() => {
    const history = navigator as History;
    if (!dirty || loading || busy || !history.block) return undefined;
    const release = history.block(transition => setPendingNavigation(transition));
    unblock.current = release;
    return () => { release(); if (unblock.current === release) unblock.current = null; };
  }, [navigator, dirty, loading, busy]);

  const change = (patch: Partial<ApprovalPolicy>) => setPolicy(current => ({ ...current, ...patch }));
  const changeLevel = (index: number, patch: Partial<ApprovalLevel>) => setPolicy(current => ({ ...current, levels: current.levels.map((level, i) => i === index ? { ...level, ...patch } : level) }));
  const valid = () => policy.name.trim() && policy.levels.length > 0 && policy.levels.some(level => level.required !== false) && (policy.priority ?? 0) > 0
    && (policy.conditions ?? []).every(condition => condition.value.trim() !== '' && Number.isFinite(Number(condition.value)) && Number(condition.value) >= 0 && /^[A-Z]{3}$/.test(condition.currency) && condition.currency === companyCurrency)
    && policy.levels.every(level => level.name.trim() && (level.required === false || level.approverId !== null && targets.some(target => target.id === level.approverId && target.approverType === level.approverType && target.documentTypes.includes(policy.documentType))));

  const save = async (shouldActivate: boolean) => {
    if (lock.current) return;
    if (!policy.name.trim() || (shouldActivate && !valid())) { setValidation(true); setActivate(false); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      let result = policy;
      if (dirty || !policy.id) {
        result = policy.id ? await api.put<ApprovalPolicy>(`${base}/${policy.id}`, policy) : await api.post<ApprovalPolicy>(base, policy);
        setPolicy(result); setSaved(JSON.stringify(result));
      }
      if (shouldActivate) {
        result = await api.post<ApprovalPolicy>(`${base}/${result.id}/activation?version=${result.version}&active=true`, {});
        setPolicy(result); setSaved(JSON.stringify(result));
      }
      setActivate(false);
      if (id === 'new') navigate(`${policiesPath}/${result.id}`, { replace: true, state: { returnTo: listPath } });
    } catch (e) { setError(getErrorMessage(e, 'ap_save_failed')); setActivate(false); }
    finally { lock.current = false; setBusy(false); }
  };
  const revise = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { const result = await api.post<ApprovalPolicy>(`${base}/${policy.id}/copy?revision=true`, {}); navigate(`${policiesPath}/${result.id}`, { state: { returnTo: listPath } }); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  if (loading) return <Box role="status" sx={{ py: 6, textAlign: 'center' }}><CircularProgress aria-label={t('loading')} /></Box>;
  if (error && !saved) return <Alert severity="error" action={<Button onClick={() => setRetry(value => value + 1)}>{t('retry')}</Button>}>{t(error)}</Alert>;

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 960, mx: 'auto' }}>
      <Box><Button onClick={() => dirty ? setDiscard(true) : navigate(listPath)} disabled={busy}>{t('ap_back')}</Button>
        <Stack direction="row" justifyContent="space-between" alignItems="start" gap={2} sx={{ mt: 1 }}>
          <Box><Typography variant="h4" sx={{ overflowWrap: 'anywhere' }}>{policy.name || t('ap_new')}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{t('ap_editor_description')}</Typography></Box>
          <Chip label={t(`ap_status_${policy.status}`)} color={policy.status === 'ACTIVE' ? 'success' : 'default'} />
        </Stack>
      </Box>
      {error && <Alert severity="error" onClose={() => setError('')}>{t(error)}</Alert>}
      {!editable && !busy && <Alert severity="info">{t(policy.status === 'DRAFT' ? 'ap_read_only' : 'ap_immutable')}</Alert>}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" sx={{ mb: 2 }}>{t('ap_general')}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
          <TextField required fullWidth label={t('name')} value={policy.name} onChange={event => change({ name: event.target.value })} disabled={!editable} inputProps={{ maxLength: 160 }} error={validation && !policy.name.trim()} helperText={validation && !policy.name.trim() ? t('approval_invalid_name') : undefined} />
          <TextField select fullWidth label={t('ap_document_type')} value={policy.documentType} disabled={!editable || Boolean(policy.replacesPolicyId)} onChange={event => change({ documentType: event.target.value as 'PR' | 'PO', levels: policy.levels.map(level => ({ ...level, approverId: null })) })}>
            <MenuItem value="PR">{t('purchase_requisitions')} (PR)</MenuItem><MenuItem value="PO">{t('purchase_orders')} (PO)</MenuItem>
          </TextField>
          <TextField fullWidth disabled label={t('company')} value={t('ap_current_company')} />
          <TextField fullWidth disabled label={t('ap_scope')} value={t('ap_all_documents_short')} />
          <TextField multiline minRows={2} fullWidth label={t('description')} value={policy.description || ''} disabled={!editable} inputProps={{ maxLength: 1000 }} onChange={event => change({ description: event.target.value })} sx={{ gridColumn: '1 / -1' }} />
        </Box>
      </Paper>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" sx={{ mb: 1 }}>{t('ap_conditions')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('ap_priority_hint')}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 2, mb: 2 }}>
          <TextField type="number" label={t('ap_priority')} value={policy.priority ?? 100} disabled={!editable} inputProps={{ min: 1, max: 2147483647, step: 1 }} onChange={event => change({ priority: Math.min(2147483647, Math.max(1, Math.floor(Number(event.target.value) || 1))) })} />
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>{(policy.conditions ?? []).length ? t('ap_estimated_amount_hint') : t('ap_all_documents')}</Typography>
        </Box>
        <Stack spacing={1.5}>
          {(policy.conditions ?? []).map((condition, index) => <Box key={index} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.3fr 1fr 1fr .7fr auto' }, gap: 1.5, alignItems: 'center' }}>
            <TextField select label={t('ap_condition_field')} value={condition.field} disabled onChange={() => undefined}><MenuItem value="ESTIMATED_NET_MATERIAL_AMOUNT">{t('ap_estimated_amount')}</MenuItem></TextField>
            <TextField select label={t('operator')} value={condition.operator} disabled={!editable} onChange={event => { const conditions = [...(policy.conditions ?? [])]; conditions[index] = { ...condition, operator: event.target.value as ApprovalConditionOperator }; change({ conditions }); }}>{conditionOperators.map(operator => <MenuItem key={operator} value={operator}>{t(`ap_operator_${operator.toLowerCase()}`)}</MenuItem>)}</TextField>
            <TextField type="number" label={t('value')} value={condition.value} disabled={!editable} inputProps={{ min: 0, step: 'any' }} error={validation && (!Number.isFinite(Number(condition.value)) || Number(condition.value) < 0)} onChange={event => { const conditions = [...(policy.conditions ?? [])]; conditions[index] = { ...condition, value: event.target.value, currency: companyCurrency }; change({ conditions }); }} />
            {/* Amounts are compared in the company currency only; editing the value realigns an older condition. */}
            <TextField label={t('currency')} value={condition.currency} disabled={!editable} InputProps={{ readOnly: true }} inputProps={{ 'aria-label': t('currency') }} error={validation && condition.currency !== companyCurrency} helperText={condition.currency !== companyCurrency ? t('ap_currency_mismatch') : t('ap_company_currency_only')} />
            <IconButton aria-label={`${t('delete')} ${index + 1}`} disabled={!editable} onClick={() => change({ conditions: (policy.conditions ?? []).filter((_, itemIndex) => itemIndex !== index) })}><DeleteOutlineIcon /></IconButton>
          </Box>)}
        </Stack>
        {canEdit && policy.status === 'DRAFT' && <Button sx={{ mt: 2, minHeight: 44 }} disabled={!editable || (policy.conditions ?? []).length >= 10} onClick={() => change({ conditions: [...(policy.conditions ?? []), { field: 'ESTIMATED_NET_MATERIAL_AMOUNT', operator: 'GREATER_THAN', value: '', currency: companyCurrency } as ApprovalCondition] })}>{t('ap_add_condition')}</Button>}
        <Alert severity="info" sx={{ mt: 2 }}>{t('ap_estimated_amount_disclaimer')}</Alert>
      </Paper>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" gap={2} sx={{ mb: 2 }}><Box><Typography variant="h5">{t('ap_levels')}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('ap_sequential_hint')}</Typography></Box><Chip size="small" label={`${policy.levels.length}/5`} /></Stack>
        {(!policy.levels.length || validation && !policy.levels.some(level => level.required !== false)) && <Alert severity={validation ? 'error' : 'info'} sx={{ mb: 2 }}>{t('approval_levels_required')}</Alert>}
        <Stack component="ol" spacing={2} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {policy.levels.map((level, index) => {
            const options = targets.filter(target => target.approverType === level.approverType && target.documentTypes.includes(policy.documentType));
            const selected = options.find(target => target.id === level.approverId) || null;
            return <Box component="li" key={index} sx={{ borderLeft: '2px solid', borderColor: 'divider', pl: { xs: 1.5, sm: 2 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1}>
                <Button aria-expanded={expanded === index} aria-controls={`approval-level-${index}`} onClick={() => setExpanded(expanded === index ? null : index)} endIcon={expanded === index ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ justifyContent: 'space-between', textAlign: 'left', flex: 1, minWidth: 0, minHeight: 44, overflowWrap: 'anywhere' }}>{index + 1}. {level.name || t('ap_unnamed_level')}</Button>
                <Stack direction="row" alignItems="center" justifyContent="flex-end">
                <Chip size="small" label={t(level.name.trim() && (level.required === false || selected) ? 'ap_configured' : 'ap_incomplete')} color={level.name.trim() && (level.required === false || selected) ? 'success' : 'warning'} />
                  <IconButton aria-label={`${t('move_up')} ${index + 1}`} disabled={!editable || index === 0} onClick={() => { const levels = [...policy.levels]; [levels[index - 1], levels[index]] = [levels[index], levels[index - 1]]; change({ levels }); setExpanded(index - 1); }}><ArrowUpwardIcon /></IconButton>
                  <IconButton aria-label={`${t('move_down')} ${index + 1}`} disabled={!editable || index === policy.levels.length - 1} onClick={() => { const levels = [...policy.levels]; [levels[index + 1], levels[index]] = [levels[index], levels[index + 1]]; change({ levels }); setExpanded(index + 1); }}><ArrowDownwardIcon /></IconButton>
                  <IconButton aria-label={`${t('delete')} ${index + 1}`} disabled={!editable} onClick={() => setRemove(index)}><DeleteOutlineIcon /></IconButton>
                </Stack>
              </Stack>
              <Collapse in={expanded === index} id={`approval-level-${index}`}>
                <Stack spacing={2} sx={{ pt: 2, pb: 1 }}>
                  <TextField fullWidth required label={t('ap_level_name')} disabled={!editable} value={level.name} inputProps={{ maxLength: 120 }} onChange={event => changeLevel(index, { name: event.target.value })} error={validation && !level.name.trim()} />
                  <FormControlLabel
                    label={t('ap_required_level')}
                    control={<Switch checked={level.required !== false} disabled={!editable} onChange={event => changeLevel(index, { required: event.target.checked, approverId: event.target.checked ? level.approverId : null })} />}
                  />
                  {level.required === false && <Alert severity="info">{t('ap_optional_level_skipped')}</Alert>}
                  {level.required !== false && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField select fullWidth label={t('ap_approver_type')} value={level.approverType} disabled={!editable} onChange={event => changeLevel(index, { approverType: event.target.value as 'USER' | 'ROLE', approverId: null })}><MenuItem value="USER">{t('user')}</MenuItem><MenuItem value="ROLE">{t('role')}</MenuItem></TextField>
                    <Autocomplete<ApprovalTarget, false, false, false> fullWidth options={options} getOptionLabel={target => target.name || `#${target.id}`} isOptionEqualToValue={(a, b) => a.id === b.id} value={selected} disabled={!editable} onChange={(_, target) => changeLevel(index, { approverId: target?.id ?? null })} noOptionsText={t('ap_no_eligible_approver')} renderInput={params => <TextField {...params} label={t('approver')} required error={validation && !selected} helperText={validation && !selected ? t('ap_choose_approver') : undefined} />} />
                  </Stack>
                  )}
                  {level.required !== false && <Typography variant="caption" color="text.secondary">{t(level.approverType === 'ROLE' ? 'ap_one_vote' : 'ap_required_level')}</Typography>}
                </Stack>
              </Collapse>
            </Box>;
          })}
        </Stack>
          {canEdit && policy.status === 'DRAFT' && <Button sx={{ mt: 2, minHeight: 44 }} disabled={!editable || policy.levels.length >= 5} onClick={() => { change({ levels: [...policy.levels, { name: '', approverType: 'USER', approverId: null, required: true }] }); setExpanded(policy.levels.length); }}>{t('add_approval_level')}</Button>}
      </Paper>
      <Paper elevation={0} sx={{ position: 'sticky', bottom: 0, zIndex: 5, borderTop: '1px solid', borderColor: 'divider', p: 2, pb: 'max(16px, env(safe-area-inset-bottom))' }}>
        {dirty && <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1 }}>{t('document_template_unsaved_changes')}</Typography>}
        <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="flex-end">
          <Button disabled={busy} onClick={() => dirty ? setDiscard(true) : navigate(listPath)}>{t('cancel')}</Button>
          <Button variant="outlined" onClick={() => setPreview(true)} disabled={busy}>{t('ap_preview')}</Button>
          {canEdit && policy.status === 'DRAFT' && <><Button variant="outlined" disabled={busy || (!dirty && Boolean(policy.id))} onClick={() => void save(false)}>{t('save_draft')}</Button><Button variant="contained" disabled={busy} onClick={() => { if (valid()) setActivate(true); else { setValidation(true); setExpanded(policy.levels.findIndex(level => !level.name.trim() || (level.required !== false && !level.approverId))); } }}>{t('ap_activate')}</Button></>}
          {canEdit && policy.status === 'ACTIVE' && <Button variant="contained" disabled={busy} onClick={() => void revise()}>{t('ap_create_revision')}</Button>}
          {canEdit && policy.status === 'INACTIVE' && <Button variant="contained" disabled={busy} onClick={() => setActivate(true)}>{t('ap_reactivate')}</Button>}
          {busy && <CircularProgress size={24} aria-label={t('loading')} />}
        </Stack>
      </Paper>
      <WorkflowPreview policy={policy} targets={targets} open={preview} onClose={() => setPreview(false)} />
      <ConfirmDialog open={activate} loading={busy} question={t('ap_confirm_activation')} confirmText={t('ap_activate')} onCancel={() => !busy && setActivate(false)} onConfirm={() => void save(true)} />
      <ConfirmDialog open={discard} question={t('ap_discard')} confirmText={t('ap_leave')} onCancel={() => setDiscard(false)} onConfirm={() => { unblock.current?.(); unblock.current = null; navigate(listPath); }} />
      <ConfirmDialog open={pendingNavigation !== null} question={t('ap_discard')} confirmText={t('ap_leave')} onCancel={() => setPendingNavigation(null)} onConfirm={() => { unblock.current?.(); unblock.current = null; const transition = pendingNavigation; setPendingNavigation(null); transition?.retry(); }} />
      <ConfirmDialog open={remove !== null} question={t('ap_remove_level')} confirmText={t('delete')} onCancel={() => setRemove(null)} onConfirm={() => { change({ levels: policy.levels.filter((_, index) => index !== remove) }); setRemove(null); setExpanded(null); }} />
    </Stack>
  );
}
