import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  debounce,
  Divider,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import WorkOrder from '../../../../models/owns/workOrder';
import {
  ChangeEvent,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ReportConfigModal from './ReportConfigModal';
import SendReportModal from './SendReportModal';
import Tasks from './Tasks';
import TimeSection from './TimeSection';
import CostSection from './CostSection';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import { getSafeHttpUrl } from '../../../../utils/safeWindow';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import PriorityWrapper from '../../components/PriorityWrapper';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import {
  changeWorkOrderStatus,
  editWorkOrder,
  removeFileFromWorkOrder
} from '../../../../slices/workOrder';
import { useDispatch, useSelector } from '../../../../store';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import SelectParts from '../../components/form/SelectParts';
import ImageViewer from 'react-simple-image-viewer';
import {
  editPartQuantity,
  editWOPartQuantities,
  getPartQuantitiesByWorkOrder
} from '../../../../slices/partQuantity';
import Labor from '../../../../models/owns/labor';
import { controlTimer, editLabor, getLabors } from '../../../../slices/labor';
import {
  durationToHours,
  getHoursAndMinutesAndSeconds
} from '../../../../utils/formatters';
import { getAdditionalCosts } from '../../../../slices/additionalCost';
import { getTasksByWorkOrder } from '../../../../slices/task';
import { Task } from '../../../../models/owns/tasks';
import LinkModal from './LinkModal';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
import { deleteRelation, getRelations } from '../../../../slices/relation';
import Relation, { relationTypes } from '../../../../models/owns/relation';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import {
  getAssetUrl,
  getPreventiveMaintenanceUrl,
  getUserUrl,
  getWorkOrderUrl
} from '../../../../utils/urlPaths';
import CompleteWOModal from './CompleteWOModal';
import useAuth from '../../../../hooks/useAuth';
import { PermissionEntity } from '../../../../models/owns/role';
import { getSingleUserMini } from '../../../../slices/user';
import FilesList from '../../components/FilesList';
import { PlanFeature } from '../../../../models/owns/subscriptionPlan';
import PartQuantitiesList from '../../components/PartQuantitiesList';
import AddFileModal from './AddFileModal';
import CommentsSection from './CommentsSection';
import { useLicenseEntitlement } from '../../../../hooks/useLicenseEntitlement';
import { getCustomFieldValuesForDetails } from '../../type';
import { getErrorMessage } from '../../../../utils/api';
import { getCommentsCountByWorkOrder } from '../../../../slices/comment';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { ContentCopyOutlined } from '@mui/icons-material';
import WorkOrderStatusChip from '../WorkOrderStatusChip';
import ConfirmDialog from '../../components/ConfirmDialog';

function WorkOrderImagePreview({
  src,
  label,
  height,
  onOpen
}: {
  src: string;
  label: string;
  height: number;
  onOpen: () => void;
}) {
  return (
    <ButtonBase
      component="button"
      type="button"
      aria-label={label}
      onClick={onOpen}
      sx={{
        p: 0,
        border: 0,
        borderRadius: 1,
        overflow: 'hidden',
        verticalAlign: 'middle',
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2
        }
      }}
    >
      <img
        src={src}
        alt=""
        style={{
          borderRadius: 5,
          height,
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block'
        }}
      />
    </ButtonBase>
  );
}

interface WorkOrderDetailsProps {
  workOrder: WorkOrder;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onCopy: (workOrder: WorkOrder) => void;
  tasks: Task[];
  onClose: () => void;
}

export default function WorkOrderDetails(props: WorkOrderDetailsProps) {
  const { workOrder, onEdit, tasks, onDelete, onCopy, onClose } = props;
  const theme = useTheme();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { getFormattedDate, getUserNameById, getFormattedCurrency } =
    useContext(CompanySettingsContext);
  const { t }: { t: any } = useTranslation();
  const { user, hasEditPermission, hasDeletePermission, hasCreatePermission } =
    useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const commentIdParam = searchParams.get('commentId');
  const [openAddFileModal, setOpenAddFileModal] = useState<boolean>(false);
  const [openLinkModal, setOpenLinkModal] = useState<boolean>(false);
  const [relationToDelete, setRelationToDelete] = useState<number | null>(null);
  const [openCompleteModal, setOpenCompleteModal] = useState<boolean>(false);
  const [openArchiveConfirm, setOpenArchiveConfirm] = useState<boolean>(false);
  const archiveInProgressRef = useRef(false);
  const [openReportConfigModal, setOpenReportConfigModal] =
    useState<boolean>(false);
  const [openSendReportModal, setOpenSendReportModal] =
    useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<string>('details');
  const [changingStatus, setChangingStatus] = useState<boolean>(false);
  const { partQuantitiesByWorkOrder, loadingPartQuantities } = useSelector(
    (state) => state.partQuantities
  );
  const partQuantities = partQuantitiesByWorkOrder[workOrder.id] ?? [];
  const [controllingTime, setControllingTime] = useState<boolean>(false);
  const { timesByWorkOrder, loadingLabors } = useSelector(
    (state) => state.labors
  );
  const { workOrderHistories } = useSelector(
    (state) => state.workOrderHistories
  );
  const { relationsByWorkOrder, loadingRelations } = useSelector(
    (state) => state.relations
  );
  const currentWorkOrderHistories = workOrderHistories[workOrder.id] ?? [];
  const currentWorkOrderRelations = relationsByWorkOrder[workOrder.id] ?? [];
  const labors = timesByWorkOrder[workOrder.id] ?? [];
  const primaryTime = labors.find(
    (labor) => labor.logged && labor.assignedTo.id === user.id
  );
  const runningTimer = primaryTime?.status === 'RUNNING';
  const handleDeleteRelation = async () => {
    if (relationToDelete === null) return;
    try {
      const deleted = await dispatch(
        deleteRelation(workOrder.id, relationToDelete)
      );
      if (!deleted) {
        showSnackBar(t('an_error_occured'), 'error');
        return;
      }
      showSnackBar(t('operation_success'), 'success');
      setRelationToDelete(null);
    } catch {
      showSnackBar(t('an_error_occured'), 'error');
    }
  };
  const { costsByWorkOrder, loadingCosts } = useSelector(
    (state) => state.additionalCosts
  );
  const additionalCosts = costsByWorkOrder[workOrder.id] ?? [];
  const { commentsCountByWorkOrder } = useSelector((state) => state.comments);
  const commentsCount = commentsCountByWorkOrder[workOrder.id]?.count ?? 0;
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const { companySettings, hasFeature } = useAuth();
  const { workOrderConfiguration, generalPreferences } = companySettings;
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const [openEditPrimaryTime, setOpenEditPrimaryTime] =
    useState<boolean>(false);
  const [primaryTimeHours, setPrimaryTimeHours] = useState<number>();
  const [primaryTimeMinutes, setPrimaryTimeMinutes] = useState<number>();
  const [savingPrimaryTime, setSavingPrimaryTime] = useState<boolean>(false);
  const [commentId, setCommentId] = useState<number>(null);

  useEffect(() => {
    dispatch(getCommentsCountByWorkOrder(workOrder.id));
  }, [workOrder.id, dispatch]);

  useEffect(() => {
    if (commentIdParam) {
      setCurrentTab('comments');
      setCommentId(Number(commentIdParam));
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('commentId');

      setSearchParams(newParams);
    }
  }, [commentIdParam]);

  useEffect(() => {
    [workOrder.createdBy, workOrder.parentRequest?.createdBy].forEach(
      (createdBy) => {
        if (!usersMini.find((user) => user.id === createdBy) && createdBy) {
          dispatch(getSingleUserMini(createdBy));
        }
      }
    );
  }, []);

  const { usersMini } = useSelector((state) => state.users);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState<boolean>(false);
  const [currentImage, setCurrentImage] = useState<string>();
  const [currentImages, setCurrentImages] = useState<string[]>();

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  const onArchiveSuccess = () => {
    onClose();
    showSnackBar(t('wo_archive_success'), 'success');
  };
  const onArchiveFailure = (err) =>
    showSnackBar(t('wo_archive_failure'), 'error');
  const onArchive = () => {
    handleCloseMenu();
    setOpenArchiveConfirm(true);
  };
  const confirmArchive = () => {
    if (archiveInProgressRef.current) return;
    archiveInProgressRef.current = true;
    setOpenArchiveConfirm(false);
    dispatch(editWorkOrder(workOrder.id, { ...workOrder, archived: true }))
      .then(onArchiveSuccess)
      .catch(onArchiveFailure)
      .finally(() => {
        archiveInProgressRef.current = false;
      });
  };
  const onGenerateReport = () => {
    handleCloseMenu();
    setOpenReportConfigModal(true);
  };
  const onEmailContractors = () => {
    handleCloseMenu();
    setOpenSendReportModal(true);
  };
  useEffect(() => {
    dispatch(getPartQuantitiesByWorkOrder(workOrder.id));
    dispatch(getLabors(workOrder.id));
    dispatch(getAdditionalCosts(workOrder.id));
    dispatch(getTasksByWorkOrder(workOrder.id));
    dispatch(getRelations(workOrder.id));
  }, []);
  useEffect(() => {
    const [hours, minutes] = getHoursAndMinutesAndSeconds(
      primaryTime?.duration
    );
    setPrimaryTimeHours(hours);
    setPrimaryTimeMinutes(minutes);
  }, [primaryTime]);

  const setImageState = (images: string[], image: string) => {
    setCurrentImage(image);
    setCurrentImages(images);
    setIsImageViewerOpen(true);
  };
  const canComplete = (): boolean => {
    let error;
    const fieldsToTest = [
      {
        name: 'completeFiles',
        condition:
          workOrder.files.length +
            commentsCountByWorkOrder[workOrder.id]?.withFilesCount ===
          0,
        message: 'required_files_on_completion'
      },
      {
        name: 'completeTasks',
        condition: tasks.some((task) => !task.value),
        message: 'required_tasks_on_completion'
      },
      {
        name: 'completeTime',
        condition: labors.filter((labor) => labor.duration).length === 0,
        message: 'required_labor_on_completion'
      },
      {
        name: 'completeParts',
        condition: !partQuantities.length,
        message: 'required_part_on_completion'
      },
      {
        name: 'completeCost',
        condition: !additionalCosts.length,
        message: 'required_cost_on_completion'
      }
    ];
    fieldsToTest.every((field) => {
      const fieldConfig =
        workOrderConfiguration.workOrderFieldConfigurations.find(
          (woFC) => woFC.fieldName === field.name
        );
      if (fieldConfig.fieldType === 'REQUIRED' && field.condition) {
        showSnackBar(t(field.message), 'error');
        error = true;
        return false;
      }
      return true;
    });

    return !error;
  };
  const isParent = (relation: Relation): boolean => {
    return relation.parent.id === workOrder.id;
  };
  const onPartQuantityChange = (value: string, partQuantity) => {
    dispatch(
      editPartQuantity(workOrder.id, partQuantity.id, Number(value), false)
    )
      .then(() => showSnackBar(t('quantity_change_success'), 'success'))
      .catch((err) => showSnackBar(t('quantity_change_failure'), 'error'));
  };
  const debouncedPartQuantityChange = useMemo(
    () => debounce(onPartQuantityChange, 1500),
    []
  );
  const onCompleteWO = (
    signature: string | undefined,
    feedback: string | undefined
  ) => {
    setChangingStatus(true);
    return dispatch(
      changeWorkOrderStatus(workOrder?.id, {
        status: 'COMPLETE',
        feedback: feedback ?? null,
        signature
      })
    )
      .then(() => {
        showSnackBar(t('wo_close_success'), 'success');
        return dispatch(getLabors(workOrder?.id)).catch(() => undefined);
      })
      .finally(() => setChangingStatus(false));
  };
  const groupRelations = (
    relations: Relation[]
  ): { [key: string]: { id: number; workOrder: WorkOrder }[] } => {
    const result = {};
    relationTypes.forEach((relationType) => {
      result[relationType] = [];
    });
    relations.forEach((relation) => {
      switch (relation.relationType) {
        case 'BLOCKS':
          if (isParent(relation)) {
            result['BLOCKS'].push({
              id: relation.id,
              workOrder: relation.child
            });
          } else
            result['BLOCKED_BY'].push({
              id: relation.id,
              workOrder: relation.parent
            });
          break;
        case 'DUPLICATE_OF':
          if (isParent(relation)) {
            result['DUPLICATE_OF'].push({
              id: relation.id,
              workOrder: relation.child
            });
          } else
            result['DUPLICATED_BY'].push({
              id: relation.id,
              workOrder: relation.parent
            });
          break;
        case 'RELATED_TO':
          result['RELATED_TO'].push({
            id: relation.id,
            workOrder: isParent(relation) ? relation.child : relation.parent
          });
          break;
        case 'SPLIT_FROM':
          if (isParent(relation)) {
            result['SPLIT_FROM'].push({
              id: relation.id,
              workOrder: relation.child
            });
          } else
            result['SPLIT_TO'].push({
              id: relation.id,
              workOrder: relation.parent
            });
          break;
        default:
          break;
      }
    });

    return result;
  };
  const workOrderStatuses = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETE'];
  const tabs = [
    { value: 'details', label: t('details') },
    {
      value: 'comments',
      label: `${t('comments')}${commentsCount > 0 ? ` (${commentsCount})` : ''}`
    }
  ];

  const getPath = (resource: string, id: number) => {
    switch (resource) {
      case 'asset':
        return getAssetUrl(id);
      case 'team':
        return `/app/people-teams/teams/${id}`;
      default:
        return `/app/${resource}s/${id}`;
    }
  };
  const onSavePrimaryTime = () => {
    setSavingPrimaryTime(true);
    const duration = primaryTimeHours * 3600 + primaryTimeMinutes * 60;
    dispatch(
      editLabor(primaryTime.id, workOrder.id, {
        ...primaryTime,
        duration
      })
    )
      .then(() => {
        setOpenEditPrimaryTime(false);
      })
      .finally(() => setSavingPrimaryTime(false));
  };
  const BasicField = ({
    label,
    value,
    id,
    type,
    isLink
  }: {
    label: string | number;
    value: string | number;
    type?: string;
    id?: number;
    isLink?: boolean;
  }) => {
    if (value && (isLink || !type || (type && id))) {
      const href = isLink
        ? getSafeHttpUrl(value.toString(), { assumeHttps: true })
        : null;
      return (
        <Grid item xs={12} lg={6}>
          <Typography variant="h6" sx={{ color: theme.palette.text.secondary }}>
            {label}
          </Typography>
          {type ? (
            <Link href={getPath(type, id)} variant="h6" fontWeight="bold">
              {value}
            </Link>
          ) : isLink && href ? (
            <Link
              variant="h6"
              fontWeight="bold"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {value}
            </Link>
          ) : (
            <Typography variant="h6">{value}</Typography>
          )}
        </Grid>
      );
    } else return null;
  };
  const handleTabsChange = (_event: ChangeEvent<{}>, value: string): void => {
    setCurrentTab(value);
  };
  const detailsFieldsToRender = (
    workOrder: WorkOrder
  ): {
    label: string;
    value: string | number;
    type?: 'location' | 'asset' | 'team';
    isLink?: boolean;
    id?: number;
  }[] => [
    {
      label: t('id'),
      value: workOrder.customId
    },
    {
      label: t('due_date'),
      value: getFormattedDate(workOrder.dueDate)
    },
    {
      label: t('estimated_start_date'),
      value: getFormattedDate(workOrder.estimatedStartDate)
    },
    {
      label: t('estimated_duration'),
      value: !!workOrder.estimatedDuration
        ? t('estimated_hours_in_text', { hours: workOrder.estimatedDuration })
        : null
    },
    {
      label: t('category'),
      value: workOrder.category?.name
    },
    {
      label: t('location'),
      value: workOrder.location?.name,
      type: 'location',
      id: workOrder.location?.id
    },
    {
      label: t('asset'),
      value: workOrder.asset?.name,
      type: 'asset',
      id: workOrder.asset?.id
    },
    {
      label: t('team'),
      value: workOrder.team?.name,
      type: 'team',
      id: workOrder.team?.id
    },
    {
      label: t('created_at'),
      value: getFormattedDate(workOrder.createdAt)
    },
    ...getCustomFieldValuesForDetails(
      workOrder.customFieldValues,
      getFormattedDate
    )
  ];
  return (
    <Grid
      container
      justifyContent="center"
      alignItems="stretch"
      spacing={2}
      sx={{ px: { xs: 1.5, sm: 3 }, py: { xs: 2, sm: 3 } }}
    >
      <Grid
        item
        xs={12}
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        justifyContent="space-between"
        gap={2}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            sx={{ mb: 1.5 }}
          >
            {workOrder.customId && (
              <Typography variant="overline" color="text.secondary">
                {workOrder.customId}
              </Typography>
            )}
            <WorkOrderStatusChip status={workOrder.status} />
            {workOrder?.priority !== 'NONE' && (
              <PriorityWrapper priority={workOrder?.priority} withSuffix />
            )}
          </Stack>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '1.5rem', sm: '2rem' },
              overflowWrap: 'anywhere'
            }}
          >
            {workOrder?.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
            {workOrder?.description}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignSelf: { xs: 'flex-end', sm: 'flex-start' } }}
        >
          {hasEditPermission(PermissionEntity.WORK_ORDERS, workOrder) && (
            <IconButton aria-label={t('actions')} onClick={handleOpenMenu}>
              <MoreVertOutlinedIcon />
            </IconButton>
          )}
          {hasEditPermission(PermissionEntity.WORK_ORDERS, workOrder) && (
            <IconButton
              aria-label={t('edit')}
              onClick={() => onEdit(workOrder.id)}
            >
              <EditOutlinedIcon color="primary" />
            </IconButton>
          )}
          {hasDeletePermission(PermissionEntity.WORK_ORDERS, workOrder) && (
            <IconButton
              aria-label={t('delete')}
              onClick={() => onDelete(workOrder.id)}
            >
              <DeleteOutlinedIcon color="error" />
            </IconButton>
          )}
        </Stack>
      </Grid>
      <Divider />
      <Grid item xs={12}>
        <Tabs
          onChange={handleTabsChange}
          value={currentTab}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          {tabs.map((tab) => (
            <Tab key={tab.value} label={tab.label} value={tab.value} />
          ))}
        </Tabs>
      </Grid>
      <Grid item xs={12}>
        {currentTab === 'details' && (
          <Box>
            <Grid container spacing={2}>
              <Grid
                item
                xs={12}
                display="flex"
                flexDirection={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                gap={1.5}
              >
                <Box>
                  {changingStatus ? (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 100,
                        height: 30
                      }}
                    >
                      <CircularProgress size={'1rem'} />
                    </Box>
                  ) : (
                    <Select
                      inputProps={{ 'aria-label': t('status') }}
                      onChange={(event) => {
                        if (event.target.value === 'COMPLETE') {
                          if (canComplete()) {
                            let error;
                            if (workOrder.requiredSignature) {
                              if (!hasFeature(PlanFeature.SIGNATURE)) {
                                error =
                                  'Signature on Work Order completion is not available in your current subscription plan.';
                              }
                            }
                            if (error) {
                              showSnackBar(t(error), 'error');
                            } else {
                              // Keep completion explicit even when feedback and signature are optional.
                              setOpenCompleteModal(true);
                              return;
                            }
                          } else return;
                        }
                        setChangingStatus(true);
                        dispatch(
                          changeWorkOrderStatus(workOrder?.id, {
                            status: event.target.value
                          })
                        )
                          .then(() =>
                            showSnackBar(
                              t('wo_status_change_success'),
                              'success'
                            )
                          )
                          .catch((error) =>
                            showSnackBar(getErrorMessage(error), 'error')
                          )
                          .finally(() => setChangingStatus(false));
                      }}
                      disabled={
                        !hasEditPermission(
                          PermissionEntity.WORK_ORDERS,
                          workOrder
                        )
                      }
                      value={workOrder.status}
                      sx={{
                        minWidth: { xs: '100%', sm: 180 },
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        fontWeight: 600
                      }}
                    >
                      {workOrderStatuses.map((workOrderStatus, index) => (
                        <MenuItem key={index} value={workOrderStatus}>
                          {t(workOrderStatus)}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                </Box>
                <Box>
                  <Button
                    startIcon={
                      controllingTime ? (
                        <CircularProgress size="1rem" />
                      ) : (
                        <TimerOutlinedIcon />
                      )
                    }
                    disabled={
                      controllingTime ||
                      !hasEditPermission(
                        PermissionEntity.WORK_ORDERS,
                        workOrder
                      )
                    }
                    onClick={() => {
                      setControllingTime(true);
                      dispatch(controlTimer(!runningTimer, workOrder.id))
                        .catch((err) =>
                          showSnackBar(getErrorMessage(err), 'error')
                        )
                        .finally(() => setControllingTime(false));
                    }}
                    variant={runningTimer ? 'contained' : 'outlined'}
                    color={runningTimer ? 'error' : 'primary'}
                    sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: 44 }}
                  >
                    {runningTimer
                      ? t('timer_running')
                      : t('run_timer') +
                        ' - ' +
                        durationToHours(primaryTime?.duration)}
                  </Button>
                </Box>
              </Grid>
              {workOrder.image && (
                <Grid
                  item
                  xs={12}
                  lg={12}
                  display="flex"
                  justifyContent="center"
                >
                  <WorkOrderImagePreview
                    src={workOrder.image.url}
                    label={`${t('view')} ${t('image')}`}
                    height={250}
                    onOpen={() => {
                      setImageState([workOrder.image.url], workOrder.image.url);
                    }}
                  />
                </Grid>
              )}
              {detailsFieldsToRender(workOrder).map((field, index) => (
                <BasicField key={index} {...field} />
              ))}
              {workOrder.primaryUser && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {t('primary_worker')}
                  </Typography>
                  <Link
                    variant="h6"
                    href={getUserUrl(workOrder.primaryUser.id)}
                  >
                    {getUserNameById(workOrder.primaryUser.id)}
                  </Link>
                </Grid>
              )}
              {(workOrder.parentRequest || workOrder.createdBy) && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {workOrder.parentRequest
                      ? t('approved_by')
                      : t('created_by')}
                  </Typography>
                  <Link variant="h6" href={getUserUrl(workOrder.createdBy)}>
                    {getUserNameById(workOrder.createdBy)}
                  </Link>
                </Grid>
              )}
              {workOrder.parentPreventiveMaintenance && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {t('preventive_maintenance')}
                  </Typography>
                  <Link
                    variant="h6"
                    href={getPreventiveMaintenanceUrl(
                      workOrder.parentPreventiveMaintenance.id
                    )}
                  >
                    {workOrder.parentPreventiveMaintenance.name}
                  </Link>
                </Grid>
              )}
              {workOrder.status === 'COMPLETE' && (
                <>
                  {workOrder.completedBy && (
                    <Grid item xs={12} lg={6}>
                      <Typography
                        variant="h6"
                        sx={{ color: theme.palette.text.secondary }}
                      >
                        {t('completed_by')}
                      </Typography>
                      <Link
                        variant="h6"
                        href={getUserUrl(workOrder.completedBy.id)}
                      >
                        {`${workOrder.completedBy.firstName} ${workOrder.completedBy.lastName}`}
                      </Link>
                    </Grid>
                  )}
                  <Grid item xs={12} lg={6}>
                    <Typography
                      variant="h6"
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      {t('completed_on')}
                    </Typography>
                    <Typography variant="h6">
                      {getFormattedDate(workOrder.completedOn)}
                    </Typography>
                  </Grid>
                  {workOrder.feedback && (
                    <Grid item xs={12} lg={6}>
                      <Typography
                        variant="h6"
                        sx={{ color: theme.palette.text.secondary }}
                      >
                        {t('feedback')}
                      </Typography>
                      <Typography variant="h6">{workOrder.feedback}</Typography>
                    </Grid>
                  )}
                  {workOrder.signature && (
                    <Grid item xs={12} lg={6}>
                      <Typography
                        variant="h6"
                        sx={{ color: theme.palette.text.secondary }}
                      >
                        {t('signature')}
                      </Typography>
                      <WorkOrderImagePreview
                        src={workOrder.signature}
                        label={`${t('view')} ${t('signature')}`}
                        height={100}
                        onOpen={() => {
                          setImageState(
                            [workOrder.signature],
                            workOrder.signature
                          );
                        }}
                      />
                    </Grid>
                  )}
                </>
              )}
              {workOrder.parentRequest && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {t('requested_by')}
                  </Typography>
                  <Link
                    variant="h6"
                    href={getUserUrl(workOrder.parentRequest.createdBy)}
                  >
                    {getUserNameById(workOrder.parentRequest.createdBy)}
                  </Link>
                </Grid>
              )}
              {primaryTime && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {t('time')}
                  </Typography>
                  {openEditPrimaryTime ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        value={primaryTimeHours}
                        type="number"
                        onChange={(event) =>
                          setPrimaryTimeHours(Number(event.target.value))
                        }
                      />
                      <Typography variant="h6">h</Typography>
                      <TextField
                        value={primaryTimeMinutes}
                        type="number"
                        InputProps={{ inputProps: { min: 0, max: 59 } }}
                        onChange={(event) =>
                          setPrimaryTimeMinutes(Number(event.target.value))
                        }
                      />
                      <Typography variant="h6">m</Typography>
                      {savingPrimaryTime ? (
                        <CircularProgress size="1rem" />
                      ) : (
                        <IconButton
                          disabled={savingPrimaryTime}
                          onClick={onSavePrimaryTime}
                        >
                          <CheckOutlinedIcon color={'primary'} />
                        </IconButton>
                      )}
                      <IconButton onClick={() => setOpenEditPrimaryTime(false)}>
                        <CloseIcon color={'error'} />
                      </IconButton>
                    </Stack>
                  ) : (
                    <Typography
                      variant="h6"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setOpenEditPrimaryTime(true)}
                      color="primary"
                    >
                      {durationToHours(primaryTime?.duration)}
                    </Typography>
                  )}
                </Grid>
              )}
              {!!workOrder.assignedTo.length && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {t('assigned_to')}
                  </Typography>
                  {workOrder.assignedTo.map((user, index) => (
                    <Box key={user.id}>
                      <Link
                        href={getUserUrl(user.id)}
                        variant="h6"
                        fontWeight="bold"
                      >{`${user.firstName} ${user.lastName}`}</Link>
                    </Box>
                  ))}
                </Grid>
              )}
              {!!workOrder.customers.length && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {t('customers')}
                  </Typography>
                  {workOrder.customers.map((customer, index) => (
                    <Box key={customer.id}>
                      <Link
                        href={`/app/vendors-customers/customers/${customer.id}`}
                        variant="h6"
                        fontWeight="bold"
                      >
                        {customer.name}
                      </Link>
                    </Box>
                  ))}
                </Grid>
              )}
            </Grid>
            {!!tasks.length && (
              <Box>
                <Divider sx={{ mt: 2 }} />
                <Tasks
                  tasksProps={tasks}
                  workOrderId={workOrder?.id}
                  handleZoomImage={setImageState}
                  disabled={
                    !hasEditPermission(PermissionEntity.WORK_ORDERS, workOrder)
                  }
                />
              </Box>
            )}
            <Box>
              <Divider sx={{ mt: 2 }} />
              <TimeSection
                workOrder={workOrder}
                labors={labors}
                loading={loadingLabors[workOrder.id]}
              />
            </Box>
            <Box>
              <Divider sx={{ mt: 2 }} />
              <CostSection
                workOrder={workOrder}
                additionalCosts={additionalCosts}
                loading={loadingCosts[workOrder.id]}
              />
            </Box>
            <Box>
              <Divider sx={{ mt: 2 }} />
              <Typography sx={{ mt: 2, mb: 1 }} variant="h3">
                {t('parts')}
              </Typography>
              {loadingPartQuantities[workOrder.id] ? (
                <Stack width={'100%'} alignItems={'center'}>
                  <CircularProgress />
                </Stack>
              ) : (
                <Fragment>
                  <PartQuantitiesList
                    partQuantities={partQuantities}
                    disabled={
                      !hasEditPermission(
                        PermissionEntity.WORK_ORDERS,
                        workOrder
                      )
                    }
                    onChange={debouncedPartQuantityChange}
                  />
                  {hasEditPermission(
                    PermissionEntity.WORK_ORDERS,
                    workOrder
                  ) && (
                    <SelectParts
                      selected={partQuantities.map(
                        (partQuantity) => partQuantity.part.id
                      )}
                      onChange={(selectedParts) => {
                        dispatch(
                          editWOPartQuantities(
                            workOrder.id,
                            selectedParts.map((part) => part.id)
                          )
                        ).catch((error) =>
                          showSnackBar(t('not_enough_part'), 'error')
                        );
                      }}
                    />
                  )}
                </Fragment>
              )}
            </Box>
            <Box>
              <Divider sx={{ mt: 2 }} />
              <Typography sx={{ mt: 2, mb: 1 }} variant="h3">
                {t('links')}
              </Typography>
              {loadingRelations[workOrder.id] ? (
                <Stack width={'100%'} alignItems={'center'}>
                  <CircularProgress />
                </Stack>
              ) : (
                <Fragment>
                  <List>
                    {Object.entries(
                      groupRelations(currentWorkOrderRelations)
                    ).map(
                      ([relationType, relations]) =>
                        !!relations.length && (
                          <Box key={relationType}>
                            <ListSubheader
                              sx={{ fontWeight: 'bold', fontSize: 20 }}
                            >
                              {t(relationType)}
                            </ListSubheader>
                            {relations.map((relation) => (
                              <ListItem
                                key={relation.id}
                                secondaryAction={
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      justifyContent: 'flex-end'
                                    }}
                                  >
                                    {hasEditPermission(
                                      PermissionEntity.WORK_ORDERS,
                                      workOrder
                                    ) && (
                                      <IconButton
                                        sx={{ ml: 1 }}
                                        aria-label={t('delete')}
                                        onClick={() =>
                                          setRelationToDelete(relation.id)
                                        }
                                      >
                                        <DeleteOutlinedIcon
                                          fontSize="small"
                                          color="error"
                                        />
                                      </IconButton>
                                    )}
                                  </Box>
                                }
                              >
                                <ListItemText
                                  primary={
                                    <Stack
                                      direction={'row'}
                                      spacing={1}
                                      onClick={() =>
                                        navigate(
                                          getWorkOrderUrl(relation.workOrder.id)
                                        )
                                      }
                                      sx={{ cursor: 'pointer' }}
                                    >
                                      <Typography variant="h6">
                                        {relation.workOrder.title}
                                      </Typography>
                                      <WorkOrderStatusChip
                                        status={relation.workOrder.status}
                                      />
                                    </Stack>
                                  }
                                  secondary={getFormattedDate(
                                    relation.workOrder.createdAt
                                  )}
                                />
                              </ListItem>
                            ))}
                          </Box>
                        )
                    )}
                  </List>
                  {hasEditPermission(
                    PermissionEntity.WORK_ORDERS,
                    workOrder
                  ) && (
                    <Button
                      onClick={() => setOpenLinkModal(true)}
                      variant="outlined"
                      sx={{ mt: 1 }}
                    >
                      {t('link_wo')}
                    </Button>
                  )}
                </Fragment>
              )}
            </Box>
            <Box>
              <Divider sx={{ mt: 2 }} />
              <Typography sx={{ mt: 2, mb: 1 }} variant="h3">
                {t('files')}
              </Typography>
              {!!workOrder.files.length ? (
                <FilesList
                  confirmMessage={t('confirm_delete_file_wo')}
                  removeDisabled={
                    !hasEditPermission(PermissionEntity.WORK_ORDERS, workOrder)
                  }
                  files={workOrder.files}
                  onRemove={(id: number) => {
                    dispatch(removeFileFromWorkOrder(workOrder.id, id));
                  }}
                />
              ) : (
                <Typography sx={{ color: theme.palette.text.secondary }}>
                  {t('no_file_linked_to_wo')}
                </Typography>
              )}
              {hasEditPermission(PermissionEntity.WORK_ORDERS, workOrder) && (
                <Button
                  onClick={() => setOpenAddFileModal(true)}
                  variant="outlined"
                  sx={{ mt: 1 }}
                >
                  {t('add_file')}
                </Button>
              )}
            </Box>
          </Box>
        )}
        {currentTab == 'comments' && (
          <CommentsSection
            disabled={
              !hasEditPermission(PermissionEntity.WORK_ORDERS, workOrder)
            }
            workOrderId={workOrder.id}
            commentId={commentId}
          />
        )}
      </Grid>
      <AddFileModal
        open={openAddFileModal}
        onClose={() => setOpenAddFileModal(false)}
        workOrderId={workOrder.id}
      />
      <LinkModal
        open={openLinkModal}
        onClose={() => setOpenLinkModal(false)}
        workOrderId={workOrder.id}
      />
      {isImageViewerOpen && (
        <div style={{ zIndex: 100 }}>
          <ImageViewer
            src={currentImages}
            currentIndex={currentImages.findIndex(
              (image) => image === currentImage
            )}
            onClose={() => setIsImageViewerOpen(false)}
            disableScroll={true}
            backgroundStyle={{
              backgroundColor: 'rgba(0,0,0,0.9)'
            }}
            closeOnClickOutside={true}
          />
        </div>
      )}
      <ReportConfigModal
        open={openReportConfigModal}
        onClose={() => setOpenReportConfigModal(false)}
        workOrderId={workOrder.id}
      />
      <SendReportModal
        open={openSendReportModal}
        onClose={() => setOpenSendReportModal(false)}
        workOrderId={workOrder.id}
        defaultCustomers={workOrder.customers}
      />
      <CompleteWOModal
        open={openCompleteModal}
        onClose={() => setOpenCompleteModal(false)}
        workOrder={{
          id: workOrder.id,
          identifier: workOrder.customId || String(workOrder.id),
          title: workOrder.title,
          assetName: workOrder.asset?.name
        }}
        laborEntries={labors.map((labor) => ({
          label: labor.assignedTo
            ? `${labor.assignedTo.firstName} ${labor.assignedTo.lastName}`.trim()
            : '—',
          seconds:
            (labor.duration || 0) +
            (labor.logged && labor.status === 'RUNNING' && labor.startedAt
              ? Math.max(
                  0,
                  Math.floor(
                    (Date.now() - new Date(labor.startedAt).getTime()) / 1000
                  )
                )
              : 0)
        }))}
        fieldsConfig={{
          feedback: generalPreferences.askFeedBackOnWOClosed,
          signature: workOrder.requiredSignature
        }}
        onComplete={onCompleteWO}
      />
      <ConfirmDialog
        open={openArchiveConfirm}
        onCancel={() => setOpenArchiveConfirm(false)}
        onConfirm={confirmArchive}
        confirmText={t('archive')}
        question={`${t('wo_archive_confirm')}${workOrder.title} ?`}
      />
      <ConfirmDialog
        open={Boolean(relationToDelete)}
        onCancel={() => setRelationToDelete(null)}
        onConfirm={handleDeleteRelation}
        confirmText={t('delete')}
        question={t('confirm_delete_row')}
      />
      <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu}>
        <MenuItem
          onClick={() => {
            setOpenLinkModal(true);
            handleCloseMenu();
          }}
        >
          <Stack spacing={2} direction="row">
            <LinkOutlinedIcon />
            <Typography variant="h6">{t('link')}</Typography>
          </Stack>
        </MenuItem>
        <MenuItem disabled={generatingReport} onClick={onGenerateReport}>
          <Stack spacing={2} direction="row">
            {generatingReport ? (
              <CircularProgress size="1rem" />
            ) : (
              <PictureAsPdfOutlinedIcon />
            )}
            <Typography variant="h6">{t('pdf_report')}</Typography>
          </Stack>
        </MenuItem>
        <MenuItem onClick={onEmailContractors}>
          <Stack spacing={2} direction="row">
            <EmailOutlinedIcon />
            <Typography variant="h6">{t('email_contractors')}</Typography>
          </Stack>
        </MenuItem>
        {hasCreatePermission(PermissionEntity.WORK_ORDERS) && (
          <MenuItem
            onClick={() => {
              onCopy(workOrder);
              handleCloseMenu();
            }}
          >
            <Stack spacing={2} direction="row">
              <ContentCopyOutlined />
              <Typography variant="h6">{t('copy_wo')}</Typography>
            </Stack>
          </MenuItem>
        )}
        <MenuItem onClick={onArchive}>
          <Stack spacing={2} direction="row">
            <ArchiveOutlinedIcon />
            <Typography variant="h6">{t('archive')}</Typography>
          </Stack>
        </MenuItem>
      </Menu>
    </Grid>
  );
}
