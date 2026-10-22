import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import PreviewOutlinedIcon from '@mui/icons-material/PreviewOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { useTranslation } from 'react-i18next';
import api, { getErrorMessage } from '../../../../utils/api';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
import { isPdfContentType } from '../../../../utils/documentResponse';
import useAuth from '../../../../hooks/useAuth';
import { PermissionEntity } from '../../../../models/owns/role';

type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
interface TemplateConfiguration {
  schemaVersion: '1.0';
  documentType: string;
  provider: string;
  style: 'CLASSIC' | 'COMPACT';
  page: {
    size: 'A4' | 'LETTER';
    orientation: 'PORTRAIT' | 'LANDSCAPE';
    marginMm: number;
  };
  visibleFields: string[];
  options: { showPageNumbers: boolean; repeatTableHeader: boolean };
}
interface DocumentTemplate {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  documentTypeCode: string;
  documentTypeName: string;
  status: TemplateStatus;
  isDefault: boolean;
  draftVersion: number;
  publishedVersion: number;
  draftConfiguration?: TemplateConfiguration | null;
  publishedConfiguration?: TemplateConfiguration | null;
}
interface DocumentType {
  code: string;
  name: string;
  category: string;
  providerCode: string;
  systemManaged: boolean;
}
interface DocumentTemplateVersion {
  id: number;
  versionNumber: number;
  status: TemplateStatus;
  createdAt: string;
  publishedAt?: string | null;
  currentDraft: boolean;
  currentPublished: boolean;
  configuration: TemplateConfiguration;
}

const workOrderFields = [
  'workOrder.customId',
  'workOrder.title',
  'workOrder.description',
  'workOrder.status',
  'workOrder.priority',
  'workOrder.dueDate',
  'workOrder.completedAt',
  'workOrder.estimatedDuration',
  'workOrder.category',
  'workOrder.team',
  'workOrder.completedBy',
  'workOrder.assignedTo',
  'asset.name',
  'asset.serialNumber',
  'location.name',
  'site.name',
  'company.name',
  'company.legalName',
  'company.registeredAddress',
  'company.registrationNumber',
  'company.taxNumber',
  'company.phone',
  'company.email'
];
const initialFields = [
  'workOrder.customId',
  'workOrder.title',
  'workOrder.description',
  'workOrder.status',
  'workOrder.priority',
  'workOrder.dueDate',
  'workOrder.assignedTo',
  'asset.name',
  'location.name',
  'company.legalName',
  'company.registeredAddress',
  'company.registrationNumber'
];
const requestFields = [
  'request.customId',
  'request.title',
  'request.description',
  'request.priority',
  'request.dueDate',
  'request.estimatedDuration',
  'request.contact',
  'request.cancelled',
  'asset.name',
  'asset.serialNumber',
  'location.name',
  'request.team',
  'site.name',
  'company.name',
  'company.legalName',
  'company.registeredAddress',
  'company.registrationNumber',
  'company.taxNumber',
  'company.phone',
  'company.email'
];
const initialRequestFields = [
  'request.customId',
  'request.title',
  'request.description',
  'request.priority',
  'request.dueDate',
  'asset.name',
  'location.name',
  'company.legalName',
  'company.registeredAddress',
  'company.registrationNumber'
];

const fieldsForType = (typeCode: string) =>
  typeCode === 'REQUEST' ? requestFields : workOrderFields;

const fieldTranslationKey = (field: string) =>
  `document_field_${field.replace(/\./g, '_')}`;

const emptyConfiguration = (
  documentType: DocumentType
): TemplateConfiguration => ({
  schemaVersion: '1.0',
  documentType: documentType.code,
  provider: documentType.providerCode,
  style: 'CLASSIC',
  page: { size: 'A4', orientation: 'LANDSCAPE', marginMm: 10 },
  visibleFields:
    documentType.code === 'REQUEST' ? initialRequestFields : initialFields,
  options: { showPageNumbers: true, repeatTableHeader: true }
});

function DocumentTemplates() {
  const { t }: { t: any } = useTranslation();
  const { user } = useAuth();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const canEditTemplates = Boolean(
    user.ownsCompany ||
      user.role?.editOtherPermissions?.includes(
        PermissionEntity.DOCUMENT_TEMPLATES
      ) ||
      (user.role?.viewPermissions?.includes(PermissionEntity.SETTINGS) &&
        user.role?.editOtherPermissions?.includes(PermissionEntity.SETTINGS))
  );
  const canCreateTemplates = Boolean(
    user.ownsCompany ||
      user.role?.createPermissions?.includes(
        PermissionEntity.DOCUMENT_TEMPLATES
      ) ||
      canEditTemplates
  );
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<DocumentTemplate | null>(
    null
  );
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [configuration, setConfiguration] =
    useState<TemplateConfiguration | null>(null);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState('');
  const [versions, setVersions] = useState<DocumentTemplateVersion[]>([]);
  const [versionsTemplate, setVersionsTemplate] =
    useState<DocumentTemplate | null>(null);
  const [previewTarget, setPreviewTarget] = useState<DocumentTemplate | null>(
    null
  );
  const [previewWorkOrderId, setPreviewWorkOrderId] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewing, setPreviewing] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [templateList, typeList] = await Promise.all([
        api.get<DocumentTemplate[]>('document-templates'),
        api.get<DocumentType[]>('document-templates/types')
      ]);
      if (!Array.isArray(templateList) || !Array.isArray(typeList)) {
        throw new Error('invalid_document_template_response');
      }
      setTemplates(templateList);
      setTypes(typeList);
    } catch (error) {
      setLoadError(getErrorMessage(error, t('document_templates_load_error')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const supportedTypes = useMemo(
    () =>
      types.filter(
        (type) =>
          (type.code === 'WORK_ORDER' && type.providerCode === 'WORK_ORDER') ||
          (type.code === 'REQUEST' && type.providerCode === 'REQUEST')
      ),
    [types]
  );
  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return templates;
    return templates.filter((item) =>
      [item.name, item.code, item.documentTypeName, item.status].some((value) =>
        value.toLocaleLowerCase().includes(query)
      )
    );
  }, [search, templates]);

  const openCreate = () => {
    const type =
      supportedTypes.find((item) => item.code === 'WORK_ORDER') ||
      supportedTypes[0];
    if (!type) return;
    setEditing(null);
    setName('');
    setCode('');
    setDescription('');
    setConfiguration(emptyConfiguration(type));
    setFormError('');
    setEditorOpen(true);
  };

  const openEdit = (template: DocumentTemplate) => {
    const type = supportedTypes.find(
      (item) => item.code === template.documentTypeCode
    );
    const source =
      template.draftConfiguration || template.publishedConfiguration;
    if (!type || !source) {
      showSnackBar(t('document_template_configuration_unavailable'), 'error');
      return;
    }
    setEditing(template);
    setName(template.name);
    setCode(template.code);
    setDescription(template.description || '');
    setConfiguration({
      ...source,
      page: { ...source.page },
      options: { ...source.options },
      visibleFields: [...source.visibleFields]
    });
    setFormError('');
    setEditorOpen(true);
  };

  const openDuplicate = (template: DocumentTemplate) => {
    const type = supportedTypes.find(
      (item) => item.code === template.documentTypeCode
    );
    const source =
      template.draftConfiguration || template.publishedConfiguration;
    if (!type || !source) {
      showSnackBar(t('document_template_configuration_unavailable'), 'error');
      return;
    }
    const baseCode = `${template.code.slice(0, 50)}_copy`;
    const existingCodes = new Set(
      templates.map((item) => item.code.toLowerCase())
    );
    let duplicateCode = baseCode;
    let suffix = 2;
    while (existingCodes.has(duplicateCode.toLowerCase())) {
      const numberedSuffix = `_copy${suffix++}`;
      duplicateCode = `${template.code.slice(
        0,
        60 - numberedSuffix.length
      )}${numberedSuffix}`;
    }
    setEditing(null);
    setName(t('document_template_copy_name', { name: template.name }));
    setCode(duplicateCode);
    setDescription(template.description || '');
    setConfiguration({
      ...source,
      page: { ...source.page },
      options: { ...source.options },
      visibleFields: [...source.visibleFields]
    });
    setFormError('');
    setEditorOpen(true);
  };

  const openVersions = async (template: DocumentTemplate) => {
    setVersionsTemplate(template);
    setVersions([]);
    setVersionsError('');
    setVersionsOpen(true);
    setVersionsLoading(true);
    try {
      const history = await api.get<DocumentTemplateVersion[]>(
        `document-templates/${template.id}/versions`
      );
      if (!Array.isArray(history))
        throw new Error('invalid_template_version_list');
      setVersions(history);
    } catch (error) {
      setVersionsError(
        getErrorMessage(error, t('document_template_history_error'))
      );
    } finally {
      setVersionsLoading(false);
    }
  };

  const previewPublishedTemplate = async () => {
    const target = previewTarget;
    const sourceId = Number(previewWorkOrderId);
    if (!target || !Number.isSafeInteger(sourceId) || sourceId <= 0) {
      setPreviewError(t('document_template_preview_work_order_required'));
      return;
    }
    const previewWindow = window.open('about:blank', '_blank');
    if (previewWindow) previewWindow.opener = null;
    setPreviewing(true);
    setPreviewError('');
    try {
      const response = await api.post<Response>(
        target.documentTypeCode === 'REQUEST'
          ? `document-templates/${
              target.id
            }/preview-request-pdf?requestId=${encodeURIComponent(sourceId)}`
          : `document-templates/${
              target.id
            }/preview-pdf?workOrderId=${encodeURIComponent(sourceId)}`,
        null,
        { raw: true }
      );
      if (!isPdfContentType(response.headers.get('content-type')))
        throw new Error('invalid_document_content_type');
      const blob = await response.blob();
      if (!blob.size) throw new Error('empty_document');
      const objectUrl = window.URL.createObjectURL(blob);
      if (previewWindow) previewWindow.location.href = objectUrl;
      else {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
      }
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
      setPreviewTarget(null);
    } catch (error) {
      previewWindow?.close();
      setPreviewError(
        getErrorMessage(error, t('work_order_report_preview_error'))
      );
    } finally {
      setPreviewing(false);
    }
  };

  const saveTemplate = async () => {
    if (
      !configuration ||
      !name.trim() ||
      (!editing && !/^[A-Za-z0-9][A-Za-z0-9_-]{1,59}$/.test(code))
    ) {
      setFormError(t('document_template_form_error'));
      return;
    }
    if (
      !configuration.visibleFields.length ||
      configuration.visibleFields.length > 23
    ) {
      setFormError(t('document_template_fields_error'));
      return;
    }
    if (
      !Number.isInteger(configuration.page.marginMm) ||
      configuration.page.marginMm < 5 ||
      configuration.page.marginMm > 30
    ) {
      setFormError(t('document_template_margin_error'));
      return;
    }
    if (editing ? !canEditTemplates : !canCreateTemplates) {
      setFormError(t('document_template_permission_error'));
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      documentTypeCode: configuration.documentType,
      code: editing?.code || code.trim(),
      name: name.trim(),
      description: description.trim() || null,
      configuration
    };
    try {
      if (editing) await api.put(`document-templates/${editing.id}`, payload);
      else await api.post('document-templates', payload);
      setEditorOpen(false);
      showSnackBar(t('document_template_saved'), 'success');
      await loadTemplates();
    } catch (error) {
      setFormError(getErrorMessage(error, t('document_template_save_error')));
    } finally {
      setSaving(false);
    }
  };

  const publishTemplate = async (
    template: DocumentTemplate,
    makeDefault = template.isDefault
  ) => {
    setSaving(true);
    try {
      await api.post(
        `document-templates/${template.id}/publish?makeDefault=${makeDefault}`,
        {}
      );
      showSnackBar(t('document_template_published'), 'success');
      await loadTemplates();
    } catch (error) {
      showSnackBar(
        getErrorMessage(error, t('document_template_publish_error')),
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const archiveTemplate = async () => {
    if (!archiveTarget) return;
    setSaving(true);
    try {
      await api.post(`document-templates/${archiveTarget.id}/archive`, {});
      setArchiveTarget(null);
      showSnackBar(t('document_template_archived'), 'success');
      await loadTemplates();
    } catch (error) {
      showSnackBar(
        getErrorMessage(error, t('document_template_archive_error')),
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const updatePage = (
    key: keyof TemplateConfiguration['page'],
    value: string | number
  ) => {
    setConfiguration((current) =>
      current
        ? {
            ...current,
            page: { ...current.page, [key]: value }
          }
        : current
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {t('document_templates')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {t('document_templates_description')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title={t('refresh')}>
            <IconButton
              aria-label={t('refresh')}
              onClick={() => void loadTemplates()}
              disabled={loading}
            >
              <RefreshOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={openCreate}
            disabled={!supportedTypes.length || !canCreateTemplates}
          >
            {t('document_template_create')}
          </Button>
        </Stack>
      </Stack>

      {loadError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" onClick={() => void loadTemplates()}>
              {t('retry')}
            </Button>
          }
        >
          {loadError}
        </Alert>
      )}
      {!loading && Boolean(templates.length) && (
        <TextField
          fullWidth
          size="small"
          label={t('document_templates_search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ mb: 2 }}
        />
      )}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {!supportedTypes.length && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('document_templates_unavailable')}
            </Alert>
          )}
          {!templates.length && !loadError ? (
            <Card variant="outlined">
              <CardContent>
                <Typography fontWeight={600}>
                  {t('document_templates_empty')}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('document_templates_empty_hint')}
                </Typography>
              </CardContent>
            </Card>
          ) : !filteredTemplates.length ? (
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary">
                  {t('document_templates_no_search_results')}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {filteredTemplates.map((template) => (
                <Grid item xs={12} md={6} key={template.id}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={1}
                      >
                        <Box minWidth={0}>
                          <Typography variant="h6" fontWeight={650} noWrap>
                            {template.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {template.code} · {template.documentTypeName}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={t(
                            `document_template_status_${template.status.toLowerCase()}`
                          )}
                          color={
                            template.status === 'PUBLISHED'
                              ? 'success'
                              : template.status === 'ARCHIVED'
                              ? 'default'
                              : 'warning'
                          }
                        />
                      </Stack>
                      {template.description && (
                        <Typography sx={{ mt: 1.5 }} color="text.secondary">
                          {template.description}
                        </Typography>
                      )}
                      <Stack
                        direction="row"
                        sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}
                      >
                        {template.isDefault && (
                          <Chip
                            size="small"
                            variant="outlined"
                            color="primary"
                            label={t('document_template_default')}
                          />
                        )}
                        {template.draftVersion > 0 && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`${t('document_template_version_draft')} v${
                              template.draftVersion
                            }`}
                          />
                        )}
                        {template.publishedVersion > 0 && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`${t(
                              'document_template_version_published'
                            )} v${template.publishedVersion}`}
                          />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
                        {template.status !== 'ARCHIVED' && canEditTemplates && (
                          <Button
                            size="small"
                            startIcon={<EditOutlinedIcon />}
                            onClick={() => openEdit(template)}
                          >
                            {t('edit')}
                          </Button>
                        )}
                        {canCreateTemplates && (
                          <Button
                            size="small"
                            startIcon={<FileCopyOutlinedIcon />}
                            onClick={() => openDuplicate(template)}
                          >
                            {t('duplicate')}
                          </Button>
                        )}
                        <Button
                          size="small"
                          startIcon={<HistoryOutlinedIcon />}
                          onClick={() => void openVersions(template)}
                        >
                          {t('document_template_history')}
                        </Button>
                        {template.status !== 'ARCHIVED' && (
                          <Button
                            size="small"
                            startIcon={<PreviewOutlinedIcon />}
                            onClick={() => {
                              setPreviewTarget(template);
                              setPreviewWorkOrderId('');
                              setPreviewError('');
                            }}
                          >
                            {t('preview')}
                          </Button>
                        )}
                        {template.status !== 'ARCHIVED' &&
                          canEditTemplates &&
                          template.draftVersion > 0 && (
                            <Button
                              size="small"
                              startIcon={<PublishOutlinedIcon />}
                              onClick={() => void publishTemplate(template)}
                              disabled={saving}
                            >
                              {t('publish')}
                            </Button>
                          )}
                        {template.status !== 'ARCHIVED' &&
                          canEditTemplates &&
                          template.draftVersion > 0 &&
                          !template.isDefault && (
                            <Button
                              size="small"
                              onClick={() =>
                                void publishTemplate(template, true)
                              }
                              disabled={saving}
                            >
                              {t('document_template_publish_default')}
                            </Button>
                          )}
                        {template.status !== 'ARCHIVED' && canEditTemplates && (
                          <Button
                            size="small"
                            color="inherit"
                            startIcon={<ArchiveOutlinedIcon />}
                            onClick={() => setArchiveTarget(template)}
                          >
                            {t('archive')}
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      <Dialog
        open={editorOpen}
        onClose={() => !saving && setEditorOpen(false)}
        fullWidth
        maxWidth="md"
        aria-labelledby="document-template-dialog-title"
      >
        <DialogTitle id="document-template-dialog-title">
          {editing
            ? t('document_template_edit')
            : t('document_template_create')}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={editing ? 12 : 3}>
                <TextField
                  fullWidth
                  required
                  label={t('name')}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  inputProps={{ maxLength: 160 }}
                />
              </Grid>
              {!editing && (
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    required
                    label={t('document_template_code')}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    inputProps={{
                      maxLength: 60,
                      pattern: '[A-Za-z0-9][A-Za-z0-9_-]{1,59}'
                    }}
                    helperText={t('document_template_code_hint')}
                  />
                </Grid>
              )}
              {!editing && (
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel id="template-type-label">
                      {t('document_template_type')}
                    </InputLabel>
                    <Select
                      labelId="template-type-label"
                      label={t('document_template_type')}
                      value={configuration?.documentType || ''}
                      onChange={(event) => {
                        const nextType = supportedTypes.find(
                          (item) => item.code === event.target.value
                        );
                        if (nextType)
                          setConfiguration(emptyConfiguration(nextType));
                      }}
                    >
                      {supportedTypes.map((type) => (
                        <MenuItem key={type.code} value={type.code}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} sm={editing ? 12 : 3}>
                <TextField
                  fullWidth
                  label={t('description')}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  inputProps={{ maxLength: 500 }}
                />
              </Grid>
            </Grid>
            {configuration && (
              <>
                <Typography variant="subtitle1" fontWeight={650}>
                  {t('document_template_layout')}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel id="template-size-label">
                        {t('paper_size')}
                      </InputLabel>
                      <Select
                        labelId="template-size-label"
                        label={t('paper_size')}
                        value={configuration.page.size}
                        onChange={(event) =>
                          updatePage('size', event.target.value)
                        }
                      >
                        <MenuItem value="A4">A4</MenuItem>
                        <MenuItem value="LETTER">Letter</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel id="template-orientation-label">
                        {t('orientation')}
                      </InputLabel>
                      <Select
                        labelId="template-orientation-label"
                        label={t('orientation')}
                        value={configuration.page.orientation}
                        onChange={(event) =>
                          updatePage('orientation', event.target.value)
                        }
                      >
                        <MenuItem value="LANDSCAPE">{t('landscape')}</MenuItem>
                        <MenuItem value="PORTRAIT">{t('portrait')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel id="template-style-label">
                        {t('document_template_style')}
                      </InputLabel>
                      <Select
                        labelId="template-style-label"
                        label={t('document_template_style')}
                        value={configuration.style}
                        onChange={(event) =>
                          setConfiguration({
                            ...configuration,
                            style: event.target
                              .value as TemplateConfiguration['style']
                          })
                        }
                      >
                        <MenuItem value="CLASSIC">
                          {t('document_template_classic')}
                        </MenuItem>
                        <MenuItem value="COMPACT">
                          {t('document_template_compact')}
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label={t('document_template_margin')}
                      value={configuration.page.marginMm}
                      error={
                        !Number.isInteger(configuration.page.marginMm) ||
                        configuration.page.marginMm < 5 ||
                        configuration.page.marginMm > 30
                      }
                      onChange={(event) =>
                        updatePage('marginMm', Number(event.target.value))
                      }
                      inputProps={{ min: 5, max: 30, step: 1 }}
                      helperText={
                        !Number.isInteger(configuration.page.marginMm) ||
                        configuration.page.marginMm < 5 ||
                        configuration.page.marginMm > 30
                          ? t('document_template_margin_error')
                          : t('document_template_margin_hint')
                      }
                    />
                  </Grid>
                </Grid>
                <Stack direction={{ xs: 'column', sm: 'row' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={configuration.options.showPageNumbers}
                        onChange={(event) =>
                          setConfiguration({
                            ...configuration,
                            options: {
                              ...configuration.options,
                              showPageNumbers: event.target.checked
                            }
                          })
                        }
                      />
                    }
                    label={t('document_template_page_numbers')}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={configuration.options.repeatTableHeader}
                        onChange={(event) =>
                          setConfiguration({
                            ...configuration,
                            options: {
                              ...configuration.options,
                              repeatTableHeader: event.target.checked
                            }
                          })
                        }
                      />
                    }
                    label={t('document_template_repeat_header')}
                  />
                </Stack>
                <Box>
                  <Typography variant="subtitle1" fontWeight={650}>
                    {t('document_template_fields')}
                  </Typography>
                  <FormHelperText>
                    {t('document_template_fields_hint')}
                  </FormHelperText>
                  <Grid container spacing={0.5} sx={{ mt: 0.5 }}>
                    {fieldsForType(configuration.documentType).map((field) => (
                      <Grid item xs={12} sm={6} md={4} key={field}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={configuration.visibleFields.includes(
                                field
                              )}
                              onChange={(event) =>
                                setConfiguration({
                                  ...configuration,
                                  visibleFields: event.target.checked
                                    ? [...configuration.visibleFields, field]
                                    : configuration.visibleFields.filter(
                                        (item) => item !== field
                                      )
                                })
                              }
                            />
                          }
                          label={
                            <Typography
                              variant="body2"
                              sx={{ overflowWrap: 'anywhere' }}
                            >
                              {t(fieldTranslationKey(field), field)}
                            </Typography>
                          }
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditorOpen(false)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveTemplate()}
            disabled={
              saving ||
              !configuration ||
              (editing ? !canEditTemplates : !canCreateTemplates)
            }
          >
            {saving ? <CircularProgress size={20} /> : t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(archiveTarget)}
        onClose={() => !saving && setArchiveTarget(null)}
      >
        <DialogTitle>{t('document_template_archive_title')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('document_template_archive_message', {
              name: archiveTarget?.name
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveTarget(null)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void archiveTemplate()}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : t('archive')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="template-history-title"
      >
        <DialogTitle id="template-history-title">
          {t('document_template_history')} · {versionsTemplate?.name}
        </DialogTitle>
        <DialogContent dividers>
          {versionsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {versionsError}
            </Alert>
          )}
          {versionsLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            versions.map((version) => (
              <Card key={version.id} variant="outlined" sx={{ mb: 1.5 }}>
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                  >
                    <Typography fontWeight={650}>
                      {t('document_template_version_published')} v
                      {version.versionNumber}
                    </Typography>
                    <Stack direction="row" spacing={0.75}>
                      {version.currentDraft && (
                        <Chip
                          size="small"
                          color="warning"
                          label={t('document_template_status_draft')}
                        />
                      )}
                      {version.currentPublished && (
                        <Chip
                          size="small"
                          color="success"
                          label={t('document_template_status_published')}
                        />
                      )}
                    </Stack>
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {version.publishedAt
                      ? t('document_template_published_at', {
                          date: new Date(version.publishedAt).toLocaleString()
                        })
                      : t('document_template_created_at', {
                          date: new Date(version.createdAt).toLocaleString()
                        })}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {version.configuration.page.size} ·{' '}
                    {version.configuration.page.orientation} ·{' '}
                    {version.configuration.style} ·{' '}
                    {t('document_template_selected_fields_count', {
                      count: version.configuration.visibleFields.length
                    })}
                  </Typography>
                </CardContent>
              </Card>
            ))
          )}
          {!versionsLoading && !versionsError && !versions.length && (
            <Typography color="text.secondary">
              {t('document_template_history_empty')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionsOpen(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(previewTarget)}
        onClose={() => !previewing && setPreviewTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('document_template_preview_title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('document_template_preview_help', {
                name: previewTarget?.name
              })}
            </Typography>
            {previewError && <Alert severity="error">{previewError}</Alert>}
            <TextField
              autoFocus
              fullWidth
              type="number"
              label={
                previewTarget?.documentTypeCode === 'REQUEST'
                  ? t('maintenance_request_number')
                  : t('work_order_number')
              }
              value={previewWorkOrderId}
              onChange={(event) => setPreviewWorkOrderId(event.target.value)}
              inputProps={{ min: 1, inputMode: 'numeric' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewTarget(null)} disabled={previewing}>
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            startIcon={
              previewing ? (
                <CircularProgress size={16} />
              ) : (
                <PreviewOutlinedIcon />
              )
            }
            onClick={() => void previewPublishedTemplate()}
            disabled={previewing}
          >
            {t('preview')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DocumentTemplates;
