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
  Typography
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
  const documentsRequest = useRef(0);

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
    }
    return () => {
      documentsRequest.current += 1;
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
    dispatch(getPDFReport(workOrderId, config, previewWindow))
      .then(() => {
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
        `work-orders/${workOrderId}/report/issue`,
        config
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
        <ReportConfigFields config={config} onToggle={handleToggle} />
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
