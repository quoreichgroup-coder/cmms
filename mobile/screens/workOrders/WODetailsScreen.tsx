import {
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  View
} from 'react-native';
import { useMentions } from 'react-native-controlled-mentions';
import { RootStackParamList, RootStackScreenProps } from '../../types';
import {
  Button,
  Dialog,
  Divider,
  Icon,
  IconButton,
  List,
  Portal,
  ProgressBar,
  Provider,
  Text,
  TextInput
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import Tag from '../../components/Tag';
import { getPriorityColor, getStatusColor } from '../../utils/overall';
import { PermissionEntity } from '../../models/role';
import useAuth from '../../hooks/useAuth';
import { getLabors } from '../../slices/labor';
import { useDispatch, useSelector } from '../../store';
import {
  editWOPartQuantities,
  getPartQuantitiesByWorkOrder
} from '../../slices/partQuantity';
import { getAdditionalCosts } from '../../slices/additionalCost';
import { getRelations } from '../../slices/relation';
import Relation, { relationTypes } from '../../models/relation';
import { getTasks } from '../../slices/task';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import {
  changeWorkOrderStatus,
  deleteWorkOrder,
  editWorkOrder,
  getPDFReport,
  getWorkOrderDetails,
  getWorkOrderLifecycleEvents,
  reopenWorkOrder
} from '../../slices/workOrder';
import { PlanFeature } from '../../models/subscriptionPlan';
import PartQuantities from '../../components/PartQuantities';
import AdditionalCostsCard from './components/AdditionalCostsCard';
import AdditionalTimesCard from './components/AdditionalTimesCard';
import { SheetManager } from 'react-native-actions-sheet';
import WorkOrder from '../../models/workOrder';
import { AudioPlayer } from '../../components/AudioPlayer';
import { isTaskComplete, Task } from '../../models/tasks';
import { getErrorMessage } from '../../utils/api';
import ImageView from '../../components/ImageViewer';
import { getCustomFieldValuesForDetails } from '../../models/form';
import CommentItem from '../../components/CommentItem';
import { downloadFile } from '../../utils/fileDownload';
import { getCommentsByWorkOrder, createComment } from '../../slices/comment';
import { getUsersMini } from '../../slices/user';
import { TriggersConfig } from 'react-native-controlled-mentions/dist/types/types';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createUploadFile } from '../../utils/uploadFiles';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import WorkOrderTimerFab from './components/WorkOrderTimerFab';
import { useLicenseEntitlement } from '../../hooks/useLicenseEntitlement';
import { WorkOrderLifecycleEvent } from '../../models/workOrderHistories';
import {
  canUseWorkOrderTimer,
  getPrimaryWorkOrderLabor
} from '../../utils/workOrderTimer';
import { canReopenCompletedWorkOrder } from '../../utils/workOrderLifecycle';
import {
  getWorkOrderCompletionBlockers,
  getWorkOrderCompletionLoadIssues,
  getWorkOrderCompletionNextStep
} from '../../utils/workOrderCompletion';
import { isWorkOrderTaskExecutionReadOnly } from '../../utils/workOrderTaskAccess';

const getRemainingTasksLength = (tasks: Task[]): number =>
  tasks.filter((task) => !isTaskComplete(task)).length;
const createTriggersConfig = (
  primaryColor: string
): TriggersConfig<'mention'> => ({
  mention: {
    trigger: '@',
    pattern: /(@\[[^\]]+\]\(user:[^)]+\))/g,
    isInsertSpaceAfterMention: true,
    textStyle: { fontWeight: 'bold', color: primaryColor },
    getTriggerData: (match: string) => {
      const result = match.match(/@\[(.*?)\]\(user:(.*?)\)/);
      return {
        original: match,
        trigger: '@',
        name: result?.[1] ?? '',
        id: result?.[2] ?? ''
      };
    },
    getTriggerValue: (suggestion) =>
      `@[${suggestion.name}](user:${suggestion.id})`
  }
});
export default function WODetailsScreen({
  navigation,
  route
}: RootStackScreenProps<'WODetails'>) {
  const { id, workOrderProp } = route.params;
  const { workOrderInfos } = useSelector((state) => state.workOrders);
  const workOrder = workOrderInfos[id]?.workOrder ?? workOrderProp;
  const { t } = useTranslation();
  const {
    hasEditPermission,
    user,
    companySettings,
    hasFeature,
    hasViewPermission
  } = useAuth();
  const hasTimeTrackingEntitlement = useLicenseEntitlement('TIME_TRACKING');
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { uploadFiles } = useContext(CompanySettingsContext);
  const { workOrderConfiguration, generalPreferences } = companySettings;
  const [loading, setLoading] = useState<boolean>(false);
  const reportDownloadInProgress = useRef(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [openCompleteConfirmation, setOpenCompleteConfirmation] =
    useState(false);
  const [openReopenDialog, setOpenReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);
  const reopeningRef = useRef(false);
  const [lifecycleEvents, setLifecycleEvents] = useState<
    WorkOrderLifecycleEvent[]
  >([]);
  const [lifecycleEventsLoading, setLifecycleEventsLoading] = useState(false);
  const [lifecycleEventsError, setLifecycleEventsError] = useState(false);
  const statusChangeInProgress = useRef(false);
  const [loadingWorkOrder, setLoadingWorkOrder] = useState(!workOrder);
  const [workOrderLoadError, setWorkOrderLoadError] = useState(false);
  const theme = useAppTheme();
  const triggersConfig = createTriggersConfig(theme.colors.primary);
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState<boolean>(false);
  const dispatch = useDispatch();
  const {
    partQuantitiesByWorkOrder,
    loadingPartQuantities,
    loadStatusByWorkOrder: partQuantityLoadStatusByWorkOrder
  } = useSelector((state) => state.partQuantities);
  const partQuantities = partQuantitiesByWorkOrder[id] ?? [];
  const { relationsByWorkOrder, loadingRelations } = useSelector(
    (state) => state.relations
  );
  const { tasksByWorkOrder, loadingTasks, taskLoadStatusByWorkOrder } =
    useSelector((state) => state.tasks);
  const tasks = tasksByWorkOrder[id] ?? [];
  const taskLoadStatus = taskLoadStatusByWorkOrder[id];
  const currentWorkOrderRelations = relationsByWorkOrder[id] ?? [];
  const {
    costsByWorkOrder,
    loadingCosts,
    loadStatusByWorkOrder: costLoadStatusByWorkOrder
  } = useSelector((state) => state.additionalCosts);
  const { timesByWorkOrder, loadingLabors, laborLoadStatusByWorkOrder } =
    useSelector((state) => state.labors);
  const labors = timesByWorkOrder[id] ?? [];
  const laborLoadStatus = laborLoadStatusByWorkOrder[id];
  const canUseTimer = canUseWorkOrderTimer(
    hasEditPermission(PermissionEntity.WORK_ORDERS, workOrder),
    hasFeature(PlanFeature.ADDITIONAL_TIME),
    hasTimeTrackingEntitlement
  );
  const primaryTime = getPrimaryWorkOrderLabor(labors, user.id);
  const additionalCosts = costsByWorkOrder[id] ?? [];
  const { getFormattedDate, getUserNameById, getFormattedCurrency } =
    useContext(CompanySettingsContext);
  const [isExtended, setIsExtended] = React.useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const submittingCommentRef = useRef(false);
  const [commentFiles, setCommentFiles] = useState<
    { uri: string; name: string; type: string }[]
  >([]);
  const {
    commentsByWorkOrder,
    loadingCreate,
    loadStatusByWorkOrder: commentLoadStatusByWorkOrder
  } = useSelector((state) => state.comments);
  const { usersMini } = useSelector((state) => state.users);
  const comments = commentsByWorkOrder[id] ?? [];
  const statuses = ['OPEN', 'ON_HOLD', 'IN_PROGRESS', 'COMPLETE'].map(
    (status) => ({ value: status, label: t(status) })
  );
  const [openDelete, setOpenDelete] = React.useState(false);
  const [openArchive, setOpenArchive] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);
  const deletingRef = React.useRef(false);
  const archivingRef = React.useRef(false);
  const remainingTasksLength = getRemainingTasksLength(tasks);
  const loadingDetails =
    loadingPartQuantities[id] ||
    loadingTasks[id] ||
    loadingCosts[id] ||
    loadingLabors[id] ||
    loadingRelations[id];
  const fieldsToRender: {
    label: string;
    value: string | number;
    isLink?: boolean;
  }[] = [
    {
      label: t('description'),
      value: workOrder?.description
    },
    {
      label: t('due_date'),
      value: getFormattedDate(workOrder?.dueDate)
    },
    {
      label: t('estimated_start_date'),
      value: getFormattedDate(workOrder?.estimatedStartDate)
    },
    {
      label: t('estimated_duration'),
      value: !!workOrder?.estimatedDuration
        ? t('estimated_hours_in_text', { hours: workOrder?.estimatedDuration })
        : null
    },
    {
      label: t('category'),
      value: workOrder?.category?.name
    },
    {
      label: t('created_at'),
      value: getFormattedDate(workOrder?.createdAt)
    },
    ...getCustomFieldValuesForDetails(
      workOrder?.customFieldValues,
      getFormattedDate
    )
  ];
  const touchableFields: {
    label: string;
    value: string | number;
    link: { route: keyof RootStackParamList; id: number };
    permissionEntity: PermissionEntity;
    address?: string;
  }[] = [
    {
      label: t('asset'),
      value: workOrder?.asset?.name,
      link: { route: 'AssetDetails', id: workOrder?.asset?.id },
      permissionEntity: PermissionEntity.ASSETS
    },
    {
      label: t('location'),
      value: workOrder?.location?.name,
      link: { route: 'LocationDetails', id: workOrder?.location?.id },
      permissionEntity: PermissionEntity.LOCATIONS,
      address: workOrder?.location?.address
    },
    {
      label: t('team'),
      value: workOrder?.team?.name,
      link: { route: 'TeamDetails', id: workOrder?.team?.id },
      permissionEntity: PermissionEntity.PEOPLE_AND_TEAMS
    },
    {
      label: t('primary_worker'),
      value: workOrder?.primaryUser
        ? `${workOrder.primaryUser.firstName} ${workOrder.primaryUser.lastName}`
        : null,
      link: { route: 'UserDetails', id: workOrder?.primaryUser?.id },
      permissionEntity: PermissionEntity.PEOPLE_AND_TEAMS
    }
  ];
  const loadWorkOrder = useCallback(async () => {
    setLoadingWorkOrder(true);
    setWorkOrderLoadError(false);
    try {
      await dispatch(getWorkOrderDetails(id));
    } catch (_error) {
      setWorkOrderLoadError(true);
    } finally {
      setLoadingWorkOrder(false);
    }
  }, [dispatch, id]);

  const refreshWorkOrderAfterTimerStart = useCallback(() => {
    void dispatch(getWorkOrderDetails(id)).catch((error) =>
      showSnackBar(getErrorMessage(error), 'error')
    );
  }, [dispatch, getErrorMessage, id, showSnackBar]);

  const getInfos = useCallback(
    (refreshWorkOrder = false) => {
      if (refreshWorkOrder || !workOrderProp) void loadWorkOrder();
      const requiredFields = new Set(
        workOrderConfiguration.workOrderFieldConfigurations
          .filter((field) => field.fieldType === 'REQUIRED')
          .map((field) => field.fieldName)
      );
      const needsParts = requiredFields.has('completeParts');
      const needsTime = requiredFields.has('completeTime');
      const needsCosts = requiredFields.has('completeCost');
      if (!generalPreferences.simplifiedWorkOrder || needsParts) {
        dispatch(getPartQuantitiesByWorkOrder(id));
      }
      if (!generalPreferences.simplifiedWorkOrder || needsTime) {
        dispatch(getLabors(id));
      }
      if (!generalPreferences.simplifiedWorkOrder || needsCosts) {
        dispatch(getAdditionalCosts(id));
      }
      if (!generalPreferences.simplifiedWorkOrder) {
        dispatch(getRelations(id));
      }
      dispatch(getTasks(id));
    },
    [
      dispatch,
      generalPreferences.simplifiedWorkOrder,
      id,
      loadWorkOrder,
      workOrderConfiguration.workOrderFieldConfigurations,
      workOrderProp
    ]
  );
  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        workOrder &&
        !loadingTasks[id] && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('more_options')}
            onPress={() => {
              SheetManager.show('work-order-details-sheet', {
                payload: {
                  onEdit: () =>
                    navigation.navigate('EditWorkOrder', { workOrder, tasks }),
                  onOpenArchive: () => {
                    setOpenArchive(true);
                  },
                  onDelete: () => {
                    setOpenDelete(true);
                  },
                  onGenerateReport,
                  workOrder
                }
              });
            }}
          >
            <IconButton icon="dots-vertical" accessible={false} />
          </Pressable>
        )
    });
    //LogBox.ignoreLogs(['VirtualizedLists should never be nested']);
  }, [loadingTasks, workOrder, tasks]);

  useEffect(() => {
    getInfos();
  }, [getInfos]);

  useEffect(() => {
    void dispatch(getCommentsByWorkOrder(id)).catch(() => undefined);
    dispatch(getUsersMini());
  }, [id]);

  const loadLifecycleEvents = useCallback(async () => {
    setLifecycleEventsLoading(true);
    setLifecycleEventsError(false);
    try {
      const events = await dispatch(getWorkOrderLifecycleEvents(id));
      setLifecycleEvents(events);
    } catch {
      setLifecycleEventsError(true);
    } finally {
      setLifecycleEventsLoading(false);
    }
  }, [dispatch, id]);

  useEffect(() => {
    void loadLifecycleEvents();
  }, [loadLifecycleEvents]);

  const canReopenWorkOrder = canReopenCompletedWorkOrder({
    status: workOrder?.status,
    roleType: user.role?.roleType,
    superAccountRelationCount: user.superAccountRelations?.length,
    editOtherPermissions: user.role?.editOtherPermissions
  });

  const submitReopenWorkOrder = async () => {
    if (reopeningRef.current) return;
    const reason = reopenReason.trim();
    if (!reason) {
      showSnackBar(t('work_order_reopen_reason_required'), 'error');
      return;
    }
    reopeningRef.current = true;
    setReopening(true);
    try {
      await dispatch(reopenWorkOrder(id, reason));
      setOpenReopenDialog(false);
      setReopenReason('');
      showSnackBar(t('work_order_reopen_success'), 'success');
      await loadLifecycleEvents();
    } catch (error) {
      showSnackBar(getErrorMessage(error), 'error');
    } finally {
      reopeningRef.current = false;
      setReopening(false);
    }
  };

  const actualDownload = async (uri: string): Promise<void> => {
    const rawFileName = workOrder?.title ?? `work-order-${id}`;
    const fileName = `${rawFileName.replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
    await downloadFile(uri, fileName);
  };
  const onDeleteSuccess = () => {
    showSnackBar(t('wo_delete_success'), 'success');
    navigation.goBack();
  };
  const onArchiveSuccess = () => {
    showSnackBar(t('wo_archive_success'), 'success');
    navigation.goBack();
  };
  const onArchiveFailure = (err) =>
    showSnackBar(t('wo_archive_failure'), 'error');
  const onDeleteFailure = (err) =>
    showSnackBar(t('wo_delete_failure'), 'error');

  const handleDelete = async () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await dispatch(deleteWorkOrder(id));
      setOpenDelete(false);
      onDeleteSuccess();
    } catch (err) {
      onDeleteFailure(err);
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };
  const onArchive = async () => {
    if (archivingRef.current || !workOrder) return;
    archivingRef.current = true;
    setArchiving(true);
    try {
      await dispatch(editWorkOrder(id, { ...workOrder, archived: true }));
      setOpenArchive(false);
      onArchiveSuccess();
    } catch (err) {
      onArchiveFailure(err);
    } finally {
      archivingRef.current = false;
      setArchiving(false);
    }
  };
  const onGenerateReport = async () => {
    if (reportDownloadInProgress.current) return;
    reportDownloadInProgress.current = true;
    setLoading(true);
    try {
      const uri: string = await dispatch(getPDFReport(id));
      let reportOpened = false;
      if (Platform.OS === 'ios') {
        await actualDownload(uri);
        reportOpened = true;
      } else if (Platform.OS === 'android' && Platform.Version < 29) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
          );
          if (granted === 'granted') {
            await actualDownload(uri);
            reportOpened = true;
          } else {
            Alert.alert(t('error'), t('storage_permission_needed_description'));
          }
        } catch (err) {
          showSnackBar(getErrorMessage(err), 'error');
        }
      } else {
        await actualDownload(uri);
        reportOpened = true;
      }
      if (reportOpened) {
        showSnackBar(t('wo_report_download_success'), 'success');
      }
    } catch (err) {
      showSnackBar(getErrorMessage(err), 'error');
    } finally {
      reportDownloadInProgress.current = false;
      setLoading(false);
    }
  };
  const canComplete = (): boolean => {
    const loadIssues = getWorkOrderCompletionLoadIssues(
      workOrderConfiguration.workOrderFieldConfigurations,
      {
        workOrder: workOrderLoadError
          ? 'error'
          : loadingWorkOrder
          ? 'loading'
          : workOrder
          ? 'success'
          : 'idle',
        comments: commentLoadStatusByWorkOrder[id],
        tasks: taskLoadStatus,
        labor: laborLoadStatus,
        parts: partQuantityLoadStatusByWorkOrder[id],
        costs: costLoadStatusByWorkOrder[id]
      }
    );
    if (loadIssues.length > 0) {
      const hasLoadError = loadIssues.some((issue) => issue.status === 'error');
      showSnackBar(
        t(
          hasLoadError
            ? 'work_order_completion_data_load_error'
            : 'work_order_completion_data_loading'
        ),
        'error'
      );
      return false;
    }

    const fieldsToTest = [
      {
        fieldName: 'completeFiles',
        isMissing:
          (workOrder?.files.length || 0) +
            comments.filter((comment) => comment.files.length).length ===
          0,
        message: 'required_files_on_completion'
      },
      {
        fieldName: 'completeTasks',
        isMissing: tasks.some((task) => !isTaskComplete(task)),
        message: 'required_tasks_on_completion'
      },
      {
        fieldName: 'completeTime',
        isMissing: labors.filter((labor) => labor.duration > 0).length === 0,
        message: 'required_labor_on_completion'
      },
      {
        fieldName: 'completeParts',
        isMissing: !partQuantities.length,
        message: 'required_part_on_completion'
      },
      {
        fieldName: 'completeCost',
        isMissing: !additionalCosts.length,
        message: 'required_cost_on_completion'
      }
    ];
    const blockers = getWorkOrderCompletionBlockers(
      workOrderConfiguration.workOrderFieldConfigurations,
      fieldsToTest
    );
    if (blockers.length > 0) {
      showSnackBar(blockers.map((message) => t(message)).join('\n'), 'error');
      return false;
    }
    return true;
  };
  const retryFailedCompletionData = () => {
    const failedSources = new Set(
      getWorkOrderCompletionLoadIssues(
        workOrderConfiguration.workOrderFieldConfigurations,
        {
          workOrder: workOrderLoadError
            ? 'error'
            : loadingWorkOrder
            ? 'loading'
            : workOrder
            ? 'success'
            : 'idle',
          comments: commentLoadStatusByWorkOrder[id],
          tasks: taskLoadStatus,
          labor: laborLoadStatus,
          parts: partQuantityLoadStatusByWorkOrder[id],
          costs: costLoadStatusByWorkOrder[id]
        }
      )
        .filter((issue) => issue.status === 'error')
        .map((issue) => issue.source)
    );

    if (failedSources.has('workOrder')) void loadWorkOrder();
    if (failedSources.has('comments'))
      void dispatch(getCommentsByWorkOrder(id)).catch(() => undefined);
    if (failedSources.has('tasks')) void dispatch(getTasks(id));
    if (failedSources.has('labor')) void dispatch(getLabors(id));
    if (failedSources.has('parts'))
      void dispatch(getPartQuantitiesByWorkOrder(id));
    if (failedSources.has('costs')) void dispatch(getAdditionalCosts(id));
  };
  const onScroll = ({ nativeEvent }) => {
    const currentScrollPosition =
      Math.floor(nativeEvent?.contentOffset?.y) ?? 0;

    setIsExtended(currentScrollPosition <= 0);
  };
  const submitWorkOrderStatus = useCallback(
    async (
      status: string,
      extra?: { feedback?: string | null; signature?: string }
    ) => {
      if (statusChangeInProgress.current) return false;

      statusChangeInProgress.current = true;
      setUpdatingStatus(true);
      try {
        await dispatch(
          changeWorkOrderStatus(id, {
            status,
            ...(extra ?? {})
          })
        );
        return true;
      } finally {
        statusChangeInProgress.current = false;
        setUpdatingStatus(false);
      }
    },
    [dispatch, id]
  );

  const onCompleteWO = async (
    signature: string | undefined,
    feedback: string | undefined
  ): Promise<boolean> => {
    const completed = await submitWorkOrderStatus('COMPLETE', {
      feedback: feedback ?? null,
      signature
    });
    if (completed) {
      showSnackBar(t('wo_complete_success'), 'success');
      navigation.navigate('Root');
    }
    return completed;
  };
  const onStatusChange = (status: string) => {
    if (status === 'COMPLETE') {
      if (!canComplete()) return;
      const completionStep = getWorkOrderCompletionNextStep({
        feedbackRequired: generalPreferences.askFeedBackOnWOClosed,
        signatureRequired: Boolean(workOrder?.requiredSignature),
        signatureFeatureEnabled: hasFeature(PlanFeature.SIGNATURE)
      });
      if (completionStep === 'blocked') {
        showSnackBar(t('signature_required_feature_unavailable'), 'error');
        return;
      }
      navigation.navigate('CompleteWorkOrder', {
        onComplete: onCompleteWO,
        workOrderContext: {
          id: workOrder.id,
          identifier: workOrder.customId || String(workOrder.id),
          title: workOrder.title,
          assetName: workOrder.asset?.name,
          laborEntries: labors.map((labor) => ({
            label: labor.assignedTo
              ? `${labor.assignedTo.firstName} ${labor.assignedTo.lastName}`.trim()
              : '—',
            seconds:
              (labor.duration || 0) +
              (labor.status === 'RUNNING' && labor.startedAt
                ? Math.max(
                    0,
                    Math.floor(
                      (Date.now() - new Date(labor.startedAt).getTime()) / 1000
                    )
                  )
                : 0)
          }))
        },
        fieldsConfig: {
          feedback: generalPreferences.askFeedBackOnWOClosed,
          signature: workOrder?.requiredSignature
        }
      });
      return;
    }
    void submitWorkOrderStatus(status).catch((err) =>
      showSnackBar(getErrorMessage(err), 'error')
    );
  };
  const confirmCompleteWorkOrder = async () => {
    try {
      const completed = await submitWorkOrderStatus('COMPLETE');
      if (completed) {
        setOpenCompleteConfirmation(false);
        showSnackBar(t('wo_complete_success'), 'success');
      }
    } catch (err) {
      showSnackBar(getErrorMessage(err), 'error');
    }
  };
  const renderReopenDialog = () => (
    <Portal>
      <Dialog
        visible={openReopenDialog}
        onDismiss={() => {
          if (!reopening) setOpenReopenDialog(false);
        }}
      >
        <Dialog.Title>{t('work_order_reopen_title')}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
            {t('work_order_reopen_description')}
          </Text>
          <TextInput
            mode="outlined"
            label={t('work_order_reopen_reason')}
            value={reopenReason}
            onChangeText={setReopenReason}
            multiline
            maxLength={1000}
            disabled={reopening}
            accessibilityLabel={t('work_order_reopen_reason')}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            disabled={reopening}
            onPress={() => setOpenReopenDialog(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            mode="contained"
            loading={reopening}
            disabled={reopening || !reopenReason.trim()}
            accessibilityState={{
              disabled: reopening || !reopenReason.trim(),
              busy: reopening
            }}
            onPress={() => void submitReopenWorkOrder()}
          >
            {t('work_order_reopen_action')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderLifecycleEvents = () => {
    if (
      !lifecycleEventsLoading &&
      !lifecycleEventsError &&
      lifecycleEvents.length === 0
    ) {
      return null;
    }
    return (
      <View style={[surfaceCardStyle, { marginTop: 16 }]}>
        <Text
          variant="titleMedium"
          style={{ marginBottom: 8 }}
          accessibilityRole="header"
        >
          {t('work_order_lifecycle_history')}
        </Text>
        {lifecycleEventsError ? (
          <AsyncStateFeedback
            mode="banner"
            message={t('work_order_lifecycle_history_error')}
            onRetry={() => void loadLifecycleEvents()}
          />
        ) : lifecycleEventsLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          lifecycleEvents.map((event) => (
            <List.Item
              key={event.id}
              title={t('work_order_lifecycle_transition', {
                from: t(event.previousStatus),
                to: t(event.newStatus)
              })}
              description={`${getFormattedDate(event.occurredAt)} · ${
                event.actorName
              }${event.reason ? `\n${event.reason}` : ''}`}
              descriptionNumberOfLines={4}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={
                    event.newStatus === 'OPEN'
                      ? 'lock-open'
                      : 'check-circle-outline'
                  }
                />
              )}
            />
          ))
        )}
      </View>
    );
  };
  const groupRelations = (
    relations: Relation[]
  ): { [key: string]: { id: number; workOrder: WorkOrder }[] } => {
    const isParent = (relation: Relation): boolean => {
      return relation.parent.id === workOrder.id;
    };
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

  const { textInputProps, triggers } = useMentions({
    value: commentContent,
    onChange: setCommentContent,
    triggersConfig
  });

  const mentionKeyword = triggers?.mention?.keyword ?? null;
  const filteredUsers = (
    mentionKeyword
      ? usersMini.filter((user) =>
          `${user.firstName} ${user.lastName}`
            .toLowerCase()
            .includes(mentionKeyword.toLowerCase())
        )
      : usersMini
  ).map((user) => ({
    id: user.id.toString(),
    name: `${user.firstName} ${user.lastName}`
  }));

  const handleCommentSubmit = async () => {
    const content = commentContent.trim();
    if (!content || submittingCommentRef.current) return;

    submittingCommentRef.current = true;
    setSubmittingComment(true);
    try {
      let fileIds: { id: number }[] = [];
      if (commentFiles.length > 0) {
        const uploadedFiles = await uploadFiles(commentFiles, [], false);
        fileIds = uploadedFiles.map((f) => ({ id: f.id }));
      }
      await dispatch(
        createComment({
          workOrder: { id },
          content,
          files: fileIds
        })
      );
      setCommentContent('');
      setCommentFiles([]);
      showSnackBar(t('comment_posted'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error), 'error');
    } finally {
      submittingCommentRef.current = false;
      setSubmittingComment(false);
    }
  };

  const pickCommentFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true
      });
      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map((asset) => createUploadFile(asset));
        setCommentFiles([...commentFiles, ...newFiles]);
      }
    } catch (error) {
      showSnackBar(getErrorMessage(error), 'error');
    }
  };

  const removeCommentFile = (index: number) => {
    setCommentFiles(commentFiles.filter((_, i) => i !== index));
  };

  function ObjectField({
    label,
    value,
    link,
    permissionEntity,
    address
  }: {
    label: string;
    value: string | number;
    link: { route: keyof RootStackParamList; id: number };
    permissionEntity: PermissionEntity;
    address?: string;
  }) {
    if (value) {
      const openMaps = () => {
        if (address) {
          const encodedAddress = encodeURIComponent(address);
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

          Linking.openURL(googleMapsUrl).catch((err) => {
            showSnackBar(getErrorMessage(err), 'error');
          });
        }
      };

      const isLocation = label === t('location');

      return (
        <TouchableOpacity
          // @ts-ignore
          disabled={!hasViewPermission(permissionEntity)}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value}`}
          onPress={() => {
            // @ts-ignore
            navigation.navigate(link.route, { id: link.id });
          }}
          style={{ marginTop: 20 }}
        >
          <Text style={{ fontSize: 14, color: theme.colors.onSurfaceVariant }}>
            {label}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                {value}
              </Text>
              {isLocation && address && (
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 4
                  }}
                >
                  {address}
                </Text>
              )}
            </View>
            {isLocation && address && (
              <IconButton
                icon="directions"
                size={24}
                iconColor={theme.colors.primary}
                accessibilityLabel={t('open_in_maps')}
                onPress={(e) => {
                  e.stopPropagation();
                  openMaps();
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      );
    } else return null;
  }

  function BasicField({
    label,
    value,
    isLink
  }: {
    label: string;
    value: string | number;
    isLink?: boolean;
  }) {
    if (!value) return null;

    const handlePress = () => {
      if (isLink) {
        const href = value.toString().startsWith('http')
          ? value.toString()
          : `https://${value}`;
        Linking.openURL(href).catch((err) =>
          console.error('Failed to open link:', err)
        );
      }
    };

    return (
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 14, color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
        {isLink ? (
          <TouchableOpacity
            onPress={handlePress}
            accessibilityRole="link"
            accessibilityLabel={`${label}: ${value}`}
          >
            <Text
              variant="titleMedium"
              style={{ fontWeight: 'bold', color: theme.colors.primary }}
            >
              {value}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            {value}
          </Text>
        )}
      </View>
    );
  }

  const renderConfirmArchive = () => {
    return (
      <Portal>
        <Dialog
          visible={openArchive}
          onDismiss={() => {
            if (!archiving) setOpenArchive(false);
          }}
        >
          <Dialog.Title>{t('confirmation')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {t('wo_archive_confirm') + workOrder.title + ' ?'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={archiving} onPress={() => setOpenArchive(false)}>
              {t('cancel')}
            </Button>
            <Button
              loading={archiving}
              disabled={archiving}
              accessibilityState={{ disabled: archiving, busy: archiving }}
              onPress={onArchive}
            >
              {t('archive')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };
  const renderConfirmComplete = () => (
    <Portal>
      <Dialog
        visible={openCompleteConfirmation}
        onDismiss={() => {
          if (!updatingStatus) setOpenCompleteConfirmation(false);
        }}
      >
        <Dialog.Title>{t('confirmation')}</Dialog.Title>
        <Dialog.Content>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {`${t('work_order')} · ${workOrder.customId || workOrder.id}`}
          </Text>
          <Text variant="titleSmall" style={{ marginTop: 4 }}>
            {workOrder.title}
          </Text>
          {workOrder.asset?.name ? (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
            >
              {`${t('asset_name')}: ${workOrder.asset.name}`}
            </Text>
          ) : null}
          <Text variant="bodyMedium" style={{ marginTop: 12 }}>
            {t('complete_work_order_confirm', { title: workOrder.title })}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}
          >
            {t('work_order_completion_read_only_notice')}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            disabled={updatingStatus}
            onPress={() => setOpenCompleteConfirmation(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            mode="contained"
            loading={updatingStatus}
            disabled={updatingStatus}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            accessibilityState={{
              disabled: updatingStatus,
              busy: updatingStatus
            }}
            onPress={() => void confirmCompleteWorkOrder()}
          >
            {t('complete_work_order')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
  const renderConfirmDelete = () => {
    return (
      <Portal>
        <Dialog
          visible={openDelete}
          onDismiss={() => {
            if (!deleting) setOpenDelete(false);
          }}
        >
          <Dialog.Title>{t('confirmation')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('confirm_delete_wo')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={deleting} onPress={() => setOpenDelete(false)}>
              {t('cancel')}
            </Button>
            <Button
              loading={deleting}
              disabled={deleting}
              accessibilityState={{ disabled: deleting, busy: deleting }}
              onPress={handleDelete}
            >
              {t('to_delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };
  const statusColor = workOrder
    ? getStatusColor(workOrder.status, theme)
    : null;
  const surfaceCardStyle = [
    styles.shadowedCard,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      shadowColor: theme.colors.shadow
    }
  ];
  if (workOrder)
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Provider theme={theme}>
          {renderConfirmDelete()}
          {renderConfirmArchive()}
          {renderConfirmComplete()}
          {renderReopenDialog()}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
            style={styles.container}
          >
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'none'
              }
              keyboardShouldPersistTaps="handled"
              onScroll={onScroll}
              style={{
                paddingHorizontal: 20
              }}
              refreshControl={
                <RefreshControl
                  refreshing={loading || loadingDetails || loadingWorkOrder}
                  onRefresh={() => getInfos(true)}
                />
              }
            >
              {taskLoadStatus === 'error' && (
                <AsyncStateFeedback
                  mode="banner"
                  message={t('work_order_tasks_load_error')}
                  onRetry={() => dispatch(getTasks(id))}
                />
              )}
              {workOrderLoadError && (
                <AsyncStateFeedback
                  mode="banner"
                  message={t('work_order_details_load_error')}
                  onRetry={() => void loadWorkOrder()}
                />
              )}
              <View
                style={[
                  styles.identityCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant
                  }
                ]}
              >
                <Text style={styles.workOrderTitle} variant="headlineSmall">
                  {workOrder.title}
                </Text>
                <View style={styles.identityMeta}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      marginRight: 10,
                      color: theme.colors.onSurfaceVariant
                    }}
                  >{`#${workOrder.customId || workOrder.id}`}</Text>
                  {workOrder.priority !== 'NONE' && (
                    <Tag
                      text={t('priority_label', {
                        priority: t(workOrder.priority)
                      })}
                      color={getPriorityColor(workOrder.priority, theme)}
                      backgroundColor={'transparent'}
                    />
                  )}
                </View>
                {workOrder.image && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('view_work_order_image')}
                    onPress={() => setIsImageViewerOpen(true)}
                  >
                    <Image
                      style={{ height: 200, marginTop: 20 }}
                      source={{ uri: workOrder.image.url }}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ marginTop: 20 }}>
                <TouchableOpacity
                  disabled={
                    updatingStatus ||
                    workOrder.status === 'COMPLETE' ||
                    !hasEditPermission(PermissionEntity.WORK_ORDERS, workOrder)
                  }
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled:
                      updatingStatus ||
                      workOrder.status === 'COMPLETE' ||
                      !hasEditPermission(
                        PermissionEntity.WORK_ORDERS,
                        workOrder
                      ),
                    busy: updatingStatus
                  }}
                  accessibilityLabel={`${t('status')}: ${
                    statuses.find((s) => s.value === workOrder.status)?.label
                  }`}
                  style={[
                    styles.statusSelector,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: statusColor
                    }
                  ]}
                  onPress={() =>
                    SheetManager.show('dropdown-sheet', {
                      payload: {
                        items: statuses,
                        value: workOrder.status,
                        setValue: (value: string) => {
                          if (workOrder.status !== value) onStatusChange(value);
                        }
                      }
                    })
                  }
                >
                  <Text style={{ color: statusColor }}>
                    {statuses.find((s) => s.value === workOrder.status)?.label}
                  </Text>
                  {updatingStatus ? (
                    <ActivityIndicator
                      size="small"
                      color={statusColor}
                      style={{ marginHorizontal: 8 }}
                    />
                  ) : (
                    <View
                      accessible={false}
                      importantForAccessibility="no"
                      style={{ marginHorizontal: 8 }}
                    >
                      <Icon source="menu-down" size={24} color={statusColor} />
                    </View>
                  )}
                </TouchableOpacity>
                {canReopenWorkOrder && (
                  <Button
                    mode="outlined"
                    icon="lock-open-variant"
                    style={{ marginTop: 10 }}
                    disabled={reopening}
                    accessibilityState={{ disabled: reopening }}
                    onPress={() => setOpenReopenDialog(true)}
                  >
                    {t('work_order_reopen_action')}
                  </Button>
                )}
                {renderLifecycleEvents()}
                {getWorkOrderCompletionLoadIssues(
                  workOrderConfiguration.workOrderFieldConfigurations,
                  {
                    workOrder: workOrderLoadError
                      ? 'error'
                      : loadingWorkOrder
                      ? 'loading'
                      : workOrder
                      ? 'success'
                      : 'idle',
                    comments: commentLoadStatusByWorkOrder[id],
                    tasks: taskLoadStatus,
                    labor: laborLoadStatus,
                    parts: partQuantityLoadStatusByWorkOrder[id],
                    costs: costLoadStatusByWorkOrder[id]
                  }
                ).some((issue) => issue.status === 'error') && (
                  <AsyncStateFeedback
                    mode="banner"
                    message={t('work_order_completion_data_load_error')}
                    onRetry={retryFailedCompletionData}
                  />
                )}
                {workOrder.audioDescription && (
                  <View style={[surfaceCardStyle, styles.audioCard]}>
                    <Text
                      variant="titleMedium"
                      style={styles.sectionTitle}
                      accessibilityRole="header"
                    >
                      {t('audio_description')}
                    </Text>
                    <AudioPlayer url={workOrder.audioDescription.url} />
                  </View>
                )}
                {fieldsToRender.map(
                  ({ label, value, isLink }, index) =>
                    value && (
                      <BasicField
                        key={label}
                        label={label}
                        value={value}
                        isLink={isLink}
                      />
                    )
                )}
                {touchableFields.map(
                  ({ label, value, link, permissionEntity }) =>
                    value && (
                      <ObjectField
                        key={label}
                        label={label}
                        value={value}
                        link={link}
                        permissionEntity={permissionEntity}
                        address={workOrder?.location?.address}
                      />
                    )
                )}
                {(workOrder.parentRequest || workOrder.createdBy) && (
                  <ObjectField
                    label={
                      workOrder.parentRequest
                        ? t('approved_by')
                        : t('created_by')
                    }
                    value={getUserNameById(workOrder.createdBy)}
                    link={{ route: 'UserDetails', id: workOrder.createdBy }}
                    permissionEntity={PermissionEntity.PEOPLE_AND_TEAMS}
                  />
                )}
                {workOrder.status === 'COMPLETE' && (
                  <View>
                    {workOrder.completedBy && (
                      <ObjectField
                        label={t('completed_by')}
                        value={`${workOrder.completedBy.firstName} ${workOrder.completedBy.lastName}`}
                        link={{
                          route: 'UserDetails',
                          id: workOrder.completedBy.id
                        }}
                        permissionEntity={PermissionEntity.PEOPLE_AND_TEAMS}
                      />
                    )}
                    <BasicField
                      label={t('completed_on')}
                      value={getFormattedDate(workOrder.completedOn)}
                    />
                    {workOrder.feedback && (
                      <BasicField
                        label={t('feedback')}
                        value={workOrder.feedback}
                      />
                    )}
                    {workOrder.signature && (
                      <View style={{ marginTop: 20 }}>
                        <Divider style={{ marginBottom: 20 }} />
                        <Text
                          variant="titleMedium"
                          style={{ fontWeight: 'bold' }}
                        >
                          {t('signature')}
                        </Text>
                        <Image
                          source={{ uri: workOrder.signature }}
                          style={{ height: 200 }}
                        />
                      </View>
                    )}
                  </View>
                )}
                {workOrder.parentRequest && (
                  <ObjectField
                    label={t('requested_by')}
                    value={getUserNameById(workOrder.parentRequest.createdBy)}
                    link={{
                      route: 'RequestDetails',
                      id: workOrder.parentRequest.id
                    }}
                    permissionEntity={PermissionEntity.PEOPLE_AND_TEAMS}
                  />
                )}
                {(workOrder.assignedTo.length > 0 ||
                  workOrder.customers.length > 0) && (
                  <View style={{ marginTop: 20 }}>
                    {workOrder.assignedTo.length > 0 && (
                      <View>
                        <Text
                          style={{
                            fontSize: 14,
                            color: theme.colors.onSurfaceVariant
                          }}
                        >
                          {t('assigned_to')}
                        </Text>
                        {workOrder.assignedTo.map((user) => (
                          <Text
                            key={user.id}
                            variant="bodyLarge"
                            style={{ marginTop: 10 }}
                          >{`${user.firstName} ${user.lastName}`}</Text>
                        ))}
                      </View>
                    )}
                    {workOrder.customers.length > 0 && (
                      <View style={{ marginTop: 14 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            color: theme.colors.onSurfaceVariant
                          }}
                        >
                          {t('assigned_customers')}
                        </Text>
                        {workOrder.customers.map((customer) => (
                          <Text
                            key={customer.id}
                            variant="bodyLarge"
                            style={{ marginTop: 10 }}
                          >
                            {customer.name}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}
                {!generalPreferences.simplifiedWorkOrder && (
                  <View>
                    <View style={surfaceCardStyle}>
                      <Text
                        style={{
                          marginBottom: 10,
                          color: theme.colors.onSurfaceVariant
                        }}
                      >
                        {t('parts')}
                      </Text>
                      {partQuantityLoadStatusByWorkOrder[id] === 'error' ? (
                        <AsyncStateFeedback
                          mode="banner"
                          message={t('parts_load_error')}
                          onRetry={() =>
                            void dispatch(getPartQuantitiesByWorkOrder(id))
                          }
                        />
                      ) : loadingPartQuantities[id] ? (
                        <View
                          style={{ alignItems: 'center', paddingVertical: 16 }}
                          accessibilityRole="progressbar"
                          accessibilityLabel={t('loading')}
                        >
                          <ActivityIndicator color={theme.colors.primary} />
                          <Text
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            {t('loading')}
                          </Text>
                        </View>
                      ) : (
                        <PartQuantities
                          partQuantities={partQuantities}
                          isPO={false}
                          navigation={navigation}
                          rootId={id}
                          disabled={
                            !hasEditPermission(
                              PermissionEntity.WORK_ORDERS,
                              workOrder
                            )
                          }
                        />
                      )}
                      {hasEditPermission(
                        PermissionEntity.WORK_ORDERS,
                        workOrder
                      ) && (
                        <Fragment>
                          <Divider style={{ marginTop: 5 }} />
                          <Button
                            disabled={
                              loadingPartQuantities[id] ||
                              partQuantityLoadStatusByWorkOrder[id] !==
                                'success'
                            }
                            onPress={() =>
                              navigation.navigate('SelectParts', {
                                onChange: (selectedParts) => {
                                  // throw new Error('nuuur');
                                  dispatch(
                                    editWOPartQuantities(
                                      id,
                                      selectedParts.map((part) => part.id)
                                    )
                                  ).catch((error) =>
                                    showSnackBar(t('not_enough_part'), 'error')
                                  );
                                },
                                selected: partQuantities.map(
                                  (partQuantity) => partQuantity.part.id
                                )
                              })
                            }
                          >
                            {t('add_parts')}
                          </Button>
                        </Fragment>
                      )}
                    </View>
                    <AdditionalCostsCard
                      additionalCosts={additionalCosts}
                      workOrder={workOrder}
                      workOrderId={id}
                      hasEditPermission={hasEditPermission}
                      hasFeature={hasFeature}
                      getFormattedCurrency={getFormattedCurrency}
                      navigation={navigation}
                      loading={Boolean(loadingCosts[id])}
                      loadError={costLoadStatusByWorkOrder[id] === 'error'}
                      onRetry={() => void dispatch(getAdditionalCosts(id))}
                    />
                  </View>
                )}
                {!!tasks.length && (
                  <View style={surfaceCardStyle}>
                    <Text
                      style={{
                        marginBottom: 10,
                        color: theme.colors.onSurfaceVariant
                      }}
                    >
                      {t('tasks')}
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`${t('remaining_tasks', {
                        count: remainingTasksLength
                      })}, ${t('complete_tasks_percent', {
                        percent: (
                          ((tasks.length - remainingTasksLength) * 100) /
                          tasks.length
                        ).toFixed(0)
                      })}`}
                      onPress={() =>
                        navigation.navigate('Tasks', {
                          workOrderId: id,
                          tasksProps: tasks,
                          isReadOnly: isWorkOrderTaskExecutionReadOnly(
                            workOrder,
                            hasEditPermission(
                              PermissionEntity.WORK_ORDERS,
                              workOrder
                            )
                          )
                        })
                      }
                    >
                      <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                        {' '}
                        {t('remaining_tasks', {
                          count: remainingTasksLength
                        })}
                      </Text>
                      <Text variant="bodyMedium">
                        {t('complete_tasks_percent', {
                          percent: (
                            ((tasks.length - remainingTasksLength) * 100) /
                            tasks.length
                          ).toFixed(0)
                        })}
                      </Text>
                      <Divider style={{ marginTop: 5 }} />
                      <ProgressBar
                        progress={
                          (tasks.length - remainingTasksLength) / tasks.length
                        }
                      />
                    </TouchableOpacity>
                  </View>
                )}
                {!generalPreferences.simplifiedWorkOrder && (
                  <View>
                    {!!workOrder.files.length && (
                      <View style={surfaceCardStyle}>
                        <Text
                          style={{
                            marginBottom: 10,
                            color: theme.colors.onSurfaceVariant
                          }}
                        >
                          {t('files')}
                        </Text>
                        {workOrder.files.map((file) => (
                          <List.Item
                            key={file.id}
                            titleStyle={{ color: theme.colors.primary }}
                            title={file.name}
                            onPress={() => {
                              Linking.openURL(file.url);
                            }}
                          />
                        ))}
                      </View>
                    )}
                    {!!currentWorkOrderRelations.length && (
                      <View style={surfaceCardStyle}>
                        <Text
                          style={{
                            marginBottom: 10,
                            color: theme.colors.onSurfaceVariant
                          }}
                        >
                          {t('links')}
                        </Text>
                        {Object.entries(
                          groupRelations(currentWorkOrderRelations)
                        ).map(
                          ([relationType, relations]) =>
                            !!relations.length && (
                              <View>
                                <Text style={{ fontWeight: 'bold' }}>
                                  {t(relationType)}
                                </Text>
                                {relations.map((relation) => (
                                  <List.Item
                                    title={relation.workOrder.title}
                                    onPress={() =>
                                      navigation.push('WODetails', {
                                        id: relation.workOrder.id
                                      })
                                    }
                                    description={getFormattedDate(
                                      relation.workOrder.createdAt
                                    )}
                                  />
                                ))}
                              </View>
                            )
                        )}
                      </View>
                    )}
                    {laborLoadStatus === 'error' ? (
                      <AsyncStateFeedback
                        mode="banner"
                        message={t('labor_load_error')}
                        onRetry={() => dispatch(getLabors(id))}
                      />
                    ) : laborLoadStatus === 'success' ? (
                      <AdditionalTimesCard
                        labors={labors}
                        workOrder={workOrder}
                        navigation={navigation}
                      />
                    ) : (
                      <View
                        style={{ paddingVertical: 20 }}
                        accessibilityRole="progressbar"
                        accessibilityLabel={t('loading')}
                      >
                        <ActivityIndicator color={theme.colors.primary} />
                        <Text
                          style={{
                            textAlign: 'center',
                            marginTop: 8,
                            color: theme.colors.onSurfaceVariant
                          }}
                        >
                          {t('loading')}
                        </Text>
                      </View>
                    )}
                    <View style={surfaceCardStyle}>
                      <Text
                        style={{
                          marginBottom: 10,
                          color: theme.colors.onSurfaceVariant
                        }}
                      >
                        {t('comments')}
                      </Text>
                      {commentLoadStatusByWorkOrder[id] === 'error' ? (
                        <AsyncStateFeedback
                          mode="banner"
                          message={t('comments_load_error')}
                          onRetry={() =>
                            void dispatch(getCommentsByWorkOrder(id)).catch(
                              () => undefined
                            )
                          }
                        />
                      ) : commentLoadStatusByWorkOrder[id] === 'loading' ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.primary}
                        />
                      ) : comments.length === 0 ? (
                        <Text
                          style={{
                            textAlign: 'center',
                            padding: 20,
                            color: theme.colors.onSurfaceVariant
                          }}
                        >
                          {t('no_comments')}
                        </Text>
                      ) : (
                        comments.map((comment) => (
                          <CommentItem
                            key={comment.id}
                            comment={comment}
                            workOrderId={id}
                            users={usersMini.map((u) => ({
                              id: u.id.toString(),
                              name: `${u.firstName} ${u.lastName}`
                            }))}
                          />
                        ))
                      )}
                      {hasEditPermission(
                        PermissionEntity.WORK_ORDERS,
                        workOrder
                      ) && (
                        <View style={{ marginTop: 10 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center'
                            }}
                          >
                            <View
                              style={{
                                flex: 1,
                                marginBottom: 8,
                                marginRight: 8
                              }}
                            >
                              {mentionKeyword && filteredUsers.length > 0 && (
                                <View
                                  style={{
                                    backgroundColor: theme.colors.surface,
                                    borderColor: theme.colors.outlineVariant,
                                    borderWidth: 1,
                                    borderRadius:
                                      qpmLayoutTokens.radius.control,
                                    elevation: 5,
                                    shadowColor: theme.colors.shadow,
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.2,
                                    marginBottom: 8,
                                    maxHeight: 200,
                                    overflow: 'hidden'
                                  }}
                                >
                                  {filteredUsers.map((item) => (
                                    <Pressable
                                      key={item.id}
                                      onPress={() => {
                                        triggers?.mention?.onSelect?.({
                                          id: item.id,
                                          name: item.name
                                        });
                                      }}
                                      style={{
                                        padding: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor:
                                          theme.colors.outlineVariant
                                      }}
                                    >
                                      <Text>{item.name}</Text>
                                    </Pressable>
                                  ))}
                                </View>
                              )}
                              <RNTextInput
                                multiline
                                numberOfLines={3}
                                onFocus={() => {
                                  setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({
                                      animated: true
                                    });
                                  }, 100);
                                }}
                                placeholder={t('add_comment_placeholder')}
                                style={{ flex: 1 }}
                                {...textInputProps}
                                editable={!submittingComment}
                              />
                            </View>
                            <IconButton
                              icon="paperclip"
                              accessibilityLabel={t('add_file')}
                              onPress={pickCommentFile}
                              disabled={submittingComment}
                              style={{ marginBottom: 8 }}
                            />
                          </View>
                          {commentFiles.length > 0 && (
                            <View style={{ marginBottom: 8 }}>
                              {commentFiles.map((file, index) => (
                                <View
                                  key={index}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    backgroundColor: theme.colors.background,
                                    borderRadius:
                                      qpmLayoutTokens.radius.control,
                                    paddingHorizontal: 8,
                                    marginBottom: 4
                                  }}
                                >
                                  <Text
                                    style={{ flex: 1, minWidth: 0 }}
                                    numberOfLines={2}
                                  >
                                    {file.name}
                                  </Text>
                                  <IconButton
                                    icon="close-circle"
                                    size={16}
                                    accessibilityLabel={`${t(
                                      'remove_attachment'
                                    )}: ${file.name}`}
                                    disabled={submittingComment}
                                    onPress={() => removeCommentFile(index)}
                                  />
                                </View>
                              ))}
                            </View>
                          )}
                          <Button
                            mode="contained"
                            onPress={handleCommentSubmit}
                            disabled={
                              !commentContent.trim() ||
                              loadingCreate ||
                              submittingComment
                            }
                            loading={loadingCreate || submittingComment}
                          >
                            {t('post_comment')}
                          </Button>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
          {!generalPreferences.simplifiedWorkOrder && canUseTimer && (
            <WorkOrderTimerFab
              labor={primaryTime}
              workOrderId={id}
              isExtended={isExtended}
              canControl={laborLoadStatus === 'success'}
              isLoading={!laborLoadStatus || laborLoadStatus === 'loading'}
              onTimerStarted={refreshWorkOrderAfterTimerStart}
            />
          )}
          {workOrder.image && (
            <ImageView
              images={[{ uri: workOrder.image.url }]}
              imageIndex={0}
              visible={isImageViewerOpen}
              onRequestClose={() => setIsImageViewerOpen(false)}
            />
          )}
        </Provider>
      </View>
    );
  else if (loadingWorkOrder)
    return <AsyncStateFeedback mode="loading" message={t('please_wait')} />;
  else
    return (
      <AsyncStateFeedback
        mode="error"
        message={t('work_order_details_load_error')}
        onRetry={() => void loadWorkOrder()}
      />
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%'
  },
  row: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
  identityCard: {
    marginTop: 8,
    padding: 16,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  },
  workOrderTitle: { fontWeight: '700', lineHeight: 32 },
  identityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 7
  },
  statusSelector: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 8,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.control
  },
  shadowedCard: {
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    marginVertical: 10,
    marginHorizontal: 5,
    elevation: 1
  },
  audioCard: { marginTop: 14 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 }
});
