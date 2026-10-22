import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import { useDispatch } from '../../../../store';
import { getPDFReport, ReportConfig } from '../../../../slices/workOrder';
import ReportConfigFields from './ReportConfigFields';
import api, { getErrorMessage } from '../../../../utils/api';
import { isPdfContentType } from '../../../../utils/documentResponse';

interface GeneratedDocument {
  id: number;
  fileName: string;
  issuedAt: string;
  sha256: string;
}

interface PublishedReportTemplate {
  id: number;
  name: string;
  versionNumber: number;
  isDefault: boolean;
}

interface ReportConfigModalProps {
  open: boolean;
  onClose: () => void;
  workOrderId: number;
}

const defaultConfig: ReportConfig = {
  cost: true,
  comments: true,
  workOrderHistory: true,
  estimatedTime: true,
  locationAddress: true,
  priority: true,
  workOrderInformation: true,
  relations: true,
  files: true,
  signature: true,
  tasks: true
};

export default function ReportConfigModal({
  open,
  onClose,
  workOrderId
}: ReportConfigModalProps) {
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const [config, setConfig] = useState<ReportConfig>(defaultConfig);
  const [generating, setGenerating] = useState<boolean>(false);
  const [issuing, setIssuing] = useState<boolean>(false);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [documentsLoadFailed, setDocumentsLoadFailed] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const [documentSaved, setDocumentSaved] = useState(false);
  const [publishedTemplates, setPublishedTemplates] = useState<PublishedReportTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesLoadFailed, setTemplatesLoadFailed] = useState(false);
  const documentsRequest = useRef(0);
  const templatesRequest = useRef(0);

  const loadDocuments = useCallback(async () => {
    const requestId = ++documentsRequest.current;
    setDocumentError('');
    setDocuments([]);
    setDocumentsLoaded(false);
    setDocumentsLoadFailed(false);
    setDocumentsLoading(true);
    try {
      const result = await api.get<GeneratedDocument[]>(
        `work-orders/${workOrderId}/documents`
      );
      if (requestId !== documentsRequest.current) return;
      if (!Array.isArray(result)) throw new Error('invalid_document_list');
      setDocuments(result);
    } catch (error) {
      if (requestId === documentsRequest.current) {
        setDocumentsLoadFailed(true);
        setDocumentError(
          getErrorMessage(error, t('issued_documents_load_error'))
        );
      }
    } finally {
      if (requestId === documentsRequest.current) {
        setDocumentsLoading(false);
        setDocumentsLoaded(true);
      }
    }
  }, [t, workOrderId]);

  useEffect(() => {
    if (open) {
      void loadDocuments();
      const requestId = ++templatesRequest.current;
      setTemplatesLoading(true);
      setTemplatesLoadFailed(false);
      api.get<PublishedReportTemplate[]>(`work-orders/${workOrderId}/report/templates`)
        .then((templates) => {
          if (requestId !== templatesRequest.current) return;
          if (!Array.isArray(templates)) throw new Error('invalid_template_list');
          setPublishedTemplates(templates);
          setSelectedTemplateId((current) => templates.some((item) => item.id === current)
            ? current
            : templates.find((item) => item.isDefault)?.id ?? '');
        })
        .catch(() => {
          if (requestId !== templatesRequest.current) return;
          setTemplatesLoadFailed(true);
          setPublishedTemplates([]);
          setSelectedTemplateId('');
        })
        .finally(() => {
          if (requestId === templatesRequest.current) setTemplatesLoading(false);
        });
    }
    return () => {
      documentsRequest.current += 1;
      templatesRequest.current += 1;
    };
  }, [open, loadDocuments]);

  const handleToggle = (key: string) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = () => {
    setDocumentError('');
    // Open synchronously from the button click so browsers do not block the
    // PDF preview after the authenticated request resolves.
    const previewWindow = window.open('about:blank', '_blank');
    if (previewWindow) previewWindow.opener = null;
    setGenerating(true);
    const preview = selectedTemplateId === ''
      ? dispatch(getPDFReport(workOrderId, config, previewWindow))
      : api.post<Response>(
          `work-orders/${workOrderId}/report/preview-template/${selectedTemplateId}`,
          null,
          { raw: true }
        ).then(async (response) => {
          if (!isPdfContentType(response.headers.get('content-type'))) {
            throw new Error('invalid_document_content_type');
          }
          const blob = await response.blob();
          if (blob.size === 0) throw new Error('empty_document');
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
        });
    preview.then(() => {
        onClose();
      })
      .catch((error) => {
        previewWindow?.close();
        setDocumentError(
          getErrorMessage(error, t('work_order_report_preview_error'))
        );
      })
      .finally(() => setGenerating(false));
  };

  const downloadDocument = async (issuedDocument: GeneratedDocument) => {
    try {
      const response = await api.get<Response>(
        `documents/${issuedDocument.id}/download`,
        { raw: true }
      );
      if (!isPdfContentType(response.headers.get('content-type'))) {
        throw new Error('invalid_document_content_type');
      }
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('empty_document');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = issuedDocument.fileName;
      link.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDocumentError(
        getErrorMessage(error, t('issued_document_download_error'))
      );
    }
  };

  const handleIssue = async () => {
    setIssuing(true);
    setDocumentError('');
    setDocumentSaved(false);
    try {
      await api.post<GeneratedDocument>(
        selectedTemplateId === ''
          ? `work-orders/${workOrderId}/report/issue`
          : `work-orders/${workOrderId}/report/issue-template/${selectedTemplateId}`,
        selectedTemplateId === '' ? config : null
      );
      setDocumentSaved(true);
      void loadDocuments();
    } catch (error) {
      setDocumentError(
        getErrorMessage(error, t('issued_document_issue_error'))
      );
    } finally {
      setIssuing(false);
    }
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('pdf_report')}
        </Typography>
        <Typography variant="subtitle2">
          {t('customize_report_description')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        {publishedTemplates.length > 0 && (
          <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={templatesLoading || generating || issuing}>
            <InputLabel id="work-order-report-template-label">{t('report_template', 'Report template')}</InputLabel>
            <Select
              labelId="work-order-report-template-label"
              label={t('report_template', 'Report template')}
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(
                event.target.value === '' ? '' : Number(event.target.value)
              )}
            >
              <MenuItem value="">{t('legacy_report_config', 'Existing report configuration')}</MenuItem>
              {publishedTemplates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name} · v{template.versionNumber}{template.isDefault ? ` · ${t('default', 'Default')}` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {templatesLoadFailed && (
          <Alert severity="info" sx={{ mb: 2 }}>{t('report_templates_unavailable', 'Published templates are unavailable. The existing report remains available.')}</Alert>
        )}
        {selectedTemplateId === '' && (
          <ReportConfigFields config={config} onToggle={handleToggle} />
        )}
        <Divider sx={{ my: 2 }} />
        <Typography variant="h5" gutterBottom>
          {t('issued_documents')}
        </Typography>
        {documentError && (
          <Alert
            severity="error"
            sx={{ mb: 1 }}
            action={
              documentsLoadFailed ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => void loadDocuments()}
                  disabled={documentsLoading}
                >
                  {t('retry')}
                </Button>
              ) : undefined
            }
          >
            {documentError}
          </Alert>
        )}
        {documentSaved && (
          <Alert severity="success" role="status" sx={{ mb: 1 }}>
            {t('issued_document_saved')}
          </Alert>
        )}
        {documentsLoading ? (
          <div role="status" aria-live="polite">
            <CircularProgress size="1rem" sx={{ mr: 1 }} />
            {t('issued_documents_loading')}
          </div>
        ) : documentsLoaded && !documentError && documents.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            {t('issued_documents_empty')}
          </Typography>
        ) : documents.length > 0 ? (
          <List dense disablePadding>
            {documents.map((document) => (
              <ListItem
                key={document.id}
                divider
                secondaryAction={
                  <Tooltip title={t('download')}>
                    <IconButton
                      aria-label={t('download')}
                      onClick={() => downloadDocument(document)}
                    >
                      <DownloadOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemText
                  primary={document.fileName}
                  secondary={`${new Date(
                    document.issuedAt
                  ).toLocaleString()} · SHA-256 ${document.sha256.slice(
                    0,
                    12
                  )}…`}
                />
              </ListItem>
            ))}
          </List>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={generating}
          startIcon={generating ? <CircularProgress size="1rem" /> : null}
        >
          {t('preview_print')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleIssue}
          disabled={issuing}
          startIcon={
            issuing ? <CircularProgress size="1rem" /> : <ArchiveOutlinedIcon />
          }
        >
          {t('issue_archive_document')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
