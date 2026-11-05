import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import BuildCircleOutlinedIcon from '@mui/icons-material/BuildCircleOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { useTranslation } from 'react-i18next';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { TitleContext } from '../../../contexts/TitleContext';
import useAuth from '../../../hooks/useAuth';
import type { PartMiniDTO } from '../../../models/owns/part';
import { PermissionEntity } from '../../../models/owns/role';
import { PlanFeature } from '../../../models/owns/subscriptionPlan';
import api, { getErrorMessage } from '../../../utils/api';
import ConfirmDialog from '../components/ConfirmDialog';
import ContentState from '../components/ContentState';
import PermissionErrorMessage from '../components/PermissionErrorMessage';
import { calculateLaborWork, copyCounterOperations, nextOperationNumber, supportsLaborWorkCalculation } from './taskListDraftUtils';

interface TaskListMaterial {
  id?: number;
  partId: number | null;
  quantity: number | null;
  unit: string;
  storageLocation: string;
  estimatedUnitCost: number | null;
}

interface TaskListOperation {
  id?: number;
  operationNumber: string;
  shortDescription: string;
  longText: string;
  workCenter: string;
  controlKey: string;
  workers: number | null;
  plannedWork: number | null;
  workUnit: string;
  duration: number | null;
  durationUnit: string;
  systemCondition: string;
  operationOrder: number;
  materials: TaskListMaterial[];
}

interface MaintenanceTaskList {
  id?: number;
  groupCode: string;
  groupCounter: string;
  description: string;
  taskListType: string;
  assetId: number | null;
  locationId: number | null;
  workCenter: string;
  validFrom: string | null;
  validTo: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  operations: TaskListOperation[];
  createdBy?: number;
}

interface TaskListGroupOption {
  groupCode: string;
  description: string;
  taskListType: string;
  counterCount: number;
  assetId: number | null;
  locationId: number | null;
}

interface TaskListReferenceObject { id: number; displayName: string; }
interface TaskListWorkCenterSuggestion { workCenter: string; controlKey: string | null; workers: number | null; workUnit: string | null; durationUnit: string | null; systemCondition: string | null; }
interface TaskListDefaults { workCenters: string[]; controlKeys: string[]; workUnits: string[]; durationUnits: string[]; systemConditions: string[]; workCenterDefaults: TaskListWorkCenterSuggestion[]; operationNumberStart: number; operationNumberIncrement: number; defaultWorkers: number; defaultWorkUnit: string; defaultDurationUnit: string; }

interface TaskListPage {
  content: MaintenanceTaskList[];
  totalPages: number;
  totalElements: number;
}
interface PartMiniPage { content: PartMiniDTO[]; totalPages: number; totalElements: number; }

const PAGE_SIZE = 12;
const steps = ['task_list_step_basic', 'task_list_step_operations', 'task_list_step_materials', 'task_list_step_review'];

const emptyForm = (): MaintenanceTaskList => ({
  groupCode: '',
  groupCounter: '',
  description: '',
  taskListType: 'GENERAL',
  assetId: null,
  locationId: null,
  workCenter: '',
  validFrom: '',
  validTo: '',
  status: 'DRAFT',
  operations: []
});

const getWorkCenterDefaults = (workCenter: string, suggestions: TaskListWorkCenterSuggestion[]) =>
  suggestions.find((suggestion) => suggestion.workCenter.trim().toLocaleLowerCase() === workCenter.trim().toLocaleLowerCase());

const applyWorkCenterDefaults = (
  operation: TaskListOperation,
  workCenter: string,
  previousWorkCenter: string,
  suggestions: TaskListWorkCenterSuggestion[]
): TaskListOperation => {
  const defaults = getWorkCenterDefaults(workCenter, suggestions);
  if (!defaults) return { ...operation, workCenter };
  const previous = getWorkCenterDefaults(previousWorkCenter, suggestions);
  const mayReplace = (current: string, previousValue: string | null | undefined, genericValue = '') =>
    !current || current.toLocaleLowerCase() === (previousValue ?? '').toLocaleLowerCase()
    || current.toLocaleLowerCase() === genericValue.toLocaleLowerCase();
  const updated = { ...operation, workCenter };
  if (defaults.controlKey && mayReplace(operation.controlKey, previous?.controlKey)) updated.controlKey = defaults.controlKey;
  if (defaults.workers != null && (operation.workers == null || operation.workers === 1 || operation.workers === previous?.workers)) updated.workers = defaults.workers;
  if (defaults.workUnit && mayReplace(operation.workUnit, previous?.workUnit, 'H')) updated.workUnit = defaults.workUnit;
  if (defaults.durationUnit && mayReplace(operation.durationUnit, previous?.durationUnit, 'H')) updated.durationUnit = defaults.durationUnit;
  if (defaults.systemCondition && mayReplace(operation.systemCondition, previous?.systemCondition)) updated.systemCondition = defaults.systemCondition;
  const calculatedWork = calculateLaborWork(updated);
  if (calculatedWork !== null || supportsLaborWorkCalculation(operation) || supportsLaborWorkCalculation(updated)) {
    updated.plannedWork = calculatedWork;
  }
  return updated;
};

const createOperation = (order: number, existing: TaskListOperation[] = [], defaultWorkCenter = '', suggestions: TaskListWorkCenterSuggestion[] = [], defaults?: Pick<TaskListDefaults, 'operationNumberStart' | 'operationNumberIncrement' | 'defaultWorkers' | 'defaultWorkUnit' | 'defaultDurationUnit'>): TaskListOperation => {
  const workCenterDefault = getWorkCenterDefaults(defaultWorkCenter, suggestions);
  return ({
  operationNumber: nextOperationNumber(existing.map((operation) => operation.operationNumber),
    defaults?.operationNumberStart ?? 10, defaults?.operationNumberIncrement ?? 10),
  shortDescription: '',
  longText: '',
  workCenter: defaultWorkCenter,
  controlKey: workCenterDefault?.controlKey ?? '',
  workers: workCenterDefault?.workers ?? defaults?.defaultWorkers ?? 1,
  plannedWork: null,
  workUnit: workCenterDefault?.workUnit ?? defaults?.defaultWorkUnit ?? 'H',
  duration: null,
  durationUnit: workCenterDefault?.durationUnit ?? defaults?.defaultDurationUnit ?? 'H',
  systemCondition: workCenterDefault?.systemCondition ?? '',
  operationOrder: order,
  materials: []
});
};

const duplicateOperation = (operation: TaskListOperation, order: number, existing: TaskListOperation[], defaults?: Pick<TaskListDefaults, 'operationNumberStart' | 'operationNumberIncrement' | 'defaultWorkers' | 'defaultWorkUnit' | 'defaultDurationUnit'>) => ({
  ...operation,
  id: undefined,
  operationNumber: createOperation(order, existing, '', [], defaults).operationNumber,
  operationOrder: order,
  materials: operation.materials.map((material) => ({ ...material, id: undefined }))
});

const normalizeForm = (taskList: MaintenanceTaskList): MaintenanceTaskList => ({
  ...taskList,
  operations: (taskList.operations ?? []).map((operation, index) => ({
    ...operation,
    operationOrder: index,
    longText: operation.longText ?? '',
    workCenter: operation.workCenter ?? '',
    controlKey: operation.controlKey ?? '',
    workUnit: operation.workUnit ?? '',
    durationUnit: operation.durationUnit ?? '',
    systemCondition: operation.systemCondition ?? '',
    materials: (operation.materials ?? []).map((material) => ({
      ...material,
      partId: material.partId,
      quantity: material.quantity,
      unit: material.unit ?? '',
      storageLocation: material.storageLocation ?? '',
      estimatedUnitCost: material.estimatedUnitCost ?? null
    }))
  }))
});

function MaintenanceTaskLists() {
  const { t }: { t: any } = useTranslation();
  const { setTitle } = useContext(TitleContext);
  const { hasViewPermission, hasCreatePermission, hasEditOtherPermission, hasDeletePermission, hasFeature, user } = useAuth();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [transferring, setTransferring] = useState(false);
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const canView = hasViewPermission(PermissionEntity.TASK_LISTS);
  const moduleEnabled = hasFeature(PlanFeature.PREVENTIVE_MAINTENANCE);
  const canCreate = moduleEnabled && hasCreatePermission(PermissionEntity.TASK_LISTS);
  const canViewParts = hasViewPermission(PermissionEntity.PARTS_AND_MULTIPARTS);
  const canManageRoles = hasViewPermission(PermissionEntity.SETTINGS)
    && hasEditOtherPermission(PermissionEntity.SETTINGS);
  const navigate = useNavigate();

  const [rows, setRows] = useState<MaintenanceTaskList[]>([]);
  const rowsRequestId = useRef(0);
  const [parts, setParts] = useState<PartMiniDTO[]>([]);
  const [groups, setGroups] = useState<TaskListGroupOption[]>([]);
  const [groupCounters, setGroupCounters] = useState<MaintenanceTaskList[]>([]);
  const [sourceCounterId, setSourceCounterId] = useState<number | null>(null);
  const [pendingSourceCounterId, setPendingSourceCounterId] = useState<number | null | undefined>(undefined);
  const [loadingGroupCounters, setLoadingGroupCounters] = useState(false);
  const [groupCountersError, setGroupCountersError] = useState(false);
  const [groupCountersReload, setGroupCountersReload] = useState(0);
  const [groupCountersPartsDenied, setGroupCountersPartsDenied] = useState(false);
  const [taskListDefaults, setTaskListDefaults] = useState<TaskListDefaults>({ workCenters: [], controlKeys: [], workUnits: [], durationUnits: [], systemConditions: [], workCenterDefaults: [], operationNumberStart: 10, operationNumberIncrement: 10, defaultWorkers: 1, defaultWorkUnit: 'H', defaultDurationUnit: 'H' });
  const [defaultsError, setDefaultsError] = useState(false);
  const [defaultsReload, setDefaultsReload] = useState(0);
  const [groupsError, setGroupsError] = useState(false);
  const [groupsReload, setGroupsReload] = useState(0);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [referenceObjects, setReferenceObjects] = useState<TaskListReferenceObject[]>([]);
  const [referenceObjectsError, setReferenceObjectsError] = useState(false);
  const [loadingReferenceObjects, setLoadingReferenceObjects] = useState(false);
  const [partsError, setPartsError] = useState<string | null>(null);
  const [loadingParts, setLoadingParts] = useState(false);
  const [partsReload, setPartsReload] = useState(0);
  const [partsQuery, setPartsQuery] = useState('');
  const [debouncedPartsQuery, setDebouncedPartsQuery] = useState('');
  const [partsPage, setPartsPage] = useState(0);
  const [partsTotalPages, setPartsTotalPages] = useState(0);
  const [partsTotalElements, setPartsTotalElements] = useState(0);
  const [partPickerTarget, setPartPickerTarget] = useState<{ operationIndex: number; materialIndex: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceTaskList | null>(null);
  const [form, setForm] = useState<MaintenanceTaskList>(emptyForm());
  const [baseline, setBaseline] = useState('');
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [partsIndex, setPartsIndex] = useState<Record<number, PartMiniDTO>>({});
  const partsIndexRef = useRef(partsIndex);
  partsIndexRef.current = partsIndex;
  const selectedMaterialIdsKey = useMemo(
    () => Array.from(new Set(form.operations.flatMap((operation) => operation.materials
      .map((material) => material.partId).filter((id): id is number => id !== null))))
      .sort((left, right) => left - right)
      .join(','),
    [form.operations]
  );

  useEffect(() => () => { rowsRequestId.current += 1; }, []);

  useEffect(() => setTitle(t('maintenance_task_lists')), [setTitle, t]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedPartsQuery(partsQuery.trim());
      setPartsPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [partsQuery]);

  const fetchRows = useCallback(async () => {
    const requestId = ++rowsRequestId.current;
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams({
        query: debouncedQuery,
        page: String(page),
        size: String(PAGE_SIZE)
      });
      const result = await api.get<TaskListPage>(`maintenance-task-lists?${params.toString()}`);
      if (requestId !== rowsRequestId.current) return;
      setRows(result.content ?? []);
      setTotalPages(result.totalPages ?? 0);
      setTotalElements(result.totalElements ?? 0);
    } catch {
      if (requestId === rowsRequestId.current) setLoadError(true);
    } finally {
      if (requestId === rowsRequestId.current) setLoading(false);
    }
  }, [debouncedQuery, page]);

  const exportTaskLists = async () => {
    setTransferring(true);
    try {
      const response = await api.get<Response>('maintenance-task-lists/export', { raw: true });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'maintenance-task-lists.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showSnackBar(getErrorMessage(error, 'task_list_export_error'), 'error');
    } finally { setTransferring(false); }
  };

  const importTaskLists = async (file?: File) => {
    if (!file) return;
    setTransferring(true);
    const data = new FormData();
    data.append('file', file);
    try {
      const result = await api.post<{ importedCounters: number; generatedGroups: number }>(
        'maintenance-task-lists/import', data,
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` } }, true
      );
      showSnackBar(t('task_list_import_success', result), 'success');
      setPage(0);
      await fetchRows();
    } catch (error) {
      const message = (error as any)?.responseBody?.message;
      const validationErrors = new Set([
        'task_list_header_values_invalid',
        'task_list_operation_values_invalid',
        'task_list_operation_required_fields',
        'task_list_operation_values_must_be_positive',
        'task_list_material_values_invalid'
      ]);
      const invalidRow = typeof message === 'string'
        ? /^task_list_import_invalid_row_(\d+)_/.exec(message)
        : null;
      const userMessage = invalidRow
        ? t('task_list_import_row_error', { row: invalidRow[1] })
        : validationErrors.has(message)
          ? t(message)
          : getErrorMessage(error, 'task_list_import_error');
      showSnackBar(userMessage, 'error');
    } finally {
      setTransferring(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  useEffect(() => {
    if (canView) void fetchRows();
  }, [canView, fetchRows]);

  const openCreate = () => {
    const next = emptyForm();
    setPartPickerTarget(null);
    setGroupCounters([]);
    setSourceCounterId(null);
    setGroupCountersError(false);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setFormError('');
    setGroupsError(false);
    setStep(0);
    setDialogOpen(true);
  };

  const openEdit = (row: MaintenanceTaskList) => {
    const next = normalizeForm(row);
    setPartPickerTarget(null);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setFormError('');
    setStep(0);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!dialogOpen || form.id || !canView) return;
    let active = true;
    setLoadingGroups(true);
    setGroupsError(false);
    api.get<TaskListGroupOption[]>('maintenance-task-lists/groups')
      .then((result) => { if (active) setGroups(result ?? []); })
      .catch(() => { if (active) setGroupsError(true); })
      .finally(() => { if (active) setLoadingGroups(false); });
    return () => { active = false; };
  }, [dialogOpen, form.id, canView, groupsReload]);

  useEffect(() => {
    if (!dialogOpen || form.id || !form.groupCode || !canView) {
      setGroupCounters([]);
      setGroupCountersError(false);
      setLoadingGroupCounters(false);
      return;
    }
    let active = true;
    setLoadingGroupCounters(true);
    setGroupCountersError(false);
    setGroupCountersPartsDenied(false);
    api.get<MaintenanceTaskList[]>(`maintenance-task-lists/groups/${encodeURIComponent(form.groupCode)}/counters`)
      .then((result) => {
        if (active) setGroupCounters((result ?? [])
          .sort((left, right) => left.groupCounter.localeCompare(right.groupCounter, undefined, { numeric: true })));
      })
      .catch((error) => {
        if (!active) return;
        setGroupCountersPartsDenied((error as any)?.responseBody?.message === 'task_list_copy_parts_not_accessible');
        setGroupCountersError(true);
      })
      .finally(() => { if (active) setLoadingGroupCounters(false); });
    return () => { active = false; };
  }, [dialogOpen, form.id, form.groupCode, canView, groupCountersReload]);

  useEffect(() => {
    if (!dialogOpen || !canView) return;
    let active = true;
    setDefaultsError(false);
    api.get<TaskListDefaults>('maintenance-task-lists/defaults')
      .then((result) => { if (active) setTaskListDefaults({ workCenters: result.workCenters ?? [], controlKeys: result.controlKeys ?? [], workUnits: result.workUnits ?? [], durationUnits: result.durationUnits ?? [], systemConditions: result.systemConditions ?? [], workCenterDefaults: result.workCenterDefaults ?? [], operationNumberStart: result.operationNumberStart ?? 10, operationNumberIncrement: result.operationNumberIncrement ?? 10, defaultWorkers: result.defaultWorkers ?? 1, defaultWorkUnit: result.defaultWorkUnit ?? 'H', defaultDurationUnit: result.defaultDurationUnit ?? 'H' }); })
      .catch(() => { if (active) { setTaskListDefaults({ workCenters: [], controlKeys: [], workUnits: [], durationUnits: [], systemConditions: [], workCenterDefaults: [], operationNumberStart: 10, operationNumberIncrement: 10, defaultWorkers: 1, defaultWorkUnit: 'H', defaultDurationUnit: 'H' }); setDefaultsError(true); } });
    return () => { active = false; };
  }, [dialogOpen, canView, defaultsReload]);

  useEffect(() => {
    if (!dialogOpen || form.taskListType === 'GENERAL') {
      setReferenceObjects([]);
      setReferenceObjectsError(false);
      return;
    }
    let active = true;
    setLoadingReferenceObjects(true);
    setReferenceObjectsError(false);
    api.get<TaskListReferenceObject[]>(`maintenance-task-lists/reference-objects?taskListType=${encodeURIComponent(form.taskListType)}`)
      .then((result) => { if (active) setReferenceObjects(result ?? []); })
      .catch(() => { if (active) setReferenceObjectsError(true); })
      .finally(() => { if (active) setLoadingReferenceObjects(false); });
    return () => { active = false; };
  }, [dialogOpen, form.taskListType]);

  const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline]);
  const requestClose = () => {
    if (saving) return;
    if (dirty) setConfirmDiscard(true);
    else { setPartPickerTarget(null); setDialogOpen(false); }
  };
  const closeDiscard = () => {
    setConfirmDiscard(false);
    setPartPickerTarget(null);
    setDialogOpen(false);
  };

  const updateHeader = (field: keyof MaintenanceTaskList, value: any) => {
    if (['taskListType', 'assetId', 'locationId'].includes(field)) setSourceCounterId(null);
    setForm((current) => {
      if (field === 'taskListType' && !current.id) {
        return { ...current, taskListType: value, assetId: null, locationId: null, groupCode: '' };
      }
      if ((field === 'assetId' || field === 'locationId') && !current.id) return { ...current, [field]: value, groupCode: '' };
      if (field === 'workCenter') {
        const previousDefault = current.workCenter.trim().toLocaleLowerCase();
        const nextDefault = String(value ?? '');
        return {
          ...current,
          workCenter: nextDefault,
          operations: current.operations.map((operation) => {
            const operationCenter = operation.workCenter.trim().toLocaleLowerCase();
            if (operationCenter && operationCenter !== previousDefault) return operation;
            return applyWorkCenterDefaults(operation, nextDefault, operation.workCenter || current.workCenter,
              taskListDefaults.workCenterDefaults);
          })
        };
      }
      return { ...current, [field]: value };
    });
    setFormError('');
  };
  const selectExistingGroup = (groupCode: string) => {
    const selectedGroup = groups.find((group) => group.groupCode === groupCode);
    setSourceCounterId(null);
    setGroupCounters([]);
    updateHeader('groupCode', groupCode);
    if (!form.description.trim() && selectedGroup?.description) {
      updateHeader('description', selectedGroup.description);
    }
  };
  const applySourceCounter = (counterId: number | null) => {
    setSourceCounterId(counterId);
    const source = groupCounters.find((counter) => counter.id === counterId);
    setForm((current) => ({ ...current, operations: source ? copyCounterOperations(source.operations ?? []) : [] }));
  };
  const selectSourceCounter = (counterId: number | null) => {
    if (counterId === sourceCounterId) return;
    if (form.operations.length > 0) {
      setPendingSourceCounterId(counterId);
      return;
    }
    applySourceCounter(counterId);
  };
  const updateOperation = (index: number, field: keyof TaskListOperation, value: any) => {
    setForm((current) => ({
      ...current,
      operations: current.operations.map((operation, operationIndex) => {
        if (operationIndex !== index) return operation;
        let updated: TaskListOperation = { ...operation, [field]: value };
        if (field === 'workCenter') {
          updated = applyWorkCenterDefaults(operation, String(value ?? ''), operation.workCenter,
            taskListDefaults.workCenterDefaults);
        }
        if (['workers', 'duration', 'durationUnit', 'workUnit', 'workCenter'].includes(field)) {
          const calculatedWork = calculateLaborWork(updated);
          if (calculatedWork !== null || supportsLaborWorkCalculation(updated)
            || supportsLaborWorkCalculation(operation)) {
            updated.plannedWork = calculatedWork;
          }
        }
        return updated;
      })
    }));
  };
  const moveOperation = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= form.operations.length) return;
    setForm((current) => {
      const operations = [...current.operations];
      [operations[index], operations[destination]] = [operations[destination], operations[index]];
      return { ...current, operations: operations.map((operation, order) => ({ ...operation, operationOrder: order })) };
    });
  };
  const updateMaterial = (operationIndex: number, materialIndex: number, field: keyof TaskListMaterial, value: any) => {
    setForm((current) => ({
      ...current,
      operations: current.operations.map((operation, index) => index !== operationIndex ? operation : ({
        ...operation,
        materials: operation.materials.map((material, partIndex) => partIndex === materialIndex ? { ...material, [field]: value } : material)
      }))
    }));
  };
  const addMaterial = (operationIndex: number) => {
    setForm((current) => ({
      ...current,
      operations: current.operations.map((operation, index) => index === operationIndex
        ? { ...operation, materials: [...operation.materials, { partId: null, quantity: null, unit: '', storageLocation: '', estimatedUnitCost: null }] }
        : operation)
    }));
  };
  const removeMaterial = (operationIndex: number, materialIndex: number) => {
    setForm((current) => ({
      ...current,
      operations: current.operations.map((operation, index) => index === operationIndex
        ? { ...operation, materials: operation.materials.filter((_, partIndex) => partIndex !== materialIndex) }
        : operation)
    }));
  };

  const legacyUnlinkedTaskList = Boolean(
    form.id && form.taskListType !== 'GENERAL' && !form.assetId && !form.locationId
  );
  const referenceObjectValid = legacyUnlinkedTaskList || (form.taskListType === 'GENERAL'
    ? !form.assetId && !form.locationId
    : form.taskListType === 'EQUIPMENT'
      ? Boolean(form.assetId) && !form.locationId
      : Boolean(form.locationId) && !form.assetId);
  const basicValid = Boolean(form.description.trim() && form.taskListType.trim()) && referenceObjectValid
    && !(form.validFrom && form.validTo && form.validTo < form.validFrom);
  const operationsValid = form.operations.length > 0 && form.operations.every((operation) =>
    operation.operationNumber.trim() && operation.shortDescription.trim()
  );
  const materialsValid = form.operations.every((operation) => operation.materials.every((material) =>
    material.partId !== null && material.quantity !== null && material.quantity > 0
  ));
  const canAdvance = step === 0
    ? basicValid
    : step === 1
      ? operationsValid || (form.status === 'DRAFT' && form.operations.length === 0)
      : step === 2
        ? materialsValid
        : true;

  useEffect(() => {
    if (!dialogOpen || step !== 2 || !canViewParts) return;
    let active = true;
    setPartsError(null);
    const selectedIds = selectedMaterialIdsKey
      ? selectedMaterialIdsKey.split(',').map(Number)
      : [];
    const missingIds = selectedIds.filter((id) => !partsIndexRef.current[id]);
    if (!missingIds.length) return () => { active = false; };
    const batches = Array.from({ length: Math.ceil(missingIds.length / 100) }, (_, index) =>
      missingIds.slice(index * 100, (index + 1) * 100)
    );
    Promise.all(batches.map((ids) => {
      const selectedParams = new URLSearchParams();
      ids.forEach((id) => selectedParams.append('ids', String(id)));
      return api.get<PartMiniDTO[]>(`parts/mini/selected?${selectedParams.toString()}`);
    }))
      .then((results) => {
        if (!active) return;
        const selected = results.flat();
        setPartsIndex((current) => Object.fromEntries([...Object.values(current), ...selected].map((part) => [part.id, part])));
      })
      .catch((error) => { if (active) setPartsError(getErrorMessage(error, 'task_list_parts_load_error')); })
    return () => { active = false; };
  }, [dialogOpen, step, canViewParts, partsReload, selectedMaterialIdsKey]);

  useEffect(() => {
    if (!dialogOpen || step !== 2 || !canViewParts || !partPickerTarget || debouncedPartsQuery.length < 2) {
      setParts([]);
      setPartsTotalPages(0);
      setPartsTotalElements(0);
      setLoadingParts(false);
      return;
    }
    let active = true;
    setLoadingParts(true);
    setPartsError(null);
    const params = new URLSearchParams({ query: debouncedPartsQuery, page: String(partsPage), size: '25' });
    api.get<PartMiniPage>(`parts/mini/search?${params.toString()}`)
      .then((result) => {
        if (!active) return;
        setParts(result.content);
        setPartsTotalPages(result.totalPages);
        setPartsTotalElements(result.totalElements);
        setPartsIndex((current) => Object.fromEntries([...Object.values(current), ...result.content].map((part) => [part.id, part])));
      })
      .catch((error) => { if (active) setPartsError(getErrorMessage(error, 'task_list_parts_load_error')); })
      .finally(() => { if (active) setLoadingParts(false); });
    return () => { active = false; };
  }, [dialogOpen, step, canViewParts, debouncedPartsQuery, partsPage, partPickerTarget, partsReload]);

  const save = async () => {
    if (!basicValid || (form.operations.length > 0 && !operationsValid)
      || (form.status === 'ACTIVE' && !operationsValid) || !materialsValid) {
      setFormError(t('task_list_validation_error'));
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      ...form,
      groupCode: form.id ? form.groupCode : null,
      groupCounter: form.id ? form.groupCounter : null,
      existingGroupCode: form.id ? null : (form.groupCode || null),
      description: form.description.trim(),
      workCenter: form.workCenter.trim() || null,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      operations: form.operations.map((operation, index) => ({
        ...operation,
        operationOrder: index,
        materials: canViewParts ? operation.materials.map((material) => ({
          ...material,
          partId: material.partId,
          quantity: material.quantity,
          unit: material.unit || null,
          storageLocation: material.storageLocation || null
        })) : operation.materials
      }))
    };
    try {
      if (form.id) await api.put(`maintenance-task-lists/${form.id}`, payload);
      else await api.post('maintenance-task-lists', payload);
      setDialogOpen(false);
      showSnackBar(t(form.id ? 'task_list_saved' : 'task_list_created'), 'success');
      await fetchRows();
    } catch (error) {
      const message = (error as any)?.responseBody?.message;
      const knownErrors = new Set([
        'task_list_group_counter_exists', 'task_list_group_code_limit_reached',
        'task_list_group_not_found', 'task_list_group_type_mismatch', 'task_list_group_object_mismatch',
        'task_list_identity_immutable', 'task_list_equipment_required', 'task_list_functional_location_required',
        'task_list_reference_object_not_allowed', 'task_list_reference_object_unavailable', 'invalid_task_list_type',
        'task_list_operation_not_found', 'task_list_material_not_found',
        'task_list_header_values_invalid', 'task_list_operation_values_invalid',
        'task_list_operation_required_fields', 'task_list_operation_values_must_be_positive',
        'task_list_material_values_invalid'
      ]);
      setFormError(knownErrors.has(message) ? t(message) : getErrorMessage(error, t('task_list_save_error')));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await api.deletes(`maintenance-task-lists/${deleteTarget.id}`);
      showSnackBar(t('task_list_deleted'), 'success');
      setDeleteTarget(null);
      if (rows.length === 1 && page > 0) setPage((current) => current - 1);
      else await fetchRows();
    } catch (error) {
      const message = (error as any)?.responseBody?.message;
      showSnackBar(message === 'task_list_in_use_by_work_order' || message === 'task_list_in_use_by_preventive_maintenance'
        ? t(message)
        : getErrorMessage(error, t('task_list_delete_error')), 'error');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const canEdit = (row: MaintenanceTaskList) => hasEditOtherPermission(PermissionEntity.TASK_LISTS) || row.createdBy === user?.id;
  const canDelete = (row: MaintenanceTaskList) => hasDeletePermission(PermissionEntity.TASK_LISTS, row as any);
  const onMaterialPartChange = (operationIndex: number, materialIndex: number, partId: number | null) => {
    const selected = partId === null ? undefined : partsIndex[partId];
    setForm((current) => ({
      ...current,
      operations: current.operations.map((operation, index) => index !== operationIndex ? operation : ({
        ...operation,
        materials: operation.materials.map((material, itemIndex) => itemIndex === materialIndex
          ? { ...material, partId, unit: selected?.unit ?? '', storageLocation: selected?.area ?? '', estimatedUnitCost: selected?.cost ?? null }
          : material)
      }))
    }));
  };

  if (!moduleEnabled) return <PermissionErrorMessage message="task_list_feature_disabled" />;
  if (!canView) return <PermissionErrorMessage message="no_access_task_lists" />;

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1500, mx: 'auto', width: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <BuildCircleOutlinedIcon color="primary" />
            <Typography variant="h4">{t('maintenance_task_lists')}</Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>{t('maintenance_task_lists_intro')}</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          {canCreate && <Button disabled={transferring} variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => importFileRef.current?.click()}>{t('task_list_import')}</Button>}
          <Button disabled={transferring} variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={() => void exportTaskLists()}>{t('task_list_export')}</Button>
          {canCreate && <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>{t('create_task_list')}</Button>}
          {canCreate && <input ref={importFileRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => void importTaskLists(event.target.files?.[0])} />}
        </Stack>
      </Stack>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
            <TextField size="small" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('task_list_search_placeholder')} inputProps={{ 'aria-label': t('task_list_search_placeholder') }} InputProps={{ startAdornment: <SearchOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }} sx={{ width: { xs: '100%', sm: 420 } }} />
            <Typography variant="body2" color="text.secondary">{t('task_list_results_count', { count: totalElements })}</Typography>
          </Stack>
        </CardContent>
      </Card>

      {loading ? <ContentState variant="loading" message={t('loading')} minHeight={280} /> : loadError ? (
        <ContentState variant="error" message={t('task_list_load_error')} actionLabel={t('retry')} onAction={() => void fetchRows()} />
      ) : rows.length === 0 ? (
        <ContentState variant="empty" message={debouncedQuery ? t('task_list_search_empty') : t('task_list_empty_page_title')} description={debouncedQuery ? t('task_list_search_empty_help') : t('task_list_empty_page_help')} minHeight={280} />
      ) : (
        <Grid container spacing={2}>
          {rows.map((row) => (
            <Grid item xs={12} md={6} xl={4} key={row.id}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'box-shadow .16s ease, transform .16s ease', '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="overline" color="text.secondary">{t('task_list_group')} · {row.groupCode} / {row.groupCounter}</Typography>
                      <Typography variant="h6" sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>{row.description}</Typography>
                    </Box>
                    <Chip size="small" label={t(`task_list_status_${row.status.toLowerCase()}`)} color={row.status === 'ACTIVE' ? 'success' : row.status === 'INACTIVE' ? 'default' : 'warning'} />
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                    <Chip size="small" variant="outlined" label={t(`task_list_type_${row.taskListType.toLowerCase()}`, { defaultValue: row.taskListType })} />
                    {row.workCenter && <Chip size="small" variant="outlined" label={`${t('work_center')}: ${row.workCenter}`} />}
                  </Stack>
                  <Divider sx={{ my: 1.75 }} />
                  <Stack direction="row" spacing={2.5} alignItems="center">
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <BuildCircleOutlinedIcon fontSize="small" color="action" />
                      <Typography variant="body2">{t('task_list_operation_count', { count: row.operations?.length ?? 0 })}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Inventory2OutlinedIcon fontSize="small" color="action" />
                      <Typography variant="body2">{t('task_list_material_count', { count: row.operations?.reduce((sum, operation) => sum + (operation.materials?.length ?? 0), 0) ?? 0 })}</Typography>
                    </Stack>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                    {row.validFrom || row.validTo ? `${row.validFrom || '—'} → ${row.validTo || '—'}` : t('task_list_validity_open')}
                  </Typography>
                </CardContent>
                {(canEdit(row) || canDelete(row)) && <>
                  <Divider />
                  <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ p: 1.25 }}>
                    {canEdit(row) && <Tooltip title={t('edit')}><IconButton aria-label={t('edit')} size="small" onClick={() => openEdit(row)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}
                    {canDelete(row) && <Tooltip title={t('delete')}><IconButton aria-label={t('delete')} size="small" color="error" onClick={() => setDeleteTarget(row)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>}
                  </Stack>
                </>}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {!loading && !loadError && totalPages > 1 && <Stack alignItems="center" sx={{ mt: 3 }}><Pagination page={page + 1} count={totalPages} onChange={(_, value) => setPage(value - 1)} color="primary" /></Stack>}

      <Dialog open={dialogOpen} onClose={requestClose} fullScreen={mobile} fullWidth maxWidth="lg" aria-labelledby="task-list-dialog-title">
        <DialogTitle id="task-list-dialog-title" sx={{ pb: 1 }}>
          <Typography variant="h5">{t(form.id ? 'edit_maintenance_task_list' : 'create_task_list')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('task_list_wizard_help')}</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {defaultsError && <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => setDefaultsReload((value) => value + 1)}>{t('retry')}</Button>}>{t('task_list_defaults_load_failed')}</Alert>}
          <Stepper activeStep={step} orientation={mobile ? 'vertical' : 'horizontal'} sx={{ mb: 3 }}>
            {steps.map((label) => <Step key={label}><StepLabel>{t(label)}</StepLabel></Step>)}
          </Stepper>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          {step === 0 && <Grid container spacing={2}>
            {form.id ? <Grid item xs={12} sm={6}><TextField fullWidth label={t('task_list_group_code')} value={form.groupCode} InputProps={{ readOnly: true }} helperText={t('task_list_group_code_immutable_help')} /></Grid> : <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="task-list-existing-group-label">{t('task_list_existing_group')}</InputLabel>
                <Select labelId="task-list-existing-group-label" label={t('task_list_existing_group')} value={form.groupCode} disabled={!referenceObjectValid} onChange={(event) => selectExistingGroup(event.target.value)}>
                  <MenuItem value="">{t('task_list_new_group_auto')}</MenuItem>
                  {groups.filter((group) => group.taskListType.toUpperCase() === form.taskListType.toUpperCase()
                    && group.assetId === form.assetId && group.locationId === form.locationId).map((group) => <MenuItem key={group.groupCode} value={group.groupCode}>{group.groupCode} · {group.description} ({t('task_list_group_counter_count', { count: group.counterCount })})</MenuItem>)}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">{t('task_list_group_code_auto_help')}</Typography>
              {loadingGroups && <Typography variant="caption" display="block">{t('loading')}</Typography>}
              {groupsError && <Alert severity="warning" sx={{ mt: 1 }} action={<Button color="inherit" size="small" onClick={() => setGroupsReload((value) => value + 1)}>{t('retry')}</Button>}>{t('task_list_groups_load_error')}</Alert>}
            </Grid>}
            {!form.id && form.groupCode && <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="task-list-source-counter-label">{t('task_list_copy_from_counter')}</InputLabel>
                <Select labelId="task-list-source-counter-label" label={t('task_list_copy_from_counter')} value={sourceCounterId ?? ''} disabled={loadingGroupCounters || groupCountersError || !canViewParts} onChange={(event) => selectSourceCounter(event.target.value ? Number(event.target.value) : null)}>
                  <MenuItem value="">{t('task_list_no_counter_copy')}</MenuItem>
                  {groupCounters.map((counter) => <MenuItem key={counter.id} value={counter.id}>{counter.groupCounter} · {counter.description || t('untitled')}</MenuItem>)}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">{t('task_list_copy_from_counter_help')}</Typography>
              {!canViewParts && <Typography variant="caption" color="text.secondary" display="block">{t('task_list_copy_counter_parts_permission')}</Typography>}
              {loadingGroupCounters && <Typography variant="caption" display="block">{t('loading')}</Typography>}
              {groupCountersError && <Alert severity="warning" sx={{ mt: 1 }} action={<Button color="inherit" size="small" onClick={() => setGroupCountersReload((value) => value + 1)}>{t('retry')}</Button>}>{t(groupCountersPartsDenied ? 'task_list_copy_counter_parts_denied' : 'task_list_group_counters_load_error')}</Alert>}
            </Grid>}
            <Grid item xs={12} sm={6}><TextField fullWidth label={t('task_list_group_counter')} value={form.groupCounter || t('task_list_counter_generated_on_save')} InputProps={{ readOnly: true }} helperText={t(form.id ? 'task_list_counter_immutable_help' : 'task_list_counter_auto_help')} /></Grid>
            <Grid item xs={12} sm={8}><TextField fullWidth required label={t('description')} value={form.description} onChange={(event) => updateHeader('description', event.target.value)} /></Grid>
            <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>{t('task_list_type')}</InputLabel><Select label={t('task_list_type')} value={form.taskListType} disabled={Boolean(form.id)} onChange={(event) => updateHeader('taskListType', event.target.value)}>
              {['GENERAL', 'EQUIPMENT', 'FUNCTIONAL_LOCATION'].map((type) => <MenuItem key={type} value={type}>{t(`task_list_type_${type.toLowerCase()}`)}</MenuItem>)}
            </Select></FormControl></Grid>
            {form.taskListType === 'EQUIPMENT' && <Grid item xs={12}><FormControl fullWidth required><InputLabel>{t('task_list_reference_equipment')}</InputLabel><Select label={t('task_list_reference_equipment')} value={form.assetId ?? ''} disabled={Boolean(form.id) || loadingReferenceObjects || referenceObjectsError} onChange={(event) => updateHeader('assetId', event.target.value ? Number(event.target.value) : null)}>
              {referenceObjects.map((item) => <MenuItem key={item.id} value={item.id}>{item.displayName}</MenuItem>)}
            </Select></FormControl></Grid>}
            {form.taskListType === 'FUNCTIONAL_LOCATION' && <Grid item xs={12}><FormControl fullWidth required><InputLabel>{t('task_list_reference_location')}</InputLabel><Select label={t('task_list_reference_location')} value={form.locationId ?? ''} disabled={Boolean(form.id) || loadingReferenceObjects || referenceObjectsError} onChange={(event) => updateHeader('locationId', event.target.value ? Number(event.target.value) : null)}>
              {referenceObjects.map((item) => <MenuItem key={item.id} value={item.id}>{item.displayName}</MenuItem>)}
            </Select></FormControl></Grid>}
            {loadingReferenceObjects && form.taskListType !== 'GENERAL' && <Grid item xs={12}><Typography variant="caption">{t('loading')}</Typography></Grid>}
            {referenceObjectsError && <Grid item xs={12}><Alert severity="error">{t('task_list_reference_objects_load_error')}</Alert></Grid>}
            <Grid item xs={12} sm={6}><Autocomplete freeSolo={taskListDefaults.workCenters.length === 0} options={taskListDefaults.workCenters} value={form.workCenter} onInputChange={(_, value) => updateHeader('workCenter', value)} onChange={(_, value) => updateHeader('workCenter', value ?? '')} renderInput={(params) => <TextField {...params} fullWidth label={t('work_center')} helperText={taskListDefaults.workCenters.length ? t('task_list_reuse_existing_default') : undefined} />} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth type="date" label={t('valid_from')} InputLabelProps={{ shrink: true }} value={form.validFrom ?? ''} onChange={(event) => updateHeader('validFrom', event.target.value || null)} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth type="date" label={t('valid_to')} InputLabelProps={{ shrink: true }} value={form.validTo ?? ''} onChange={(event) => updateHeader('validTo', event.target.value || null)} /></Grid>
            <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>{t('status')}</InputLabel><Select label={t('status')} value={form.status} onChange={(event) => updateHeader('status', event.target.value)}>
              {(['DRAFT', 'ACTIVE', 'INACTIVE'] as const).map((status) => <MenuItem key={status} value={status}>{t(`task_list_status_${status.toLowerCase()}`)}</MenuItem>)}
            </Select></FormControl></Grid>
            {form.validFrom && form.validTo && form.validTo < form.validFrom && <Grid item xs={12}><Alert severity="warning">{t('task_list_invalid_validity')}</Alert></Grid>}
          </Grid>}

          {step === 1 && <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
              <Box><Typography variant="h6">{t('task_list_operations_title')}</Typography><Typography variant="body2" color="text.secondary">{t('task_list_operations_help')}</Typography></Box>
              <Button variant="outlined" startIcon={<AddOutlinedIcon />} onClick={() => setForm((current) => ({ ...current, operations: [...current.operations, createOperation(current.operations.length, current.operations, current.workCenter, taskListDefaults.workCenterDefaults, taskListDefaults)] }))}>{t('add_task_list_operation')}</Button>
            </Stack>
            {form.operations.length === 0 && <Alert severity={form.status === 'ACTIVE' ? 'warning' : 'info'}>{t(form.status === 'ACTIVE' ? 'task_list_requires_operation' : 'task_list_draft_without_operations')}</Alert>}
            {form.operations.map((operation, index) => <Card variant="outlined" key={operation.id ?? `operation-${index}`}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1} sx={{ mb: 2 }}>
                  <Typography fontWeight={700}>{t('operation')} {index + 1}</Typography>
                  <Stack direction="row" spacing={0.5} justifyContent={{ xs: 'flex-end', sm: 'initial' }}>
                    <Tooltip title={t('move_up')}><span><IconButton size="small" disabled={index === 0} onClick={() => moveOperation(index, -1)} aria-label={t('move_up')}>↑</IconButton></span></Tooltip>
                    <Tooltip title={t('move_down')}><span><IconButton size="small" disabled={index === form.operations.length - 1} onClick={() => moveOperation(index, 1)} aria-label={t('move_down')}>↓</IconButton></span></Tooltip>
                    <Tooltip title={t('duplicate_operation')}><IconButton size="small" onClick={() => setForm((current) => ({ ...current, operations: [...current.operations, duplicateOperation(operation, current.operations.length, current.operations, taskListDefaults)] }))} aria-label={t('duplicate_operation')}><ContentCopyOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title={t('delete')}><IconButton size="small" color="error" onClick={() => setForm((current) => ({ ...current, operations: current.operations.filter((_, operationIndex) => operationIndex !== index).map((item, order) => ({ ...item, operationOrder: order })) }))} aria-label={t('delete')}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                </Stack>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={3}><TextField fullWidth required size="small" label={t('task_list_operation_number')} value={operation.operationNumber} InputProps={{ readOnly: operation.id === undefined }} helperText={operation.id === undefined ? t('task_list_operation_number_auto_help') : undefined} onChange={(event) => updateOperation(index, 'operationNumber', event.target.value)} /></Grid>
                  <Grid item xs={12} sm={9}><TextField fullWidth required size="small" label={t('short_description')} value={operation.shortDescription} onChange={(event) => updateOperation(index, 'shortDescription', event.target.value)} /></Grid>
                  <Grid item xs={12}><TextField fullWidth size="small" multiline minRows={2} label={t('long_text')} value={operation.longText} onChange={(event) => updateOperation(index, 'longText', event.target.value)} /></Grid>
                  <Grid item xs={12} sm={4}><Autocomplete freeSolo={taskListDefaults.workCenters.length === 0} options={taskListDefaults.workCenters} value={operation.workCenter} onInputChange={(_, value) => updateOperation(index, 'workCenter', value)} onChange={(_, value) => updateOperation(index, 'workCenter', value ?? '')} renderInput={(params) => <TextField {...params} fullWidth size="small" label={t('work_center')} helperText={getWorkCenterDefaults(operation.workCenter, taskListDefaults.workCenterDefaults) ? t('task_list_work_center_suggestions') : undefined} />} /></Grid>
                  <Grid item xs={12} sm={4}><Autocomplete freeSolo={taskListDefaults.controlKeys.length === 0} options={taskListDefaults.controlKeys} value={operation.controlKey} onInputChange={(_, value) => updateOperation(index, 'controlKey', value)} onChange={(_, value) => updateOperation(index, 'controlKey', value ?? '')} renderInput={(params) => <TextField {...params} fullWidth size="small" label={t('control_key')} />} /></Grid>
                  <Grid item xs={6} sm={2}><TextField fullWidth size="small" type="number" inputProps={{ min: 1, step: 1 }} label={t('task_list_technicians')} value={operation.workers ?? ''} onChange={(event) => updateOperation(index, 'workers', event.target.value ? Number(event.target.value) : null)} /></Grid>
                  <Grid item xs={6} sm={2}><TextField select fullWidth size="small" label={t('system_condition')} value={operation.systemCondition} onChange={(event) => updateOperation(index, 'systemCondition', event.target.value)}>
                    <MenuItem value="">{t('select_system_condition')}</MenuItem>
                    <MenuItem value="0">0 · {t('system_condition_not_in_operation')}</MenuItem>
                    <MenuItem value="1">1 · {t('system_condition_in_operation')}</MenuItem>
                    {taskListDefaults.systemConditions.filter((condition) => !['0', '1'].includes(condition)).map((condition) => <MenuItem key={condition} value={condition}>{t('system_condition_legacy_value', { value: condition })}</MenuItem>)}
                  </TextField></Grid>
                  <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="number" inputProps={{ min: 0, step: 0.001 }} label={t('task_list_total_labor_work')} value={operation.plannedWork ?? ''} InputProps={{ readOnly: supportsLaborWorkCalculation(operation) }} helperText={supportsLaborWorkCalculation(operation) ? t('task_list_labor_work_formula', { duration: operation.duration ?? 0, workers: operation.workers ?? 0, work: operation.plannedWork ?? 0 }) : t('task_list_labor_work_manual_help')} onChange={(event) => updateOperation(index, 'plannedWork', event.target.value ? Number(event.target.value) : null)} /></Grid>
                  <Grid item xs={6} sm={3}><Autocomplete freeSolo options={taskListDefaults.workUnits} value={operation.workUnit} onInputChange={(_, value) => updateOperation(index, 'workUnit', value)} onChange={(_, value) => updateOperation(index, 'workUnit', value ?? '')} renderInput={(params) => <TextField {...params} fullWidth size="small" label={t('unit')} />} /></Grid>
                  <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="number" inputProps={{ min: 0.01, step: 0.01 }} label={t('duration')} value={operation.duration ?? ''} onChange={(event) => updateOperation(index, 'duration', event.target.value ? Number(event.target.value) : null)} /></Grid>
                  <Grid item xs={6} sm={3}><Autocomplete freeSolo options={taskListDefaults.durationUnits} value={operation.durationUnit} onInputChange={(_, value) => updateOperation(index, 'durationUnit', value)} onChange={(_, value) => updateOperation(index, 'durationUnit', value ?? '')} renderInput={(params) => <TextField {...params} fullWidth size="small" label={t('duration_unit')} />} /></Grid>
                </Grid>
              </CardContent>
            </Card>)}
          </Stack>}

          {step === 2 && <Stack spacing={2}>
            <Box><Typography variant="h6">{t('task_list_materials_title')}</Typography><Typography variant="body2" color="text.secondary">{t('task_list_materials_help')}</Typography></Box>
            {!canViewParts && <Alert severity="info" action={canManageRoles ? <Button color="inherit" size="small" onClick={() => navigate('/app/roles')}>{t('task_list_manage_role_permissions')}</Button> : undefined}>{t('task_list_materials_permission_limited')}</Alert>}
            {partsError && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setPartsReload((value) => value + 1)}>{t('retry')}</Button>}>{t(partsError)}</Alert>}
            {form.operations.length === 0 && <Alert severity="info">{t('task_list_add_operation_first')}</Alert>}
            {form.operations.map((operation, operationIndex) => <Card variant="outlined" key={operation.id ?? `materials-${operationIndex}`}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                  <Box><Typography fontWeight={700}>{operation.operationNumber} · {operation.shortDescription || t('untitled_operation')}</Typography><Typography variant="caption" color="text.secondary">{t('task_list_material_count', { count: operation.materials.length })}</Typography></Box>
                  {canViewParts && <Button size="small" startIcon={<AddOutlinedIcon />} onClick={() => addMaterial(operationIndex)}>{t('add_component')}</Button>}
                </Stack>
                {operation.materials.length === 0 ? <Typography variant="body2" color="text.secondary">{t('no_planned_materials')}</Typography> : <Stack spacing={1.5}>
                  {operation.materials.map((material, materialIndex) => {
                    const selectedPart = material.partId === null ? undefined : partsIndex[material.partId];
                    // A blank new material has no selectedPart yet. Keep its selector and
                    // editable fields active so the user can choose the part first.
                    const canEditMaterial = canViewParts;
                    return <Grid container spacing={1} alignItems="center" key={material.id ?? `material-${materialIndex}`}>
                      <Grid item xs={12} sm={4}>{canEditMaterial ? <Button
                        fullWidth
                        variant="outlined"
                        color="inherit"
                        startIcon={<SearchOutlinedIcon />}
                        onClick={() => {
                          setParts([]);
                          setPartsTotalPages(0);
                          setPartsTotalElements(0);
                          setPartsQuery('');
                          setDebouncedPartsQuery('');
                          setPartsPage(0);
                          setPartPickerTarget({ operationIndex, materialIndex });
                        }}
                        sx={{ minHeight: 44, justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal', lineHeight: 1.35 }}
                      >{selectedPart ? `${selectedPart.barcode || `#${selectedPart.id}`} · ${selectedPart.name}` : t('task_list_select_part')}</Button> : <TextField fullWidth size="small" disabled label={t('part')} value={selectedPart ? `${selectedPart.barcode || `#${selectedPart.id}`} · ${selectedPart.name}` : t('part_reference', { id: material.partId })} />}</Grid>
                      <Grid item xs={6} sm={2}><TextField fullWidth size="small" type="number" inputProps={{ min: 0.0001, step: 0.0001 }} label={t('required_quantity')} value={material.quantity ?? ''} disabled={!canEditMaterial} onChange={(event) => updateMaterial(operationIndex, materialIndex, 'quantity', event.target.value ? Number(event.target.value) : null)} /></Grid>
                      <Grid item xs={6} sm={2}><TextField fullWidth size="small" label={t('unit')} value={material.unit || selectedPart?.unit || ''} disabled={!canEditMaterial} onChange={(event) => updateMaterial(operationIndex, materialIndex, 'unit', event.target.value)} /></Grid>
                      <Grid item xs={6} sm={2}><TextField fullWidth size="small" label={t('storage_location')} value={material.storageLocation} helperText={selectedPart?.area ? t('task_list_storage_location_from_part') : undefined} disabled={!canEditMaterial} onChange={(event) => updateMaterial(operationIndex, materialIndex, 'storageLocation', event.target.value)} /></Grid>
                      <Grid item xs={5} sm={1}><TextField fullWidth size="small" type="number" inputProps={{ min: 0, step: 0.01 }} label={t('estimated_unit_cost')} value={material.estimatedUnitCost ?? selectedPart?.cost ?? ''} disabled={!canEditMaterial} onChange={(event) => updateMaterial(operationIndex, materialIndex, 'estimatedUnitCost', event.target.value ? Number(event.target.value) : null)} /></Grid>
                      <Grid item xs={12} sm={1} sx={{ display: 'flex', justifyContent: { xs: 'flex-end', sm: 'center' } }}><Tooltip title={t('remove_component')}><span><IconButton color="error" disabled={!canEditMaterial} aria-label={t('remove_component')} onClick={() => removeMaterial(operationIndex, materialIndex)} sx={{ minWidth: 44, minHeight: 44 }}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip></Grid>
                    </Grid>;
                  })}
                </Stack>}
              </CardContent>
            </Card>)}
          </Stack>}

          {step === 3 && <Stack spacing={2}>
            <Typography variant="h6">{t('task_list_review_title')}</Typography>
            <Card variant="outlined"><CardContent>
              <Stack spacing={1}>
                <Typography variant="h6">{form.description || t('untitled_task_list')}</Typography>
                <Typography color="text.secondary">{t('task_list_group')} · {form.id ? form.groupCode : (form.groupCode || t('task_list_group_generated_on_save'))} / {form.id ? form.groupCounter : t('task_list_counter_generated_on_save')}</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip size="small" label={t(`task_list_status_${form.status.toLowerCase()}`)} />
                  <Chip size="small" variant="outlined" label={t(`task_list_type_${form.taskListType.toLowerCase()}`, { defaultValue: form.taskListType })} />
                  {form.workCenter && <Chip size="small" variant="outlined" label={`${t('work_center')}: ${form.workCenter}`} />}
                  <Chip size="small" variant="outlined" label={t('task_list_operation_count', { count: form.operations.length })} />
                  <Chip size="small" variant="outlined" label={t('task_list_material_count', { count: form.operations.reduce((sum, operation) => sum + operation.materials.length, 0) })} />
                </Stack>
              </Stack>
            </CardContent></Card>
            {form.operations.map((operation, index) => <Card variant="outlined" key={operation.id ?? `review-${index}`}><CardContent>
              <Typography fontWeight={700}>{operation.operationNumber} · {operation.shortDescription || t('untitled_operation')}</Typography>
              <Typography variant="body2" color="text.secondary">{[operation.workCenter, operation.workers ? t('task_list_technicians_count', { count: operation.workers }) : '', operation.plannedWork != null ? `${operation.plannedWork} ${operation.workUnit}` : '', operation.duration != null ? `${operation.duration} ${operation.durationUnit}` : ''].filter(Boolean).join(' · ') || t('task_list_operation_no_planning_data')}</Typography>
              {operation.materials.map((material, materialIndex) => {
                const part = material.partId === null ? undefined : partsIndex[material.partId];
                return <Typography variant="body2" sx={{ mt: 1 }} key={material.id ?? materialIndex}>{material.quantity} {material.unit} · {part?.barcode || `#${material.partId}`} {part?.name ?? ''}</Typography>;
              })}
            </CardContent></Card>)}
            <Alert severity="info">{t('task_list_planned_material_disclaimer')}</Alert>
          </Stack>}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between', flexDirection: { xs: 'column-reverse', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 1, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
          <Button onClick={requestClose} color="inherit" sx={{ width: { xs: '100%', sm: 'auto' } }}>{t('cancel')}</Button>
          <Stack direction="row" spacing={1} width={{ xs: '100%', sm: 'auto' }}>
            {step > 0 && <Button sx={{ flex: { xs: '1 1 0%', sm: 'initial' } }} onClick={() => { setFormError(''); setStep((current) => current - 1); }}>{t('back')}</Button>}
            {step < steps.length - 1 ? <Button sx={{ flex: { xs: '1 1 0%', sm: 'initial' } }} variant="contained" disabled={!canAdvance} onClick={() => { setFormError(''); setStep((current) => current + 1); }}>{t('next')}</Button> : <Button sx={{ flex: { xs: '1 1 0%', sm: 'initial' } }} variant="contained" disabled={saving || !basicValid || (form.operations.length > 0 && !operationsValid) || (form.status === 'ACTIVE' && !operationsValid) || !materialsValid} onClick={() => void save()}>{saving ? t('saving') : t('save')}</Button>}
          </Stack>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(partPickerTarget)} onClose={() => setPartPickerTarget(null)} fullScreen={mobile} fullWidth maxWidth="md" aria-labelledby="task-list-part-picker-title">
        <DialogTitle id="task-list-part-picker-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {t('task_list_part_picker_title')}
          <IconButton aria-label={t('close')} onClick={() => setPartPickerTarget(null)} edge="end"><CloseOutlinedIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">{t('task_list_part_picker_help')}</Typography>
            <TextField
              autoFocus
              fullWidth
              label={t('task_list_search_parts')}
              placeholder={t('task_list_search_parts_hint')}
              value={partsQuery}
              onChange={(event) => {
                setPartsQuery(event.target.value);
                setParts([]);
                setPartsPage(0);
                setPartsTotalPages(0);
                setPartsTotalElements(0);
              }}
              InputProps={{ startAdornment: <SearchOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
              helperText={debouncedPartsQuery.length < 2 ? t('task_list_search_parts_minimum') : t('task_list_parts_search_count', { count: partsTotalElements })}
            />
            {loadingParts && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} /><Typography variant="body2">{t('loading')}</Typography></Stack>}
            {partsError && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setPartsReload((value) => value + 1)}>{t('retry')}</Button>}>{t(partsError)}</Alert>}
            {debouncedPartsQuery.length >= 2 && !loadingParts && !partsError && parts.length === 0 && <Alert severity="info">{t('task_list_parts_no_match')}</Alert>}
            <Stack spacing={1}>
              {parts.map((part) => <Button
                key={part.id}
                fullWidth
                variant="outlined"
                color="inherit"
                onClick={() => {
                  if (partPickerTarget) onMaterialPartChange(partPickerTarget.operationIndex, partPickerTarget.materialIndex, part.id);
                  setPartPickerTarget(null);
                }}
                sx={{ p: 1.5, justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal' }}
              >
                <Stack alignItems="flex-start" spacing={0.25} sx={{ width: '100%' }}>
                  <Typography variant="body2" fontWeight={700}>{part.barcode || `#${part.id}`} · {part.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{[part.description, part.unit, part.cost != null ? `${part.cost}` : ''].filter(Boolean).join(' · ')}</Typography>
                </Stack>
              </Button>)}
            </Stack>
            {partsTotalPages > 1 && <Stack alignItems="center" sx={{ pt: 1 }}><Pagination count={partsTotalPages} page={partsPage + 1} onChange={(_, value) => { setParts([]); setPartsPage(value - 1); }} size={mobile ? 'small' : 'medium'} color="primary" /></Stack>}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setPartPickerTarget(null)}>{t('cancel')}</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={confirmDiscard} onCancel={() => setConfirmDiscard(false)} onConfirm={closeDiscard} confirmText={t('discard_changes')} question={t('task_list_discard_confirm')} />
      <ConfirmDialog open={pendingSourceCounterId !== undefined} onCancel={() => setPendingSourceCounterId(undefined)} onConfirm={() => { const nextCounterId = pendingSourceCounterId ?? null; setPendingSourceCounterId(undefined); applySourceCounter(nextCounterId); }} confirmText={t('task_list_copy_from_counter')} question={t('task_list_replace_operations_confirm')} />
      <ConfirmDialog open={Boolean(deleteTarget)} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} confirmText={deleting ? t('deleting') : t('delete')} question={t('task_list_delete_confirm', { name: deleteTarget?.description ?? '' })} />
    </Box>
  );
}

export default MaintenanceTaskLists;
