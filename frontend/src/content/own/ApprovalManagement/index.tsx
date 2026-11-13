import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, IconButton, Menu,
  MenuItem, Pagination, Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography, useMediaQuery, useTheme
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVertOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { TitleContext } from '../../../contexts/TitleContext';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';
import { PlanFeature } from '../../../models/owns/subscriptionPlan';
import { ApprovalConditionOperator, ApprovalEvent, ApprovalPage, ApprovalPolicy, ApprovalTarget } from '../../../models/owns/procurementApproval';
import api, { getErrorMessage } from '../../../utils/api';
import ConfirmDialog from '../components/ConfirmDialog';
import ApprovalPolicyEditor from './ApprovalPolicyEditor';
import { AmountGap, findAmountGaps, formatAmountGap } from '../../../utils/approvalCoverage';

const base = 'approval-management';
const ruleSymbols: Record<ApprovalConditionOperator, string> = { EQUALS: '=', NOT_EQUALS: '≠', GREATER_THAN: '>', GREATER_THAN_OR_EQUAL: '≥', LESS_THAN: '<', LESS_THAN_OR_EQUAL: '≤' };
type Translate = (key: string, options?: any) => string;
const policyRuleSummary = (policy: ApprovalPolicy, allDocuments: string, t: Translate) => {
  if (!policy.conditions?.length) return allDocuments;
  return policy.conditions.map(rule => `${t('ap_estimated_amount')} ${ruleSymbols[rule.operator]} ${rule.value} ${rule.currency}`).join(` ${t('and')} `);
};

export default function ApprovalManagement() {
  const { t } = useTranslation();
  const { user, company, hasFeature } = useAuth();
  const { setTitle } = useContext(TitleContext);
  const { policyId } = useParams();
  const location = useLocation();
  const policiesPath = location.pathname.includes('/settings/approval-management')
    ? '/app/settings/approval-management/policies'
    : '/app/approval-management/policies';
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const history = location.pathname.endsWith('/history');
  const role = user?.role;
  const allowed = Boolean((user?.ownsCompany || role?.viewPermissions.includes(PermissionEntity.SETTINGS)) && hasFeature(PlanFeature.PURCHASE_ORDER));
  const canEdit = Boolean(allowed && (user?.ownsCompany || role?.editOtherPermissions.includes(PermissionEntity.SETTINGS)));
  const [items, setItems] = useState<ApprovalPolicy[]>([]);
  const [events, setEvents] = useState<ApprovalEvent[]>([]);
  const [targets, setTargets] = useState<ApprovalTarget[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState(params.get('query') || '');
  const [selected, setSelected] = useState<ApprovalPolicy | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [confirmation, setConfirmation] = useState<'delete' | 'deactivate' | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('lg'));
  const rawPage = Number(params.get('page') || 0);
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const type = params.get('type') || '';
  const status = params.get('status') || '';
  const query = params.get('query') || '';
  const action = params.get('action') || '';

  useEffect(() => { setTitle(t(history ? 'ap_history' : 'ap_policies')); }, [history, setTitle, t]);
  useEffect(() => { setSearch(query); }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    setTargets([]); setLookupError('');
    if (!allowed) { setTargetsLoading(false); return () => controller.abort(); }
    setTargetsLoading(true);
    api.get<ApprovalTarget[]>(`${base}/targets`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setTargets(data); })
      .catch(e => { if (!controller.signal.aborted) setLookupError(getErrorMessage(e, 'error_loading_data')); })
      .finally(() => { if (!controller.signal.aborted) setTargetsLoading(false); });
    return () => controller.abort();
  }, [allowed, company?.id, user?.id, reload]);
  useEffect(() => {
    const controller = new AbortController();
    if (!allowed || policyId) return () => controller.abort();
    setLoading(true); setError(''); setItems([]); setEvents([]);
    const endpoint = history ? 'history' : 'policies';
    const searchParams = new URLSearchParams({ query, type, page: String(page), ...(history ? { action } : { status }) });
    api.get<ApprovalPage<ApprovalPolicy | ApprovalEvent>>(`${base}/${endpoint}?${searchParams}`, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      if (history) setEvents(data.content as ApprovalEvent[]); else setItems(data.content as ApprovalPolicy[]);
      setTotalPages(data.totalPages); setTotal(data.totalElements);
    }).catch(e => { if (!controller.signal.aborted) setError(getErrorMessage(e, 'error_loading_data')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, company?.id, user?.id, policyId, history, query, type, status, action, page, reload]);

  // Gaps in the amounts accepted by the active policies block document submission (approval_no_matching_policy).
  const [coverageGaps, setCoverageGaps] = useState<{ type: 'PR' | 'PO'; gaps: AmountGap[]; currency: string }[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    if (!allowed || policyId || history) return () => controller.abort();
    const loadActive = async (documentType: 'PR' | 'PO') => {
      const active: ApprovalPolicy[] = [];
      for (let pageIndex = 0; pageIndex < 10; pageIndex++) {
        const searchParams = new URLSearchParams({ type: documentType, status: 'ACTIVE', page: String(pageIndex) });
        const data = await api.get<ApprovalPage<ApprovalPolicy>>(`${base}/policies?${searchParams}`, { signal: controller.signal });
        active.push(...data.content);
        if (pageIndex + 1 >= data.totalPages) break;
      }
      return { type: documentType, gaps: findAmountGaps(active), currency: active.flatMap(policy => policy.conditions ?? [])[0]?.currency ?? '' };
    };
    Promise.all([loadActive('PR'), loadActive('PO')])
      .then(results => { if (!controller.signal.aborted) setCoverageGaps(results.filter(result => result.gaps.length)); })
      .catch(() => { if (!controller.signal.aborted) setCoverageGaps([]); });
    return () => controller.abort();
  }, [allowed, company?.id, policyId, history, reload]);

  const filter = (key: string, value: string) => { const next = new URLSearchParams(params); next.delete('page'); if (value) next.set(key, value); else next.delete(key); setParams(next); };
  const edit = (id: string | number) => navigate(`${policiesPath}/${id}`, { state: { returnTo: `${location.pathname}${location.search}` } });
  const mutate = async (operation: 'copy' | 'delete' | 'deactivate') => {
    if (!selected?.id || locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      if (operation === 'copy') { const copy = await api.post<ApprovalPolicy>(`${base}/policies/${selected.id}/copy`, {}); edit(copy.id!); }
      else if (operation === 'delete') await api.deletes(`${base}/policies/${selected.id}?version=${selected.version}`);
      else await api.post(`${base}/policies/${selected.id}/activation?version=${selected.version}&active=false`, {});
      setConfirmation(null); setAnchor(null); setReload(value => value + 1);
    } catch (e) { setError(getErrorMessage(e)); setConfirmation(null); }
    finally { locked.current = false; setBusy(false); }
  };
  const policyBadge = (policy: ApprovalPolicy) => <Chip size="small" color={policy.status === 'ACTIVE' ? 'success' : policy.status === 'DRAFT' ? 'warning' : 'default'} label={t(`ap_status_${policy.status}`)} />;
  const actions = (policy: ApprovalPolicy) => <IconButton disabled={busy} aria-label={`${t('actions')} ${policy.name}`} onClick={event => { setSelected(policy); setAnchor(event.currentTarget); }}><MoreVertIcon /></IconButton>;

  if (!allowed) return <Box sx={{ p: 3 }}><Alert severity="warning">{t('ap_access_denied')}</Alert></Box>;
  return <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2.5, md: 4 }, maxWidth: 1400, mx: 'auto', '& .MuiIconButton-root': { minWidth: 44, minHeight: 44 }, '& .MuiButton-root': { minHeight: 44 }, '& .MuiInputBase-root': { minHeight: 44 } }}>
    {policyId ? <>
      {lookupError && <Alert severity="error" action={<Button onClick={() => setReload(value => value + 1)}>{t('retry')}</Button>} sx={{ mb: 2 }}>{t(lookupError)}</Alert>}
      {targetsLoading ? <Box role="status" sx={{ py: 6, textAlign: 'center' }}><CircularProgress aria-label={t('loading')} /></Box> : <ApprovalPolicyEditor key={`${company?.id}:${user?.id}:${policyId}`} id={policyId} targets={targets} canEdit={canEdit && !lookupError} />}
    </> : <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Box><Typography variant="h4">{t(history ? 'ap_history' : 'ap_policies')}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{t(history ? 'ap_history_description' : 'ap_list_description')}</Typography></Box>
        {!history && canEdit && <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => edit('new')}>{t('ap_create')}</Button>}
      </Stack>
      <Paper variant="outlined" sx={{ p: 2 }} component="form" onSubmit={event => { event.preventDefault(); filter('query', search); }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
          <TextField fullWidth size="small" label={t('search')} value={search} inputProps={{ maxLength: 160 }} onChange={event => setSearch(event.target.value)} />
          <TextField select size="small" label={t('ap_document_type')} value={type} onChange={event => filter('type', event.target.value)} sx={{ minWidth: { sm: 160 } }}><MenuItem value="">{t('all')}</MenuItem><MenuItem value="PR">PR</MenuItem><MenuItem value="PO">PO</MenuItem></TextField>
          <TextField select size="small" label={t(history ? 'ap_decision' : 'status')} value={history ? action : status} onChange={event => filter(history ? 'action' : 'status', event.target.value)} sx={{ minWidth: { sm: 160 } }}><MenuItem value="">{t('all')}</MenuItem>{(history ? ['APPROVED', 'REJECTED', 'REASSIGNED'] : ['ACTIVE', 'DRAFT', 'INACTIVE']).map(value => <MenuItem key={value} value={value}>{t(`ap_status_${value}`)}</MenuItem>)}</TextField>
          <Button type="submit" variant="outlined" startIcon={<SearchOutlinedIcon />}>{t('search')}</Button>
        </Stack>
      </Paper>
      {history && <Alert severity="info">{t('ap_history_scope')}</Alert>}
      {!history && coverageGaps.map(coverage => <Alert key={coverage.type} severity="warning">{t('ap_coverage_gap', {
        type: coverage.type,
        ranges: coverage.gaps.map(gap => `${formatAmountGap(gap, value => value.toLocaleString(), t('and').toLowerCase())}${coverage.currency ? ` ${coverage.currency}` : ''}`).join(' ; ')
      })}</Alert>)}
      {error && <Alert severity="error" action={<Button onClick={() => setReload(value => value + 1)}>{t('retry')}</Button>}>{t(error)}</Alert>}
      {loading ? <Box role="status" sx={{ textAlign: 'center', py: 6 }}><CircularProgress aria-label={t('loading')} /></Box> : !error && <>
        {!(history ? events : items).length ? <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}><Typography variant="h5">{t(history ? 'ap_history_empty' : query || type || status ? 'no_results' : 'ap_empty')}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{t(history ? 'ap_history_description' : 'ap_list_description')}</Typography></Paper> : history ? <Stack spacing={1.5}>
          {events.map(event => <Card variant="outlined" key={event.id}><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
            <Box sx={{ minWidth: 0 }}><Typography fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{event.documentType} #{event.documentId} · {event.documentName}</Typography><Typography variant="body2" color="text.secondary">{event.policyName} · v{event.policyVersion} · {event.levelNumber ? `${event.levelNumber}. ` : ''}{event.levelName}</Typography><Typography variant="body2" sx={{ mt: 1 }}>{event.actorName}</Typography>{event.comment && <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{event.comment}</Typography>}</Box>
            <Box><Chip size="small" color={event.action === 'APPROVED' ? 'success' : event.action === 'REJECTED' ? 'error' : 'info'} label={t(`ap_status_${event.action}`)} /><Typography variant="caption" display="block" sx={{ mt: 1 }}>{new Date(event.decidedAt).toLocaleString()}</Typography></Box>
          </Stack></CardContent></Card>)}
        </Stack> : mobile ? <Stack spacing={1.5}>{items.map(policy => <Card key={policy.id} variant="outlined"><CardContent><Stack direction="row" alignItems="start" justifyContent="space-between" gap={1}><Button sx={{ textAlign: 'left', overflowWrap: 'anywhere', minWidth: 0 }} onClick={() => edit(policy.id!)}>{policy.name}</Button>{actions(policy)}</Stack><Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ mt: 1 }}><Chip size="small" variant="outlined" label={policy.documentType} /><Chip size="small" variant="outlined" label={`${t('ap_priority')} ${policy.priority ?? 100}`} />{policyBadge(policy)}<Typography variant="body2">{policy.levels.length} {t('ap_levels')}</Typography></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{policyRuleSummary(policy, t('ap_all_documents_short'), t)}</Typography></CardContent></Card>)}</Stack> : <Paper variant="outlined"><Table sx={{ tableLayout: 'fixed' }}><TableHead><TableRow><TableCell sx={{ width: '24%' }}>{t('name')}</TableCell><TableCell sx={{ width: '10%' }}>{t('ap_document_type')}</TableCell><TableCell sx={{ width: '27%' }}>{t('ap_conditions')}</TableCell><TableCell sx={{ width: '10%' }}>{t('ap_priority')}</TableCell><TableCell sx={{ width: '10%' }}>{t('ap_levels')}</TableCell><TableCell sx={{ width: '11%' }}>{t('status')}</TableCell><TableCell sx={{ width: '8%' }}>{t('actions')}</TableCell></TableRow></TableHead><TableBody>{items.map(policy => <TableRow key={policy.id}><TableCell><Button sx={{ textAlign: 'left', overflowWrap: 'anywhere', minWidth: 0 }} onClick={() => edit(policy.id!)}>{policy.name}</Button></TableCell><TableCell><Chip size="small" label={policy.documentType} /></TableCell><TableCell sx={{ overflowWrap: 'anywhere' }}>{policyRuleSummary(policy, t('ap_all_documents_short'), t)}</TableCell><TableCell>{policy.priority ?? 100}</TableCell><TableCell>{policy.levels.length}</TableCell><TableCell>{policyBadge(policy)}</TableCell><TableCell>{actions(policy)}</TableCell></TableRow>)}</TableBody></Table></Paper>}
        {totalPages > 0 && <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" gap={2}><Typography variant="caption">{t('ap_total', { count: total })}</Typography><Pagination count={totalPages} page={Math.min(page + 1, totalPages)} onChange={(_, value) => { const next = new URLSearchParams(params); next.set('page', String(value - 1)); setParams(next); }} size={mobile ? 'small' : 'medium'} /></Stack>}
      </>}
    </Stack>}
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
      <MenuItem disabled={busy} onClick={() => { if (selected?.id) edit(selected.id); setAnchor(null); }}>{t('view')}</MenuItem>
      {canEdit && <MenuItem disabled={busy} onClick={() => void mutate('copy')}>{t('ap_duplicate')}</MenuItem>}
      {canEdit && selected?.status === 'ACTIVE' && <MenuItem disabled={busy} onClick={() => { setAnchor(null); setConfirmation('deactivate'); }}>{t('ap_deactivate')}</MenuItem>}
      {canEdit && selected?.status === 'DRAFT' && <MenuItem disabled={busy} onClick={() => { setAnchor(null); setConfirmation('delete'); }}>{t('delete')}</MenuItem>}
      {canEdit && selected?.status === 'INACTIVE' && <MenuItem disabled={busy} onClick={() => { if (selected?.id) edit(selected.id); setAnchor(null); }}>{t('ap_reactivate')}</MenuItem>}
    </Menu>
    <ConfirmDialog open={confirmation !== null} loading={busy} question={t(confirmation === 'delete' ? 'ap_delete_confirm' : 'ap_deactivate_confirm')} confirmText={t(confirmation === 'delete' ? 'delete' : 'ap_deactivate')} onCancel={() => !busy && setConfirmation(null)} onConfirm={() => void mutate(confirmation === 'delete' ? 'delete' : 'deactivate')} />
  </Box>;
}
