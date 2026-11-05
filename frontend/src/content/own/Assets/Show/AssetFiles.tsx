import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CustomDataGrid from '../../components/CustomDatagrid';
import {
  GridActionsCellItem,
  GridRowParams,
  GridToolbar
} from '@mui/x-data-grid';
import { GridEnrichedColDef } from '@mui/x-data-grid/models/colDef/gridColDef';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { AssetDTO } from '../../../../models/owns/asset';
import { useDispatch } from '../../../../store';
import { editAsset } from '../../../../slices/asset';
import useAuth from '../../../../hooks/useAuth';
import { PermissionEntity } from '../../../../models/owns/role';
import { FileMiniDTO } from '../../../../models/owns/file';
import { getSafeHttpUrl, openSafeWindow } from '../../../../utils/safeWindow';

interface PropsType {
  asset: AssetDTO;
}

const getFileKind = (file: FileMiniDTO) => {
  const candidates = [file.name, file.url]
    .map((value) => value.split(/[?#]/)[0].toLowerCase());
  if (candidates.some((value) => value.endsWith('.pdf'))) return 'pdf';
  if (candidates.some((value) => /\.(png|jpe?g|gif|webp|bmp)$/.test(value))) return 'image';
  return 'other';
};

const AssetFiles = ({ asset }: PropsType) => {
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { hasEditPermission } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedFile, setSelectedFile] = useState<FileMiniDTO | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const previewFrame = useRef<HTMLIFrameElement>(null);

  const selectedUrl = useMemo(
    () => getSafeHttpUrl(selectedFile?.url),
    [selectedFile]
  );

  const showPreview = (file: FileMiniDTO) => {
    if (getFileKind(file) === 'other') {
      openSafeWindow(file.url);
      return;
    }
    setPreviewLoaded(false);
    setPreviewFailed(false);
    setSelectedFile(file);
  };

  const downloadFile = (file: FileMiniDTO) => {
    const url = getSafeHttpUrl(file.url);
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('confirm_delete_file_asset'))) {
      dispatch(
        editAsset(asset.id, {
          ...asset,
          files: asset.files.filter((file) => file.id !== id)
        })
      );
    }
  };

  const columns: GridEnrichedColDef[] = [
    {
      field: 'name',
      headerName: t('name'),
      description: t('name'),
      flex: 1,
      minWidth: 180
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('actions'),
      description: t('actions'),
      width: 150,
      getActions: (params: GridRowParams<FileMiniDTO>) => {
        const actions = [
          <GridActionsCellItem
            key="view"
            icon={<VisibilityOutlinedIcon fontSize="small" />}
            onClick={() => showPreview(params.row)}
            label={t('document_view')}
            showInMenu
          />,
          <GridActionsCellItem
            key="download"
            icon={<DownloadOutlinedIcon fontSize="small" />}
            onClick={() => downloadFile(params.row)}
            label={t('document_download')}
            showInMenu
          />,
          <GridActionsCellItem
            key="delete"
            icon={<DeleteOutlinedIcon fontSize="small" color="error" />}
            onClick={() => handleDelete(Number(params.id))}
            label={t('to_delete')}
            showInMenu
          />
        ];
        if (!hasEditPermission(PermissionEntity.ASSETS, asset)) actions.pop();
        return actions;
      }
    }
  ];

  const handlePrint = () => {
    try {
      previewFrame.current?.contentWindow?.focus();
      previewFrame.current?.contentWindow?.print();
    } catch {
      if (selectedFile?.url) openSafeWindow(selectedFile.url);
    }
  };

  return (
    <Box sx={{ px: { xs: 0, sm: 1, md: 2 } }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card
            variant="outlined"
            sx={{ p: { xs: 1, sm: 2 }, borderRadius: 2, minWidth: 0 }}
          >
            <Box sx={{ width: '100%', minWidth: 0 }}>
              <CustomDataGrid
                columns={columns}
                rows={asset?.files ?? []}
                components={{ Toolbar: GridToolbar }}
                onRowClick={(params: GridRowParams<FileMiniDTO>) =>
                  showPreview(params.row)
                }
                initialState={{
                  columns: { columnVisibilityModel: {} }
                }}
              />
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={Boolean(selectedFile)}
        onClose={() => setSelectedFile(null)}
        fullScreen={isMobile}
        fullWidth
        maxWidth="lg"
        aria-labelledby="asset-document-preview-title"
      >
        <DialogTitle
          id="asset-document-preview-title"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}
        >
          <Typography variant="h6" sx={{ flexGrow: 1, overflowWrap: 'anywhere' }}>
            {selectedFile?.name}
          </Typography>
          <Tooltip title={t('document_print')}>
            <span>
              <IconButton
                aria-label={t('document_print')}
                onClick={handlePrint}
                disabled={!previewLoaded || previewFailed}
              >
                <PrintOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('document_download')}>
            <IconButton
              aria-label={t('document_download')}
              onClick={() => selectedFile && downloadFile(selectedFile)}
            >
              <DownloadOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('document_open_new_tab')}>
            <IconButton
              aria-label={t('document_open_new_tab')}
              onClick={() => selectedFile?.url && openSafeWindow(selectedFile.url)}
            >
              <OpenInNewOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('close')}>
            <IconButton aria-label={t('close')} onClick={() => setSelectedFile(null)}>
              <CloseOutlinedIcon />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{ minHeight: { xs: 0, sm: '65vh' }, p: { xs: 1, sm: 2 } }}
        >
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t('document_metadata_name')}: {selectedFile?.name} · {t('document_metadata_id')}: {selectedFile?.id}
            </Typography>
          </Box>
          {!selectedUrl || previewFailed ? (
            <Box role="alert" sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="error">{t('document_preview_error')}</Typography>
            </Box>
          ) : (
            <Box sx={{ position: 'relative', height: { xs: 'calc(100% - 40px)', sm: '60vh' }, minHeight: 280 }}>
              {!previewLoaded && (
                <Typography sx={{ p: 2 }} role="status">
                  {t('loading')}
                </Typography>
              )}
              <iframe
                ref={previewFrame}
                title={selectedFile?.name || t('document_preview_title')}
                src={selectedUrl}
                onLoad={() => setPreviewLoaded(true)}
                onError={() => setPreviewFailed(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 0,
                  display: previewLoaded ? 'block' : 'none'
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1, px: 1 }}>
            {t('document_preview_secure_note')}
          </Typography>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetFiles;
