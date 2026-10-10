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
import { useCallback, useEffect, useState } from 'react';
import ArchiveTwoToneIcon from '@mui/icons-material/ArchiveTwoTone';
import DownloadTwoToneIcon from '@mui/icons-material/DownloadTwoTone';
import { useDispatch } from '../../../../store';
import { getPDFReport, ReportConfig } from '../../../../slices/workOrder';
import ReportConfigFields from './ReportConfigFields';
import api, { getErrorMessage } from '../../../../utils/api';

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
  const [documentError, setDocumentError] = useState('');
  const [documentSaved, setDocumentSaved] = useState(false);

  const loadDocuments = useCallback(() => {
    setDocumentError('');
    api
      .get<GeneratedDocument[]>(`work-orders/${workOrderId}/documents`)
      .then(setDocuments)
      .catch((error) => setDocumentError(getErrorMessage(error, t('issued_documents_load_error'))));
  }, [t, workOrderId]);

  useEffect(() => {
    if (open) {
      setDocumentError('');
      loadDocuments();
    }
  }, [open, loadDocuments]);

  const handleToggle = (key: string) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = () => {
    setGenerating(true);
    dispatch(getPDFReport(workOrderId, config))
      .then(() => {
        onClose();
      })
      .finally(() => setGenerating(false));
  };

  const downloadDocument = async (issuedDocument: GeneratedDocument) => {
    try {
      const response = await api.get<Response>(`documents/${issuedDocument.id}/download`, { raw: true });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = issuedDocument.fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setDocumentError(getErrorMessage(error, t('issued_documents_load_error')));
    }
  };

  const handleIssue = async () => {
    setIssuing(true);
    setDocumentError('');
    setDocumentSaved(false);
    try {
      await api.post<GeneratedDocument>(`work-orders/${workOrderId}/report/issue`, config);
      setDocumentSaved(true);
      loadDocuments();
    } catch (error) {
      setDocumentError(getErrorMessage(error, t('issued_document_issue_error')));
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
        <Typography variant="h5" gutterBottom>{t('issued_documents')}</Typography>
        {documentError && <Alert severity="error" sx={{ mb: 1 }}>{documentError}</Alert>}
        {documentSaved && <Alert severity="success" sx={{ mb: 1 }}>{t('issued_document_saved')}</Alert>}
        {documents.length === 0 ? (
          <Typography color="text.secondary" variant="body2">{t('issued_documents_empty')}</Typography>
        ) : (
          <List dense disablePadding>
            {documents.map((document) => (
              <ListItem key={document.id} divider secondaryAction={
                <Tooltip title={t('download')}>
                  <IconButton aria-label={t('download')} onClick={() => downloadDocument(document)}>
                    <DownloadTwoToneIcon />
                  </IconButton>
                </Tooltip>
              }>
                <ListItemText primary={document.fileName}
                  secondary={`${new Date(document.issuedAt).toLocaleString()} · SHA-256 ${document.sha256.slice(0, 12)}…`} />
              </ListItem>
            ))}
          </List>
        )}
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
          startIcon={issuing ? <CircularProgress size="1rem" /> : <ArchiveTwoToneIcon />}
        >
          {t('issue_archive_document')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
