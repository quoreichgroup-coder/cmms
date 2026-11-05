import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, List, ListItem, ListItemText, MenuItem, Select, Stack,
  Typography, useMediaQuery, useTheme
} from '@mui/material';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PreviewOutlinedIcon from '@mui/icons-material/PreviewOutlined';
import { useTranslation } from 'react-i18next';
import api, { getErrorMessage } from '../../../utils/api';
import { isPdfContentType } from '../../../utils/documentResponse';

type Kind = 'purchase-orders' | 'purchase-requisitions';
interface Doc { id: number; fileName: string; issuedAt: string; sha256: string }
interface Template { id: number; name: string; versionNumber: number; isDefault: boolean }
interface Props { kind: Kind; sourceId: number; disabled?: boolean; issueDisabled?: boolean }

export default function ProcurementDocumentModal({ kind, sourceId, disabled = false, issueDisabled = false }: Props) {
  const { t }: { t: any } = useTranslation();
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const seq = useRef(0);
  const base = kind === 'purchase-orders' ? 'purchase-orders' : 'purchase-requisitions';
  const load = useCallback(async () => {
    const token = ++seq.current;
    setLoading(true); setError('');
    setDocs([]); setTemplates([]); setSelected('');
    try {
      const [documents, options] = await Promise.all([
        api.get<Doc[]>(`${base}/${sourceId}/documents`),
        api.get<Template[]>(`${base}/${sourceId}/document-templates`)
      ]);
      if (token !== seq.current) return;
      if (!Array.isArray(documents) || !Array.isArray(options)) throw new Error('invalid_procurement_documents');
      setDocs(documents); setTemplates(options);
      setSelected((current) => options.some((item) => item.id === current) ? current : options.find((item) => item.isDefault)?.id ?? options[0]?.id ?? '');
    } catch (e) { if (token === seq.current) setError(getErrorMessage(e, t('issued_documents_load_error'))); }
    finally { if (token === seq.current) setLoading(false); }
  }, [base, sourceId, t]);
  useEffect(() => { if (open) void load(); return () => { seq.current += 1; }; }, [open, load]);

  const openPdf = async (response: Response, newTab: boolean, fileName?: string, targetWindow?: Window | null) => {
    if (!isPdfContentType(response.headers.get('content-type'))) throw new Error('invalid_document_content_type');
    const blob = await response.blob(); if (!blob.size) throw new Error('empty_document');
    const url = URL.createObjectURL(blob);
    if (newTab) { if (targetWindow) targetWindow.location.href = url; else { const tab = window.open(url, '_blank', 'noopener,noreferrer'); if (!tab) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click(); } } }
    else { const a = document.createElement('a'); a.href = url; a.download = fileName || 'purchase-document.pdf'; a.click(); }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const preview = async () => {
    if (selected === '') return;
    const tab = window.open('about:blank', '_blank'); if (tab) tab.opener = null;
    setBusy(true); setError('');
    try { const response = await api.post<Response>(`${base}/${sourceId}/documents/preview/${selected}`, null, { raw: true }); await openPdf(response, true, undefined, tab); }
    catch (e) { tab?.close(); setError(getErrorMessage(e, t('work_order_report_preview_error'))); }
    finally { setBusy(false); }
  };
  const issue = async () => {
    if (selected === '') return;
    setBusy(true); setError('');
    try {
      const created = await api.post<Doc>(`${base}/${sourceId}/documents/issue/${selected}`, null);
      await load();
      const response = await api.get<Response>(`documents/${created.id}/download`, { raw: true });
      await openPdf(response, false, created.fileName);
    } catch (e) { setError(getErrorMessage(e, t('issued_document_issue_error'))); }
    finally { setBusy(false); }
  };
  const download = async (doc: Doc) => {
    setBusy(true); setError('');
    try { const response = await api.get<Response>(`documents/${doc.id}/download`, { raw: true }); if (!isPdfContentType(response.headers.get('content-type'))) throw new Error('invalid_document_content_type'); const blob = await response.blob(); if (!blob.size) throw new Error('empty_document'); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = doc.fileName; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
    catch (e) { setError(getErrorMessage(e, t('issued_document_download_error'))); }
    finally { setBusy(false); }
  };
  const openIssuedPdf = async (doc: Doc) => {
    const tab = window.open('about:blank', '_blank'); if (tab) tab.opener = null;
    setBusy(true); setError('');
    try { const response = await api.get<Response>(`documents/${doc.id}/download`, { raw: true }); await openPdf(response, true, doc.fileName, tab); }
    catch (e) { tab?.close(); setError(getErrorMessage(e, t('issued_document_download_error'))); }
    finally { setBusy(false); }
  };

  return <>
    <Button size="small" sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-start', sm: 'center' } }} startIcon={<PrintOutlinedIcon />} disabled={disabled} onClick={() => setOpen(true)}>{t('procurement_print', 'Print / PDF')}</Button>
    <Dialog open={open} onClose={() => !busy && setOpen(false)} fullScreen={fullScreen} fullWidth maxWidth="sm">
      <DialogTitle>{kind === 'purchase-orders' ? t('purchase_order', 'Purchase order') : t('purchase_requisition', 'Purchase requisition')} · {t('procurement_print', 'Print / PDF')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">{t('procurement_print_help', 'Preview a published template, then issue a traceable PDF. Reprints remain available below.')}</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {issueDisabled && <Alert severity="info">{t('procurement_issue_requires_approval')}</Alert>}
          {loading ? <CircularProgress size={24} /> : templates.length ? <Select fullWidth size="small" value={selected} onChange={(event) => setSelected(Number(event.target.value))} aria-label={t('document_template')}>
            {templates.map((template) => <MenuItem key={template.id} value={template.id}>{template.name} · v{template.versionNumber}{template.isDefault ? ` · ${t('default')}` : ''}</MenuItem>)}
          </Select> : <Alert severity="info">{t('procurement_print_no_template', 'No published template is available. Configure one in Settings → Documents.')}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button startIcon={<PreviewOutlinedIcon />} onClick={() => void preview()} disabled={busy || loading || selected === ''}>{t('preview')}</Button>
            <Button variant="contained" startIcon={busy ? <CircularProgress size={16} /> : <PrintOutlinedIcon />} onClick={() => void issue()} disabled={issueDisabled || busy || loading || selected === ''}>{t('procurement_issue_pdf', 'Issue PDF')}</Button>
          </Stack>
          <Typography variant="subtitle2">{t('issued_documents', 'Issued documents')}</Typography>
          {docs.length ? <List dense disablePadding>{docs.map((doc) => <ListItem key={doc.id} divider sx={{ display: 'block', py: 1.5 }}>
            <ListItemText primary={doc.fileName} secondary={new Date(doc.issuedAt).toLocaleString()} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
              <Button size="small" startIcon={<PrintOutlinedIcon />} disabled={busy} onClick={() => void openIssuedPdf(doc)}>{t('procurement_reprint_pdf', 'Open / print')}</Button>
              <Button size="small" startIcon={<DownloadOutlinedIcon />} disabled={busy} onClick={() => void download(doc)}>{t('download')}</Button>
            </Stack>
          </ListItem>)}</List> : <Typography variant="body2" color="text.secondary">{t('issued_documents_empty', 'No PDF has been issued yet.')}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)} disabled={busy}>{t('close')}</Button></DialogActions>
    </Dialog>
  </>;
}
