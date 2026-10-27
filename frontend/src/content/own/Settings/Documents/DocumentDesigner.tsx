import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import {
  UNSAFE_NavigationContext,
  useNavigate,
  useParams
} from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';
import ArrowUpwardOutlinedIcon from '@mui/icons-material/ArrowUpwardOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RedoOutlinedIcon from '@mui/icons-material/RedoOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import api, { getErrorMessage } from '../../../../utils/api';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { isPdfContentType } from '../../../../utils/documentResponse';
import { blockDocumentNavigation } from './documentDesignerNavigation';

type StylePreset = 'CLASSIC' | 'COMPACT' | 'MODERN';
type FieldItem = {
  id: string;
  type: 'FIELD' | 'TABLE' | 'SIGNATURE';
  fieldKey: string;
  label?: string;
  title?: string;
  hideIfEmpty?: boolean;
  fullWidth?: boolean;
  columnWidths?: number[];
  tableColumns?: string[];
  style?: {
    fontSize?: number;
    bold?: boolean;
    alignment?: 'LEFT' | 'CENTER' | 'RIGHT';
    tone?: 'DEFAULT' | 'ACCENT';
  };
};
type Section = {
  id: string;
  type: 'SECTION';
  title: string;
  columns: 1 | 2 | 3;
  pageBreakBefore?: boolean;
  keepTogether?: boolean;
  items: FieldItem[];
};
type Configuration = {
  schemaVersion: '2.0';
  documentType: string;
  provider: string;
  style: StylePreset;
  page: {
    size: 'A4' | 'LETTER';
    orientation: 'PORTRAIT' | 'LANDSCAPE';
    marginMm: number;
  };
  layout: Section[];
  options: { showPageNumbers: boolean; repeatTableHeader: boolean };
  design?: { accentColor?: string };
};
type DesignerView = 'LAYOUT' | 'PDF';
type Template = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  documentTypeCode: string;
  documentTypeName: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isDefault: boolean;
  draftVersion: number;
  publishedVersion: number;
  draftConfiguration?: any;
  publishedConfiguration?: any;
};

const FIELD_KEYS = [
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
  'workOrder.assignedTo',
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
const TABLE_KEYS = new Set([
  'workOrder.executionTasks',
  'workOrder.laborTimeEntries',
  'workOrder.materialsUsed'
]);
const idFor = (seed: string) =>
  `${seed.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 38)}-${Date.now().toString(
    36
  )}-${Math.random().toString(36).slice(2, 7)}`;
const defaultLabel = (field: string) =>
  field
    .split('.')
    .pop()
    ?.replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase()) || field;
const fieldTranslationKey = (field: string) =>
  `document_field_${field.replace(/\./g, '_')}`;

const sampleValues: Record<string, string> = {
  'workOrder.customId': 'WO-2026-00482',
  'workOrder.title': 'Inspecter la pompe de transfert P-204',
  'workOrder.description':
    'Vérifier le bruit anormal, contrôler les vibrations et confirmer le débit après intervention.',
  'workOrder.status': 'En cours',
  'workOrder.priority': 'Haute',
  'workOrder.dueDate': '22/10/2026 · 14:30',
  'workOrder.completedAt': '22/10/2026 · 16:05',
  'workOrder.estimatedDuration': '2 h 30',
  'workOrder.actualDuration': '1.75',
  'workOrder.category': 'Maintenance corrective',
  'workOrder.team': 'Équipe mécanique',
  'workOrder.completedBy': 'A. Traoré',
  'workOrder.assignedTo': 'A. Traoré · M. Diallo',
  'workOrder.feedback':
    'Alignement corrigé. Essai à vide effectué et résultat conforme.',
  'asset.name': 'Pompe de transfert P-204',
  'asset.serialNumber': 'SN-P204-0018',
  'location.name': 'Zone de pompage · Atelier 2',
  'site.name': 'Site principal',
  'company.name': 'Entreprise de démonstration',
  'company.legalName': 'QPM · Exemple de mise en page',
  'company.registeredAddress': 'Adresse de démonstration',
  'company.registrationNumber': 'Exemple · immatriculation',
  'company.taxNumber': 'Exemple · identifiant fiscal',
  'company.phone': '+000 00 00 00 00',
  'company.email': 'maintenance@example.test'
};

const TABLE_HEADERS: Record<string, string[]> = {
  'workOrder.executionTasks': [
    'document_designer_column_number',
    'document_designer_sample_operation',
    'document_designer_column_result',
    'document_designer_column_notes'
  ],
  'workOrder.laborTimeEntries': [
    'document_designer_sample_technician',
    'document_designer_column_activity',
    'document_designer_column_started',
    'document_designer_column_time',
    'document_designer_column_entry_status'
  ],
  'workOrder.materialsUsed': [
    'document_designer_column_part',
    'document_designer_sample_description',
    'document_designer_sample_quantity',
    'document_designer_column_unit'
  ]
};
const DEFAULT_TABLE_WIDTHS: Record<string, number[]> = {
  'workOrder.executionTasks': [10, 38, 18, 34],
  'workOrder.laborTimeEntries': [24, 28, 20, 16, 12],
  'workOrder.materialsUsed': [20, 40, 16, 24]
};
const TABLE_COLUMN_IDS: Record<string, string[]> = {
  'workOrder.executionTasks': ['step', 'task', 'result', 'notes'],
  'workOrder.laborTimeEntries': [
    'technician',
    'activity',
    'startedAt',
    'durationSeconds',
    'status'
  ],
  'workOrder.materialsUsed': ['part', 'description', 'quantity', 'unit']
};
const tableWidthsFor = (item: FieldItem) =>
  item.columnWidths || DEFAULT_TABLE_WIDTHS[item.fieldKey] || [];
const tableColumnsFor = (item: FieldItem) =>
  item.tableColumns || TABLE_COLUMN_IDS[item.fieldKey] || [];
const equalTableWidths = (count: number) => {
  if (count === 1) return [100];
  const base = Math.floor(100 / count);
  return Array.from(
    { length: count },
    (_, index) => base + (index < 100 % count ? 1 : 0)
  );
};

function redistributeColumnWidth(
  current: number[],
  index: number,
  value: number
) {
  if (!Number.isFinite(value) || !current.length) return current;
  const desired = Math.max(
    10,
    Math.min(current.length === 1 ? 100 : 70, Math.round(value))
  );
  const widths = [...current];
  const previous = widths[index];
  let delta = desired - previous;
  widths[index] = desired;
  for (let cursor = 0; cursor < widths.length && delta !== 0; cursor += 1) {
    if (cursor === index) continue;
    const capacity =
      delta > 0
        ? widths[cursor] - 10
        : (widths.length === 1 ? 100 : 70) - widths[cursor];
    const adjustment = Math.sign(delta) * Math.min(Math.abs(delta), capacity);
    widths[cursor] -= adjustment;
    delta -= adjustment;
  }
  return delta === 0 ? widths : current;
}

const sampleTableRows: Record<string, string[][]> = {
  'workOrder.executionTasks': [
    ['01', 'Inspection visuelle', 'Conforme', 'Aucune anomalie'],
    ['02', 'Contrôle des vibrations', 'À suivre', 'M. Diallo']
  ],
  'workOrder.laborTimeEntries': [
    ['A. Traoré', 'Inspection', '08:15', '1 h 30', 'Confirmé'],
    ['M. Diallo', 'Contrôle', '09:00', '0 h 55', 'Confirmé']
  ],
  'workOrder.materialsUsed': [
    ['BRG-6205', 'Roulement · exemple', '2', 'pcs'],
    ['LUB-ISO46', 'Huile · exemple', '0,5', 'L']
  ]
};

function toDesignerSchema(
  source: any,
  documentType: string,
  provider: string
): Configuration {
  if (source?.schemaVersion === '2.0' && Array.isArray(source.layout)) {
    return {
      ...source,
      page: { ...source.page },
      options: { ...source.options },
      layout: source.layout.map((section: Section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          columnWidths: item.columnWidths ? [...item.columnWidths] : undefined,
          tableColumns: item.tableColumns ? [...item.tableColumns] : undefined,
          style: item.style ? { ...item.style } : undefined
        }))
      }))
    };
  }
  const buckets: Record<string, Section> = {};
  (Array.isArray(source?.visibleFields)
    ? source.visibleFields
    : FIELD_KEYS.slice(0, 10)
  ).forEach((field: string, index: number) => {
    const group = field.startsWith('company.')
      ? 'Company and branding'
      : field.startsWith('asset.') ||
        field.startsWith('location.') ||
        field === 'site.name'
      ? 'Equipment and location'
      : TABLE_KEYS.has(field)
      ? field.includes('executionTasks')
        ? 'Operations and checks'
        : field.includes('labor')
        ? 'Labor and actual time'
        : 'Materials and spare parts'
      : field.includes('dueDate') || field.includes('Duration')
      ? 'Planning and scheduling'
      : field === 'workOrder.feedback'
      ? 'Execution notes'
      : 'Work Order identification';
    if (!buckets[group])
      buckets[group] = {
        id: idFor(group),
        type: 'SECTION',
        title: group,
        columns: 2,
        items: []
      };
    const item: FieldItem = {
      id: idFor(field + index),
      type: TABLE_KEYS.has(field)
        ? 'TABLE'
        : field === 'workOrder.signature'
        ? 'SIGNATURE'
        : 'FIELD',
      fieldKey: field,
      ...(TABLE_KEYS.has(field)
        ? {
            columnWidths: [...DEFAULT_TABLE_WIDTHS[field]],
            tableColumns: [...TABLE_COLUMN_IDS[field]]
          }
        : {})
    };
    if (source?.fieldLabels?.[field])
      item[TABLE_KEYS.has(field) ? 'title' : 'label'] =
        source.fieldLabels[field];
    buckets[group].items.push(item);
  });
  return {
    schemaVersion: '2.0',
    documentType,
    provider,
    style: source?.style || 'CLASSIC',
    page: {
      size: source?.page?.size || 'A4',
      orientation: source?.page?.orientation || 'LANDSCAPE',
      marginMm: source?.page?.marginMm || 10
    },
    layout: Object.values(buckets),
    options: {
      showPageNumbers: source?.options?.showPageNumbers ?? true,
      repeatTableHeader: source?.options?.repeatTableHeader ?? true
    }
  };
}

export default function DocumentDesigner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const navigation = useContext(UNSAFE_NavigationContext);
  const { t }: { t: any } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [template, setTemplate] = useState<Template | null>(null);
  const [configuration, setConfiguration] = useState<Configuration | null>(
    null
  );
  const latestConfiguration = useRef(configuration);
  latestConfiguration.current = configuration;
  const [savedConfiguration, setSavedConfiguration] = useState('');
  const savedConfigurationRef = useRef('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');
  const [history, setHistory] = useState<Configuration[]>([]);
  const [future, setFuture] = useState<Configuration[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [previewConfiguration, setPreviewConfiguration] = useState('');
  const [designerView, setDesignerView] = useState<DesignerView>('LAYOUT');
  const [workOrderId, setWorkOrderId] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const templates = await api.get<Template[]>('document-templates');
      const current = templates.find((item) => item.id === Number(id));
      if (
        !current ||
        current.documentTypeCode !== 'WORK_ORDER' ||
        current.status === 'ARCHIVED'
      )
        throw new Error('document_template_unavailable');
      const source =
        current.draftConfiguration || current.publishedConfiguration;
      if (!source)
        throw new Error('document_template_configuration_unavailable');
      const next = toDesignerSchema(
        source,
        current.documentTypeCode,
        'WORK_ORDER'
      );
      setTemplate(current);
      setConfiguration(next);
      setSavedConfiguration(JSON.stringify(next));
      savedConfigurationRef.current = JSON.stringify(next);
      setSelectedSection(next.layout[0]?.id || '');
      setSelectedItem(next.layout[0]?.items[0]?.id || '');
    } catch (reason) {
      setError(getErrorMessage(reason, t('document_designer_load_error')));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(
    () => () => {
      if (pdfPreviewUrl) window.URL.revokeObjectURL(pdfPreviewUrl);
    },
    [pdfPreviewUrl]
  );
  const isDirty = Boolean(
    configuration && JSON.stringify(configuration) !== savedConfiguration
  );
  useEffect(() => {
    if (!isDirty) return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty || leaveOpen) return undefined;
    // React Router 6.3 has no public blocker; BrowserRouter supplies history v5.
    return blockDocumentNavigation(navigation.navigator, (retry) => {
      setPendingNavigation(() => retry);
      setLeaveOpen(true);
    });
  }, [isDirty, leaveOpen, navigation.navigator]);

  const requestLeave = () => {
    navigate('/app/settings/documents');
  };

  const commit = (update: (current: Configuration) => Configuration) => {
    if (saving) return;
    setDesignerView('LAYOUT');
    setConfiguration((current) => {
      if (!current) return current;
      setHistory((items) => [...items.slice(-29), current]);
      setFuture([]);
      return update(current);
    });
  };
  const updateTableColumns = (itemId: string, next: string[]) => {
    if (!next.length) return;
    const currentItem = configuration?.layout
      .flatMap((section) => section.items)
      .find((item) => item.id === itemId);
    const currentColumns = currentItem ? tableColumnsFor(currentItem) : [];
    const currentWidths = currentItem ? tableWidthsFor(currentItem) : [];
    const reordered = next.length === currentColumns.length;
    const widths = reordered
      ? next.map(
          (column) => currentWidths[currentColumns.indexOf(column)] ?? 10
        )
      : equalTableWidths(next.length);
    commit((current) => ({
      ...current,
      layout: current.layout.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          item.id === itemId
            ? { ...item, tableColumns: next, columnWidths: widths }
            : item
        )
      }))
    }));
  };
  const undo = () => {
    if (saving || !configuration || !history.length) return;
    setFuture((items) => [...items, configuration]);
    setConfiguration(history[history.length - 1]);
    setHistory((items) => items.slice(0, -1));
  };
  const redo = () => {
    if (saving || !configuration || !future.length) return;
    setHistory((items) => [...items, configuration]);
    setConfiguration(future[future.length - 1]);
    setFuture((items) => items.slice(0, -1));
  };
  const selected = useMemo(() => {
    const section = configuration?.layout.find(
      (item) => item.id === selectedSection
    );
    const item = section?.items.find((entry) => entry.id === selectedItem);
    return { section, item };
  }, [configuration, selectedSection, selectedItem]);
  const tableColumnControlOrder =
    selected.item?.type === 'TABLE'
      ? [
          ...tableColumnsFor(selected.item),
          ...TABLE_COLUMN_IDS[selected.item.fieldKey].filter(
            (column) => !tableColumnsFor(selected.item!).includes(column)
          )
        ]
      : [];
  const availableFields = useMemo(() => {
    const query = fieldSearch.trim().toLocaleLowerCase();
    return FIELD_KEYS.filter((field) => {
      const localized = String(
        t(fieldTranslationKey(field), {
          defaultValue: defaultLabel(field)
        })
      );
      return (
        !query || `${localized} ${field}`.toLocaleLowerCase().includes(query)
      );
    });
  }, [fieldSearch, t]);
  const previewIsOutdated = Boolean(
    pdfPreviewUrl &&
      configuration &&
      previewConfiguration !== JSON.stringify(configuration)
  );
  const hasComponents = Boolean(
    configuration?.layout.some((section) => section.items.length > 0)
  );

  const saveDraft = async () => {
    if (!template || !configuration) return false;
    setSaving(true);
    setError('');
    const configurationToSave = JSON.stringify(configuration);
    try {
      await api.put(`document-templates/${template.id}`, {
        documentTypeCode: template.documentTypeCode,
        code: template.code,
        name: template.name,
        description: template.description || null,
        configuration
      });
      setSavedConfiguration(configurationToSave);
      savedConfigurationRef.current = configurationToSave;
      showSnackBar(t('document_designer_saved'), 'success');
      return true;
    } catch (reason) {
      setError(getErrorMessage(reason, t('document_template_save_error')));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const preview = async () => {
    const sourceId = Number(workOrderId);
    if (!template || !Number.isSafeInteger(sourceId) || sourceId <= 0) {
      setError(t('document_template_preview_work_order_required'));
      return;
    }
    // Open synchronously from the user gesture; browsers may block a tab opened
    // only after the asynchronous PDF request has completed.
    const previewWindow = window.open('about:blank', '_blank');
    if (previewWindow) previewWindow.opener = null;
    if (!(await saveDraft())) {
      previewWindow?.close();
      return;
    }
    setSaving(true);
    try {
      const response = await api.post<Response>(
        `document-templates/${
          template.id
        }/preview-pdf?workOrderId=${encodeURIComponent(sourceId)}`,
        null,
        { raw: true }
      );
      if (!isPdfContentType(response.headers.get('content-type')))
        throw new Error('invalid_document_content_type');
      const blob = await response.blob();
      if (!blob.size) throw new Error('empty_document');
      const objectUrl = window.URL.createObjectURL(blob);
      if (pdfPreviewUrl) window.URL.revokeObjectURL(pdfPreviewUrl);
      if (previewWindow) previewWindow.location.replace(objectUrl);
      setPdfPreviewUrl(objectUrl);
      setPreviewConfiguration(JSON.stringify(configuration));
      setDesignerView('PDF');
      setPreviewOpen(false);
    } catch (reason) {
      previewWindow?.close();
      setError(getErrorMessage(reason, t('work_order_report_preview_error')));
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!template || !(await saveDraft())) return;
    if (
      JSON.stringify(latestConfiguration.current) !==
      savedConfigurationRef.current
    ) {
      setError(t('document_designer_changed_during_save'));
      return;
    }
    setSaving(true);
    try {
      await api.post(
        `document-templates/${template.id}/publish?makeDefault=${template.isDefault}`,
        {}
      );
      showSnackBar(t('document_template_published'), 'success');
      setPublishOpen(false);
      navigate('/app/settings/documents');
    } catch (reason) {
      setError(getErrorMessage(reason, t('document_template_publish_error')));
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    const section: Section = {
      id: idFor('section'),
      type: 'SECTION',
      title: t('document_designer_new_section'),
      columns: 2,
      pageBreakBefore: false,
      items: []
    };
    commit((current) => ({ ...current, layout: [...current.layout, section] }));
    setSelectedSection(section.id);
    setSelectedItem('');
  };
  const addField = (
    fieldKey: string,
    targetSection = selectedSection,
    insertAt?: number
  ) => {
    if (
      !configuration ||
      !configuration.layout.some((section) => section.id === targetSection) ||
      configuration.layout.some((section) =>
        section.items.some((item) => item.fieldKey === fieldKey)
      )
    )
      return;
    const item: FieldItem = {
      id: idFor(fieldKey),
      type: TABLE_KEYS.has(fieldKey)
        ? 'TABLE'
        : fieldKey === 'workOrder.signature'
        ? 'SIGNATURE'
        : 'FIELD',
      fieldKey,
      ...(TABLE_KEYS.has(fieldKey)
        ? {
            columnWidths: [...DEFAULT_TABLE_WIDTHS[fieldKey]],
            tableColumns: [...TABLE_COLUMN_IDS[fieldKey]]
          }
        : {})
    };
    commit((current) => ({
      ...current,
      layout: current.layout.map((section) =>
        section.id !== targetSection
          ? section
          : {
              ...section,
              ...(item.type === 'TABLE' ? { keepTogether: false } : {}),
              items: [
                ...section.items.slice(0, insertAt ?? section.items.length),
                item,
                ...section.items.slice(insertAt ?? section.items.length)
              ]
            }
      )
    }));
    setSelectedSection(targetSection);
    setSelectedItem(item.id);
  };
  const moveItem = (
    fromSection: string,
    itemId: string,
    toSection: string,
    toIndex: number
  ) => {
    commit((current) => {
      const source = current.layout.find(
        (section) => section.id === fromSection
      );
      const moved = source?.items.find((item) => item.id === itemId);
      if (!moved) return current;
      const without = current.layout.map((section) =>
        section.id === fromSection
          ? {
              ...section,
              items: section.items.filter((item) => item.id !== itemId)
            }
          : section
      );
      return {
        ...current,
        layout: without.map((section) => {
          if (section.id !== toSection) return section;
          const index = Math.max(0, Math.min(toIndex, section.items.length));
          const items = [...section.items];
          items.splice(index, 0, moved);
          return {
            ...section,
            ...(moved.type === 'TABLE' ? { keepTogether: false } : {}),
            items
          };
        })
      };
    });
  };
  const moveSection = (sectionId: string, offset: -1 | 1) => {
    commit((current) => {
      const sourceIndex = current.layout.findIndex(
        (section) => section.id === sectionId
      );
      const targetIndex = sourceIndex + offset;
      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= current.layout.length
      )
        return current;
      const layout = [...current.layout];
      [layout[sourceIndex], layout[targetIndex]] = [
        layout[targetIndex],
        layout[sourceIndex]
      ];
      return { ...current, layout };
    });
  };
  const removeSelected = () => {
    const componentCount =
      configuration?.layout.reduce(
        (total, section) => total + section.items.length,
        0
      ) || 0;
    if (selected.item && componentCount > 0)
      commit((current) => ({
        ...current,
        layout: current.layout.map((section) => ({
          ...section,
          items: section.items.filter((item) => item.id !== selected.item?.id)
        }))
      }));
    else if (
      selected.section &&
      configuration &&
      configuration.layout.length > 1
    )
      commit((current) => ({
        ...current,
        layout: current.layout.filter(
          (section) => section.id !== selected.section?.id
        )
      }));
    setSelectedItem('');
  };
  const dragField = (event: DragEvent, fieldKey: string) =>
    event.dataTransfer.setData('text/qpm-field', fieldKey);
  const dropOnSection = (event: DragEvent, sectionId: string) => {
    event.preventDefault();
    const field = event.dataTransfer.getData('text/qpm-field');
    const component = event.dataTransfer.getData('text/qpm-component');
    if (field) addField(field, sectionId);
    else if (component) {
      const [fromSection, itemId] = component.split('|');
      moveItem(
        fromSection,
        itemId,
        sectionId,
        configuration?.layout.find((section) => section.id === sectionId)?.items
          .length || 0
      );
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  if (!configuration || !template)
    return (
      <Box p={3}>
        <Alert
          severity="error"
          action={<Button onClick={() => void load()}>{t('retry')}</Button>}
        >
          {error || t('document_designer_load_error')}
        </Alert>
      </Box>
    );

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 96px)',
        p: { xs: 1, md: 2 },
        bgcolor: 'background.default'
      }}
    >
      <Paper
        variant="outlined"
        sx={{ p: 1.25, mb: 1.5, position: 'sticky', top: 0, zIndex: 3 }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          flexWrap="wrap"
          sx={{ rowGap: 0.5 }}
        >
          <Tooltip title={t('back')}>
            <IconButton onClick={requestLeave}>
              <ArrowBackOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1, minWidth: 170 }}>
            <Typography fontWeight={700}>{template.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {template.code} · {t('document_template_version_draft')}{' '}
              {template.draftVersion || template.publishedVersion + 1}
            </Typography>
          </Box>
          <Chip
            size="small"
            color={isDirty ? 'warning' : 'success'}
            variant={isDirty ? 'filled' : 'outlined'}
            label={t(
              isDirty
                ? 'document_designer_unsaved'
                : 'document_designer_saved_state'
            )}
          />
          <Tooltip title={t('document_designer_undo')}>
            <span>
              <IconButton
                aria-label={t('document_designer_undo')}
                onClick={undo}
                disabled={!history.length}
              >
                <UndoOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('document_designer_redo')}>
            <span>
              <IconButton
                aria-label={t('document_designer_redo')}
                onClick={redo}
                disabled={!future.length}
              >
                <RedoOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            startIcon={<VisibilityOutlinedIcon />}
            onClick={() => setPreviewOpen(true)}
            disabled={!hasComponents}
          >
            {t('document_designer_generate_preview')}
          </Button>
          <Button
            startIcon={<SaveOutlinedIcon />}
            onClick={() => void saveDraft()}
            disabled={saving}
          >
            {t('save')}
          </Button>
          <Button
            variant="contained"
            startIcon={<PublishOutlinedIcon />}
            onClick={() => setPublishOpen(true)}
            disabled={saving || !hasComponents}
          >
            {t('publish')}
          </Button>
        </Stack>
      </Paper>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: '240px minmax(400px, 1fr) 280px'
          },
          gap: 1.5,
          alignItems: 'start'
        }}
      >
        <Card
          variant="outlined"
          sx={{
            p: 1.5,
            maxHeight: { lg: 'calc(100vh - 190px)' },
            overflow: 'auto'
          }}
        >
          <Typography variant="subtitle2" fontWeight={700}>
            {t('document_designer_library')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('document_designer_fields')}
          </Typography>
          <TextField
            fullWidth
            size="small"
            label={t('document_designer_search_fields')}
            value={fieldSearch}
            onChange={(event) => setFieldSearch(event.target.value)}
            sx={{ mt: 1 }}
            inputProps={{ 'aria-label': t('document_designer_search_fields') }}
          />
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {availableFields.map((field) => {
              const used = configuration.layout.some((section) =>
                section.items.some((item) => item.fieldKey === field)
              );
              return (
                <Button
                  key={field}
                  size="small"
                  variant="outlined"
                  disabled={used}
                  draggable={!used}
                  onDragStart={(event) => dragField(event, field)}
                  onClick={() => addField(field)}
                  startIcon={<AddOutlinedIcon />}
                  sx={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    textTransform: 'none'
                  }}
                >
                  {t(fieldTranslationKey(field), {
                    defaultValue: defaultLabel(field)
                  })}
                </Button>
              );
            })}
            {!availableFields.length && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ p: 1 }}
              >
                {t('document_designer_no_fields_found')}
              </Typography>
            )}
          </Stack>
          <Divider sx={{ my: 1.5 }} />
          <Button
            fullWidth
            variant="contained"
            onClick={addSection}
            startIcon={<AddOutlinedIcon />}
          >
            {t('document_designer_add_section')}
          </Button>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1.5 }}>
            {t('document_designer_structure')}
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {configuration.layout.map((section, sectionIndex) => (
              <Box key={section.id}>
                <Stack direction="row" alignItems="center">
                  <Button
                    fullWidth
                    size="small"
                    onClick={() => {
                      setSelectedSection(section.id);
                      setSelectedItem('');
                    }}
                    sx={{
                      justifyContent: 'flex-start',
                      fontWeight:
                        selectedSection === section.id && !selectedItem
                          ? 700
                          : 400
                    }}
                  >
                    {section.title}
                  </Button>
                  <Tooltip title={t('document_designer_move_section_up')}>
                    <span>
                      <IconButton
                        size="small"
                        aria-label={t('document_designer_move_section_up')}
                        disabled={sectionIndex === 0}
                        onClick={() => moveSection(section.id, -1)}
                      >
                        <ArrowUpwardOutlinedIcon fontSize="inherit" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('document_designer_move_section_down')}>
                    <span>
                      <IconButton
                        size="small"
                        aria-label={t('document_designer_move_section_down')}
                        disabled={
                          sectionIndex === configuration.layout.length - 1
                        }
                        onClick={() => moveSection(section.id, 1)}
                      >
                        <ArrowDownwardOutlinedIcon fontSize="inherit" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
                {section.items.map((item) => (
                  <Button
                    key={item.id}
                    fullWidth
                    size="small"
                    onClick={() => {
                      setSelectedSection(section.id);
                      setSelectedItem(item.id);
                    }}
                    sx={{
                      justifyContent: 'flex-start',
                      pl: 2,
                      fontWeight: selectedItem === item.id ? 700 : 400
                    }}
                  >
                    {item.type === 'TABLE'
                      ? '▤ '
                      : item.type === 'SIGNATURE' ||
                        item.fieldKey === 'workOrder.signature'
                      ? '✍ '
                      : '· '}
                    {t(fieldTranslationKey(item.fieldKey), {
                      defaultValue: defaultLabel(item.fieldKey)
                    })}
                  </Button>
                ))}
              </Box>
            ))}
          </Stack>
        </Card>

        <Box
          sx={{
            minWidth: 0,
            overflow: 'auto',
            maxHeight: { lg: 'calc(100vh - 190px)' },
            bgcolor: 'action.hover',
            p: { xs: 1, md: 2 },
            borderRadius: 2
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            spacing={1}
            sx={{ mb: 1 }}
          >
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                {designerView === 'PDF'
                  ? t('document_designer_pdf_output')
                  : t('document_designer_canvas')}{' '}
                · {configuration.page.size} {configuration.page.orientation}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {designerView === 'PDF'
                  ? t('document_designer_pdf_output_hint')
                  : t('document_designer_canvas_hint')}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Button
                size="small"
                variant={designerView === 'LAYOUT' ? 'contained' : 'outlined'}
                onClick={() => setDesignerView('LAYOUT')}
              >
                {t('document_designer_layout_view')}
              </Button>
              <Button
                size="small"
                variant={designerView === 'PDF' ? 'contained' : 'outlined'}
                onClick={() => setDesignerView('PDF')}
                disabled={!pdfPreviewUrl}
              >
                {t('document_designer_pdf_view')}
              </Button>
              {designerView === 'LAYOUT' && (
                <Chip size="small" label={t('document_designer_sample_data')} />
              )}
            </Stack>
          </Stack>
          {previewIsOutdated && designerView === 'PDF' && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              {t('document_designer_pdf_outdated')}
            </Alert>
          )}
          {designerView === 'PDF' && pdfPreviewUrl && (
            <Alert
              severity="info"
              sx={{ mb: 1 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setDesignerView('LAYOUT')}
                >
                  {t('document_designer_return_to_editor')}
                </Button>
              }
            >
              {t('document_designer_pdf_read_only')}
            </Alert>
          )}
          {designerView === 'LAYOUT' && !hasComponents && (
            <Alert severity="info" sx={{ mb: 1 }}>
              {t('document_designer_blank_canvas_hint')}
            </Alert>
          )}
          {designerView === 'PDF' && pdfPreviewUrl ? (
            <Paper
              elevation={3}
              sx={{
                mx: 'auto',
                width: '100%',
                minHeight: 340,
                p: { xs: 2, md: 4 },
                display: 'grid',
                placeContent: 'center',
                textAlign: 'center',
                gap: 1.5
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                {t('document_designer_pdf_ready')}
              </Typography>
              <Typography color="text.secondary">
                {t('document_designer_pdf_open_hint')}
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="center"
              >
                <Button
                  component="a"
                  href={pdfPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  startIcon={<OpenInNewOutlinedIcon />}
                >
                  {t('document_designer_open_pdf')}
                </Button>
                <Button
                  component="a"
                  href={pdfPreviewUrl}
                  download={`${template.code}-preview.pdf`}
                  variant="outlined"
                  startIcon={<DownloadOutlinedIcon />}
                >
                  {t('download')}
                </Button>
              </Stack>
            </Paper>
          ) : (
            <Paper
              elevation={3}
              sx={{
                mx: 'auto',
                width: '100%',
                maxWidth:
                  configuration.page.orientation === 'LANDSCAPE' ? 1050 : 760,
                minHeight:
                  configuration.page.orientation === 'LANDSCAPE' ? 530 : 740,
                p: `${Math.max(24, configuration.page.marginMm * 4)}px`,
                bgcolor: '#fff',
                color: '#17233b',
                overflow: 'hidden',
                boxSizing: 'border-box',
                border: '1px solid #d0d5dd'
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  gap: 1,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e4e7ec',
                  borderRadius: 1,
                  px: 1.25,
                  pt: 1,
                  borderBottom: 2,
                  borderColor:
                    configuration.design?.accentColor || 'primary.main',
                  pb: 1.5,
                  mb: 2
                }}
              >
                <Box sx={{ minWidth: 0, flex: '1 1 55%' }}>
                  <Typography variant="caption" sx={{ color: '#475467' }}>
                    QPM · {t('document_designer_company_header')}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700}>
                    QPM · {t('document_designer_company_identity_bound')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#475467' }}>
                    {t('document_designer_legal_fields_bound')}
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 0, flex: '1 1 30%', textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: '#475467' }}>
                    WORK ORDER
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      color: configuration.design?.accentColor || 'primary.main'
                    }}
                    fontWeight={800}
                  >
                    Job Card
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#475467' }}>
                    {t('document_designer_sample_data')}
                  </Typography>
                </Box>
              </Box>
              {configuration.layout.map((section) => (
                <Box
                  key={section.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropOnSection(event, section.id)}
                  onClick={() => {
                    setSelectedSection(section.id);
                    setSelectedItem('');
                  }}
                  sx={{
                    mb: 2,
                    outline:
                      selectedSection === section.id && !selectedItem
                        ? '2px solid'
                        : 'none',
                    outlineColor:
                      configuration.design?.accentColor || 'primary.main',
                    p: 0.75,
                    borderRadius: 1,
                    minWidth: 0,
                    bgcolor: '#fff'
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={0.5}
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      pb: 0.5,
                      mb: 0.75
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
                    >
                      {section.title}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {section.pageBreakBefore && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={t('document_designer_page_break_before')}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {section.columns} {t('document_designer_columns')}
                      </Typography>
                    </Stack>
                  </Stack>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))`,
                      gap: 0.75,
                      minWidth: 0
                    }}
                  >
                    {section.items.map((item, index) => (
                      <Box
                        key={item.id}
                        draggable
                        onDragStart={(event) =>
                          event.dataTransfer.setData(
                            'text/qpm-component',
                            `${section.id}|${item.id}`
                          )
                        }
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.stopPropagation();
                          const component =
                            event.dataTransfer.getData('text/qpm-component');
                          if (component) {
                            const [fromSection, itemId] = component.split('|');
                            moveItem(fromSection, itemId, section.id, index);
                          } else {
                            const field =
                              event.dataTransfer.getData('text/qpm-field');
                            if (field) addField(field, section.id, index);
                          }
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedSection(section.id);
                          setSelectedItem(item.id);
                        }}
                        sx={{
                          gridColumn:
                            item.fullWidth ||
                            item.type === 'TABLE' ||
                            item.type === 'SIGNATURE' ||
                            item.fieldKey === 'workOrder.signature' ||
                            item.fieldKey.includes('description') ||
                            item.fieldKey.includes('feedback')
                              ? '1 / -1'
                              : undefined,
                          cursor: 'grab',
                          position: 'relative',
                          p: 0.75,
                          border: 1,
                          borderColor:
                            selectedItem === item.id
                              ? configuration.design?.accentColor ||
                                'primary.main'
                              : 'divider',
                          borderRadius: 1,
                          bgcolor: '#fff',
                          minWidth: 0,
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word'
                        }}
                      >
                        {selectedItem === item.id && (
                          <Tooltip
                            title={t('document_designer_remove_component')}
                          >
                            <IconButton
                              size="small"
                              aria-label={t(
                                'document_designer_remove_component'
                              )}
                              onClick={(event) => {
                                event.stopPropagation();
                                removeSelected();
                              }}
                              sx={{
                                position: 'absolute',
                                top: 1,
                                right: 1,
                                zIndex: 1
                              }}
                            >
                              <DeleteOutlineIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {item.hideIfEmpty && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={t('document_designer_hide_if_empty')}
                            sx={{ mb: 0.5 }}
                          />
                        )}
                        {item.fullWidth && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={t('document_designer_full_width')}
                            sx={{ mb: 0.5 }}
                          />
                        )}
                        {item.type === 'TABLE' ? (
                          <>
                            <Typography
                              variant="caption"
                              fontWeight={item.style?.bold ? 700 : 600}
                              sx={{
                                fontSize: item.style?.fontSize,
                                textAlign: (
                                  item.style?.alignment || 'LEFT'
                                ).toLowerCase(),
                                color:
                                  item.style?.tone === 'ACCENT'
                                    ? configuration.design?.accentColor ||
                                      'primary.main'
                                    : undefined
                              }}
                            >
                              {item.title ||
                                t(fieldTranslationKey(item.fieldKey), {
                                  defaultValue: defaultLabel(item.fieldKey)
                                })}
                            </Typography>
                            <Box
                              component="table"
                              sx={{
                                width: '100%',
                                mt: 0.75,
                                borderCollapse: 'collapse',
                                tableLayout: 'fixed',
                                '& th, & td': {
                                  border: '1px solid #d0d5dd',
                                  p: 0.5,
                                  textAlign: 'left',
                                  verticalAlign: 'top',
                                  overflowWrap: 'anywhere',
                                  wordBreak: 'break-word',
                                  fontSize: '0.68rem'
                                },
                                '& th': {
                                  bgcolor: '#f2f4f7',
                                  color: '#344054',
                                  fontWeight: 700
                                },
                                '& td': { color: '#17233b' }
                              }}
                            >
                              <thead>
                                <tr>
                                  {tableColumnsFor(item).map((columnId) => {
                                    const columnIndex =
                                      TABLE_COLUMN_IDS[item.fieldKey].indexOf(
                                        columnId
                                      );
                                    const headerKey =
                                      TABLE_HEADERS[item.fieldKey][columnIndex];
                                    return (
                                      <th
                                        key={columnId}
                                        style={{
                                          width: `${
                                            tableWidthsFor(item)[
                                              tableColumnsFor(item).indexOf(
                                                columnId
                                              )
                                            ]
                                          }%`
                                        }}
                                      >
                                        {t(headerKey)}
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>
                              <tbody>
                                {(sampleTableRows[item.fieldKey] || []).map(
                                  (row, rowIndex) => (
                                    <tr key={`${item.id}-${rowIndex}`}>
                                      {tableColumnsFor(item).map((columnId) => {
                                        const valueIndex =
                                          TABLE_COLUMN_IDS[
                                            item.fieldKey
                                          ].indexOf(columnId);
                                        return (
                                          <td
                                            key={`${item.id}-${rowIndex}-${columnId}`}
                                          >
                                            {row[valueIndex]}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </Box>
                          </>
                        ) : item.type === 'SIGNATURE' ||
                          item.fieldKey === 'workOrder.signature' ? (
                          <Box
                            sx={{
                              gridColumn: '1 / -1',
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 1,
                              mt: 1
                            }}
                          >
                            {[
                              t('document_designer_technician_signature'),
                              t('document_designer_supervisor_signature')
                            ].map((label) => (
                              <Box
                                key={label}
                                sx={{
                                  minHeight: 66,
                                  border: 1,
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                  p: 1,
                                  display: 'flex',
                                  alignItems: 'flex-end'
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    width: '100%',
                                    borderTop: 1,
                                    borderColor: 'text.secondary',
                                    pt: 0.5
                                  }}
                                >
                                  {label}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <>
                            <Typography
                              variant="overline"
                              sx={{
                                display: 'block',
                                lineHeight: 1.4,
                                minWidth: 0,
                                maxWidth: '100%',
                                pr: selectedItem === item.id ? 3 : 0,
                                bgcolor: '#f2f4f7',
                                px: 0.5,
                                py: 0.25,
                                borderRadius: 0.5,
                                color: '#475467',
                                textAlign: (
                                  item.style?.alignment || 'LEFT'
                                ).toLowerCase(),
                                overflowWrap: 'anywhere',
                                wordBreak: 'break-word'
                              }}
                            >
                              {item.label ||
                                t(fieldTranslationKey(item.fieldKey), {
                                  defaultValue: defaultLabel(item.fieldKey)
                                })}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                minHeight: 20,
                                minWidth: 0,
                                maxWidth: '100%',
                                mt: 0.35,
                                px: 0.5,
                                pt: 0.35,
                                borderTop: '1px solid #e4e7ec',
                                fontSize: item.style?.fontSize,
                                fontWeight: item.style?.bold ? 700 : undefined,
                                textAlign: (
                                  item.style?.alignment || 'LEFT'
                                ).toLowerCase(),
                                color:
                                  item.style?.tone === 'ACCENT'
                                    ? configuration.design?.accentColor ||
                                      'primary.main'
                                    : '#17233b',
                                overflowWrap: 'anywhere',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap'
                              }}
                            >
                              {sampleValues[item.fieldKey] ||
                                t('document_designer_sample_value')}
                            </Typography>
                          </>
                        )}
                        <DragIndicatorIcon
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            opacity: 0.45,
                            width: 14,
                            pointerEvents: 'none'
                          }}
                        />
                      </Box>
                    ))}
                    {!section.items.length && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ gridColumn: '1 / -1', p: 2, textAlign: 'center' }}
                      >
                        {t('document_designer_drop_hint')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
              <Box
                component="footer"
                sx={{
                  mt: 3,
                  pt: 1,
                  borderTop: '2px solid #98a2b3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1,
                  color: '#475467',
                  bgcolor: '#f8fafc',
                  px: 1,
                  py: 1.25
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: 'inherit',
                    minWidth: 0,
                    overflowWrap: 'anywhere'
                  }}
                >
                  {t('document_designer_footer_copy')}
                </Typography>
                {configuration.options.showPageNumbers && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'inherit', whiteSpace: 'nowrap' }}
                  >
                    {t('document_designer_page_number_sample')}
                  </Typography>
                )}
              </Box>
            </Paper>
          )}
        </Box>

        <Card
          variant="outlined"
          sx={{ p: 1.5, position: { lg: 'sticky' }, top: 82 }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="subtitle2" fontWeight={700}>
              {t('document_designer_properties')}
            </Typography>
            <Tooltip title={t('delete')}>
              <span>
                <IconButton
                  size="small"
                  onClick={removeSelected}
                  disabled={
                    selected.item
                      ? configuration.layout.reduce(
                          (total, section) => total + section.items.length,
                          0
                        ) <= 0
                      : !selected.section || configuration.layout.length <= 1
                  }
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          {selected.item ? (
            <Stack spacing={1.25} sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t(fieldTranslationKey(selected.item.fieldKey), {
                  defaultValue: defaultLabel(selected.item.fieldKey)
                })}
              </Typography>
              {selected.item.type === 'TABLE' ? (
                <>
                  <TextField
                    size="small"
                    label={t('document_designer_table_title')}
                    value={selected.item.title || ''}
                    onChange={(event) =>
                      commit((current) => ({
                        ...current,
                        layout: current.layout.map((section) => ({
                          ...section,
                          items: section.items.map((item) =>
                            item.id === selected.item?.id
                              ? { ...item, title: event.target.value }
                              : item
                          )
                        }))
                      }))
                    }
                  />
                  <Typography variant="subtitle2">
                    {t('document_designer_columns_to_print')}
                  </Typography>
                  {tableColumnControlOrder.map((columnId) => {
                    const originalIndex =
                      TABLE_COLUMN_IDS[selected.item!.fieldKey].indexOf(
                        columnId
                      );
                    const selectedColumns = tableColumnsFor(selected.item!);
                    const currentIndex = selectedColumns.indexOf(columnId);
                    const header = t(
                      TABLE_HEADERS[selected.item!.fieldKey][originalIndex]
                    );
                    const nextColumns = (delta: -1 | 1) => {
                      const reordered = [...selectedColumns];
                      const targetIndex = currentIndex + delta;
                      [reordered[currentIndex], reordered[targetIndex]] = [
                        reordered[targetIndex],
                        reordered[currentIndex]
                      ];
                      updateTableColumns(selected.item!.id, reordered);
                    };
                    return (
                      <Stack
                        key={columnId}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ minWidth: 0 }}
                      >
                        <FormControlLabel
                          sx={{ minWidth: 0, mr: 0 }}
                          control={
                            <Switch
                              size="small"
                              checked={currentIndex >= 0}
                              disabled={
                                currentIndex >= 0 &&
                                selectedColumns.length === 1
                              }
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [
                                      ...selectedColumns,
                                      ...TABLE_COLUMN_IDS[
                                        selected.item!.fieldKey
                                      ].filter(
                                        (candidate) =>
                                          candidate === columnId &&
                                          !selectedColumns.includes(candidate)
                                      )
                                    ]
                                  : selectedColumns.filter(
                                      (candidate) => candidate !== columnId
                                    );
                                updateTableColumns(selected.item!.id, next);
                              }}
                            />
                          }
                          label={
                            <Typography variant="body2" noWrap>
                              {header}
                            </Typography>
                          }
                        />
                        <Stack direction="row" flexShrink={0}>
                          <IconButton
                            size="small"
                            aria-label={t('document_designer_move_column_up', {
                              column: header
                            })}
                            disabled={currentIndex <= 0}
                            onClick={() => nextColumns(-1)}
                          >
                            <ArrowUpwardOutlinedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label={t(
                              'document_designer_move_column_down',
                              { column: header }
                            )}
                            disabled={
                              currentIndex < 0 ||
                              currentIndex >= selectedColumns.length - 1
                            }
                            onClick={() => nextColumns(1)}
                          >
                            <ArrowDownwardOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    );
                  })}
                  <Typography variant="subtitle2">
                    {t('document_designer_column_widths')}
                  </Typography>
                  {tableColumnsFor(selected.item).map((columnId, index) => {
                    const originalIndex =
                      TABLE_COLUMN_IDS[selected.item!.fieldKey].indexOf(
                        columnId
                      );
                    const headerKey =
                      TABLE_HEADERS[selected.item!.fieldKey][originalIndex];
                    return (
                      <TextField
                        key={columnId}
                        size="small"
                        type="number"
                        label={t(headerKey)}
                        value={tableWidthsFor(selected.item)[index] ?? ''}
                        disabled={tableColumnsFor(selected.item).length === 1}
                        inputProps={{
                          min: 10,
                          max:
                            tableColumnsFor(selected.item).length === 1
                              ? 100
                              : 70,
                          step: 1,
                          'aria-label': t(
                            'document_designer_column_width_percent',
                            { column: t(headerKey) }
                          )
                        }}
                        onChange={(event) => {
                          const widths = redistributeColumnWidth(
                            tableWidthsFor(selected.item),
                            index,
                            Number(event.target.value)
                          );
                          commit((current) => ({
                            ...current,
                            layout: current.layout.map((section) => ({
                              ...section,
                              items: section.items.map((item) =>
                                item.id === selected.item?.id
                                  ? { ...item, columnWidths: widths }
                                  : item
                              )
                            }))
                          }));
                        }}
                        InputProps={{
                          endAdornment: (
                            <Typography variant="caption">%</Typography>
                          )
                        }}
                      />
                    );
                  })}
                  <Typography variant="caption" color="text.secondary">
                    {t('document_designer_column_widths_help')}
                  </Typography>
                </>
              ) : (
                <TextField
                  size="small"
                  label={t('document_designer_field_label')}
                  value={selected.item.label || ''}
                  inputProps={{ maxLength: 100 }}
                  onChange={(event) =>
                    commit((current) => ({
                      ...current,
                      layout: current.layout.map((section) => ({
                        ...section,
                        items: section.items.map((item) =>
                          item.id === selected.item?.id
                            ? { ...item, label: event.target.value }
                            : item
                        )
                      }))
                    }))
                  }
                />
              )}
              {selected.item.type !== 'TABLE' && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(selected.item.hideIfEmpty)}
                      onChange={(event) =>
                        commit((current) => ({
                          ...current,
                          layout: current.layout.map((section) => ({
                            ...section,
                            items: section.items.map((item) =>
                              item.id === selected.item?.id
                                ? { ...item, hideIfEmpty: event.target.checked }
                                : item
                            )
                          }))
                        }))
                      }
                    />
                  }
                  label={t('document_designer_hide_if_empty')}
                />
              )}
              {selected.item.type === 'FIELD' &&
                ![
                  'workOrder.description',
                  'workOrder.feedback',
                  'request.description'
                ].includes(selected.item.fieldKey) && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(selected.item.fullWidth)}
                        onChange={(event) =>
                          commit((current) => ({
                            ...current,
                            layout: current.layout.map((section) => ({
                              ...section,
                              items: section.items.map((item) =>
                                item.id === selected.item?.id
                                  ? { ...item, fullWidth: event.target.checked }
                                  : item
                              )
                            }))
                          }))
                        }
                      />
                    }
                    label={t('document_designer_full_width')}
                  />
                )}
              <TextField
                size="small"
                type="number"
                label={t('document_designer_font_size')}
                value={selected.item.style?.fontSize || 9}
                inputProps={{ min: 7, max: 16 }}
                onChange={(event) =>
                  commit((current) => ({
                    ...current,
                    layout: current.layout.map((section) => ({
                      ...section,
                      items: section.items.map((item) =>
                        item.id === selected.item?.id
                          ? {
                              ...item,
                              style: {
                                ...item.style,
                                fontSize: Number(event.target.value)
                              }
                            }
                          : item
                      )
                    }))
                  }))
                }
              />
              <FormControl size="small">
                <InputLabel>{t('document_designer_alignment')}</InputLabel>
                <Select
                  label={t('document_designer_alignment')}
                  value={selected.item.style?.alignment || 'LEFT'}
                  onChange={(event) =>
                    commit((current) => ({
                      ...current,
                      layout: current.layout.map((section) => ({
                        ...section,
                        items: section.items.map((item) =>
                          item.id === selected.item?.id
                            ? {
                                ...item,
                                style: {
                                  ...item.style,
                                  alignment: event.target.value as
                                    | 'LEFT'
                                    | 'CENTER'
                                    | 'RIGHT'
                                }
                              }
                            : item
                        )
                      }))
                    }))
                  }
                >
                  <MenuItem value="LEFT">
                    {t('document_designer_align_left')}
                  </MenuItem>
                  <MenuItem value="CENTER">
                    {t('document_designer_align_center')}
                  </MenuItem>
                  <MenuItem value="RIGHT">
                    {t('document_designer_align_right')}
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={selected.item.style?.bold || false}
                    onChange={(event) =>
                      commit((current) => ({
                        ...current,
                        layout: current.layout.map((section) => ({
                          ...section,
                          items: section.items.map((item) =>
                            item.id === selected.item?.id
                              ? {
                                  ...item,
                                  style: {
                                    ...item.style,
                                    bold: event.target.checked
                                  }
                                }
                              : item
                          )
                        }))
                      }))
                    }
                  />
                }
                label={t('document_designer_bold')}
              />
              <FormControl size="small">
                <InputLabel>{t('document_designer_tone')}</InputLabel>
                <Select
                  label={t('document_designer_tone')}
                  value={selected.item.style?.tone || 'DEFAULT'}
                  onChange={(event) =>
                    commit((current) => ({
                      ...current,
                      layout: current.layout.map((section) => ({
                        ...section,
                        items: section.items.map((item) =>
                          item.id === selected.item?.id
                            ? {
                                ...item,
                                style: {
                                  ...item.style,
                                  tone: event.target.value as
                                    | 'DEFAULT'
                                    | 'ACCENT'
                                }
                              }
                            : item
                        )
                      }))
                    }))
                  }
                >
                  <MenuItem value="DEFAULT">
                    {t('document_designer_tone_default')}
                  </MenuItem>
                  <MenuItem value="ACCENT">
                    {t('document_designer_tone_accent')}
                  </MenuItem>
                </Select>
              </FormControl>
              <Button
                size="small"
                onClick={() =>
                  moveItem(
                    selectedSection,
                    selected.item!.id,
                    selectedSection,
                    Math.max(
                      0,
                      selected.section!.items.findIndex(
                        (item) => item.id === selected.item!.id
                      ) - 1
                    )
                  )
                }
              >
                {t('document_designer_move_up')}
              </Button>
              <Button
                size="small"
                onClick={() =>
                  moveItem(
                    selectedSection,
                    selected.item!.id,
                    selectedSection,
                    selected.section!.items.findIndex(
                      (item) => item.id === selected.item!.id
                    ) + 1
                  )
                }
              >
                {t('document_designer_move_down')}
              </Button>
            </Stack>
          ) : selected.section ? (
            <Stack spacing={1.25} sx={{ mt: 1 }}>
              <TextField
                size="small"
                label={t('document_designer_section_title')}
                value={selected.section.title}
                inputProps={{ maxLength: 100 }}
                onChange={(event) =>
                  commit((current) => ({
                    ...current,
                    layout: current.layout.map((section) =>
                      section.id === selected.section?.id
                        ? { ...section, title: event.target.value }
                        : section
                    )
                  }))
                }
              />
              <FormControl size="small">
                <InputLabel>{t('document_designer_columns')}</InputLabel>
                <Select
                  label={t('document_designer_columns')}
                  value={selected.section.columns}
                  onChange={(event) =>
                    commit((current) => ({
                      ...current,
                      layout: current.layout.map((section) =>
                        section.id === selected.section?.id
                          ? {
                              ...section,
                              columns: Number(event.target.value) as 1 | 2 | 3
                            }
                          : section
                      )
                    }))
                  }
                >
                  <MenuItem value={1}>1</MenuItem>
                  <MenuItem value={2}>2</MenuItem>
                  <MenuItem value={3}>3</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(selected.section.pageBreakBefore)}
                    onChange={(event) =>
                      commit((current) => ({
                        ...current,
                        layout: current.layout.map((section) =>
                          section.id === selected.section?.id
                            ? {
                                ...section,
                                pageBreakBefore: event.target.checked
                              }
                            : section
                        )
                      }))
                    }
                  />
                }
                label={t('document_designer_page_break_before')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(selected.section.keepTogether)}
                    disabled={selected.section.items.some((item) => item.type === 'TABLE')}
                    onChange={(event) =>
                      commit((current) => ({
                        ...current,
                        layout: current.layout.map((section) =>
                          section.id === selected.section?.id
                            ? { ...section, keepTogether: event.target.checked }
                            : section
                        )
                      }))
                    }
                  />
                }
                label={t('document_designer_keep_section_together')}
              />
              <Typography variant="caption" color="text.secondary">
                {t(selected.section.items.some((item) => item.type === 'TABLE')
                  ? 'document_designer_keep_section_table_help'
                  : 'document_designer_keep_section_help')}
              </Typography>
            </Stack>
          ) : null}
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1.25}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(configuration.design?.accentColor)}
                  onChange={(event) =>
                    commit((current) => ({
                      ...current,
                      design: event.target.checked
                        ? { ...current.design, accentColor: '#2F5BEA' }
                        : { ...current.design, accentColor: undefined }
                    }))
                  }
                />
              }
              label={t('document_designer_use_custom_accent')}
            />
            {configuration.design?.accentColor && (
              <TextField
                size="small"
                type="color"
                label={t('document_designer_accent_color')}
                value={configuration.design.accentColor}
                onChange={(event) =>
                  commit((current) => ({
                    ...current,
                    design: {
                      ...current.design,
                      accentColor: event.target.value
                    }
                  }))
                }
                helperText={t('document_designer_accent_contrast_hint')}
                InputLabelProps={{ shrink: true }}
              />
            )}
            <FormControl size="small">
              <InputLabel>{t('document_designer_style')}</InputLabel>
              <Select
                label={t('document_designer_style')}
                value={configuration.style}
                onChange={(event) =>
                  commit((current) => ({
                    ...current,
                    style: event.target.value as StylePreset
                  }))
                }
              >
                <MenuItem value="CLASSIC">Classic</MenuItem>
                <MenuItem value="MODERN">Modern</MenuItem>
                <MenuItem value="COMPACT">Compact</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>{t('document_designer_page_size')}</InputLabel>
              <Select
                label={t('document_designer_page_size')}
                value={configuration.page.size}
                onChange={(event) =>
                  commit((current) => ({
                    ...current,
                    page: {
                      ...current.page,
                      size: event.target.value as 'A4' | 'LETTER'
                    }
                  }))
                }
              >
                <MenuItem value="A4">A4</MenuItem>
                <MenuItem value="LETTER">Letter</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>{t('document_designer_orientation')}</InputLabel>
              <Select
                label={t('document_designer_orientation')}
                value={configuration.page.orientation}
                onChange={(event) =>
                  commit((current) => ({
                    ...current,
                    page: {
                      ...current.page,
                      orientation: event.target.value as
                        | 'PORTRAIT'
                        | 'LANDSCAPE'
                    }
                  }))
                }
              >
                <MenuItem value="PORTRAIT">Portrait</MenuItem>
                <MenuItem value="LANDSCAPE">Landscape</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="number"
              label={t('document_designer_margin')}
              value={configuration.page.marginMm}
              inputProps={{ min: 5, max: 30 }}
              onChange={(event) =>
                commit((current) => ({
                  ...current,
                  page: {
                    ...current.page,
                    marginMm: Number(event.target.value)
                  }
                }))
              }
            />
          </Stack>
        </Card>
      </Box>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('document_designer_preview')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            type="number"
            margin="dense"
            label={t('document_designer_work_order_id')}
            value={workOrderId}
            onChange={(event) => setWorkOrderId(event.target.value)}
            helperText={t('document_designer_preview_hint')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => void preview()}
            disabled={saving || !hasComponents}
          >
            {t('document_designer_generate_preview')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={publishOpen} onClose={() => setPublishOpen(false)}>
        <DialogTitle>{t('document_designer_publish_title')}</DialogTitle>
        <DialogContent>
          <Typography>{t('document_designer_publish_body')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishOpen(false)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => void publish()}
            disabled={saving}
          >
            {t('publish')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={leaveOpen}
        onClose={() => {
          setLeaveOpen(false);
          setPendingNavigation(null);
        }}
      >
        <DialogTitle>{t('document_designer_leave_title')}</DialogTitle>
        <DialogContent>
          <Typography>{t('document_designer_leave_body')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setLeaveOpen(false);
              setPendingNavigation(null);
            }}
            disabled={saving}
          >
            {t('cancel')}
          </Button>
          <Button
            color="inherit"
            onClick={() => {
              setLeaveOpen(false);
              pendingNavigation?.();
              setPendingNavigation(null);
            }}
            disabled={saving}
          >
            {t('document_designer_discard_leave')}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            disabled={saving}
            onClick={async () => {
              if (await saveDraft()) {
                if (
                  JSON.stringify(latestConfiguration.current) !==
                  savedConfigurationRef.current
                ) {
                  setError(t('document_designer_changed_during_save'));
                  return;
                }
                setLeaveOpen(false);
                pendingNavigation?.();
                setPendingNavigation(null);
              }
            }}
          >
            {t('document_designer_save_leave')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
