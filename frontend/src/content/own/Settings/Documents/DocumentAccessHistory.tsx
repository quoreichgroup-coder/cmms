import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, FormControl, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import api, { getErrorMessage } from '../../../../utils/api';

type AccessEvent = {
  id: number;
  generatedDocumentId: number;
  sourceType: string;
  sourceId: number;
  actorId: number;
  actorName: string;
  outcome: 'SUCCESS' | 'FAILED';
  accessedAt: string;
};
type AccessPage = { content: AccessEvent[]; totalElements: number; totalPages: number };

const sourceTypes = ['', 'PURCHASE_REQUISITION', 'PURCHASE_ORDER', 'WORK_ORDER', 'REQUEST'];
const sourceLabel = (type: string) => ({
  PURCHASE_ORDER: 'purchase_orders',
  PURCHASE_REQUISITION: 'purchase_requisitions',
  WORK_ORDER: 'work_orders',
  REQUEST: 'requests'
}[type] ?? type);

export default function DocumentAccessHistory() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [outcome, setOutcome] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<AccessPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ query, sourceType, outcome, page: String(page) });
      const data = await api.get<AccessPage>(`settings/generated-document-access?${params}`, { signal });
      if (!signal.aborted) setResult(data);
    } catch (e) {
      if (!signal.aborted) { setResult(null); setError(getErrorMessage(e, 'error_loading_data')); }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [query, sourceType, outcome, page]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <Stack spacing={2.5} sx={{ py: { xs: 2, sm: 3 }, px: { xs: 0, sm: 1 } }}>
      <Box>
        <Typography variant="h4" component="h1">{t('document_access_history')}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>{t('document_access_history_description')}</Typography>
      </Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField fullWidth label={t('search')} value={query} onChange={event => { setPage(0); setQuery(event.target.value); }} inputProps={{ maxLength: 120 }} />
        <FormControl fullWidth>
          <InputLabel id="document-access-type-label">{t('document_type')}</InputLabel>
          <Select labelId="document-access-type-label" label={t('document_type')} value={sourceType} onChange={event => { setPage(0); setSourceType(event.target.value); }}>
            {sourceTypes.map(type => <MenuItem key={type || 'all'} value={type}>{type ? t(sourceLabel(type)) : t('all')}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id="document-access-result-label">{t('status')}</InputLabel>
          <Select labelId="document-access-result-label" label={t('status')} value={outcome} onChange={event => { setPage(0); setOutcome(event.target.value); }}>
            <MenuItem value="">{t('all')}</MenuItem>
            <MenuItem value="SUCCESS">{t('document_access_success')}</MenuItem>
            <MenuItem value="FAILED">{t('document_access_failed')}</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      {error && <Alert severity="error">{t(error)}</Alert>}
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small" aria-busy={loading}>
          <TableHead><TableRow>
            <TableCell>{t('document_access_date')}</TableCell>
            <TableCell>{t('document_type')}</TableCell>
            <TableCell>{t('document_access_document')}</TableCell>
            <TableCell>{t('document_access_actor')}</TableCell>
            <TableCell>{t('status')}</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {result?.content.map(event => <TableRow key={event.id} hover>
              <TableCell>{new Date(event.accessedAt).toLocaleString(i18n.language)}</TableCell>
              <TableCell>{t(sourceLabel(event.sourceType))}</TableCell>
              <TableCell>{event.sourceId} <Typography component="span" variant="caption" color="text.secondary">· PDF #{event.generatedDocumentId}</Typography></TableCell>
              <TableCell>{event.actorName}</TableCell>
              <TableCell>{t(event.outcome === 'SUCCESS' ? 'document_access_success' : 'document_access_failed')}</TableCell>
            </TableRow>)}
            {!loading && !error && !result?.content.length && <TableRow><TableCell colSpan={5} align="center">{t('no_data')}</TableCell></TableRow>}
            {loading && <TableRow><TableCell colSpan={5} align="center">{t('loading')}</TableCell></TableRow>}
          </TableBody>
        </Table>
        <TablePagination component="div" count={result?.totalElements ?? 0} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, next) => setPage(next)} labelRowsPerPage={t('rows_per_page')} />
      </TableContainer>
    </Stack>
  );
}
