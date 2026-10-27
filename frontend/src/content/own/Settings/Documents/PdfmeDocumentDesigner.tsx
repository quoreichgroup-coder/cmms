import { type DragEvent, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { UNSAFE_NavigationContext, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Switch,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardOutlinedIcon from '@mui/icons-material/ArrowUpwardOutlined';
import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import WidgetsOutlinedIcon from '@mui/icons-material/WidgetsOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { Designer } from '@pdfme/ui';
import {
  ellipse,
  image,
  line,
  multiVariableText,
  rectangle,
  signature,
  table,
  text,
  barcodes
} from '@pdfme/schemas';
import { PDFME_VERSION, type Template } from '@pdfme/common';
import api, { getErrorMessage } from '../../../../utils/api';
import { isPdfContentType } from '../../../../utils/documentResponse';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
import useAuth from '../../../../hooks/useAuth';
import { PermissionEntity } from '../../../../models/owns/role';
import { qpmBrandTokens } from '../../../../theme/tokens';
import { blockDocumentNavigation } from './documentDesignerNavigation';

type TemplateRecord = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  documentTypeCode: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  draftConfiguration?: any;
  publishedConfiguration?: any;
  draftVersion: number;
  defaultScope?: 'COMPANY' | 'SITE';
  siteId?: number | null;
  siteName?: string | null;
};
type SiteOption = { id: number; name: string };
type PrintZone = 'HEADER' | 'FOOTER' | 'REPORT_HEADER' | 'REPORT_FOOTER';
type PrintZoneHeights = Partial<Record<PrintZone, number>>;
const DEFAULT_PRINT_ZONE_HEIGHTS: Record<PrintZone, number> = {
  HEADER: 20,
  FOOTER: 20,
  REPORT_HEADER: 32,
  REPORT_FOOTER: 24
};

const PAGE_WIDTH = 297;
const PAGE_HEIGHT = 210;
type PageOrientation = 'LANDSCAPE' | 'PORTRAIT';
const getPageDimensions = (template: any) => {
  const width = Number(template?.basePdf?.width) || PAGE_WIDTH;
  const height = Number(template?.basePdf?.height) || PAGE_HEIGHT;
  return { width, height, orientation: width >= height ? 'LANDSCAPE' as const : 'PORTRAIT' as const };
};
const scaleSchemasToPageWidth = (schemas: any[], width: number) => {
  const scale = width / PAGE_WIDTH;
  if (scale === 1) return schemas;
  return schemas.map((schema) => ({
    ...schema,
    position: schema.position ? { ...schema.position, x: Number(schema.position.x || 0) * scale } : schema.position,
    ...(Number.isFinite(Number(schema.width)) ? { width: Number(schema.width) * scale } : {})
  }));
};
const isValidWorkOrderReference = (value: string) => Boolean(value.trim()) && value.trim().length <= 100;
const PRIMARY = qpmBrandTokens.primary;
const COMPONENT_MIME_TYPE = 'application/x-qpm-report-component';

const tableColumnsFor = (name: string): string[] => name === 'workOrder.executionTasks'
  ? ['step', 'task', 'result', 'notes']
  : name === 'workOrder.laborTimeEntries'
    ? ['technician', 'activity', 'startedAt', 'durationHours', 'status']
    : ['part', 'description', 'quantity', 'unit'];

const tableDatasetKey = (name: string): 'tasks' | 'labor' | 'materials' => name === 'workOrder.executionTasks'
  ? 'tasks'
  : name === 'workOrder.laborTimeEntries' ? 'labor' : 'materials';

const normalizeColumnWidths = (values: number[]): number[] => {
  if (!values.length) return [];
  const safe = values.map((value) => Number.isFinite(value) && value > 0 ? value : 1);
  const total = safe.reduce((sum, value) => sum + value, 0);
  const rounded = safe.map((value) => Math.round((value / total) * 10000) / 100);
  rounded[rounded.length - 1] = Math.round((rounded[rounded.length - 1] + 100 - rounded.reduce((sum, value) => sum + value, 0)) * 100) / 100;
  return rounded;
};

const schemaFrom = (plugin: any, name: string, content: string, position: { x: number; y: number }, width: number, height: number, extra: Record<string, unknown> = {}) => ({
  ...plugin.propPanel.defaultSchema,
  name,
  content,
  position,
  width,
  height,
  ...extra
});

const field = (name: string, x: number, y: number, width: number, sample: string, fontSize = 9, extra: Record<string, unknown> = {}) =>
  schemaFrom(text, name, sample, { x, y }, width, 8, {
    fontSize,
    fontColor: '#101828',
    backgroundColor: '',
    borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    ...extra
  });

function createJobCard(t: (key: string) => string): Template {
  const heading = (name: string, value: string, x: number, y: number, width: number, size = 10, height = 8) =>
    schemaFrom(text, name, value, { x, y }, width, height, {
      fontSize: size,
      fontColor: '#344054',
      backgroundColor: '',
      borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
      padding: { top: 0, right: 0, bottom: 0, left: 0 }
    });
  const tablePlugin: any = table;
  const tableSchema = (name: string, headers: string[], y: number, widths: number[]) => ({
    ...tablePlugin.propPanel.defaultSchema,
    name,
    position: { x: 12, y },
    width: 273,
    height: 18,
    head: headers,
    columnBindings: name === 'workOrder.executionTasks' ? ['step', 'task', 'result', 'notes']
      : name === 'workOrder.laborTimeEntries' ? ['technician', 'activity', 'startedAt', 'durationHours', 'status']
        : ['part', 'description', 'quantity', 'unit'],
    headWidthPercentages: widths,
    repeatHead: true,
    showHead: true,
    qpmEmptyMessage: t('document_table_empty_message_default'),
    content: '[]',
    headStyles: {
      ...tablePlugin.propPanel.defaultSchema.headStyles,
      fontSize: 8,
      fontColor: '#FFFFFF',
      backgroundColor: PRIMARY,
      padding: { top: 2, right: 2, bottom: 2, left: 2 }
    },
    bodyStyles: {
      ...tablePlugin.propPanel.defaultSchema.bodyStyles,
      fontSize: 8,
      padding: { top: 2, right: 2, bottom: 2, left: 2 }
    }
  });
  const page = [
    schemaFrom(image, 'company.logo', '', { x: 12, y: 7 }, 20, 20, {
      objectFit: 'contain',
      objectPosition: 'center center',
      qpmPrintZone: 'HEADER'
    }),
    field('company.name', 38, 7, 164, t('document_field_company_name'), 13, { fontColor: PRIMARY, qpmPrintZone: 'HEADER' }),
    field('company.legalName', 38, 17, 164, t('document_field_company_legalName'), 8, { fontColor: '#475467' }),
    heading('static:job_card_title', t('document_pdfme_job_card_title'), 207, 9, 78, 10, 18),
    heading('static:registered_address_label', t('document_pdfme_registered_address'), 12, 25, 120, 6, 5),
    field('company.registeredAddress', 12, 31, 120, t('document_field_company_registeredAddress'), 7, { height: 6 }),
    heading('static:registration_number_label', t('document_pdfme_registration_number'), 137, 25, 70, 6, 5),
    field('company.registrationNumber', 137, 31, 70, t('document_field_company_registrationNumber'), 7, { height: 6 }),
    heading('static:tax_number_label', t('document_pdfme_tax_number'), 212, 25, 73, 6, 5),
    field('company.taxNumber', 212, 31, 73, t('document_field_company_taxNumber'), 7, { height: 6 }),
    schemaFrom(line, 'static:header_rule', '', { x: 12, y: 38 }, 273, 0.8, { color: PRIMARY }),
    heading('static:wo_label', t('document_pdfme_work_order'), 12, 42, 65, 8),
    field('workOrder.customId', 12, 50, 75, 'WO-00000', 12, { fontColor: PRIMARY }),
    heading('static:status_label', t('document_pdfme_status'), 92, 42, 55, 8),
    field('workOrder.status', 92, 50, 55, t('document_field_workOrder_status'), 9),
    heading('static:priority_label', t('document_pdfme_priority'), 152, 42, 50, 8),
    field('workOrder.priority', 152, 50, 50, t('document_field_workOrder_priority'), 9),
    heading('static:asset_label', t('document_pdfme_equipment'), 207, 42, 48, 8),
    heading('static:asset_serial_label', t('document_pdfme_serial_number'), 257, 42, 28, 8),
    field('asset.name', 207, 50, 48, t('document_field_asset_name'), 9),
    field('asset.serialNumber', 257, 50, 28, t('document_field_asset_serialNumber'), 8),
    heading('static:location_label', t('document_pdfme_location'), 12, 62, 95, 8),
    field('location.name', 12, 70, 95, t('document_field_location_name'), 8),
    heading('static:site_label', t('document_pdfme_site'), 112, 62, 50, 8),
    field('site.name', 112, 70, 50, t('document_field_site_name'), 8),
    heading('static:due_date_label', t('document_pdfme_scheduled_due'), 167, 62, 55, 8),
    field('workOrder.dueDate', 167, 70, 55, t('document_field_workOrder_dueDate'), 8),
    heading('static:planned_duration_label', t('document_pdfme_estimated_hours'), 227, 62, 58, 8),
    field('workOrder.estimatedDuration', 227, 70, 58, t('document_field_workOrder_estimatedDuration'), 8),
    heading('static:assigned_to_label', t('document_pdfme_assigned_team'), 12, 82, 135, 8),
    field('workOrder.assignedTo', 12, 90, 135, t('document_field_workOrder_assignedTo'), 8),
    field('workOrder.team', 152, 90, 133, t('document_field_workOrder_team'), 8),
    heading('static:description_label', t('document_pdfme_maintenance_description'), 12, 102, 273, 8),
    field('workOrder.title', 12, 111, 273, t('document_field_workOrder_title'), 11),
    field('workOrder.description', 12, 121, 273, t('document_field_workOrder_description'), 9),
    heading('static:operations_label', t('document_pdfme_execution_tasks'), 12, 139, 273, 9),
    tableSchema('workOrder.executionTasks', ['step', 'task', 'result', 'notes'].map((key) => t(`document_table_column_${key}`)), 149, [10, 38, 22, 30])
  ];
  const laborPage = [
    heading('static:labor_page_title', t('document_pdfme_labor_title'), 12, 12, 273, 15),
    schemaFrom(line, 'static:labor_rule', '', { x: 12, y: 31 }, 273, 0.8, { color: PRIMARY }),
    heading('static:actual_duration_label', t('document_field_workOrder_actualDuration'), 12, 40, 100, 8),
    field('workOrder.actualDuration', 12, 49, 100, t('document_field_workOrder_actualDuration'), 10),
    heading('static:labor_table_label', t('document_pdfme_labor_entries'), 12, 65, 273, 9),
    tableSchema('workOrder.laborTimeEntries', ['technician', 'activity', 'startedAt', 'durationHours', 'status'].map((key) => t(`document_table_column_${key}`)), 76, [24, 22, 22, 16, 16])
  ];
  const materialsPage = [
    heading('static:materials_page_title', t('document_pdfme_materials_title'), 12, 12, 273, 15),
    schemaFrom(line, 'static:materials_rule', '', { x: 12, y: 31 }, 273, 0.8, { color: PRIMARY }),
    heading('static:materials_table_label', t('document_pdfme_materials_used'), 12, 40, 273, 9),
    tableSchema('workOrder.materialsUsed', ['part', 'description', 'quantity', 'unit'].map((key) => t(`document_table_column_${key}`)), 51, [24, 48, 16, 12])
  ];
  const closeoutPage = [
    heading('static:closeout_page_title', t('document_pdfme_closeout_title'), 12, 12, 273, 14),
    schemaFrom(line, 'static:closeout_rule', '', { x: 12, y: 31 }, 273, 0.8, { color: PRIMARY }),
    heading('static:safety_label', t('document_pdfme_safety_instructions'), 12, 40, 273, 9),
    field('static:safety_instructions', 12, 50, 273, '', 9, { height: 32 }),
    heading('static:execution_notes_label', t('document_pdfme_execution_notes'), 12, 88, 273, 9),
    field('workOrder.feedback', 12, 98, 273, t('document_field_workOrder_feedback'), 9, { height: 24 }),
    heading('static:technician_label', t('document_pdfme_completed_by'), 12, 132, 125, 8),
    field('workOrder.completedBy', 12, 141, 125, t('document_field_workOrder_completedBy'), 9),
    heading('static:signature_label', t('document_pdfme_technician_signature'), 12, 153, 125, 8),
    schemaFrom(signature, 'workOrder.signature', '', { x: 12, y: 162 }, 125, 25),
    heading('static:supervisor_label', t('document_pdfme_supervisor_approval'), 152, 132, 133, 8),
    schemaFrom(line, 'static:supervisor_signature_line', '', { x: 152, y: 185 }, 133, 0.5, { color: '#475467' })
  ];
  const pages = [page, laborPage, materialsPage, closeoutPage];
  const footer = [
    schemaFrom(line, 'static:qpm_footer_rule', '', { x: 12, y: 193 }, 273, 0.6, { color: PRIMARY, qpmPrintZone: 'FOOTER' }),
    field('static:qpm_footer_page', 220, 196, 65, `${t('document_pdfme_page')} {currentPage} / {totalPages}`, 8, { alignment: 'right', qpmPrintZone: 'FOOTER' })
  ];
  return {
    pdfmeVersion: PDFME_VERSION,
    basePdf: { width: PAGE_WIDTH, height: PAGE_HEIGHT, padding: [8, 8, 8, 8] },
    schemas: pages.map((schemas, index) => index === 0 ? [...schemas, ...footer] : schemas)
  } as Template;
}

const plugins = {
  Text: text,
  'Multi-variable text': multiVariableText,
  Image: image,
  Signature: signature,
  Table: table,
  Line: line,
  Rectangle: rectangle,
  Ellipse: ellipse,
  'QR code': barcodes.qrcode
};

const componentDefinitions = [
  { id: 'summary', group: 'workOrder', labelKey: 'document_component_summary', bindings: ['workOrder.customId', 'workOrder.status', 'workOrder.priority', 'asset.name', 'asset.serialNumber', 'location.name'] },
  { id: 'people', group: 'workOrder', labelKey: 'document_component_people', bindings: ['workOrder.primaryUser', 'workOrder.assignedTo', 'workOrder.customers', 'workOrder.createdBy'] },
  { id: 'tasks', group: 'execution', labelKey: 'document_component_tasks', bindings: ['workOrder.executionTasks'] },
  { id: 'labor', group: 'execution', labelKey: 'document_component_labor', bindings: ['workOrder.laborTimeEntries'] },
  { id: 'materials', group: 'execution', labelKey: 'document_component_materials', bindings: ['workOrder.materialsUsed'] },
  { id: 'signoff', group: 'execution', labelKey: 'document_component_signoff', bindings: ['workOrder.completedBy', 'workOrder.signature'] },
  { id: 'comments', group: 'context', labelKey: 'document_component_comments', bindings: ['workOrder.comments'] },
  { id: 'history', group: 'context', labelKey: 'document_component_history', bindings: ['workOrder.history'] },
  { id: 'relations', group: 'context', labelKey: 'document_component_relations', bindings: ['workOrder.relations'] },
  { id: 'customFields', group: 'context', labelKey: 'document_component_custom_fields', bindings: ['workOrder.customFields'] },
  { id: 'attachments', group: 'context', labelKey: 'document_component_attachments', bindings: ['workOrder.files'] },
  { id: 'textBlock', group: 'custom', labelKey: 'document_component_text_block', bindings: [] },
  { id: 'pageHeader', group: 'internal', labelKey: 'document_component_page_header', bindings: [] },
  { id: 'pageFooter', group: 'internal', labelKey: 'document_component_page_footer', bindings: [] }
] as const;

const componentGroups = [
  { id: 'workOrder', labelKey: 'document_component_group_work_order' },
  { id: 'execution', labelKey: 'document_component_group_execution' },
  { id: 'context', labelKey: 'document_component_group_context' },
  { id: 'custom', labelKey: 'document_component_group_custom' },
  { id: 'repeated', labelKey: 'document_component_group_repeated' }
] as const;

const componentIdForSchema = (schema: any): string => {
  if (componentDefinitions.some(({ id }) => id === schema.qpmComponent)) return schema.qpmComponent;
  if (schema.qpmPrintZone === 'HEADER' || schema.name.startsWith('static:qpm_header_')) return 'pageHeader';
  if (schema.qpmPrintZone === 'FOOTER' || schema.name.startsWith('static:qpm_footer_')) return 'pageFooter';
  if (schema.name.startsWith('static:qpm_')) {
    const inferred = schema.name.slice('static:qpm_'.length).split('_')[0];
    if (componentDefinitions.some(({ id }) => id === inferred)) return inferred;
  }
  return componentDefinitions.find(({ bindings }) => bindings.some((binding) => binding === schema.name))?.id || 'other';
};

function componentSchemas(id: string, t: (key: string) => string, y: number) {
  const title = (key: string, suffix: string) => field(`static:qpm_${id}_${suffix}`, 12, y, 273, t(key), 11, { fontColor: PRIMARY });
  const tableSchema = (name: string, headers: string[], widths: number[]) => ({
    ...table.propPanel.defaultSchema,
    name,
    position: { x: 12, y: y + 10 },
    width: 273,
    height: 32,
    head: headers,
    columnBindings: name === 'workOrder.executionTasks' ? ['step', 'task', 'result', 'notes']
      : name === 'workOrder.laborTimeEntries' ? ['technician', 'activity', 'startedAt', 'durationHours', 'status']
        : ['part', 'description', 'quantity', 'unit'],
    headWidthPercentages: widths,
    repeatHead: true,
    showHead: true,
    qpmEmptyMessage: t('document_table_empty_message_default'),
    content: '[]',
    headStyles: { ...table.propPanel.defaultSchema.headStyles, fontSize: 8, fontColor: '#FFFFFF', backgroundColor: PRIMARY },
    bodyStyles: { ...table.propPanel.defaultSchema.bodyStyles, fontSize: 8 }
  });
  if (id === 'summary') return [title('document_component_summary', 'title'),
    field('workOrder.customId', 12, y + 10, 70, t('document_field_workOrder_customId'), 12, { fontColor: PRIMARY }),
    field('workOrder.status', 88, y + 10, 55, t('document_field_workOrder_status'), 9), field('workOrder.priority', 149, y + 10, 55, t('document_field_workOrder_priority'), 9),
    field('asset.name', 210, y + 10, 75, t('document_field_asset_name'), 9),
    field('asset.serialNumber', 210, y + 20, 75, t('document_field_asset_serialNumber'), 8),
    field('location.name', 12, y + 30, 200, t('document_field_location_name'), 9),
    field('workOrder.actualDuration', 217, y + 30, 68, t('document_field_workOrder_actualDuration'), 8)];
  if (id === 'tasks') return [title('document_component_tasks', 'title'), tableSchema('workOrder.executionTasks', ['step', 'task', 'result', 'notes'].map((key) => t(`document_table_column_${key}`)), [10, 38, 22, 30])];
  if (id === 'labor') return [title('document_component_labor', 'title'), tableSchema('workOrder.laborTimeEntries', ['technician', 'activity', 'startedAt', 'durationHours', 'status'].map((key) => t(`document_table_column_${key}`)), [24, 22, 22, 16, 16])];
  if (id === 'materials') return [title('document_component_materials', 'title'), tableSchema('workOrder.materialsUsed', ['part', 'description', 'quantity', 'unit'].map((key) => t(`document_table_column_${key}`)), [24, 48, 16, 12])];
  if (id === 'people') return [title('document_component_people', 'title'),
    field('workOrder.primaryUser', 12, y + 11, 132, t('document_pdfme_primary_user'), 9),
    field('workOrder.assignedTo', 149, y + 11, 136, t('document_field_workOrder_assignedTo'), 9),
    field('workOrder.customers', 12, y + 21, 200, t('document_pdfme_customers'), 9),
    field('workOrder.createdBy', 217, y + 21, 68, t('document_pdfme_created_by'), 9)];
  const longTextFit = { height: 36, dynamicFontSize: { min: 5, max: 9, fit: 'vertical' } };
  if (id === 'comments') return [title('document_component_comments', 'title'), field('workOrder.comments', 12, y + 11, 273, t('document_component_comments'), 9, longTextFit)];
  if (id === 'history') return [title('document_component_history', 'title'), field('workOrder.history', 12, y + 11, 273, t('document_component_history'), 9, longTextFit)];
  if (id === 'relations') return [title('document_component_relations', 'title'), field('workOrder.relations', 12, y + 11, 273, t('document_component_relations'), 9, longTextFit)];
  if (id === 'customFields') return [title('document_component_custom_fields', 'title'), field('workOrder.customFields', 12, y + 11, 273, t('document_component_custom_fields'), 9, { height: 24 })];
  if (id === 'attachments') return [title('document_component_attachments', 'title'), field('workOrder.files', 12, y + 11, 273, t('document_component_attachments'), 9, { height: 24 })];
  if (id === 'textBlock') return [field('static:qpm_textBlock_content', 12, y, 273, t('document_component_text_block_default'), 9, { height: 18, ...longTextFit })];
  return [title('document_component_signoff', 'title'), field('workOrder.completedBy', 12, y + 11, 125, t('document_field_workOrder_completedBy'), 9),
    schemaFrom(signature, 'workOrder.signature', '', { x: 152, y: y + 11 }, 125, 24)];
}

const bindingProvenanceKeys = (name: string): { source: string; relationship: string } => {
  if (name.startsWith('static:')) return { source: 'static', relationship: 'static' };
  if (name.startsWith('company.')) return { source: 'company', relationship: 'company' };
  if (name.startsWith('asset.')) return { source: 'asset', relationship: 'asset' };
  if (name.startsWith('location.')) return { source: 'location', relationship: 'location' };
  if (name === 'site.name') return { source: 'site', relationship: 'site' };
  if (name === 'workOrder.relations') return { source: 'relations', relationship: 'relations' };
  if (name.startsWith('workOrder.')) return { source: 'workOrder', relationship: 'workOrder' };
  return { source: 'static', relationship: 'static' };
};

function toTemplate(configuration: any, t: (key: string) => string): Template {
  if (configuration?.basePdf && Array.isArray(configuration?.schemas)) {
    return configuration as Template;
  }
  const template = createJobCard(t);
  // Preserve fields selected in a legacy QPM draft by retaining only matching data-bound schemas.
  const selected = new Set<string>(configuration?.visibleFields || []);
  if (selected.size) {
    template.schemas = template.schemas.map((page: any[]) => page.filter((schema) =>
      schema.name.startsWith('static:') || selected.has(schema.name)
    ));
  }
  return template;
}

function PdfmeDocumentDesigner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const navigation = useContext(UNSAFE_NavigationContext);
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const muiTheme = useTheme();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const fontInputRef = useRef<HTMLInputElement | null>(null);
  const designerRef = useRef<Designer | null>(null);
  const workingTemplateRef = useRef<Template | null>(null);
  const currentTemplateRef = useRef<Template | null>(null);
  const dirtyRef = useRef(false);
  const [template, setTemplate] = useState<TemplateRecord | null>(null);
  const [workingTemplate, setWorkingTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [error, setError] = useState('');
  const [previewId, setPreviewId] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [selectedTable, setSelectedTable] = useState<{ pageIndex: number; schemaIndex: number; schema: any } | null>(null);
  const [selectedDataElement, setSelectedDataElement] = useState<{ schema: any } | null>(null);
  const [dataDiagnosis, setDataDiagnosis] = useState<{ binding: string; workOrderId: string; kind: 'available' | 'empty' | 'unlinked' | 'unavailable' | 'count'; count?: number } | null>(null);
  const [diagnosingData, setDiagnosingData] = useState(false);
  const [tablePreview, setTablePreview] = useState<{ binding: string; workOrderId: string; status: 'available' | 'empty' | 'unavailable'; totalCount: number; rows: Record<string, string>[] } | null>(null);
  const [previewingTable, setPreviewingTable] = useState(false);
  const [selectedPrintElement, setSelectedPrintElement] = useState<{ pageIndex: number; schemaIndex: number; schema: any } | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<{ pageIndex: number; id: string; sectionId?: string } | null>(null);
  const [deleteComponentOpen, setDeleteComponentOpen] = useState(false);
  const [zoneToClear, setZoneToClear] = useState<PrintZone | ''>('');
  const [activePage, setActivePage] = useState(0);
  const [canvasPageCount, setCanvasPageCount] = useState(1);
  const [selectedOutlineKey, setSelectedOutlineKey] = useState('');
  const [outlineSearch, setOutlineSearch] = useState('');
  const [componentSearch, setComponentSearch] = useState('');
  const [workspacePanel, setWorkspacePanel] = useState<'components' | 'structure'>('components');
  const [pendingPrintZone, setPendingPrintZone] = useState<PrintZone | ''>('');
  const [expandedComponentGroup, setExpandedComponentGroup] = useState<string>('workOrder');
  const [zoneHeightDrafts, setZoneHeightDrafts] = useState<Partial<Record<PrintZone, string>>>({});
  const [newTableColumn, setNewTableColumn] = useState('');
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [scope, setScope] = useState<'COMPANY' | 'SITE'>('COMPANY');
  const [siteId, setSiteId] = useState('');
  const markDirty = () => {
    dirtyRef.current = true;
    setHasUnsavedChanges(true);
  };
  const printZoneHeight = (source: any, zone: PrintZone) => {
    const configured = Number(source?.qpmPrintZoneHeights?.[zone]);
    return Number.isInteger(configured) && configured > 0
      ? configured
      : DEFAULT_PRINT_ZONE_HEIGHTS[zone];
  };
  const savePrintZoneHeight = (zone: PrintZone) => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    const draft = zoneHeightDrafts[zone];
    if (!designer || !current || draft === undefined) return;
    const value = Number(draft);
    const { height: pageHeight } = getPageDimensions(current);
    const maxHeight = Math.floor(pageHeight / 2);
    const configuredHeights = Object.fromEntries(
      (['HEADER', 'FOOTER', 'REPORT_HEADER', 'REPORT_FOOTER'] as PrintZone[]).map((item) => [
        item,
        item === zone ? value : printZoneHeight(current, item)
      ])
    ) as Record<PrintZone, number>;
    const topBandHeight = Math.max(configuredHeights.HEADER, configuredHeights.REPORT_HEADER);
    const bottomBandHeight = Math.max(configuredHeights.FOOTER, configuredHeights.REPORT_FOOTER);
    const withinPage = value >= 8 && value <= maxHeight
      && topBandHeight + bottomBandHeight <= pageHeight - 30;
    const zoneMembers = ((current.schemas as any[][]) || []).flat().filter((schema) => schema.qpmPrintZone === zone);
    const membersFit = zoneMembers.every((schema) => {
      const y = Number(schema.position?.y || 0);
      const bottom = y + Number(schema.height || 0);
      return ['HEADER', 'REPORT_HEADER'].includes(zone)
        ? y >= 0 && bottom <= value
        : y >= pageHeight - value && bottom <= pageHeight;
    });
    if (!Number.isInteger(value) || !withinPage || !membersFit) {
      showSnackBar(t(membersFit ? 'document_zone_height_invalid' : 'document_zone_height_component_overflow'), 'warning');
      setZoneHeightDrafts((drafts) => ({ ...drafts, [zone]: String(printZoneHeight(current, zone)) }));
      return;
    }
    const next = {
      ...current,
      qpmPrintZoneHeights: { ...((current as any).qpmPrintZoneHeights || {}), [zone]: value }
    } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setZoneHeightDrafts((drafts) => {
      const updated = { ...drafts };
      delete updated[zone];
      return updated;
    });
    designer.updateTemplate(next, { page: activePage });
  };
  const updatePrintZoneEmptyVisibility = (zone: PrintZone, enabled: boolean) => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current) return;
    const currentPages = current.schemas as any[][];
    const zoneMembers = currentPages.flat().filter((schema) => schema.qpmPrintZone === zone);
    if (!zoneMembers.some((schema) => !String(schema.name).startsWith('static:'))) return;
    const pages = currentPages.map((page) => page.map((schema) => {
      if (schema.qpmPrintZone !== zone) return schema;
      const nextSchema = { ...schema };
      if (enabled) nextSchema.qpmPrintZoneHideIfEmpty = true;
      else delete nextSchema.qpmPrintZoneHideIfEmpty;
      return nextSchema;
    }));
    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    designer.updateTemplate(next, { page: activePage });
  };
  const clearPrintZone = () => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    const zone = zoneToClear;
    if (!designer || !current || !zone) return;
    const pages = (current.schemas as any[][]).map((page) => page.filter((schema) => schema.qpmPrintZone !== zone));
    const removed = (current.schemas as any[][]).flat().length - pages.flat().length;
    if (removed === 0) { setZoneToClear(''); return; }
    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setSelectedPrintElement(null);
    setSelectedComponent(null);
    setZoneToClear('');
    designer.updateTemplate(next, { page: activePage });
    designer.selectSchemas([], { pageIndex: activePage, scroll: true });
    showSnackBar(t('document_zone_cleared'), 'success');
  };
  const hasTemplate = workingTemplate !== null;
  const customFont = (workingTemplate as any)?.font as Record<string, { data: string; fallback?: boolean; subset?: boolean }> | undefined;
  const fontData = customFont ? Object.values(customFont)[0]?.data || '' : '';
  const canEdit = Boolean(user.ownsCompany || (
    user.role?.viewPermissions?.includes(PermissionEntity.SETTINGS) &&
    user.role?.editOtherPermissions?.includes(PermissionEntity.SETTINGS)
  ) || (
    user.role?.viewPermissions?.includes(PermissionEntity.DOCUMENT_TEMPLATES) &&
    user.role?.editOtherPermissions?.includes(PermissionEntity.DOCUMENT_TEMPLATES)
  ));

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [templates, availableSites] = await Promise.all([
        api.get<TemplateRecord[]>('document-templates'),
        api.get<SiteOption[]>('sites')
      ]);
      if (Array.isArray(availableSites)) setSites(availableSites);
      const record = templates.find((item) => String(item.id) === String(id));
      if (!record) throw new Error('document_template_not_found');
      if (record.documentTypeCode !== 'WORK_ORDER') throw new Error('pdfme_work_orders_only');
      const configuration = record.draftConfiguration || record.publishedConfiguration;
      setTemplate(record);
      setScope(record.defaultScope === 'SITE' ? 'SITE' : 'COMPANY');
      setSiteId(record.siteId ? String(record.siteId) : '');
      dirtyRef.current = !configuration?.basePdf || !Array.isArray(configuration?.schemas);
      setHasUnsavedChanges(dirtyRef.current);
      const normalized = toTemplate(configuration, t);
      currentTemplateRef.current = normalized;
      setWorkingTemplate(normalized);
    } catch (loadError) {
      setError(getErrorMessage(loadError, t('document_template_load_error')));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { void loadTemplate(); }, [loadTemplate]);

  useEffect(() => {
    if (!hasUnsavedChanges || leaveConfirmOpen) return undefined;
    return blockDocumentNavigation(navigation.navigator, (retry) => {
      setPendingNavigation(() => retry);
      setLeaveConfirmOpen(true);
    });
  }, [hasUnsavedChanges, leaveConfirmOpen, navigation.navigator]);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => { workingTemplateRef.current = workingTemplate; }, [workingTemplate]);

  useEffect(() => {
    const templateToMount = workingTemplateRef.current;
    if (!mountRef.current || !templateToMount || loading || error || !canEdit) return undefined;
    try {
      const designer = new Designer({
        domContainer: mountRef.current,
        template: templateToMount,
        plugins,
        options: {
          lang: i18n.language?.startsWith('fr') ? 'fr' : 'en',
          sidebarOpen: true,
          font: customFont,
          theme: {
            token: {
              colorPrimary: muiTheme.palette.primary.main,
              colorPrimaryBg: muiTheme.palette.primary.light,
              colorWhite: muiTheme.palette.common.white
            }
          }
        }
      });
      designer.onChangeTemplate((next) => {
        currentTemplateRef.current = next;
        markDirty();
        setWorkingTemplate(next);
      });
      designer.onSaveTemplate((next) => {
        currentTemplateRef.current = next;
        markDirty();
        setWorkingTemplate(next);
      });
      setCanvasPageCount(designer.getTotalPages());
      designer.onPageChange(({ currentPage, totalPages }) => {
        setActivePage(currentPage);
        setCanvasPageCount(totalPages);
      });
      designer.onChangeSelection((selection) => {
        setActivePage(selection.pageIndex);
        const outlineSelection = selection.schemas.length === 1 ? selection.schemas[0] : null;
        setSelectedOutlineKey(outlineSelection ? `${outlineSelection.pageIndex}:${outlineSelection.schemaIndex}` : '');
        const selected = selection.schemas.find((item) => item.type === 'table');
        if (selected) setSelectedTable({ pageIndex: selected.pageIndex, schemaIndex: selected.schemaIndex, schema: selected.schema });
        else setSelectedTable(null);
        const selectedPrint = selection.schemas.length === 1 ? selection.schemas[0] : null;
        const selectedComponentIds = new Set(selection.schemas.map((item) => componentIdForSchema(item.schema)));
        const selectedSectionIds = new Set(selection.schemas.map((item) => item.schema.qpmSectionId || 'legacy'));
        const selectedSchema = selection.schemas[0]?.schema;
        const selectionIsComponent = selection.schemas.length > 1
          || Boolean(selectedSchema?.qpmComponent || selectedSchema?.qpmSectionId || selectedSchema?.qpmPrintZone);
        if (selection.schemas.length > 0 && selectionIsComponent && selectedComponentIds.size === 1
            && selectedSectionIds.size === 1 && !selectedComponentIds.has('other')) {
          setSelectedComponent({ pageIndex: selection.pageIndex, id: [...selectedComponentIds][0],
            sectionId: selection.schemas[0]?.schema.qpmSectionId });
        } else setSelectedComponent(null);
        setSelectedDataElement(selectedPrint ? { schema: selectedPrint.schema } : null);
        setDataDiagnosis(null);
        if (selectedPrint && !['table', 'signature'].includes(selectedPrint.type)) {
          setSelectedPrintElement({ pageIndex: selectedPrint.pageIndex, schemaIndex: selectedPrint.schemaIndex, schema: selectedPrint.schema });
        } else setSelectedPrintElement(null);
      });
      designerRef.current = designer;
      return () => {
        designerRef.current = null;
        designer.destroy();
      };
    } catch (mountError) {
      setError(getErrorMessage(mountError, t('document_designer_load_error')));
      return undefined;
    }
  }, [hasTemplate, fontData, loading, error, canEdit, i18n.language, muiTheme.palette.primary.light, muiTheme.palette.primary.main, muiTheme.palette.common.white, t]);

  const uploadFont = async (file?: File) => {
    if (!file || !workingTemplate) return;
    if (!/\.(ttf|otf)$/i.test(file.name) || file.size > 512 * 1024) {
      showSnackBar(t('document_designer_font_invalid'), 'error');
      if (fontInputRef.current) fontInputRef.current.value = '';
      return;
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('font_read_failed'));
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('font_read_failed'));
        reader.readAsDataURL(file);
      });
      const encoded = data.split(',')[1] || '';
      const signature = atob(encoded.slice(0, 12));
      const signatureBytes = Array.from(signature.slice(0, 4), (character) => character.charCodeAt(0));
      const isOpenType = signature === 'OTTO' || signature.startsWith('OTTO');
      const isTrueType = (signatureBytes[0] === 0 && signatureBytes[1] === 1 && signatureBytes[2] === 0 && signatureBytes[3] === 0)
        || signature.startsWith('true') || signature.startsWith('typ1');
      if (!isOpenType && !isTrueType) throw new Error('invalid_font_signature');
      const normalizedData = data.replace(/^data:[^,]+,/, isOpenType ? 'data:font/otf;base64,' : 'data:font/ttf;base64,');
      const next = { ...workingTemplate, font: { 'QPM Custom': { data: normalizedData, fallback: true, subset: true } } } as Template;
      currentTemplateRef.current = next;
      markDirty();
      setWorkingTemplate(next);
      showSnackBar(t('document_designer_font_added'), 'success');
    } catch {
      showSnackBar(t('document_designer_font_invalid'), 'error');
    } finally {
      if (fontInputRef.current) fontInputRef.current.value = '';
    }
  };

  const removeFont = () => {
    if (!workingTemplate) return;
    const next = { ...workingTemplate } as any;
    delete next.font;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next as Template);
  };

  const updatePageOrientation = (orientation: PageOrientation) => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current) return;
    const previous = getPageDimensions(current);
    if (previous.orientation === orientation) return;
    const width = orientation === 'LANDSCAPE' ? PAGE_WIDTH : PAGE_HEIGHT;
    const height = orientation === 'LANDSCAPE' ? PAGE_HEIGHT : PAGE_WIDTH;
    const scaleX = width / previous.width;
    const scaleY = height / previous.height;
    const schemas = (current.schemas as any[][]).map((page) => page.map((schema) => ({
      ...schema,
      position: schema.position ? {
        ...schema.position,
        x: Number(schema.position.x || 0) * scaleX,
        y: Number(schema.position.y || 0) * scaleY
      } : schema.position,
      ...(Number.isFinite(Number(schema.width)) ? { width: Number(schema.width) * scaleX } : {}),
      ...(Number.isFinite(Number(schema.height)) ? { height: Number(schema.height) * scaleY } : {})
    })));
    const next = { ...current, basePdf: { ...current.basePdf, width, height }, schemas } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setSelectedComponent(null);
    setSelectedPrintElement(null);
    setSelectedTable(null);
    setSelectedDataElement(null);
    designer.updateTemplate(next, { page: activePage });
  };

  const insertComponent = (componentId: string) => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current) return;
    const definition = componentDefinitions.find((item) => item.id === componentId);
    if (!definition) return;
    const pages = current.schemas as any[][];
    const { width: pageWidth, height: pageHeight } = getPageDimensions(current);
    const sectionId = `qpm-${componentId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const baseSchemas = scaleSchemasToPageWidth(componentSchemas(componentId, t, 12), pageWidth);
    if (pendingPrintZone && baseSchemas.some((schema) => ['table', 'signature'].includes(schema.type))) {
      showSnackBar(t('document_zone_component_unsupported'), 'warning');
      return;
    }
    if (pendingPrintZone) {
      const existingNames = new Set(pages.flat().map((schema) => schema.name));
      if (definition.bindings.some((binding) => existingNames.has(binding))) {
        showSnackBar(t('document_zone_component_duplicate'), 'warning');
        return;
      }
    }
    const startPage = designer.getPageCursor();
    const pageOrder = [startPage, ...pages.map((_, index) => index).filter((index) => index !== startPage)];
    const componentHeight = baseSchemas.reduce(
      (max, schema) => Math.max(max, Number(schema.position?.y || 0) + Number(schema.height || 0)),
      12
    ) - 12;
    let target = -1;
    let insertY = 12;
    for (const pageIndex of pageOrder) {
      const schemas = pages[pageIndex] || [];
      const names = new Set(schemas.map((schema) => schema.name));
      if (definition.bindings.some((binding) => names.has(binding))) continue;
      // Repeated page/report headers and footers are overlaid by the renderer;
      // they should not force body components onto a later page.
      const bodySchemas = schemas.filter((schema) => !schema.qpmPrintZone);
      const bottom = bodySchemas.reduce((max, schema) => Math.max(max, Number(schema.position?.y || 0) + Number(schema.height || 0)), 12);
      const zoneSchemas = pendingPrintZone ? schemas.filter((schema) => schema.qpmPrintZone === pendingPrintZone) : [];
      const topZone = pendingPrintZone === 'HEADER' || pendingPrintZone === 'REPORT_HEADER';
      const zoneHeight = pendingPrintZone ? printZoneHeight(current, pendingPrintZone) : 0;
      const zoneTop = topZone ? 8 : pageHeight - zoneHeight;
      const zoneBottom = topZone ? zoneHeight : pageHeight - 8;
      const candidateY = !pendingPrintZone
        ? Math.max(12, bottom + 6, Math.max(printZoneHeight(current, 'HEADER'), printZoneHeight(current, 'REPORT_HEADER')) + 4)
        : topZone
          ? Math.max(zoneTop, zoneSchemas.reduce((max, schema) => Math.max(max,
            Number(schema.position?.y || 0) + Number(schema.height || 0)), zoneTop) + 4)
          : Math.min(zoneBottom - componentHeight, (zoneSchemas.length
            ? Math.min(...zoneSchemas.map((schema) => Number(schema.position?.y || 0)))
            : zoneBottom) - componentHeight - 4);
      const bodyBottom = pageHeight - Math.max(printZoneHeight(current, 'FOOTER'), printZoneHeight(current, 'REPORT_FOOTER')) - 4;
      const fitsZone = !pendingPrintZone || (candidateY >= zoneTop && candidateY + componentHeight <= zoneBottom);
      if (fitsZone && candidateY + componentHeight <= (pendingPrintZone ? pageHeight - 8 : bodyBottom)) { target = pageIndex; insertY = candidateY; break; }
    }
    if (target < 0) {
      if (pendingPrintZone) { showSnackBar(t('document_zone_no_space'), 'warning'); return; }
      if (pages.length >= 20) { showSnackBar(t('document_component_page_limit'), 'warning'); return; }
      target = pages.length;
      insertY = 12;
    }
    const nextPages = pages.map((page) => [...page]);
    while (nextPages.length <= target) nextPages.push([]);
    const addedSchemas = scaleSchemasToPageWidth(componentSchemas(componentId, t, insertY), pageWidth)
      .map((schema) => ({
        ...schema,
        ...(componentId === 'textBlock' ? { name: `static:qpm_textBlock_${sectionId}` } : {}),
        qpmComponent: componentId,
        qpmSectionId: sectionId,
        ...(pendingPrintZone ? { qpmPrintZone: pendingPrintZone } : {})
      }));
    if (pendingPrintZone) {
      const allNames = new Set(pages.flat().map((schema) => schema.name));
      if (addedSchemas.some((schema) => allNames.has(schema.name))) {
        showSnackBar(t('document_zone_component_duplicate'), 'warning');
        return;
      }
    }
    const firstAddedIndex = nextPages[target].length;
    nextPages[target].push(...addedSchemas);
    const next = { ...current, schemas: nextPages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    designer.updateTemplate(next, { page: target });
    designer.selectSchemas(addedSchemas.map((schema, index) => ({
      name: schema.name,
      pageIndex: target,
      schemaIndex: firstAddedIndex + index
    })), { pageIndex: target, scroll: true });
    showSnackBar(
      pendingPrintZone
        ? t('document_component_added_to_zone', { zone: t(`document_zone_${pendingPrintZone === 'HEADER' ? 'header' : pendingPrintZone === 'FOOTER' ? 'footer' : pendingPrintZone === 'REPORT_HEADER' ? 'reportHeader' : 'reportFooter'}`) })
        : t(componentId === 'textBlock' ? 'document_component_text_block_added' : 'document_component_added'),
      'success'
    );
  };

  const addEditableHeaderFooter = () => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current) return;
    const { width: pageWidth, height: pageHeight } = getPageDimensions(current);
    const headerSectionId = 'qpm-page-header-page-0';
    const footerSectionId = 'qpm-page-footer-page-0';
    const pages = (current.schemas as any[][]).map((schemas, pageIndex) => schemas.map((schema) => {
      const componentId = componentIdForSchema(schema);
      if (componentId === 'pageHeader') return {
        ...schema,
        qpmComponent: componentId,
        qpmSectionId: `qpm-page-header-page-${pageIndex}`,
        qpmPrintZone: 'HEADER'
      };
      if (componentId === 'pageFooter') return {
        ...schema,
        qpmComponent: componentId,
        qpmSectionId: `qpm-page-footer-page-${pageIndex}`,
        qpmPrintZone: 'FOOTER'
      };
      return pageIndex === 0 && (schema.name === 'company.logo' || schema.name === 'company.name')
        ? {
          ...schema,
          qpmComponent: 'pageHeader',
          qpmSectionId: headerSectionId,
          qpmPrintZone: 'HEADER'
        } : schema;
    }));
    if (!pages.length) pages.push([]);
    const allNames = new Set(pages.flat().map((schema) => schema.name));
    const hasEditableHeader = pages.flat().some((schema) => schema.qpmComponent === 'pageHeader'
      || schema.name.startsWith('static:qpm_header_'));
    const hasEditableFooter = pages.flat().some((schema) => schema.qpmComponent === 'pageFooter'
      || schema.name.startsWith('static:qpm_footer_'));
    if (!hasEditableHeader) {
      const header: any[] = [
        field('static:qpm_header_title', pageWidth - 97, 4, 85, template?.name || t('document_template'), 9,
          { fontColor: PRIMARY, height: 10, alignment: 'right', qpmPrintZone: 'HEADER' }),
        schemaFrom(line, 'static:qpm_header_rule', '', { x: 12, y: 16 }, pageWidth - 24, 0.6,
          { color: PRIMARY, qpmPrintZone: 'HEADER' })
      ];
      if (!allNames.has('company.logo')) header.push(schemaFrom(image, 'company.logo', '', { x: 12, y: 1 }, 12, 12,
        { objectFit: 'contain', qpmPrintZone: 'HEADER' }));
      if (!allNames.has('company.name')) header.push(field('company.name', 27, 4, pageWidth - 127, 'Company name', 9,
        { fontColor: PRIMARY, qpmPrintZone: 'HEADER' }));
      pages[0].push(...header.map((schema) => ({ ...schema, qpmComponent: 'pageHeader', qpmSectionId: headerSectionId })));
    }
    if (!hasEditableFooter) {
      const footer: any[] = [
        schemaFrom(line, 'static:qpm_footer_rule', '', { x: 12, y: pageHeight - 17 }, pageWidth - 24, 0.6,
          { color: PRIMARY, qpmPrintZone: 'FOOTER' }),
        field('static:qpm_footer_page', pageWidth - 77, pageHeight - 14, 65, `${t('document_page')} {currentPage} / {totalPages}`, 8,
          { alignment: 'right', qpmPrintZone: 'FOOTER' })
      ];
      pages[0].push(...footer.map((schema) => ({ ...schema, qpmComponent: 'pageFooter', qpmSectionId: footerSectionId })));
    }
    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    designer.updateTemplate(next, { page: 0 });
    const headerTargets = pages[0].flatMap((schema, schemaIndex) => schema.qpmComponent === 'pageHeader'
      ? [{ name: schema.name, pageIndex: 0, schemaIndex }] : []);
    if (headerTargets.length) {
      setSelectedComponent({ pageIndex: 0, id: 'pageHeader', sectionId: headerSectionId });
      designer.selectSchemas(headerTargets, { pageIndex: 0, scroll: true });
    }
    showSnackBar(t('document_header_footer_added'), 'success');
  };

  const updateSelectedPrintZone = (zone: '' | 'HEADER' | 'FOOTER' | 'REPORT_HEADER' | 'REPORT_FOOTER') => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current || !selectedPrintElement) return;
    const pages = (current.schemas as any[][]).map((page) => [...page]);
    const page = pages[selectedPrintElement.pageIndex];
    const currentSchema = page?.[selectedPrintElement.schemaIndex];
    if (!currentSchema || currentSchema.name !== selectedPrintElement.schema.name) return;
    const schema = { ...currentSchema };
    if (zone) schema.qpmPrintZone = zone;
    else delete schema.qpmPrintZone;
    page[selectedPrintElement.schemaIndex] = schema;
    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setSelectedPrintElement({ ...selectedPrintElement, schema });
    designer.updateTemplate(next, { page: selectedPrintElement.pageIndex });
    designer.selectSchemas([{ name: schema.name, pageIndex: selectedPrintElement.pageIndex, schemaIndex: selectedPrintElement.schemaIndex }],
      { pageIndex: selectedPrintElement.pageIndex, scroll: true });
  };

  const updateSelectedHideIfEmpty = (enabled: boolean) => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current || !selectedPrintElement) return;
    const pages = (current.schemas as any[][]).map((page) => [...page]);
    const page = pages[selectedPrintElement.pageIndex];
    const currentSchema = page?.[selectedPrintElement.schemaIndex];
    if (!currentSchema || currentSchema.name !== selectedPrintElement.schema.name) return;
    const schema = { ...currentSchema };
    if (enabled) schema.qpmHideIfEmpty = true;
    else delete schema.qpmHideIfEmpty;
    page[selectedPrintElement.schemaIndex] = schema;
    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setSelectedPrintElement({ ...selectedPrintElement, schema });
    designer.updateTemplate(next, { page: selectedPrintElement.pageIndex });
    designer.selectSchemas([{ name: schema.name, pageIndex: selectedPrintElement.pageIndex, schemaIndex: selectedPrintElement.schemaIndex }],
      { pageIndex: selectedPrintElement.pageIndex, scroll: true });
  };

  const updateSelectedComponentVisibility = (enabled: boolean) => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current || !selectedComponent) return;
    const pages = (current.schemas as any[][]).map((page) => [...page]);
    const page = pages[selectedComponent.pageIndex];
    if (!page) return;
    const componentSchemas = page.filter((schema) => selectedComponent.sectionId
      ? schema.qpmSectionId === selectedComponent.sectionId
      : componentIdForSchema(schema) === selectedComponent.id);
    if (componentSchemas.length < 2) return;
    const sectionId = selectedComponent.sectionId
      || `qpm-${selectedComponent.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const updatedPage = page.map((schema) => {
      if (selectedComponent.sectionId ? schema.qpmSectionId !== selectedComponent.sectionId
        : componentIdForSchema(schema) !== selectedComponent.id) return schema;
      const nextSchema = { ...schema, qpmComponent: selectedComponent.id, qpmSectionId: sectionId };
      if (enabled) nextSchema.qpmHideComponentIfEmpty = true;
      else delete nextSchema.qpmHideComponentIfEmpty;
      return nextSchema;
    });
    pages[selectedComponent.pageIndex] = updatedPage;
    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setSelectedComponent({ ...selectedComponent, sectionId });
    designer.updateTemplate(next, { page: selectedComponent.pageIndex });
    designer.selectSchemas(updatedPage.flatMap((schema, schemaIndex) => schema.qpmSectionId === sectionId
      ? [{ name: schema.name, pageIndex: selectedComponent.pageIndex, schemaIndex }]
      : []), { pageIndex: selectedComponent.pageIndex, scroll: true });
  };

  const updateSelectedComponentPrintZone = (zone: '' | 'HEADER' | 'FOOTER' | 'REPORT_HEADER' | 'REPORT_FOOTER') => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current || !selectedComponent) return;
    const pages = (current.schemas as any[][]).map((page) => [...page]);
    const page = pages[selectedComponent.pageIndex];
    if (!page) return;
    const sectionId = selectedComponent.sectionId
      || `qpm-${selectedComponent.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const updatedPage = page.map((schema) => {
      const belongs = selectedComponent.sectionId
        ? schema.qpmSectionId === selectedComponent.sectionId
        : componentIdForSchema(schema) === selectedComponent.id;
      if (!belongs) return schema;
      const nextSchema = { ...schema, qpmComponent: selectedComponent.id, qpmSectionId: sectionId };
      if (zone) nextSchema.qpmPrintZone = zone;
      else delete nextSchema.qpmPrintZone;
      return nextSchema;
    });
    pages[selectedComponent.pageIndex] = updatedPage;
    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setSelectedComponent({ ...selectedComponent, sectionId });
    designer.updateTemplate(next, { page: selectedComponent.pageIndex });
    designer.selectSchemas(updatedPage.flatMap((schema, schemaIndex) => schema.qpmSectionId === sectionId
      ? [{ name: schema.name, pageIndex: selectedComponent.pageIndex, schemaIndex }]
      : []), { pageIndex: selectedComponent.pageIndex, scroll: true });
  };

  const alignSelectedComponentWithinZone = () => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current || !selectedComponent) return;
    const pages = (current.schemas as any[][]).map((page) => [...page]);
    const page = pages[selectedComponent.pageIndex];
    if (!page) return;
    const members = page.filter((schema) => selectedComponent.sectionId
      ? schema.qpmSectionId === selectedComponent.sectionId
      : componentIdForSchema(schema) === selectedComponent.id);
    const zoneValues = new Set(members.map((schema) => schema.qpmPrintZone || ''));
    if (members.length === 0 || zoneValues.size !== 1) return;
    const zone = [...zoneValues][0];
    if (!['HEADER', 'FOOTER', 'REPORT_HEADER', 'REPORT_FOOTER'].includes(zone)) return;

    const { height: pageHeight } = getPageDimensions(current);
    const top = Math.min(...members.map((schema) => Number(schema.position?.y || 0)));
    const bottom = Math.max(...members.map((schema) => Number(schema.position?.y || 0) + Number(schema.height || 0)));
    const componentHeight = bottom - top;
    const margin = 8;
    const bandHeight = printZoneHeight(current, zone as PrintZone);
    if (componentHeight > Math.min(pageHeight - margin * 2, bandHeight - margin)) {
      showSnackBar(t('document_component_zone_too_tall'), 'warning');
      return;
    }
    const targetTop = ['HEADER', 'REPORT_HEADER'].includes(zone)
      ? Math.max(margin, (bandHeight - componentHeight) / 2)
      : pageHeight - bandHeight + (bandHeight - componentHeight) / 2;
    if (targetTop < 0 || targetTop + componentHeight > pageHeight) {
      showSnackBar(t('document_component_zone_too_tall'), 'warning');
      return;
    }
    const offset = targetTop - top;
    const sectionId = selectedComponent.sectionId
      || `qpm-${selectedComponent.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const updatedPage = page.map((schema) => {
      const belongs = selectedComponent.sectionId
        ? schema.qpmSectionId === selectedComponent.sectionId
        : componentIdForSchema(schema) === selectedComponent.id;
      if (!belongs) return schema;
      return {
        ...schema,
        qpmComponent: selectedComponent.id,
        qpmSectionId: sectionId,
        position: { ...schema.position, y: Number(schema.position?.y || 0) + offset }
      };
    });
    pages[selectedComponent.pageIndex] = updatedPage;
    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setSelectedComponent({ ...selectedComponent, sectionId });
    designer.updateTemplate(next, { page: selectedComponent.pageIndex });
    designer.selectSchemas(updatedPage.flatMap((schema, schemaIndex) => schema.qpmSectionId === sectionId
      ? [{ name: schema.name, pageIndex: selectedComponent.pageIndex, schemaIndex }]
      : []), { pageIndex: selectedComponent.pageIndex, scroll: true });
    showSnackBar(t('document_component_aligned_zone'), 'success');
  };

  const removeSelectedComponent = () => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current || !selectedComponent) return;
    const pages = (current.schemas as any[][]).map((page) => [...page]);
    const page = pages[selectedComponent.pageIndex];
    if (!page) return;
    const belongsToComponent = (schema: any) => selectedComponent.sectionId
      ? schema.qpmSectionId === selectedComponent.sectionId
      : componentIdForSchema(schema) === selectedComponent.id;
    const removedCount = page.filter(belongsToComponent).length;
    if (removedCount === 0) return;
    pages[selectedComponent.pageIndex] = page.filter((schema) => !belongsToComponent(schema));
    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setSelectedComponent(null);
    setSelectedPrintElement(null);
    setSelectedTable(null);
    setSelectedDataElement(null);
    setDeleteComponentOpen(false);
    designer.updateTemplate(next, { page: selectedComponent.pageIndex });
    designer.selectSchemas([], { pageIndex: selectedComponent.pageIndex, scroll: true });
    showSnackBar(t('document_component_removed'), 'success');
  };

  const duplicateSelectedTextBlock = () => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current || !selectedComponent || selectedComponent.id !== 'textBlock') return;
    const pages = (current.schemas as any[][]).map((page) => [...page]);
    const pageIndex = selectedComponent.pageIndex;
    const page = pages[pageIndex];
    if (!page) return;
    const source = page.filter((schema) => selectedComponent.sectionId
      ? schema.qpmSectionId === selectedComponent.sectionId
      : componentIdForSchema(schema) === 'textBlock');
    if (source.length === 0 || source.some((schema) => !String(schema.name).startsWith('static:')
      || schema.qpmPrintZone)) return;
    const { height: pageHeight } = getPageDimensions(current);
    const minY = Math.min(...source.map((schema) => Number(schema.position?.y || 0)));
    const maxY = Math.max(...source.map((schema) => Number(schema.position?.y || 0) + Number(schema.height || 0)));
    const pageContentBottom = page.filter((schema) => !schema.qpmPrintZone).reduce((bottom, schema) =>
      Math.max(bottom, Number(schema.position?.y || 0) + Number(schema.height || 0)), 12);
    const deltaY = Math.max(6, pageContentBottom + 6 - minY);
    if (maxY + deltaY > pageHeight - printZoneHeight(current, 'FOOTER') - 4) {
      showSnackBar(t('document_component_duplicate_no_space'), 'warning');
      return;
    }
    const sectionId = `qpm-textBlock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const copies = source.map((schema, index) => ({
      ...schema,
      name: `static:qpm_textBlock_${sectionId}_${index}`,
      position: { ...schema.position, y: Number(schema.position?.y || 0) + deltaY },
      qpmComponent: 'textBlock',
      qpmSectionId: sectionId
    }));
    const firstIndex = page.length;
    pages[pageIndex].push(...copies);
    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setSelectedComponent({ pageIndex, id: 'textBlock', sectionId });
    designer.updateTemplate(next, { page: pageIndex });
    designer.selectSchemas(copies.map((schema, index) => ({ name: schema.name, pageIndex, schemaIndex: firstIndex + index })),
      { pageIndex, scroll: true });
    showSnackBar(t('document_component_duplicated'), 'success');
  };

  const moveSelectedComponentPage = (offset: -1 | 1) => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current || !selectedComponent) return;
    const { height: pageHeight } = getPageDimensions(current);
    const pages = (current.schemas as any[][]).map((page) => [...page]);
    const sourceIndex = selectedComponent.pageIndex;
    const targetIndex = sourceIndex + offset;
    if (targetIndex < 0 || targetIndex > pages.length || targetIndex >= 20) return;

    const source = pages[sourceIndex] || [];
    const belongsToComponent = (schema: any) => selectedComponent.sectionId
      ? schema.qpmSectionId === selectedComponent.sectionId
      : componentIdForSchema(schema) === selectedComponent.id;
    const componentMembers = source.filter(belongsToComponent);
    if (!componentMembers.length || componentMembers.some((schema) => schema.qpmPrintZone)) return;

    const componentTop = Math.min(...componentMembers.map((schema) => Number(schema.position?.y || 0)));
    const componentBottom = Math.max(...componentMembers.map((schema) => Number(schema.position?.y || 0) + Number(schema.height || 0)));
    const componentHeight = componentBottom - componentTop;
    const targetPage = pages[targetIndex] || [];
    const targetBody = targetPage.filter((schema) => !schema.qpmPrintZone);
    const targetBottom = targetBody.reduce(
      (bottom, schema) => Math.max(bottom, Number(schema.position?.y || 0) + Number(schema.height || 0)),
      0
    );
    const targetTop = targetBottom > 0 ? targetBottom + 6 : 12;
    if (targetTop + componentHeight > pageHeight - 10) {
      showSnackBar(t('document_component_move_page_full'), 'warning');
      return;
    }
    const verticalOffset = targetTop - componentTop;
    const movedSchemas = componentMembers.map((schema) => ({
      ...schema,
      position: { ...schema.position, y: Number(schema.position?.y || 0) + verticalOffset }
    }));

    if (targetIndex === pages.length) pages.push([]);
    pages[sourceIndex] = source.filter((schema) => !belongsToComponent(schema));
    const target = pages[targetIndex] || [];
    const firstIndex = target.length;
    pages[targetIndex] = [...target, ...movedSchemas];

    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setActivePage(targetIndex);
    setCanvasPageCount(Math.max(designer.getTotalPages(), pages.length));
    setSelectedComponent({ ...selectedComponent, pageIndex: targetIndex });
    designer.updateTemplate(next, { page: targetIndex });
    designer.selectSchemas(movedSchemas.map((schema, index) => ({
      name: schema.name,
      pageIndex: targetIndex,
      schemaIndex: firstIndex + index
    })), { pageIndex: targetIndex, scroll: true });
    showSnackBar(t('document_component_moved_page'), 'success');
  };

  const moveSelectedComponentToNewPage = () => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current || !selectedComponent) return;
    const { height: pageHeight } = getPageDimensions(current);
    const pages = (current.schemas as any[][]).map((page) => [...page]);
    const sourceIndex = selectedComponent.pageIndex;
    const source = pages[sourceIndex] || [];
    const belongsToComponent = (schema: any) => selectedComponent.sectionId
      ? schema.qpmSectionId === selectedComponent.sectionId
      : componentIdForSchema(schema) === selectedComponent.id;
    const componentMembers = source.filter(belongsToComponent);
    if (!componentMembers.length || componentMembers.some((schema) => schema.qpmPrintZone)) return;
    if (pages.length >= 20) {
      showSnackBar(t('document_component_page_limit'), 'warning');
      return;
    }

    const componentTop = Math.min(...componentMembers.map((schema) => Number(schema.position?.y || 0)));
    const componentBottom = Math.max(...componentMembers.map((schema) => Number(schema.position?.y || 0) + Number(schema.height || 0)));
    const componentHeight = componentBottom - componentTop;
    const targetTop = 12;
    if (targetTop + componentHeight > pageHeight - 10) {
      showSnackBar(t('document_component_move_page_full'), 'warning');
      return;
    }

    let targetIndex = sourceIndex + 1;
    const verticalOffset = targetTop - componentTop;
    const movedSchemas = componentMembers.map((schema) => ({
      ...schema,
      position: { ...schema.position, y: Number(schema.position?.y || 0) + verticalOffset }
    }));
    pages[sourceIndex] = source.filter((schema) => !belongsToComponent(schema));
    const sourceHasBody = pages[sourceIndex].some((schema) => !schema.qpmPrintZone);
    if (!sourceHasBody) {
      pages.splice(sourceIndex, 1);
      targetIndex = sourceIndex;
    }
    pages.splice(targetIndex, 0, movedSchemas);

    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setActivePage(targetIndex);
    setCanvasPageCount(Math.max(designer.getTotalPages(), pages.length));
    setSelectedComponent({ ...selectedComponent, pageIndex: targetIndex });
    designer.updateTemplate(next, { page: targetIndex });
    designer.selectSchemas(movedSchemas.map((schema, index) => ({
      name: schema.name,
      pageIndex: targetIndex,
      schemaIndex: index
    })), { pageIndex: targetIndex, scroll: true });
    showSnackBar(t('document_component_moved_new_page'), 'success');
  };

  const updateSelectedTableSchema = (update: (schema: any) => any) => {
    const designer = designerRef.current;
    const current = currentTemplateRef.current || workingTemplate;
    if (!designer || !current || !selectedTable) return;
    const pages = (current.schemas as any[][]).map((page) => [...page]);
    const page = pages[selectedTable.pageIndex];
    if (!page?.[selectedTable.schemaIndex]) return;
    const schema = update({ ...page[selectedTable.schemaIndex] });
    if (!schema) return;
    page[selectedTable.schemaIndex] = schema;
    const next = { ...current, schemas: pages } as Template;
    currentTemplateRef.current = next;
    markDirty();
    setWorkingTemplate(next);
    setSelectedTable({ ...selectedTable, schema });
    designer.updateTemplate(next, { page: selectedTable.pageIndex });
    designer.selectSchemas([{ name: schema.name, pageIndex: selectedTable.pageIndex, schemaIndex: selectedTable.schemaIndex }],
      { pageIndex: selectedTable.pageIndex, scroll: true });
  };

  const updateTableColumnBinding = (columnIndex: number, binding: string) => {
    updateSelectedTableSchema((schema) => {
      const available = tableColumnsFor(schema.name);
      const bindings = Array.isArray(schema.columnBindings) ? [...schema.columnBindings]
        : available.slice(0, schema.head?.length || available.length);
      bindings[columnIndex] = binding;
      schema.columnBindings = bindings;
      return schema;
    });
  };

  const updateTableColumnHeader = (columnIndex: number, header: string) => {
    updateSelectedTableSchema((schema) => {
      const headers = [...(schema.head || [])];
      headers[columnIndex] = header.slice(0, 100);
      schema.head = headers;
      return schema;
    });
  };

  const updateTableColumnWidth = (columnIndex: number, requestedWidth: number) => {
    updateSelectedTableSchema((schema) => {
      const count = schema.head?.length || 0;
      if (!count || columnIndex < 0 || columnIndex >= count) return null;
      const currentWidths = normalizeColumnWidths(
        schema.headWidthPercentages || schema.head.map(() => 1),
      );
      const width = Math.min(100 - (count - 1), Math.max(1, requestedWidth));
      const remaining = 100 - width;
      const peers = currentWidths
        .map((value: number, index: number) => ({ index, weight: value }))
        .filter(({ index }: { index: number }) => index !== columnIndex);
      const nextWidths = Array(count).fill(0);
      nextWidths[columnIndex] = width;

      // Keep every other column at least 1%, distributing the remaining
      // width proportionally to its existing size.
      let active = [...peers];
      let available = remaining;
      while (active.length) {
        let totalWeight = 0;
        for (const peer of active) totalWeight += peer.weight;
        if (!totalWeight) totalWeight = active.length;
        const tooSmall: typeof active = [];
        for (const peer of active) {
          if (available * peer.weight / totalWeight < 1) tooSmall.push(peer);
        }
        if (!tooSmall.length) {
          for (const peer of active) nextWidths[peer.index] = available * peer.weight / totalWeight;
          break;
        }
        const tooSmallIndexes = new Set<number>();
        for (const peer of tooSmall) {
          nextWidths[peer.index] = 1;
          available -= 1;
          tooSmallIndexes.add(peer.index);
        }
        const remainingPeers: typeof active = [];
        for (const peer of active) {
          if (!tooSmallIndexes.has(peer.index)) remainingPeers.push(peer);
        }
        active = remainingPeers;
      }
      schema.headWidthPercentages = normalizeColumnWidths(nextWidths);
      return schema;
    });
  };

  const updateTableEmptyMessage = (message: string) => {
    updateSelectedTableSchema((schema) => {
      schema.qpmEmptyMessage = message.slice(0, 200);
      return schema;
    });
  };

  const moveTableColumn = (columnIndex: number, offset: number) => {
    updateSelectedTableSchema((schema) => {
      const targetIndex = columnIndex + offset;
      if (targetIndex < 0 || targetIndex >= schema.head.length) return null;
      const bindings = [...(schema.columnBindings || tableColumnsFor(schema.name).slice(0, schema.head.length))];
      const widths = [...(schema.headWidthPercentages || normalizeColumnWidths(schema.head.map(() => 1)))];
      const headers = [...schema.head];
      [headers[columnIndex], headers[targetIndex]] = [headers[targetIndex], headers[columnIndex]];
      [bindings[columnIndex], bindings[targetIndex]] = [bindings[targetIndex], bindings[columnIndex]];
      [widths[columnIndex], widths[targetIndex]] = [widths[targetIndex], widths[columnIndex]];
      schema.head = headers;
      schema.columnBindings = bindings;
      schema.headWidthPercentages = widths;
      try {
        const rows = JSON.parse(schema.content || '[]');
        if (Array.isArray(rows)) {
          schema.content = JSON.stringify(rows.map((row: unknown[]) => {
            if (!Array.isArray(row)) return row;
            const copy = [...row];
            [copy[columnIndex], copy[targetIndex]] = [copy[targetIndex], copy[columnIndex]];
            return copy;
          }));
        }
      } catch { /* Leave malformed sample content for the PDFME editor to repair. */ }
      return schema;
    });
  };

  const removeTableColumn = (columnIndex: number) => {
    updateSelectedTableSchema((schema) => {
      if (schema.head.length <= 1) return null;
      const bindings = [...(schema.columnBindings || tableColumnsFor(schema.name).slice(0, schema.head.length))];
      const widths = [...(schema.headWidthPercentages || normalizeColumnWidths(schema.head.map(() => 1)))];
      schema.head = schema.head.filter((_: string, index: number) => index !== columnIndex);
      schema.columnBindings = bindings.filter((_: string, index: number) => index !== columnIndex);
      schema.headWidthPercentages = normalizeColumnWidths(widths.filter((_: number, index: number) => index !== columnIndex));
      try {
        const rows = JSON.parse(schema.content || '[]');
        if (Array.isArray(rows)) schema.content = JSON.stringify(rows.map((row: unknown[]) =>
          Array.isArray(row) ? row.filter((_: unknown, index: number) => index !== columnIndex) : row));
      } catch { /* Leave malformed sample content for the PDFME editor to repair. */ }
      return schema;
    });
  };

  const addTableColumn = () => {
    if (!newTableColumn) return;
    updateSelectedTableSchema((schema) => {
      const available = tableColumnsFor(schema.name);
      const bindings = Array.isArray(schema.columnBindings) ? [...schema.columnBindings]
        : available.slice(0, schema.head?.length || available.length);
      if (!available.includes(newTableColumn) || bindings.includes(newTableColumn) || schema.head.length >= 12) return null;
      const widths = schema.headWidthPercentages || normalizeColumnWidths(schema.head.map(() => 1));
      const scale = 85 / 100;
      schema.head = [...schema.head, t(`document_table_column_${newTableColumn}`)];
      schema.columnBindings = [...bindings, newTableColumn];
      schema.headWidthPercentages = normalizeColumnWidths([...widths.map((width: number) => width * scale), 15]);
      try {
        const rows = JSON.parse(schema.content || '[]');
        if (Array.isArray(rows)) schema.content = JSON.stringify(rows.map((row: unknown[]) => Array.isArray(row) ? [...row, ''] : row));
      } catch { /* Leave malformed sample content for the PDFME editor to repair. */ }
      return schema;
    });
    setNewTableColumn('');
  };

  const updateTableOption = (key: 'repeatHead' | 'showHead', value: boolean) => {
    updateSelectedTableSchema((schema) => ({ ...schema, [key]: value }));
  };

  const handleComponentDrop = (event: DragEvent<HTMLDivElement>) => {
    const componentId = event.dataTransfer.getData(COMPONENT_MIME_TYPE);
    if (!componentId) return;
    event.preventDefault();
    insertComponent(componentId);
  };

  const persistDraft = async () => {
    if (!template || !designerRef.current) throw new Error('document_designer_not_ready');
    if (scope === 'SITE' && !siteId) throw new Error('document_template_site_required');
    designerRef.current.saveTemplate();
    const configuration = currentTemplateRef.current || workingTemplate;
    if (!configuration) throw new Error('document_designer_template_missing');
    const updated = await api.put<TemplateRecord>(`document-templates/${template.id}`, {
      documentTypeCode: template.documentTypeCode,
      code: template.code,
      name: template.name,
      description: template.description || null,
      defaultScope: scope,
      siteId: scope === 'SITE' ? Number(siteId) : null,
      configuration
    });
    dirtyRef.current = false;
    setHasUnsavedChanges(false);
    setTemplate(updated || template);
  };

  const save = async () => {
    if (!template || !canEdit || !designerRef.current) return;
    setSaving(true);
    try {
      await persistDraft();
      showSnackBar(t('document_template_saved'), 'success');
    } catch (saveError) {
      showSnackBar(getErrorMessage(saveError, t('document_template_save_error')), 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAndLeave = async () => {
    if (!pendingNavigation || saving) return;
    setSaving(true);
    try {
      await persistDraft();
      const retry = pendingNavigation;
      setLeaveConfirmOpen(false);
      setPendingNavigation(null);
      retry();
    } catch (saveError) {
      showSnackBar(getErrorMessage(saveError, t('document_template_save_error')), 'error');
    } finally {
      setSaving(false);
    }
  };

  const resolvePreviewWorkOrderId = async (reference: string): Promise<string | null> => {
    if (/^\d+$/.test(reference)) return reference;
    const result = await api.post<{ content?: Array<{ id: number; customId?: string }> }>('work-orders/search', {
      pageNum: 0,
      pageSize: 100,
      filterFields: [{ field: 'customId', operation: 'cn', value: reference }]
    });
    const matches = (result?.content || []).filter((workOrder) =>
      workOrder.customId?.trim().toLocaleLowerCase() === reference.toLocaleLowerCase());
    if (matches.length !== 1) {
      showSnackBar(t('document_designer_preview_order_not_found'), 'warning');
      return null;
    }
    return String(matches[0].id);
  };

  const previewPdf = async () => {
    const reference = previewId.trim();
    if (!template || !isValidWorkOrderReference(reference)) return;
    const previewWindow = window.open('about:blank', '_blank');
    if (previewWindow) previewWindow.opener = null;
    setPreviewing(true);
    try {
      const workOrderId = await resolvePreviewWorkOrderId(reference);
      if (!workOrderId) { previewWindow?.close(); return; }
      if (dirtyRef.current) await persistDraft();
      const response = await api.post<Response>(
        `document-templates/${template.id}/preview-pdf?workOrderId=${encodeURIComponent(workOrderId)}`,
        null,
        { raw: true }
      );
      if (!isPdfContentType(response.headers.get('content-type'))) throw new Error('invalid_document_content_type');
      const blob = await response.blob();
      if (!blob.size) throw new Error('empty_document');
      const url = URL.createObjectURL(blob);
      if (previewWindow) previewWindow.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setPreviewId('');
      setShowPreview(false);
    } catch (previewError) {
      previewWindow?.close();
      showSnackBar(getErrorMessage(previewError, t('work_order_report_preview_error')), 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const diagnoseBinding = async (binding: string | undefined) => {
    const reference = previewId.trim();
    if (!binding || binding.startsWith('static:') || !isValidWorkOrderReference(reference)) return;
    setDiagnosingData(true);
    setDataDiagnosis(null);
    try {
      const workOrderId = await resolvePreviewWorkOrderId(reference);
      if (!workOrderId) return;
      const diagnosis = await api.post<Record<string, { status: 'available' | 'empty' | 'unavailable'; count?: number | null }>>(
        `work-orders/${encodeURIComponent(workOrderId)}/report/diagnose-data`,
        { fields: [binding] }
      );
      const field = diagnosis?.[binding];
      const kind = field?.status === 'available' && field.count !== null && field.count !== undefined
        ? 'count' : field?.status || 'empty';
      setDataDiagnosis({ binding, workOrderId: reference, kind, count: field?.count ?? undefined });
    } catch (diagnosisError) {
      showSnackBar(getErrorMessage(diagnosisError, t('document_data_diagnosis_error')), 'error');
    } finally {
      setDiagnosingData(false);
    }
  };

  const diagnoseSelectedBinding = () => diagnoseBinding(selectedDataElement?.schema?.name);

  const previewTableRows = async (binding: string, columns: string[]) => {
    const reference = previewId.trim();
    const selectedColumns = [...new Set(columns)].filter(Boolean).slice(0, 12);
    if (!isValidWorkOrderReference(reference) || !selectedColumns.length) return;
    setPreviewingTable(true);
    setTablePreview(null);
    setDataDiagnosis(null);
    try {
      const workOrderId = await resolvePreviewWorkOrderId(reference);
      if (!workOrderId) return;
      const result = await api.post<{ status: 'available' | 'empty' | 'unavailable'; totalCount: number; rows: Record<string, string>[] }>(
        `work-orders/${encodeURIComponent(workOrderId)}/report/table-preview`,
        { binding, columns: selectedColumns }
      );
      setTablePreview({ binding, workOrderId: reference, ...result });
      const kind = result.status === 'available' && result.totalCount > 0 ? 'count' : result.status;
      setDataDiagnosis({ binding, workOrderId: reference, kind, count: result.totalCount });
    } catch (previewError) {
      showSnackBar(getErrorMessage(previewError, t('document_data_diagnosis_error')), 'error');
    } finally {
      setPreviewingTable(false);
    }
  };

  const publish = async () => {
    if (!template || !canEdit) return;
    setSaving(true);
    try {
      if (dirtyRef.current) await persistDraft();
      await api.post(`document-templates/${template.id}/publish?makeDefault=false`, {});
      showSnackBar(t('document_template_published'), 'success');
      await loadTemplate();
    } catch (publishError) {
      showSnackBar(getErrorMessage(publishError, t('document_template_publish_error')), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>;
  if (error || !template || !workingTemplate) return <Box p={3}><Alert severity="error">{error || t('document_template_load_error')}</Alert></Box>;
  if (!canEdit) return <Box p={3}><Alert severity="warning">{t('document_template_permission_error')}</Alert></Box>;

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, minHeight: 'calc(100vh - 96px)' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} minWidth={0}>
          <Tooltip title={t('back')}><Button aria-label={t('back')} onClick={() => navigate('/app/settings/documents')} startIcon={<ArrowBackOutlinedIcon />} /></Tooltip>
          <Box minWidth={0}>
            <Typography variant="h5" fontWeight={700} noWrap>{template.name}</Typography>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography variant="caption" color="text.secondary">{t('document_designer_pdfme_subtitle')} · PDFME {PDFME_VERSION} · {template.draftVersion ? `v${template.draftVersion}` : t('document_template_status_published')}</Typography>
              <Chip
                size="small"
                variant="outlined"
                color={hasUnsavedChanges ? 'warning' : 'success'}
                label={t(hasUnsavedChanges ? 'document_template_unsaved_changes' : 'document_template_all_changes_saved')}
              />
            </Stack>
          </Box>
        </Stack>
        <Stack direction="row" flexWrap="wrap" sx={{ gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
            <InputLabel id="pdfme-page-orientation-quick-label">{t('document_page_orientation')}</InputLabel>
            <Select
              labelId="pdfme-page-orientation-quick-label"
              label={t('document_page_orientation')}
              value={getPageDimensions(workingTemplate).orientation}
              onChange={(event) => updatePageOrientation(event.target.value as PageOrientation)}
              inputProps={{ 'aria-label': t('document_page_orientation') }}
            >
              <MenuItem value="PORTRAIT">{t('document_page_orientation_portrait')}</MenuItem>
              <MenuItem value="LANDSCAPE">{t('document_page_orientation_landscape')}</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<PictureAsPdfOutlinedIcon />} onClick={() => setShowPreview((value) => !value)} disabled={!canEdit}>{t('document_designer_preview_pdf')}</Button>
          <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={() => void save()} disabled={!canEdit || saving || !hasUnsavedChanges}>{saving ? t('saving') : t('document_template_save_draft')}</Button>
          <Button variant="outlined" color="success" startIcon={<PublishOutlinedIcon />} onClick={() => void publish()} disabled={!canEdit || saving || !template.draftVersion}>{t('publish')}</Button>
        </Stack>
      </Stack>
      {showPreview && (
        <Paper variant="outlined" sx={{ mb: 1.5, p: 1.5, bgcolor: 'action.hover' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
            <Box>
              <Typography variant="subtitle2">{t('document_designer_preview_panel_title')}</Typography>
              <Typography variant="caption" color="text.secondary">{t('document_designer_preview_authorized_help')}</Typography>
            </Box>
            <IconButton size="small" aria-label={t('cancel')} onClick={() => setShowPreview(false)} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
              <CloseOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
            <TextField
              size="small"
              fullWidth
              label={t('work_order_id')}
              value={previewId}
              inputProps={{ maxLength: 100 }}
              helperText={previewId.trim().length > 100
                ? t('document_designer_preview_id_invalid') : t('document_designer_preview_id_help')}
              error={previewId.trim().length > 100}
              onChange={(event) => { setPreviewId(event.target.value); setDataDiagnosis(null); setTablePreview(null); }}
            />
            <Button
              variant="contained"
              startIcon={<PictureAsPdfOutlinedIcon />}
              onClick={() => void previewPdf()}
              disabled={previewing || !isValidWorkOrderReference(previewId)}
              sx={{ minWidth: { sm: 180 }, minHeight: 40 }}
            >
              {previewing ? t('loading') : t('document_designer_preview_generate')}
            </Button>
          </Stack>
        </Paper>
      )}
      <Alert severity="info" sx={{ mb: 1 }}>{t('document_designer_pdfme_notice')}</Alert>
      <Accordion disableGutters elevation={0} sx={{ mb: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon />} sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.75 } }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography variant="body2" fontWeight={600}>{t('document_designer_template_options')}</Typography>
            <Typography variant="caption" color="text.secondary">
              · {t(scope === 'SITE' ? 'document_template_scope_site' : 'document_template_scope_company')}
              {scope === 'SITE' && siteId ? ` · ${sites.find((item) => String(item.id) === siteId)?.name || ''}` : ''}
              {` · ${t(`document_page_orientation_${getPageDimensions(workingTemplate).orientation.toLowerCase()}`)}`}
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5, maxWidth: 620 }}>
        <FormControl size="small" fullWidth>
          <InputLabel id="pdfme-template-scope-label">{t('document_template_scope')}</InputLabel>
          <Select
            labelId="pdfme-template-scope-label"
            label={t('document_template_scope')}
            value={scope}
            onChange={(event) => { setScope(event.target.value as 'COMPANY' | 'SITE'); markDirty(); }}
          >
            <MenuItem value="COMPANY">{t('document_template_scope_company')}</MenuItem>
            <MenuItem value="SITE">{t('document_template_scope_site')}</MenuItem>
          </Select>
        </FormControl>
        {scope === 'SITE' && (
          <FormControl size="small" fullWidth required>
            <InputLabel id="pdfme-template-site-label">{t('site')}</InputLabel>
            <Select labelId="pdfme-template-site-label" label={t('site')} value={siteId} onChange={(event) => { setSiteId(String(event.target.value)); markDirty(); }}>
              {sites.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </Stack>
      <Accordion disableGutters elevation={0} sx={{ mb: 1, border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.75 } }}>
          <Box>
            <Typography variant="body2" fontWeight={600}>{t('document_designer_field_reference')}</Typography>
            <Typography variant="caption" color="text.secondary">{t('document_designer_field_reference_hint')}</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary">{t('document_designer_binding_help')}</Typography>
        </AccordionDetails>
      </Accordion>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <input ref={fontInputRef} hidden type="file" accept=".ttf,.otf,font/ttf,font/otf" onChange={(event) => void uploadFont(event.target.files?.[0])} />
        <Button size="small" variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => fontInputRef.current?.click()}>{t('document_designer_upload_font')}</Button>
        <Typography variant="caption" color="text.secondary">{customFont ? t('document_designer_font_installed') : t('document_designer_font_help')}</Typography>
        {customFont && <IconButton size="small" aria-label={t('document_designer_remove_font')} onClick={removeFont}><DeleteOutlineIcon fontSize="small" /></IconButton>}
      </Stack>
        </AccordionDetails>
      </Accordion>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '260px minmax(0, 1fr) 320px' }, gap: 1.5, alignItems: 'start' }}>
      <Stack spacing={1} sx={{ gridColumn: { xs: '1', lg: '1' }, position: { lg: 'sticky' }, top: { lg: 12 }, maxHeight: { lg: 'calc(100vh - 24px)' }, overflowY: { lg: 'auto' }, pr: { lg: 0.5 }, minWidth: 0 }}>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Tabs value={workspacePanel} onChange={(_, value) => setWorkspacePanel(value)} variant="fullWidth" aria-label={t('document_workspace_panels')}>
          <Tab value="components" label={t('document_designer_components')} />
          <Tab value="structure" label={t('document_outline_title')} />
        </Tabs>
      </Paper>
      <Box sx={{ display: workspacePanel === 'components' ? 'block' : 'none', minWidth: 0 }}>
        {pendingPrintZone && (
          <Alert
            severity="info"
            action={<Button color="inherit" size="small" onClick={() => { setPendingPrintZone(''); setWorkspacePanel('structure'); }}>{t('document_zone_insert_cancel')}</Button>}
            sx={{ mb: 1, alignItems: 'center' }}
          >
            <Typography variant="body2" fontWeight={600}>
              {t('document_zone_insert_title', { zone: t(`document_zone_${pendingPrintZone === 'HEADER' ? 'header' : pendingPrintZone === 'FOOTER' ? 'footer' : pendingPrintZone === 'REPORT_HEADER' ? 'reportHeader' : 'reportFooter'}`) })}
            </Typography>
            <Typography variant="caption">{t('document_zone_insert_help')}</Typography>
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
          <Box>
            <Typography variant="subtitle2">{t('document_designer_components')}</Typography>
            <Typography variant="caption" color="text.secondary">{t('document_component_drag_help')}</Typography>
          </Box>
          <TextField
            size="small"
            value={componentSearch}
            onChange={(event) => setComponentSearch(event.target.value)}
            placeholder={t('document_component_search')}
            aria-label={t('document_component_search')}
            sx={{ width: { xs: '100%', sm: 280 } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchOutlinedIcon fontSize="small" /></InputAdornment>,
              endAdornment: componentSearch ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label={t('clear')} onClick={() => setComponentSearch('')} edge="end">
                    <CloseOutlinedIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined
            }}
          />
        </Stack>
        <Paper variant="outlined" sx={{ px: 1, py: 0.25 }}>
          {componentGroups.map((group) => {
            const allItems = componentDefinitions.filter((component) => component.group === group.id);
            const query = componentSearch.trim().toLocaleLowerCase();
            const groupLabel = t(group.labelKey);
            const matchesGroup = !query || groupLabel.toLocaleLowerCase().includes(query);
            const items = !query || matchesGroup ? allItems : allItems.filter((component) =>
              `${t(component.labelKey)} ${component.bindings.join(' ')}`.toLocaleLowerCase().includes(query));
            const repeatedMatches = group.id === 'repeated' && (!query || matchesGroup
              || t('document_header_footer_button').toLocaleLowerCase().includes(query));
            if (!items.length && !repeatedMatches) return null;
            const expanded = query ? true : expandedComponentGroup === group.id;
            return (
              <Accordion
                key={group.id}
                disableGutters
                elevation={0}
                expanded={expanded}
                onChange={(_, isExpanded) => { if (isExpanded) setExpandedComponentGroup(group.id); else setExpandedComponentGroup(''); }}
                sx={{ '&:before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon />} sx={{ minHeight: 40, px: 1, '& .MuiAccordionSummary-content': { my: 0.75 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%" pr={1}>
                    <Typography variant="body2" fontWeight={600}>{groupLabel}</Typography>
                    <Typography variant="caption" color="text.secondary">{group.id === 'repeated' ? '1' : items.length}</Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 1, px: 0.5 }}>
                  <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5 }}>
                    {items.map((component) => (
                      (() => {
                        const unsupportedInZone = Boolean(pendingPrintZone)
                          && componentSchemas(component.id, t, 12).some((schema) => ['table', 'signature'].includes(schema.type));
                        return (
                          <Tooltip key={component.id} title={unsupportedInZone ? t('document_zone_component_unsupported') : ''}>
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                draggable={!unsupportedInZone}
                                disabled={unsupportedInZone}
                                startIcon={<WidgetsOutlinedIcon />}
                                onDragStart={(event) => {
                                  event.dataTransfer.setData(COMPONENT_MIME_TYPE, component.id);
                                  event.dataTransfer.effectAllowed = 'copy';
                                }}
                                onClick={() => insertComponent(component.id)}
                                sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none', minHeight: 34, borderColor: 'divider' }}
                              >
                                {t(component.labelKey)}
                              </Button>
                            </span>
                          </Tooltip>
                        );
                      })()
                    ))}
                    {repeatedMatches && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<WidgetsOutlinedIcon />}
                        onClick={addEditableHeaderFooter}
                        sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none', minHeight: 34, borderColor: 'divider' }}
                      >
                        {t('document_header_footer_button')}
                      </Button>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
          {componentSearch.trim() && !componentGroups.some((group) => {
            const query = componentSearch.trim().toLocaleLowerCase();
            return t(group.labelKey).toLocaleLowerCase().includes(query)
              || componentDefinitions.some((component) => component.group === group.id
                && `${t(component.labelKey)} ${component.bindings.join(' ')}`.toLocaleLowerCase().includes(query))
              || group.id === 'repeated' && t('document_header_footer_button').toLocaleLowerCase().includes(query);
          }) && <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1.5 }}>{t('document_component_search_empty')}</Typography>}
        </Paper>
      </Box>
      <Box sx={{ display: workspacePanel === 'structure' ? 'block' : 'none', minWidth: 0 }}>
      {(() => {
        const pages = (workingTemplate.schemas as any[][]) || [];
        const hasEditableHeader = pages.flat().some((schema) => schema.name.startsWith('static:qpm_header_'));
        const hasEditableFooter = pages.flat().some((schema) => schema.name.startsWith('static:qpm_footer_'));
        const pageSchemas = pages[activePage] || [];
        const orderedSchemas = pageSchemas.map((schema, schemaIndex) => ({ schema, schemaIndex, pageIndex: activePage }))
          .sort((left, right) => Number(left.schema.position?.y || 0) - Number(right.schema.position?.y || 0)
            || Number(left.schema.position?.x || 0) - Number(right.schema.position?.x || 0)
            || left.schemaIndex - right.schemaIndex);
        const allOrderedSchemas = pages.flatMap((schemas, pageIndex) => schemas.map((schema, schemaIndex) => ({ schema, schemaIndex, pageIndex })));
        const reportZones = [
          { key: 'reportHeader', printZone: 'REPORT_HEADER' },
          { key: 'header', printZone: 'HEADER' },
          { key: 'body', printZone: '' },
          { key: 'footer', printZone: 'FOOTER' },
          { key: 'reportFooter', printZone: 'REPORT_FOOTER' }
        ].map((zone) => ({
          ...zone,
          items: (zone.key === 'header' || zone.key === 'footer' ? allOrderedSchemas : orderedSchemas)
            .filter(({ schema }) => (schema.qpmPrintZone || '') === zone.printZone)
        }));
        const labelFor = (schema: any) => {
          if (schema.name.startsWith('static:')) {
            const label = String(schema.content || schema.name.slice('static:'.length)).replace(/\s+/g, ' ').trim();
            return label.slice(0, 90) || schema.name.slice('static:'.length);
          }
          const key = `document_field_${schema.name.replace(/\./g, '_')}`;
          const translated = t(key);
          return translated === key ? schema.name : translated;
        };
        const outlineQuery = outlineSearch.trim().toLocaleLowerCase();
        const matchesOutline = ({ schema }: { schema: any }) => {
          if (!outlineQuery) return true;
          const component = componentDefinitions.find(({ id }) => id === componentIdForSchema(schema));
          const componentLabel = component ? t(component.labelKey) : t('document_component_group_other');
          return `${labelFor(schema)} ${schema.name} ${schema.type} ${componentLabel}`
            .toLocaleLowerCase().includes(outlineQuery);
        };
        const matchingCount = reportZones.flatMap(({ items }) => items).filter(matchesOutline).length;
        return (
          <Paper variant="outlined" sx={{ p: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" spacing={1}>
              <Box>
                <Typography variant="subtitle2">{t('document_outline_title')}</Typography>
                <Typography variant="caption" color="text.secondary">{t('document_outline_help')}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">{t('document_zone_outline_note')}</Typography>
              </Box>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="pdfme-outline-page-label">{t('document_outline_page')}</InputLabel>
                <Select
                  labelId="pdfme-outline-page-label"
                  label={t('document_outline_page')}
                  value={String(activePage)}
                  onChange={(event) => {
                    const pageIndex = Number(event.target.value);
                    setSelectedOutlineKey('');
                    designerRef.current?.selectSchemas([], { pageIndex, scroll: true });
                  }}
                >
                  {Array.from({ length: canvasPageCount }, (_, pageIndex) => (
                    <MenuItem key={pageIndex} value={String(pageIndex)}>
                      {t('document_outline_page_option', { number: pageIndex + 1, count: (pages[pageIndex] || []).length })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<WidgetsOutlinedIcon />}
                disabled={hasEditableHeader && hasEditableFooter}
                onClick={addEditableHeaderFooter}
              >
                {t('document_header_footer_button')}
              </Button>
              {hasEditableHeader && hasEditableFooter && (
                <Chip size="small" color="success" variant="outlined" label={t('document_header_footer_configured')} />
              )}
            </Stack>
            <TextField
              size="small"
              fullWidth
              value={outlineSearch}
              onChange={(event) => setOutlineSearch(event.target.value)}
              placeholder={t('document_outline_search')}
              inputProps={{ 'aria-label': t('document_outline_search') }}
              InputProps={{
                startAdornment: <SearchOutlinedIcon fontSize="small" color="action" />
              }}
              sx={{ mt: 1, maxWidth: 420 }}
            />
            <List dense disablePadding sx={{ mt: 0.75, maxHeight: 260, overflowY: 'auto' }}>
              {matchingCount || !outlineQuery ? reportZones.map(({ key, items }) => {
                const matchingItems = items.filter(matchesOutline);
                return (matchingItems.length > 0 || !outlineQuery) && (
                <Box key={key}>
                  <ListSubheader disableSticky sx={{ px: 1, py: 0.5, bgcolor: 'background.paper', fontSize: '0.75rem' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75}>
                      <Typography variant="caption" fontWeight={700} sx={{ minWidth: 0 }}>{t(`document_zone_${key}`)} · {matchingItems.length}</Typography>
                      {key !== 'body' && (() => {
                        const zone: PrintZone = key === 'header' ? 'HEADER' : key === 'footer' ? 'FOOTER'
                          : key === 'reportHeader' ? 'REPORT_HEADER' : 'REPORT_FOOTER';
                        return <TextField
                          type="number"
                          size="small"
                          label={t('document_zone_height_label')}
                          value={zoneHeightDrafts[zone] ?? String(printZoneHeight(workingTemplate, zone))}
                          onChange={(event) => setZoneHeightDrafts((drafts) => ({ ...drafts, [zone]: event.target.value }))}
                          onBlur={() => savePrintZoneHeight(zone)}
                          onKeyDown={(event) => { if (event.key === 'Enter') (event.currentTarget as HTMLInputElement).blur(); }}
                          inputProps={{ min: 8, max: Math.floor(getPageDimensions(workingTemplate).height / 2), step: 1, 'aria-label': t('document_zone_height_label') }}
                          sx={{ width: 126, '& .MuiInputBase-input': { py: 0.65 }, '& .MuiInputLabel-root': { fontSize: '0.7rem' } }}
                        />;
                      })()}
                      {key !== 'body' && pages.flat().some((schema) => schema.qpmPrintZone === (
                        key === 'header' ? 'HEADER' : key === 'footer' ? 'FOOTER'
                          : key === 'reportHeader' ? 'REPORT_HEADER' : 'REPORT_FOOTER'
                      )) && <Tooltip title={t('document_zone_clear_action', { zone: t(`document_zone_${key}`) })}>
                        <IconButton
                          size="small"
                          aria-label={t('document_zone_clear_action', { zone: t(`document_zone_${key}`) })}
                          onClick={() => setZoneToClear(key === 'header' ? 'HEADER' : key === 'footer' ? 'FOOTER'
                            : key === 'reportHeader' ? 'REPORT_HEADER' : 'REPORT_FOOTER')}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>}
                    </Stack>
                    {key !== 'body' && items.some(({ schema }) => !String(schema.name).startsWith('static:')) && (() => {
                      const zone: PrintZone = key === 'header' ? 'HEADER' : key === 'footer' ? 'FOOTER'
                        : key === 'reportHeader' ? 'REPORT_HEADER' : 'REPORT_FOOTER';
                      const zoneMembers = pages.flat().filter((schema) => schema.qpmPrintZone === zone);
                      return <FormControlLabel
                        sx={{ ml: 0, mt: 0.25, '& .MuiFormControlLabel-label': { fontSize: '0.7rem', fontWeight: 400 } }}
                        control={<Switch size="small" checked={zoneMembers.some((schema) => schema.qpmPrintZoneHideIfEmpty === true)}
                          onChange={(event) => updatePrintZoneEmptyVisibility(zone, event.target.checked)} />}
                        label={t('document_zone_hide_if_empty')}
                      />;
                    })()}
                  </ListSubheader>
                  {Array.from(new Map(matchingItems.map(({ schema, pageIndex }) => {
                    const componentId = componentIdForSchema(schema);
                    const sectionId = schema.qpmSectionId || '';
                    return [`${pageIndex}:${componentId}:${sectionId || 'legacy'}`, { componentId, sectionId, pageIndex }];
                  })).values()).map(({ componentId, sectionId, pageIndex }) => {
                    const componentItems = matchingItems.filter(({ schema, pageIndex: itemPageIndex }) => componentIdForSchema(schema) === componentId
                      && (schema.qpmSectionId || '') === sectionId
                      && itemPageIndex === pageIndex);
                    const component = componentDefinitions.find(({ id }) => id === componentId);
                    return (
                      <Box key={`${key}:${componentId}:${sectionId || 'legacy'}`}>
                        <ListItemButton
                          component="button"
                          disabled={componentId === 'other'}
                          onClick={() => {
                            if (componentId === 'other') return;
                            designerRef.current?.selectSchemas(componentItems.map(({ schema, schemaIndex, pageIndex: itemPageIndex }) => ({
                              name: schema.name, pageIndex: itemPageIndex, schemaIndex
                            })), { pageIndex: componentItems[0]?.pageIndex ?? activePage, scroll: true });
                            setSelectedComponent({ pageIndex: componentItems[0]?.pageIndex ?? activePage, id: componentId,
                              sectionId: sectionId || undefined });
                          }}
                          sx={{ minHeight: 28, py: 0, pl: 2, bgcolor: 'action.hover' }}
                        >
                          <ListItemText
                            primary={`${component ? t(component.labelKey) : t('document_component_group_other')} · ${componentItems.length}`}
                            primaryTypographyProps={{ noWrap: true, variant: 'caption', fontWeight: 700 }}
                          />
                        </ListItemButton>
                        {componentItems.map(({ schema, schemaIndex, pageIndex }) => (
                          <ListItemButton
                            key={`${pageIndex}:${schema.name}:${schemaIndex}`}
                            selected={selectedOutlineKey === `${pageIndex}:${schemaIndex}`}
                            onClick={() => designerRef.current?.selectSchemas(
                              [{ name: schema.name, pageIndex, schemaIndex }],
                              { pageIndex, scroll: true }
                            )}
                            sx={{ pl: 3 }}
                          >
                            <ListItemText
                              primary={labelFor(schema)}
                              secondary={schema.type}
                              primaryTypographyProps={{ noWrap: true, variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItemButton>
                        ))}
                      </Box>
                    );
                  })}
                  {!matchingItems.length && (
                    <Stack spacing={0.5} alignItems="flex-start" sx={{ px: 2, py: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('document_zone_empty_hint')}
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        <Button
                          size="small"
                          startIcon={<AddOutlinedIcon />}
                          onClick={() => {
                            const printZone: PrintZone | '' = key === 'header' ? 'HEADER'
                              : key === 'footer' ? 'FOOTER'
                                : key === 'reportHeader' ? 'REPORT_HEADER'
                                  : key === 'reportFooter' ? 'REPORT_FOOTER' : '';
                            setPendingPrintZone(printZone);
                            setWorkspacePanel('components');
                          }}
                        >
                          {t('document_zone_add_component')}
                        </Button>
                        {(key === 'header' || key === 'footer') && !(hasEditableHeader && hasEditableFooter) && (
                          <Button size="small" variant="outlined" onClick={addEditableHeaderFooter}>
                            {t('document_header_footer_button')}
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  )}
                </Box>
                );
              }) : (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 1 }}>
                  {t('document_outline_search_empty')}
                </Typography>
              )}
            </List>
          </Paper>
        );
      })()}
      </Box>
      </Stack>
      <Box
        ref={mountRef}
        aria-label={t('document_designer_canvas')}
        onDragOver={(event) => {
          if (Array.from(event.dataTransfer.types).includes(COMPONENT_MIME_TYPE)) event.preventDefault();
        }}
        onDrop={handleComponentDrop}
        sx={{ gridColumn: { xs: '1', lg: '2' }, gridRow: { lg: '1 / span 2' }, position: { lg: 'sticky' }, top: { lg: 12 }, height: { xs: 'calc(100vh - 290px)', md: 'calc(100vh - 230px)' }, minHeight: 560, overflow: 'hidden', border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: '#fff' }}
      />
      <Stack spacing={1} sx={{ gridColumn: { xs: '1', lg: '3' }, gridRow: { lg: '1 / span 2' }, position: { lg: 'sticky' }, top: { lg: 12 }, maxHeight: { lg: 'calc(100vh - 24px)' }, overflowY: { lg: 'auto' }, pr: { lg: 0.5 }, minWidth: 0 }}>
      {(selectedTable || selectedPrintElement || selectedComponent) && (() => {
        const schema = selectedTable?.schema || selectedPrintElement?.schema;
        const component = selectedComponent
          ? componentDefinitions.find(({ id }) => id === selectedComponent.id)
          : undefined;
        const translated = schema && !schema.name.startsWith('static:')
          ? t(`document_field_${schema.name.replace(/\./g, '_')}`)
          : '';
        const title = schema
          ? schema.name.startsWith('static:')
            ? String(schema.content || schema.name.slice('static:'.length)).replace(/\s+/g, ' ').trim() || t('document_inspector_title')
            : translated.startsWith('document_field_') ? schema.name : translated
          : component ? t(component.labelKey) : selectedComponent?.id || t('document_inspector_title');
        const pageIndex = selectedTable?.pageIndex ?? selectedPrintElement?.pageIndex ?? selectedComponent?.pageIndex;
        const zone = schema?.qpmPrintZone;
        return (
          <Paper variant="outlined" sx={{ p: 1.25 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Box minWidth={0}>
                <Typography variant="overline" color="text.secondary" lineHeight={1.4}>{t('document_inspector_title')}</Typography>
                <Typography variant="subtitle2" fontWeight={700} noWrap title={title}>{title}</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {pageIndex !== undefined && <Chip size="small" variant="outlined" label={t('document_outline_page_option', { number: pageIndex + 1, count: (workingTemplate.schemas as any[][])[pageIndex]?.length || 0 })} />}
                  {zone && <Chip size="small" color="primary" variant="outlined" label={t(`document_zone_${zone === 'HEADER' ? 'header' : zone === 'FOOTER' ? 'footer' : zone === 'REPORT_HEADER' ? 'reportHeader' : 'reportFooter'}`)} />}
                </Stack>
              </Box>
              <Tooltip title={t('document_inspector_clear_selection')}>
                <IconButton size="small" aria-label={t('document_inspector_clear_selection')}
                  onClick={() => designerRef.current?.selectSchemas([], { pageIndex: activePage, scroll: false })}>
                  <CloseOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Paper>
        );
      })()}
      {selectedDataElement && (() => {
        const { source, relationship } = bindingProvenanceKeys(selectedDataElement.schema.name);
        return (
          <Paper variant="outlined" sx={{ mt: 1, p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>{t('document_data_provenance_title')}</Typography>
            <Stack spacing={0.5}>
              <Typography variant="body2">
                <strong>{t('document_data_provenance_binding')}:</strong>{' '}
                {selectedDataElement.schema.name.startsWith('static:')
                  ? t('document_data_source_static')
                  : selectedDataElement.schema.name}
              </Typography>
              <Typography variant="body2">{t(`document_data_source_${source}`)}</Typography>
              <Typography variant="caption" color="text.secondary">{t(`document_data_relation_${relationship}`)}</Typography>
              {!selectedDataElement.schema.name.startsWith('static:') && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ pt: 0.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void diagnoseSelectedBinding()}
                    disabled={diagnosingData || !isValidWorkOrderReference(previewId)}
                  >
                    {diagnosingData ? t('loading') : t('document_data_diagnosis_button')}
                  </Button>
                  <Typography variant="caption" color="text.secondary">{t('document_data_diagnosis_privacy')}</Typography>
                </Stack>
              )}
              {dataDiagnosis?.binding === selectedDataElement.schema.name && dataDiagnosis.workOrderId === previewId.trim() && (
                <Alert severity={dataDiagnosis.kind === 'available' || dataDiagnosis.kind === 'count' ? 'success' : 'warning'} sx={{ mt: 0.5 }}>
                  {dataDiagnosis.kind === 'count'
                    ? t('document_data_diagnosis_count', { count: dataDiagnosis.count })
                    : t(`document_data_diagnosis_${dataDiagnosis.kind}`)}
                </Alert>
              )}
            </Stack>
          </Paper>
        );
      })()}
      {selectedPrintElement && (
        <Paper variant="outlined" sx={{ mt: 1, p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('document_print_behavior_title')}</Typography>
          {(() => {
            const supportsPrintZone = !['table', 'signature'].includes(selectedPrintElement.schema.type);
            return (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="pdfme-print-zone-label">{t('document_print_zone_label')}</InputLabel>
              <Select
                labelId="pdfme-print-zone-label"
                label={t('document_print_zone_label')}
                value={selectedPrintElement.schema.qpmPrintZone || ''}
                onChange={(event) => updateSelectedPrintZone(event.target.value as '' | 'HEADER' | 'FOOTER' | 'REPORT_HEADER' | 'REPORT_FOOTER')}
              >
                <MenuItem value="">{t('document_print_zone_page_only')}</MenuItem>
                <MenuItem value="HEADER" disabled={!supportsPrintZone}>{t('document_print_zone_header')}</MenuItem>
                <MenuItem value="FOOTER" disabled={!supportsPrintZone}>{t('document_print_zone_footer')}</MenuItem>
                <MenuItem value="REPORT_HEADER" disabled={!supportsPrintZone}>{t('document_print_zone_report_header')}</MenuItem>
                <MenuItem value="REPORT_FOOTER" disabled={!supportsPrintZone}>{t('document_print_zone_report_footer')}</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">{t('document_print_zone_help')}</Typography>
          </Stack>
            );
          })()}
          {!selectedPrintElement.schema.name.startsWith('static:')
            && ['text', 'multiVariableText'].includes(selectedPrintElement.schema.type) && (
            <Stack sx={{ mt: 1 }} spacing={0.25}>
              <FormControlLabel
                control={<Switch
                  size="small"
                  checked={selectedPrintElement.schema.qpmHideIfEmpty === true}
                  onChange={(event) => updateSelectedHideIfEmpty(event.target.checked)}
                />}
                label={t('document_designer_hide_if_empty')}
              />
              <Typography variant="caption" color="text.secondary">{t('document_hide_if_empty_help')}</Typography>
            </Stack>
          )}
        </Paper>
      )}
      {selectedComponent && (() => {
        const schemas = ((workingTemplate?.schemas as any[][]) || [])[selectedComponent.pageIndex] || [];
        const members = schemas.filter((schema) => selectedComponent.sectionId
          ? schema.qpmSectionId === selectedComponent.sectionId
          : componentIdForSchema(schema) === selectedComponent.id);
        if (members.length === 0) return null;
        const component = componentDefinitions.find(({ id }) => id === selectedComponent.id);
        const zoneValues = new Set(members.map((schema) => schema.qpmPrintZone || ''));
        const componentZone = zoneValues.size === 1 ? [...zoneValues][0] : 'MIXED';
        const supportsPrintZone = members.every((schema) => !['table', 'signature'].includes(schema.type));
        const canDuplicateTextBlock = selectedComponent.id === 'textBlock'
          && members.length > 0 && members.every((schema) => String(schema.name).startsWith('static:') && !schema.qpmPrintZone);
        return (
          <Paper variant="outlined" sx={{ mt: 1, p: 1.5 }}>
            <Typography variant="subtitle2">{t('document_component_visibility_title', { name: component ? t(component.labelKey) : selectedComponent.id })}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mt: 1, mb: 0.5 }}>
              <FormControl size="small" sx={{ minWidth: 230 }}>
                <InputLabel id="pdfme-component-print-zone-label">{t('document_print_zone_label')}</InputLabel>
                <Select
                  labelId="pdfme-component-print-zone-label"
                  label={t('document_print_zone_label')}
                  value={componentZone}
                  onChange={(event) => updateSelectedComponentPrintZone(event.target.value as '' | 'HEADER' | 'FOOTER' | 'REPORT_HEADER' | 'REPORT_FOOTER')}
                >
                  {componentZone === 'MIXED' && <MenuItem value="MIXED" disabled>{t('document_print_zone_mixed')}</MenuItem>}
                  <MenuItem value="">{t('document_print_zone_page_only')}</MenuItem>
                  <MenuItem value="HEADER" disabled={!supportsPrintZone}>{t('document_print_zone_header')}</MenuItem>
                  <MenuItem value="FOOTER" disabled={!supportsPrintZone}>{t('document_print_zone_footer')}</MenuItem>
                  <MenuItem value="REPORT_HEADER" disabled={!supportsPrintZone}>{t('document_print_zone_report_header')}</MenuItem>
                  <MenuItem value="REPORT_FOOTER" disabled={!supportsPrintZone}>{t('document_print_zone_report_footer')}</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">{t('document_component_print_zone_help')}</Typography>
            </Stack>
            {['HEADER', 'FOOTER', 'REPORT_HEADER', 'REPORT_FOOTER'].includes(componentZone) && (
              <Button size="small" variant="outlined" onClick={alignSelectedComponentWithinZone} sx={{ mb: 1 }}>
                {t('document_component_align_zone')}
              </Button>
            )}
            <FormControlLabel
              control={<Switch size="small" checked={members.some((schema) => schema.qpmHideComponentIfEmpty === true)}
                onChange={(event) => updateSelectedComponentVisibility(event.target.checked)} />}
              label={t('document_designer_hide_if_empty')}
            />
            <Typography variant="caption" color="text.secondary" display="block">{t('document_component_visibility_help')}</Typography>
            {canDuplicateTextBlock && (
              <Button size="small" variant="outlined"
                startIcon={<AddOutlinedIcon />}
                onClick={duplicateSelectedTextBlock} sx={{ mt: 1 }}>
                {t('document_component_duplicate_button')}
              </Button>
            )}
            {componentZone === '' && (
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddOutlinedIcon />}
                  disabled={((workingTemplate?.schemas as any[][]) || []).length >= 20}
                  onClick={moveSelectedComponentToNewPage}
                >
                  {t('document_component_move_new_page')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={selectedComponent.pageIndex === 0}
                  onClick={() => moveSelectedComponentPage(-1)}
                >
                  {t('document_component_move_previous_page')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={selectedComponent.pageIndex >= 19}
                  onClick={() => moveSelectedComponentPage(1)}
                >
                  {t('document_component_move_next_page')}
                </Button>
              </Stack>
            )}
            <Button
              size="small"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => setDeleteComponentOpen(true)}
              sx={{ mt: 1 }}
            >
              {t('document_component_remove_button')}
            </Button>
          </Paper>
        );
      })()}
      {selectedTable && (
        <Paper variant="outlined" sx={{ mt: 1, p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('document_table_data_mapping')}</Typography>
          {(() => {
            const available = tableColumnsFor(selectedTable.schema.name);
            const dataset = tableDatasetKey(selectedTable.schema.name);
            const tableBinding = selectedTable.schema.name;
            const bindings = selectedTable.schema.columnBindings || available.slice(0, selectedTable.schema.head.length);
            const widths = selectedTable.schema.headWidthPercentages || normalizeColumnWidths(selectedTable.schema.head.map(() => 1));
            const previewColumns = (selectedTable.schema.head || []).map((heading: string, index: number) => ({
              binding: bindings[index], heading
            })).filter(({ binding }: { binding: string }) => available.includes(binding));
            const missing = available.filter((key) => !bindings.includes(key));
            return <>
              <Paper variant="outlined" sx={{ p: 1, mb: 1, bgcolor: 'action.hover' }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2"><strong>{t('document_table_dataset_label')}:</strong> {t(`document_table_dataset_${dataset}`)}</Typography>
                  <Typography variant="caption" color="text.secondary">{t(`document_table_order_${dataset}`)}</Typography>
                  {dataset === 'labor' && <Typography variant="caption" color="text.secondary">{t('document_table_entitlement_labor')}</Typography>}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void previewTableRows(tableBinding, previewColumns.map(({ binding }: { binding: string }) => binding))}
                      disabled={previewingTable || diagnosingData || !isValidWorkOrderReference(previewId)}
                    >
                      {previewingTable ? t('loading') : t('document_table_preview_button')}
                    </Button>
                    <Typography variant="caption" color="text.secondary">{t('document_table_preview_privacy')}</Typography>
                  </Stack>
                  {dataDiagnosis?.binding === tableBinding && dataDiagnosis.workOrderId === previewId.trim() && (
                    <Alert severity={dataDiagnosis.kind === 'available' || dataDiagnosis.kind === 'count' ? 'success' : 'warning'}>
                      {dataDiagnosis.kind === 'count'
                        ? t('document_data_diagnosis_count', { count: dataDiagnosis.count })
                        : t(`document_data_diagnosis_${dataDiagnosis.kind}`)}
                    </Alert>
                  )}
                  {tablePreview?.binding === tableBinding && tablePreview.workOrderId === previewId.trim()
                    && tablePreview.status === 'available' && tablePreview.rows.length > 0 && (
                    <TableContainer sx={{ maxHeight: 240, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Table size="small" stickyHeader aria-label={t('document_table_preview_aria')}>
                        <TableHead>
                          <TableRow>
                            {previewColumns.map(({ binding, heading }: { binding: string; heading: string }) => (
                              <TableCell key={binding} sx={{ fontWeight: 700 }}>{heading || t(`document_table_column_${binding}`)}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tablePreview.rows.map((row, rowIndex) => (
                            <TableRow key={`${tableBinding}:${rowIndex}`}>
                              {previewColumns.map(({ binding }: { binding: string }) => (
                                <TableCell key={binding} sx={{ maxWidth: 240, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                                  {row[binding] || '—'}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Stack>
              </Paper>
              <Stack spacing={1}>
                {(selectedTable.schema.head || []).map((header: string, index: number) => (
                  <Stack key={`${selectedTable.schema.name}:${index}:${bindings[index]}:${header}:${widths[index]}`} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} spacing={1}>
                    <Typography variant="caption" sx={{ width: 28, flexShrink: 0 }}>{index + 1}</Typography>
                    <FormControl size="small" sx={{ minWidth: 170 }}>
                      <InputLabel>{t('document_table_source_field')}</InputLabel>
                      <Select label={t('document_table_source_field')} value={bindings[index] || available[index] || ''} onChange={(event) => updateTableColumnBinding(index, String(event.target.value))}>
                        {available.map((key) => <MenuItem key={key} value={key} disabled={bindings.some((selected: string, selectedIndex: number) => selected === key && selectedIndex !== index)}>{t(`document_table_column_${key}`)}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      label={t('document_table_printed_heading')}
                      defaultValue={header}
                      inputProps={{ maxLength: 100 }}
                      onBlur={(event) => {
                        if (event.target.value !== header) updateTableColumnHeader(index, event.target.value);
                      }}
                      sx={{ minWidth: 160, flex: 1 }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label={t('document_table_column_width')}
                      defaultValue={Number(widths[index] || 0).toFixed(1)}
                      inputProps={{ min: 1, max: Math.max(1, 100 - selectedTable.schema.head.length + 1), step: 0.1, 'aria-label': t('document_table_column_width') }}
                      onBlur={(event) => {
                        const requested = Number(event.target.value);
                        if (!Number.isFinite(requested)) {
                          event.target.value = Number(widths[index] || 0).toFixed(1);
                          return;
                        }
                        if (Math.abs(requested - Number(widths[index] || 0)) >= 0.05) updateTableColumnWidth(index, requested);
                      }}
                      sx={{ width: 100, flexShrink: 0 }}
                    />
                    <Stack direction="row" spacing={0.25}>
                      <Tooltip title={t('document_table_move_column_up')}><span><IconButton size="small" aria-label={t('document_table_move_column_up')} disabled={index === 0} onClick={() => moveTableColumn(index, -1)}><ArrowUpwardOutlinedIcon fontSize="small" /></IconButton></span></Tooltip>
                      <Tooltip title={t('document_table_move_column_down')}><span><IconButton size="small" aria-label={t('document_table_move_column_down')} disabled={index === selectedTable.schema.head.length - 1} onClick={() => moveTableColumn(index, 1)}><ArrowDownwardOutlinedIcon fontSize="small" /></IconButton></span></Tooltip>
                      <Tooltip title={t('document_table_remove_column')}><span><IconButton size="small" aria-label={t('document_table_remove_column')} disabled={selectedTable.schema.head.length <= 1} onClick={() => removeTableColumn(index)}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mt: 1 }}>
                <FormControl size="small" sx={{ minWidth: 200 }} disabled={!missing.length || selectedTable.schema.head.length >= 12}>
                  <InputLabel>{t('document_table_add_column')}</InputLabel>
                  <Select label={t('document_table_add_column')} value={newTableColumn} onChange={(event) => setNewTableColumn(String(event.target.value))}>
                    {missing.map((key) => <MenuItem key={key} value={key}>{t(`document_table_column_${key}`)}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button size="small" startIcon={<AddOutlinedIcon />} disabled={!newTableColumn || selectedTable.schema.head.length >= 12} onClick={addTableColumn}>{t('document_table_add_column')}</Button>
                <FormControlLabel control={<Switch size="small" checked={selectedTable.schema.showHead !== false} onChange={(event) => updateTableOption('showHead', event.target.checked)} />} label={t('document_table_show_header')} />
                <FormControlLabel control={<Switch size="small" checked={selectedTable.schema.repeatHead !== false} onChange={(event) => updateTableOption('repeatHead', event.target.checked)} />} label={t('document_table_repeat_header')} />
              </Stack>
              <TextField
                key={`${selectedTable.pageIndex}:${selectedTable.schema.name}:empty-message`}
                size="small"
                fullWidth
                label={t('document_table_empty_message')}
                defaultValue={selectedTable.schema.qpmEmptyMessage || ''}
                inputProps={{ maxLength: 200 }}
                onBlur={(event) => {
                  if (event.target.value !== (selectedTable.schema.qpmEmptyMessage || '')) {
                    updateTableEmptyMessage(event.target.value);
                  }
                }}
                sx={{ mt: 1 }}
              />
            </>;
          })()}
          <Typography variant="caption" color="text.secondary">{t('document_table_data_mapping_help')}</Typography>
        </Paper>
      )}
      {!selectedDataElement && !selectedPrintElement && !selectedComponent && !selectedTable && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2">{t('document_inspector_title')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('document_inspector_empty')}</Typography>
        </Paper>
      )}
      </Stack>
      </Box>
      <Dialog
        open={leaveConfirmOpen}
        onClose={() => {
          if (saving) return;
          setLeaveConfirmOpen(false);
          setPendingNavigation(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('document_designer_leave_title')}</DialogTitle>
        <DialogContent>
          <Typography>{t('document_designer_leave_body')}</Typography>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5, px: 2, pb: 2 }}>
          <Button onClick={() => { setLeaveConfirmOpen(false); setPendingNavigation(null); }} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button
            color="inherit"
            onClick={() => {
              const retry = pendingNavigation;
              setLeaveConfirmOpen(false);
              setPendingNavigation(null);
              retry?.();
            }}
            disabled={saving}
          >
            {t('document_designer_discard_leave')}
          </Button>
          <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={() => void saveAndLeave()} disabled={saving}>
            {saving ? t('saving') : t('document_designer_save_leave')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteComponentOpen}
        onClose={() => setDeleteComponentOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('document_component_remove_title')}</DialogTitle>
        <DialogContent>
          <Typography>{t('document_component_remove_help')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteComponentOpen(false)}>{t('cancel')}</Button>
          <Button color="error" variant="contained" onClick={removeSelectedComponent}>
            {t('document_component_remove_confirm')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(zoneToClear)} onClose={() => setZoneToClear('')} maxWidth="xs" fullWidth>
        <DialogTitle>{t('document_zone_clear_title', { zone: t(`document_zone_${zoneToClear === 'HEADER' ? 'header' : zoneToClear === 'FOOTER' ? 'footer' : zoneToClear === 'REPORT_HEADER' ? 'reportHeader' : 'reportFooter'}`) })}</DialogTitle>
        <DialogContent>
          <Typography>{t('document_zone_clear_help')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setZoneToClear('')}>{t('cancel')}</Button>
          <Button color="error" variant="contained" onClick={clearPrintZone}>{t('document_zone_clear_confirm')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PdfmeDocumentDesigner;
