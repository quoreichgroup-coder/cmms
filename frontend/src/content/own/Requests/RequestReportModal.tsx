import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PreviewOutlinedIcon from '@mui/icons-material/PreviewOutlined';
import { useTranslation } from 'react-i18next';
import api, { getErrorMessage } from '../../../utils/api';
import { isPdfContentType } from '../../../utils/documentResponse';

interface GeneratedDocument {
  id: number;
  fileName: string;
  issuedAt: string;
  sha256: string;
}

interface PublishedTemplate {
  id: number;
  name: string;
  versionNumber: number;
  isDefault: boolean;
  defaultScope?: 'COMPANY' | 'SITE';
  siteName?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  requestId: number;
}

export default function RequestReportModal({
  open,
  onClose,
  requestId
}: Props) {
  const { t }: { t: any } = useTranslation();
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [templates, setTemplates] = useState<PublishedTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const sequence = useRef(0);

  const load = useCallback(async (preserveSuccess = false) => {
    const current = ++sequence.current;
    setLoading(true);
    setError('');
    if (!preserveSuccess) setSuccess(false);
    try {
      const [documentList, templateList] = await Promise.all([
        api.get<GeneratedDocument[]>(`requests/${requestId}/documents`),
        api.get<PublishedTemplate[]>(`requests/${requestId}/report/templates`)
      ]);
      if (current !== sequence.current) return;
      if (!Array.isArray(documentList) || !Array.isArray(templateList))
        throw new Error('invalid_request_report_response');
      setDocuments(documentList);
      setTemplates(templateList);
      setSelectedTemplateId((selected) =>
        templateList.some((item) => item.id === selected)
          ? selected
          : templateList.find((item) => item.isDefault)?.id ??
            templateList[0]?.id ??
            ''
      );
    } catch (loadError) {
      if (current === sequence.current)
        setError(getErrorMessage(loadError, t('issued_documents_load_error')));
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [requestId, t]);

  useEffect(() => {
    if (open) void load();
    return () => {
      sequence.current += 1;
    };
  }, [open, load]);

  const preview = async () => {
    if (selectedTemplateId === '') return;
    const previewWindow = window.open('about:blank', '_blank');
    if (previewWindow) previewWindow.opener = null;
    setBusy(true);
    setError('');
    try {
      const response = await api.post<Response>(
        `requests/${requestId}/report/preview-template/${selectedTemplateId}`,
        null,
        { raw: true }
      );
      if (!isPdfContentType(response.headers.get('content-type')))
        throw new Error('invalid_document_content_type');
      const blob = await response.blob();
      if (!blob.size) throw new Error('empty_document');
      const url = window.URL.createObjectURL(blob);
      if (previewWindow) previewWindow.location.href = url;
      else {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
      }
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (previewError) {
      previewWindow?.close();
      setError(
        getErrorMessage(previewError, t('work_order_report_preview_error'))
      );
    } finally {
      setBusy(false);
    }
  };

  const issue = async () => {
    if (selectedTemplateId === '') return;
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      await api.post(
        `requests/${requestId}/report/issue-template/${selectedTemplateId}`,
        null
      );
      setSuccess(true);
      await load(true);
    } catch (issueError) {
      setError(getErrorMessage(issueError, t('issued_document_issue_error')));
    } finally {
      setBusy(false);
    }
  };

  const download = async (item: GeneratedDocument) => {
    setBusy(true);
    setError('');
    try {
      const response = await api.get<Response>(
        `documents/${item.id}/download`,
        { raw: true }
      );
      if (!isPdfContentType(response.headers.get('content-type')))
        throw new Error('invalid_document_content_type');
      const blob = await response.blob();
      if (!blob.size) throw new Error('empty_document');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.fileName;
      link.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(
        getErrorMessage(downloadError, t('issued_document_download_error'))
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={() => !busy && onClose()}
    >
      <DialogTitle>
        {t('maintenance_request_report', 'Maintenance request report')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography color="text.secondary">
            {t(
              'request_report_help',
              'Preview a draft or published template, then issue an archived PDF. This does not approve the request or create a Work Order.'
            )}
          </Typography>
          {error && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => void load()}
                  disabled={loading || busy}
                >
                  {t('retry')}
                </Button>
              }
            >
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" role="status">
              {t('issued_document_saved')}
            </Alert>
          )}
          <FormControl
            fullWidth
            size="small"
            disabled={loading || busy || !templates.length}
          >
            <InputLabel id="request-report-template-label">
              {t('report_template', 'Report template')}
            </InputLabel>
            <Select
              labelId="request-report-template-label"
              label={t('report_template', 'Report template')}
              value={selectedTemplateId}
              onChange={(event) =>
                setSelectedTemplateId(Number(event.target.value))
              }
            >
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name} · v{template.versionNumber}
                  {template.siteName ? ` · ${template.siteName}` : ''}
                  {template.isDefault ? ` · ${t('default', 'Default')}` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {!loading && templates.length === 0 && (
            <Alert severity="info">
              {t(
                'request_report_no_template',
                'No published maintenance request template is available.'
              )}
            </Alert>
          )}
          <Divider />
          <Typography variant="h6">{t('issued_documents')}</Typography>
          {loading ? (
            <div role="status">
              <CircularProgress size="1rem" sx={{ mr: 1 }} />
              {t('issued_documents_loading')}
            </div>
          ) : documents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('issued_documents_empty')}
            </Typography>
          ) : (
            <List dense disablePadding>
              {documents.map((item) => (
                <ListItem
                  key={item.id}
                  divider
                  secondaryAction={
                    <Tooltip title={t('download')}>
                      <IconButton
                        aria-label={t('download')}
                        disabled={busy}
                        onClick={() => void download(item)}
                      >
                        <DownloadOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={item.fileName}
                    secondary={`${new Date(
                      item.issuedAt
                    ).toLocaleString()} · SHA-256 ${item.sha256.slice(0, 12)}…`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t('close')}
        </Button>
        <Button
          startIcon={
            busy ? <CircularProgress size={16} /> : <PreviewOutlinedIcon />
          }
          onClick={() => void preview()}
          disabled={busy || loading || selectedTemplateId === ''}
        >
          {t('preview_print')}
        </Button>
        <Button
          variant="contained"
          startIcon={
            busy ? <CircularProgress size={16} /> : <ArchiveOutlinedIcon />
          }
          onClick={() => void issue()}
          disabled={busy || loading || selectedTemplateId === ''}
        >
          {t('issue_archive_document')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
