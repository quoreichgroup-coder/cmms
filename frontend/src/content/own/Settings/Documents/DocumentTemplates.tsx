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
  Divider,
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
  Tab,
  Tabs,
  Tooltip,
  Typography
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import PreviewOutlinedIcon from '@mui/icons-material/PreviewOutlined';
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import ReportFieldOrderEditor from './ReportFieldOrderEditor';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
  style: 'CLASSIC' | 'COMPACT' | 'MODERN';
  page: {
    size: 'A4' | 'LETTER';
    orientation: 'PORTRAIT' | 'LANDSCAPE';
    marginMm: number;
  };
  visibleFields: string[];
  fieldLabels?: Record<string, string>;
  options: { showPageNumbers: boolean; repeatTableHeader: boolean };
  pdfmeVersion?: string;
  basePdf?: { width: number; height: number; padding: number[] };
  schemas?: any[][];
}
interface DocumentTemplate {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  documentTypeCode: string;
  documentTypeName: string;
  providerCode: string;
  status: TemplateStatus;
  isDefault: boolean;
  draftVersion: number;
  publishedVersion: number;
  draftConfiguration?: TemplateConfiguration | null;
  publishedConfiguration?: TemplateConfiguration | null;
  defaultScope?: 'COMPANY' | 'SITE';
  siteId?: number | null;
  siteName?: string | null;
}
interface SiteOption {
  id: number;
  name: string;
}
interface DocumentType {
  id: number;
  code: string;
  name: string;
  category: string;
  providerCode: string;
  description?: string | null;
  systemManaged: boolean;
  active: boolean;
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
  'workOrder.actualDuration',
  'workOrder.category',
  'workOrder.team',
  'workOrder.completedBy',
  'workOrder.primaryUser',
  'workOrder.customers',
  'workOrder.createdBy',
  'workOrder.assignedTo',
  'workOrder.primaryUser',
  'workOrder.customers',
  'workOrder.feedback',
  'workOrder.signature',
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
  'company.email',
  'workOrder.executionTasks',
  'workOrder.laborTimeEntries',
  'workOrder.materialsUsed'
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
  'company.registrationNumber',
  'workOrder.signature',
  'workOrder.actualDuration'
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
const fieldsForType = (providerCode: string) =>
  providerCode === 'REQUEST' ? requestFields : workOrderFields;

const fieldTranslationKey = (field: string) =>
  `document_field_${field.replace(/\./g, '_')}`;

const isPdfmeConfiguration = (configuration: any) =>
  Boolean(configuration?.basePdf && Array.isArray(configuration?.schemas));

const emptyConfiguration = (
  documentType: DocumentType
): TemplateConfiguration => ({
  schemaVersion: '1.0',
  documentType: documentType.code,
  provider: documentType.providerCode,
  style: 'CLASSIC',
  page: { size: 'A4', orientation: 'LANDSCAPE', marginMm: 10 },
  visibleFields:
    documentType.providerCode === 'REQUEST'
      ? initialRequestFields
      : initialFields,
  fieldLabels: {},
  options: { showPageNumbers: true, repeatTableHeader: true }
});

function DocumentTemplates() {
  const { t }: { t: any } = useTranslation();
  const navigate = useNavigate();
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
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [newTypeProvider, setNewTypeProvider] = useState('WORK_ORDER');
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [blankName, setBlankName] = useState('');
  const [blankCode, setBlankCode] = useState('');
  const [startSearch, setStartSearch] = useState('');
  const [openDesignerAfterSave, setOpenDesignerAfterSave] = useState(false);
  const [editorSection, setEditorSection] = useState(0);
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<DocumentTemplate | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<DocumentTemplate | null>(
    null
  );
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [templateScope, setTemplateScope] = useState<'COMPANY' | 'SITE'>(
    'COMPANY'
  );
  const [templateSiteId, setTemplateSiteId] = useState('');
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
      const [templateList, typeList, siteList] = await Promise.all([
        api.get<DocumentTemplate[]>('document-templates'),
        api.get<DocumentType[]>('document-templates/types'),
        api.get<SiteOption[]>('sites')
      ]);
      if (
        !Array.isArray(templateList) ||
        !Array.isArray(typeList) ||
        !Array.isArray(siteList)
      ) {
        throw new Error('invalid_document_template_response');
      }
      setTemplates(templateList);
      setTypes(typeList);
      setSites(siteList);
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
          type.active && ['WORK_ORDER', 'REQUEST'].includes(type.providerCode)
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
  const designerStartTemplates = useMemo(() => {
    const query = startSearch.trim().toLocaleLowerCase();
    return templates.filter(
      (item) =>
        item.documentTypeCode === 'WORK_ORDER' &&
        item.status !== 'ARCHIVED' &&
        (!query ||
          [item.name, item.code, item.documentTypeName].some((value) =>
            value.toLocaleLowerCase().includes(query)
          ))
    );
  }, [startSearch, templates]);

  const openStartDialog = () => {
    const base = 'WO_JOB_CARD';
    const existingCodes = new Set(
      templates.map((item) => item.code.toLocaleLowerCase())
    );
    let candidate = base;
    let suffix = 2;
    while (existingCodes.has(candidate.toLocaleLowerCase())) {
      candidate = `${base}_${suffix++}`;
    }
    setBlankName(t('document_designer_blank_name'));
    setBlankCode(candidate);
    setStartSearch('');
    setStartDialogOpen(true);
  };

  const createBlankDesigner = async () => {
    const normalizedCode = blankCode.trim();
    if (
      !blankName.trim() ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{1,59}$/.test(normalizedCode)
    ) {
      showSnackBar(t('document_template_form_error'), 'error');
      return;
    }
    const type = supportedTypes.find((item) => item.code === 'WORK_ORDER');
    if (!type || !canCreateTemplates) {
      showSnackBar(t('document_template_permission_error'), 'error');
      return;
    }
    setSaving(true);
    try {
      const created = await api.post<DocumentTemplate>('document-templates', {
        documentTypeCode: type.code,
        code: normalizedCode,
        name: blankName.trim(),
        configuration: {
          schemaVersion: '2.0',
          documentType: type.code,
          provider: type.providerCode,
          style: 'MODERN',
          page: { size: 'A4', orientation: 'LANDSCAPE', marginMm: 10 },
          layout: [
            {
              id: 'work-order-main',
              type: 'SECTION',
              title: t('document_designer_work_order_section'),
              columns: 2,
              items: []
            }
          ],
          options: { showPageNumbers: true, repeatTableHeader: true }
        }
      });
      if (!created?.id) throw new Error('invalid_document_template_response');
      setStartDialogOpen(false);
      showSnackBar(t('document_designer_blank_created'), 'success');
      navigate(`/app/settings/documents/${created.id}/designer`);
    } catch (error) {
      showSnackBar(
        getErrorMessage(error, t('document_template_save_error')),
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    const type =
      supportedTypes.find((item) => item.code === 'WORK_ORDER') ||
      supportedTypes[0];
    if (!type) return;
    setEditing(null);
    setOpenDesignerAfterSave(false);
    setName('');
    setCode('');
    setDescription('');
    setTemplateScope('COMPANY');
    setTemplateSiteId('');
    setConfiguration(emptyConfiguration(type));
    setFormError('');
    setEditorSection(0);
    setEditorOpen(true);
  };

  const openTypeEditor = (type: DocumentType) => {
    setEditingType(type);
    setNewTypeName(type.name);
    setNewTypeDescription(type.description || '');
    setNewTypeProvider(type.providerCode);
    setTypeDialogOpen(true);
  };

  const saveDocumentType = async () => {
    if (!newTypeName.trim() || !canEditTemplates) return;
    setSaving(true);
    try {
      const payload = {
        name: newTypeName.trim(),
        description: newTypeDescription.trim() || null,
        providerCode: editingType?.providerCode || newTypeProvider
      };
      if (editingType) {
        await api.put(`document-templates/types/${editingType.id}`, payload);
        showSnackBar(t('document_type_updated'), 'success');
      } else {
        const created = await api.post<DocumentType>(
          'document-templates/types',
          payload
        );
        if (!created?.code) throw new Error('invalid_document_type_response');
        showSnackBar(t('document_type_created'), 'success');
      }
      setTypeDialogOpen(false);
      setTypeManagerOpen(false);
      setEditingType(null);
      setNewTypeName('');
      setNewTypeDescription('');
      await loadTemplates();
    } catch (error) {
      showSnackBar(
        getErrorMessage(
          error,
          editingType
            ? t('document_type_update_error')
            : t('document_type_create_error')
        ),
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleDocumentType = async (type: DocumentType) => {
    if (!canEditTemplates || type.systemManaged) return;
    setSaving(true);
    try {
      await api.put(`document-templates/types/${type.id}`, {
        name: type.name,
        description: type.description || null,
        providerCode: type.providerCode,
        active: !type.active
      });
      showSnackBar(
        t(
          type.active
            ? 'document_type_deactivated'
            : 'document_type_reactivated'
        ),
        'success'
      );
      await loadTemplates();
    } catch (error) {
      showSnackBar(
        getErrorMessage(error, t('document_type_deactivate_error')),
        'error'
      );
    } finally {
      setSaving(false);
    }
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
    setOpenDesignerAfterSave(false);
    setName(template.name);
    setCode(template.code);
    setDescription(template.description || '');
    setTemplateScope(template.defaultScope === 'SITE' ? 'SITE' : 'COMPANY');
    setTemplateSiteId(template.siteId ? String(template.siteId) : '');
    setConfiguration({
      ...source,
      page: { ...source.page },
      options: { ...source.options },
      visibleFields: [...source.visibleFields],
      fieldLabels: { ...source.fieldLabels }
    });
    setFormError('');
    setEditorSection(0);
    setEditorOpen(true);
  };

  const openDuplicate = async (template: DocumentTemplate) => {
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
    if (template.documentTypeCode === 'WORK_ORDER') {
      setSaving(true);
      try {
        const created = await api.post<DocumentTemplate>('document-templates', {
          documentTypeCode: template.documentTypeCode,
          code: duplicateCode,
          name: t('document_template_copy_name', { name: template.name }),
          description: template.description || null,
          defaultScope: template.defaultScope || 'COMPANY',
          siteId: template.siteId || null,
          configuration: source
        });
        if (!created?.id) throw new Error('invalid_document_template_response');
        showSnackBar(t('document_template_saved'), 'success');
        await loadTemplates();
        navigate(`/app/settings/documents/${created.id}/designer`);
      } catch (duplicateError) {
        showSnackBar(
          getErrorMessage(duplicateError, t('document_template_save_error')),
          'error'
        );
      } finally {
        setSaving(false);
      }
      return;
    }
    setEditing(null);
    setStartDialogOpen(false);
    setOpenDesignerAfterSave(true);
    setName(t('document_template_copy_name', { name: template.name }));
    setCode(duplicateCode);
    setDescription(template.description || '');
    setTemplateScope(template.defaultScope === 'SITE' ? 'SITE' : 'COMPANY');
    setTemplateSiteId(template.siteId ? String(template.siteId) : '');
    setConfiguration({
      ...source,
      page: { ...source.page },
      options: { ...source.options },
      visibleFields: [...source.visibleFields],
      fieldLabels: { ...source.fieldLabels }
    });
    setFormError('');
    setEditorSection(0);
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
        target.providerCode === 'REQUEST'
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
      configuration.visibleFields.length > 32
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
    if (templateScope === 'SITE' && !templateSiteId) {
      setFormError(t('document_template_site_required'));
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      documentTypeCode: configuration.documentType,
      code: editing?.code || code.trim(),
      name: name.trim(),
      description: description.trim() || null,
      defaultScope: templateScope,
      siteId: templateScope === 'SITE' ? Number(templateSiteId) : null,
      configuration
    };
    try {
      if (editing) await api.put(`document-templates/${editing.id}`, payload);
      else {
        const created = await api.post<DocumentTemplate>(
          'document-templates',
          payload
        );
        if (openDesignerAfterSave && created?.id) {
          setEditorOpen(false);
          showSnackBar(t('document_template_saved'), 'success');
          await loadTemplates();
          navigate(`/app/settings/documents/${created.id}/designer`);
          setOpenDesignerAfterSave(false);
          return;
        }
      }
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

  const deleteTemplate = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.deletes(`document-templates/${deleteTarget.id}`);
      setDeleteTarget(null);
      showSnackBar(t('document_template_deleted'), 'success');
      await loadTemplates();
    } catch (error) {
      showSnackBar(
        getErrorMessage(error, t('document_template_delete_error')),
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
          <Button
            variant="outlined"
            onClick={() => {
              setEditingType(null);
              setNewTypeName('');
              setNewTypeDescription('');
              setNewTypeProvider('WORK_ORDER');
              setTypeDialogOpen(true);
            }}
            disabled={!canCreateTemplates}
          >
            {t('document_type_create')}
          </Button>
          <Button variant="text" onClick={() => setTypeManagerOpen(true)}>
            {t('document_type_manage')}
          </Button>
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
            onClick={openStartDialog}
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
                        <Chip
                          size="small"
                          variant="outlined"
                          label={
                            template.defaultScope === 'SITE'
                              ? `${t('document_template_scope_site')}: ${
                                  template.siteName ||
                                  t('document_template_site_missing')
                                }`
                              : t('document_template_scope_company')
                          }
                        />
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
                        {template.status !== 'ARCHIVED' &&
                          canEditTemplates &&
                          template.documentTypeCode === 'WORK_ORDER' && (
                            <Button
                              size="small"
                              startIcon={<DesignServicesOutlinedIcon />}
                              onClick={() =>
                                navigate(
                                  `/app/settings/documents/${template.id}/designer`
                                )
                              }
                            >
                              {t('document_designer_open')}
                            </Button>
                          )}
                        {template.status !== 'ARCHIVED' &&
                          canEditTemplates &&
                          template.documentTypeCode !== 'WORK_ORDER' && (
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
                        {canEditTemplates && (
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteOutlineIcon />}
                            onClick={() => setDeleteTarget(template)}
                          >
                            {t('delete')}
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
        open={typeDialogOpen}
        onClose={() => !saving && setTypeDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="document-type-create-title"
      >
        <DialogTitle id="document-type-create-title">
          {t(
            editingType
              ? 'document_type_edit_title'
              : 'document_type_create_title'
          )}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              required
              fullWidth
              label={t('document_type_name')}
              value={newTypeName}
              onChange={(event) => setNewTypeName(event.target.value)}
              inputProps={{ maxLength: 120 }}
              helperText={t('document_type_name_hint')}
            />
            <FormControl fullWidth>
              <InputLabel id="document-type-provider-label">
                {t('document_type_source')}
              </InputLabel>
              <Select
                labelId="document-type-provider-label"
                label={t('document_type_source')}
                value={newTypeProvider}
                onChange={(event) => setNewTypeProvider(event.target.value)}
                disabled={Boolean(editingType)}
              >
                <MenuItem value="WORK_ORDER">{t('work_order')}</MenuItem>
                <MenuItem value="REQUEST">{t('maintenance_request')}</MenuItem>
              </Select>
              <FormHelperText>{t('document_type_source_hint')}</FormHelperText>
            </FormControl>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label={t('description')}
              value={newTypeDescription}
              onChange={(event) => setNewTypeDescription(event.target.value)}
              inputProps={{ maxLength: 500 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeDialogOpen(false)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveDocumentType()}
            disabled={
              saving ||
              !newTypeName.trim() ||
              (editingType ? !canEditTemplates : !canCreateTemplates)
            }
          >
            {saving ? (
              <CircularProgress size={18} />
            ) : (
              t(editingType ? 'save' : 'document_type_create')
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={typeManagerOpen}
        onClose={() => setTypeManagerOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('document_type_manage')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {types
              .filter(
                (type) =>
                  !type.systemManaged &&
                  ['WORK_ORDER', 'REQUEST'].includes(type.providerCode)
              )
              .map((type) => (
                <Card key={type.code} variant="outlined">
                  <CardContent
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: '12px !important'
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={600}>{type.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {type.providerCode === 'WORK_ORDER'
                          ? t('work_order')
                          : t('maintenance_request')}
                        {type.description ? ` · ${type.description}` : ''}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      color={type.active ? 'success' : 'default'}
                      label={t(type.active ? 'active' : 'inactive')}
                    />
                    <IconButton
                      aria-label={`${t('edit')} ${type.name}`}
                      onClick={() => openTypeEditor(type)}
                      disabled={!canEditTemplates}
                    >
                      <EditOutlinedIcon />
                    </IconButton>
                    <IconButton
                      aria-label={t(
                        type.active
                          ? 'document_type_deactivate'
                          : 'document_type_reactivate'
                      )}
                      onClick={() => void toggleDocumentType(type)}
                      disabled={!canEditTemplates || saving}
                    >
                      {type.active ? (
                        <ToggleOffOutlinedIcon />
                      ) : (
                        <ToggleOnOutlinedIcon />
                      )}
                    </IconButton>
                  </CardContent>
                </Card>
              ))}
            {!types.some(
              (type) =>
                !type.systemManaged &&
                ['WORK_ORDER', 'REQUEST'].includes(type.providerCode)
            ) && (
              <Typography color="text.secondary">
                {t('document_type_manage_empty')}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeManagerOpen(false)}>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={startDialogOpen}
        onClose={() => !saving && setStartDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{t('document_designer_start_title')}</DialogTitle>
        <DialogContent dividers>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('document_designer_start_hint')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700}>
                    {t('document_designer_start_blank')}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5, mb: 2 }}
                  >
                    {t('document_designer_start_blank_hint')}
                  </Typography>
                  <Stack spacing={1.5}>
                    <TextField
                      required
                      fullWidth
                      size="small"
                      label={t('name')}
                      value={blankName}
                      onChange={(event) => setBlankName(event.target.value)}
                      inputProps={{ maxLength: 160 }}
                    />
                    <TextField
                      required
                      fullWidth
                      size="small"
                      label={t('document_template_code')}
                      value={blankCode}
                      onChange={(event) => setBlankCode(event.target.value)}
                      inputProps={{
                        maxLength: 60,
                        pattern: '[A-Za-z0-9][A-Za-z0-9_-]{1,59}'
                      }}
                      helperText={t('document_template_code_hint')}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AddOutlinedIcon />}
                      onClick={() => void createBlankDesigner()}
                      disabled={
                        saving ||
                        !canCreateTemplates ||
                        !supportedTypes.some(
                          (type) => type.code === 'WORK_ORDER'
                        )
                      }
                    >
                      {t('document_designer_create_blank')}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={7}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700}>
                    {t('document_designer_start_existing')}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5, mb: 1.5 }}
                  >
                    {t('document_designer_start_existing_hint')}
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('document_templates_search')}
                    value={startSearch}
                    onChange={(event) => setStartSearch(event.target.value)}
                    sx={{ mb: 1.25 }}
                  />
                  <Stack
                    spacing={1}
                    sx={{ maxHeight: 300, overflowY: 'auto', pr: 0.5 }}
                  >
                    {designerStartTemplates.length ? (
                      designerStartTemplates.map((item) => (
                        <Card key={item.id} variant="outlined">
                          <CardContent sx={{ '&:last-child': { pb: 1.5 } }}>
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              alignItems={{ xs: 'stretch', sm: 'center' }}
                              justifyContent="space-between"
                              spacing={1}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  fontWeight={650}
                                  sx={{ overflowWrap: 'anywhere' }}
                                >
                                  {item.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ overflowWrap: 'anywhere' }}
                                >
                                  {item.code} · {item.documentTypeName}
                                </Typography>
                              </Box>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<FileCopyOutlinedIcon />}
                                onClick={() => openDuplicate(item)}
                                disabled={!canCreateTemplates}
                              >
                                {t('document_designer_use_template')}
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Alert severity="info">
                        {t(
                          startSearch
                            ? 'document_templates_no_search_results'
                            : 'document_designer_no_start_templates'
                        )}
                      </Alert>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Button
            size="small"
            onClick={() => {
              setStartDialogOpen(false);
              openCreate();
            }}
          >
            {t('document_designer_basic_create')}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartDialogOpen(false)} disabled={saving}>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>

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
            <Tabs
              value={editorSection}
              onChange={(_, value) => setEditorSection(value)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label={t('document_template_editor_sections')}
            >
              <Tab label={t('document_template_section_general')} />
              <Tab label={t('document_template_section_page')} />
              <Tab label={t('document_template_section_fields')} />
            </Tabs>
            {editorSection === 0 && (
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
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="template-scope-label">
                      {t('document_template_scope')}
                    </InputLabel>
                    <Select
                      labelId="template-scope-label"
                      label={t('document_template_scope')}
                      value={templateScope}
                      onChange={(event) =>
                        setTemplateScope(
                          event.target.value as 'COMPANY' | 'SITE'
                        )
                      }
                    >
                      <MenuItem value="COMPANY">
                        {t('document_template_scope_company')}
                      </MenuItem>
                      <MenuItem value="SITE">
                        {t('document_template_scope_site')}
                      </MenuItem>
                    </Select>
                    <FormHelperText>
                      {t('document_template_scope_help')}
                    </FormHelperText>
                  </FormControl>
                </Grid>
                {templateScope === 'SITE' && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel id="template-site-label">
                        {t('site')}
                      </InputLabel>
                      <Select
                        labelId="template-site-label"
                        label={t('site')}
                        value={templateSiteId}
                        onChange={(event) =>
                          setTemplateSiteId(String(event.target.value))
                        }
                      >
                        {sites.map((site) => (
                          <MenuItem key={site.id} value={String(site.id)}>
                            {site.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {!sites.length && (
                        <FormHelperText>
                          {t('document_template_no_sites')}
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            )}
            {configuration && (
              <>
                {editorSection === 1 && (
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
                            <MenuItem value="LANDSCAPE">
                              {t('landscape')}
                            </MenuItem>
                            <MenuItem value="PORTRAIT">
                              {t('portrait')}
                            </MenuItem>
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
                            <MenuItem value="MODERN">
                              {t('document_template_modern')}
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
                  </>
                )}
                {editorSection === 2 && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight={650}>
                      {t('document_template_fields')}
                    </Typography>
                    <FormHelperText>
                      {t('document_template_fields_hint')}
                    </FormHelperText>
                    <Grid container spacing={0.5} sx={{ mt: 0.5 }}>
                      {fieldsForType(configuration.provider).map((field) => (
                        <Grid item xs={12} sm={6} md={4} key={field}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={configuration.visibleFields.includes(
                                  field
                                )}
                                onChange={(event) =>
                                  (() => {
                                    const visibleFields = event.target.checked
                                      ? [...configuration.visibleFields, field]
                                      : configuration.visibleFields.filter(
                                          (item) => item !== field
                                        );
                                    const fieldLabels = {
                                      ...configuration.fieldLabels
                                    };
                                    if (!event.target.checked) {
                                      delete fieldLabels[field];
                                    }
                                    setConfiguration({
                                      ...configuration,
                                      visibleFields,
                                      fieldLabels
                                    });
                                  })()
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
                    <ReportFieldOrderEditor
                      fields={configuration.visibleFields}
                      labelFor={(field) => t(fieldTranslationKey(field), field)}
                      labelOverrides={configuration.fieldLabels || {}}
                      onLabelOverrideChange={(field, value) => {
                        const fieldLabels = { ...configuration.fieldLabels };
                        if (value) fieldLabels[field] = value;
                        else delete fieldLabels[field];
                        setConfiguration({ ...configuration, fieldLabels });
                      }}
                      title={t('document_template_field_order')}
                      hint={t('document_template_field_order_hint')}
                      companyHeaderLabel={t(
                        'document_template_canvas_company_header'
                      )}
                      documentTitle={t(
                        configuration.provider === 'REQUEST'
                          ? 'document_template_canvas_request_title'
                          : 'document_template_canvas_work_order_title'
                      )}
                      fieldBlockLabel={t(
                        'document_template_canvas_field_block'
                      )}
                      tableBlockLabel={t(
                        'document_template_canvas_table_block'
                      )}
                      customLabelLabel={t(
                        'document_template_canvas_custom_label'
                      )}
                      moveUpLabel={t('document_template_canvas_move_up')}
                      moveDownLabel={t('document_template_canvas_move_down')}
                      onChange={(visibleFields) =>
                        setConfiguration({ ...configuration, visibleFields })
                      }
                    />
                  </Box>
                )}
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
        open={Boolean(deleteTarget)}
        onClose={() => !saving && setDeleteTarget(null)}
        aria-labelledby="template-delete-title"
      >
        <DialogTitle id="template-delete-title">
          {t('document_template_delete_title')}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {t('document_template_delete_message', {
              name: deleteTarget?.name
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void deleteTemplate()}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : t('delete')}
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
                    {isPdfmeConfiguration(version.configuration)
                      ? `PDFME ${
                          version.configuration.pdfmeVersion || ''
                        } · A4 · ${version.configuration.schemas.reduce(
                          (total: number, page: any[]) => total + page.length,
                          0
                        )} ${t('document_designer_components')}`
                      : `${version.configuration.page.size} · ${
                          version.configuration.page.orientation
                        } · ${version.configuration.style} · ${t(
                          'document_template_selected_fields_count',
                          {
                            count:
                              version.configuration.visibleFields?.length || 0
                          }
                        )}`}
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
                previewTarget?.providerCode === 'REQUEST'
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
