import { logSafeError } from '../../utils/safeErrorLog';
import {
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import * as React from 'react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from '../../store';
import { RootStackParamList, RootStackScreenProps } from '../../types';
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  IconButton,
  Portal,
  RadioButton,
  Text,
  TextInput
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import {
  approveRequest,
  cancelRequest,
  deleteRequest,
  getRequestDetails
} from '../../slices/request';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { PermissionEntity } from '../../models/role';
import useAuth from '../../hooks/useAuth';
import Request from '../../models/request';
import { AudioPlayer } from '../../components/AudioPlayer';
import { getCustomFieldValuesForDetails } from '../../models/form';
import { getErrorMessage } from '../../utils/api';
import { useAppTheme } from '../../custom-theme';
import Tag from '../../components/Tag';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import { qpmLayoutTokens } from '../../theme/tokens';
import { AssetStatus, assetStatuses } from '../../models/asset';

export default function RequestDetails({
  navigation,
  route
}: RootStackScreenProps<'RequestDetails'>) {
  const { id, requestProp } = route.params;
  const { requestInfos } = useSelector((state) => state.requests);
  const request = requestInfos[id]?.request ?? requestProp;
  const theme = useAppTheme();
  const [approving, setApproving] = useState<boolean>(false);
  const approvingRef = useRef(false);
  const [openAssetStatusModal, setOpenAssetStatusModal] = useState(false);
  const [selectedAssetStatus, setSelectedAssetStatus] = useState<AssetStatus>(
    'INSPECTION_SCHEDULED'
  );
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [openRejectModal, setOpenRejectModal] = useState<boolean>(false);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const rejectingRef = useRef(false);
  const { getFormattedDate, getUserNameById } = useContext(
    CompanySettingsContext
  );
  const {
    hasViewPermission,
    hasEditPermission,
    hasDeletePermission,
    hasCreatePermission,
    user
  } = useAuth();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const deletingRef = useRef(false);
  const [requestLoading, setRequestLoading] = useState(!request);
  const [requestLoadError, setRequestLoadError] = useState(false);
  const onApprove = () => {
    if (approvingRef.current) return;
    approvingRef.current = true;
    setApproving(true);
    dispatch(
      approveRequest(
        request.id,
        request.asset ? selectedAssetStatus : undefined
      )
    )
      .then((workOrderId: number) => {
        setOpenAssetStatusModal(false);
        navigation.push('WODetails', { id: workOrderId });
      })
      .catch((err) => showSnackBar(getErrorMessage(err), 'error'))
      .finally(() => {
        approvingRef.current = false;
        setApproving(false);
      });
  };
  const handleApprovePress = () => {
    if (request.asset) setOpenAssetStatusModal(true);
    else onApprove();
  };
  const closeRejectDialog = () => {
    if (rejectingRef.current) return;
    setOpenRejectModal(false);
    setRejectFeedback('');
  };
  const onReject = async () => {
    if (rejectingRef.current) return;
    const reason = rejectFeedback.trim();
    if (!reason) {
      showSnackBar(t('required_feedback'), 'error');
      return;
    }
    rejectingRef.current = true;
    setRejecting(true);
    try {
      await dispatch(cancelRequest(request.id, reason));
      navigation.goBack();
    } catch (err) {
      // Keep the reason so the reviewer can correct or retry without retyping.
      showSnackBar(getErrorMessage(err), 'error');
    } finally {
      rejectingRef.current = false;
      setRejecting(false);
    }
  };

  const getStatusMeta = (request: Request): [string, string] => {
    if (request.workOrder) {
      // @ts-ignore
      return [t('approved'), theme.colors.success];
    } else if (request.cancelled) {
      return [t('rejected'), theme.colors.error];
    } else return [t('pending'), theme.colors.primary];
  };
  const fieldsToRender = [
    {
      label: t('description'),
      value: request?.description
    },
    {
      label: t('status'),
      value: request ? getStatusMeta(request)[0] : null
    },
    {
      label: t('id'),
      value: request?.id
    },
    {
      label: t('priority'),
      value: t(`${request?.priority.toLowerCase()}_priority`)
    },
    {
      label: t('due_date'),
      value: getFormattedDate(request?.dueDate)
    },
    {
      label: t('estimated_start_date'),
      value: getFormattedDate(request?.estimatedStartDate)
    },
    {
      label: t('category'),
      value: request?.category?.name
    },
    ...getCustomFieldValuesForDetails(
      request?.customFieldValues,
      getFormattedDate
    )
  ];
  const onDeleteSuccess = () => {
    showSnackBar(t('request_delete_success'), 'success');
    navigation.goBack();
  };
  const [deleting, setDeleting] = useState(false);
  const onDeleteFailure = () =>
    showSnackBar(t('request_delete_failure'), 'error');

  const handleDelete = async () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await dispatch(deleteRequest(request?.id));
      setOpenDelete(false);
      onDeleteSuccess();
    } catch (_error) {
      onDeleteFailure();
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };
  const renderConfirmDelete = () => {
    return (
      <Portal>
        <Dialog
          visible={openDelete}
          onDismiss={() => !deleting && setOpenDelete(false)}
        >
          <Dialog.Title>{t('confirmation')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('confirm_delete_request')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={deleting} onPress={() => setOpenDelete(false)}>
              {t('cancel')}
            </Button>
            <Button
              loading={deleting}
              disabled={deleting}
              onPress={() => void handleDelete()}
            >
              {t('to_delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  const loadRequest = useCallback(async () => {
    setRequestLoading(true);
    setRequestLoadError(false);
    try {
      await dispatch(getRequestDetails(id));
    } catch (_error) {
      setRequestLoadError(true);
    } finally {
      setRequestLoading(false);
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!requestProp) void loadRequest();
  }, [loadRequest, requestProp]);

  useEffect(() => {
    navigation.setOptions({
      title: request?.title ?? t('loading'),
      headerRight: () => (
        <View style={{ display: 'flex', flexDirection: 'row' }}>
          {!!request &&
            hasDeletePermission(PermissionEntity.REQUESTS, request) && (
              <IconButton
                onPress={() => setOpenDelete(true)}
                icon="delete-outline"
                accessibilityLabel={t('to_delete')}
              />
            )}
          {request &&
            !request.workOrder &&
            !request.cancelled &&
            hasEditPermission(PermissionEntity.REQUESTS, request) && (
              <IconButton
                icon={'pencil'}
                accessibilityLabel={t('edit_request')}
                onPress={() => navigation.navigate('EditRequest', { request })}
              />
            )}
          {approving ? (
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={t('approving_request')}
              style={styles.headerProgress}
            >
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            !!request &&
            !request.workOrder &&
            !request?.cancelled &&
            (hasViewPermission(PermissionEntity.SETTINGS) ||
              user.role.code === 'LIMITED_ADMIN') &&
            hasCreatePermission(PermissionEntity.WORK_ORDERS) && (
              <IconButton
                onPress={handleApprovePress}
                icon="check"
                accessibilityLabel={t('approve')}
              />
            )
          )}
        </View>
      )
    });
  }, [request, approving]);

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
          logSafeError('Failed to open link:', err)
        );
      }
    };

    return (
      <View
        style={[
          styles.infoRow,
          { borderBottomColor: theme.colors.outlineVariant }
        ]}
      >
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {label}
        </Text>
        {isLink ? (
          <Text
            style={{ fontWeight: '600', color: theme.colors.primary }}
            onPress={handlePress}
          >
            {value}
          </Text>
        ) : (
          <Text style={styles.infoValue}>{value}</Text>
        )}
      </View>
    );
  }

  function ObjectField({
    label,
    value,
    link
  }: {
    label: string;
    value: string | number;
    link: { route: keyof RootStackParamList; id: number };
  }) {
    if (value) {
      return (
        <Card
          mode="outlined"
          style={[
            styles.objectCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
          onPress={() => {
            if (user.role.code === 'REQUESTER') return;
            // @ts-ignore
            navigation.navigate(link.route, { id: link.id });
          }}
          accessibilityRole="button"
        >
          <Card.Content style={styles.objectContent}>
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {label}
            </Text>
            <Text variant="bodyLarge" style={styles.infoValue}>
              {value}
            </Text>
          </Card.Content>
        </Card>
      );
    } else return null;
  }

  const renderRejectDialog = () => {
    return (
      <Portal theme={theme}>
        <Dialog
          visible={openRejectModal}
          onDismiss={() => !rejectingRef.current && closeRejectDialog()}
        >
          <Dialog.Title>{t('reject')}</Dialog.Title>
          <Dialog.Content>
            <View>
              <TextInput
                style={{ width: '100%' }}
                mode="outlined"
                multiline
                label={t('feedback')}
                onChangeText={setRejectFeedback}
                value={rejectFeedback}
                editable={!rejecting}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={rejecting} onPress={closeRejectDialog}>
              {t('cancel')}
            </Button>
            <Button
              loading={rejecting}
              disabled={rejecting}
              mode={'contained'}
              accessibilityState={{
                disabled: rejecting,
                busy: rejecting
              }}
              onPress={() => void onReject()}
            >
              {t('reject')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  const renderAssetStatusDialog = () => (
    <Portal theme={theme}>
      <Dialog
        visible={openAssetStatusModal}
        onDismiss={() => {
          if (!approvingRef.current) setOpenAssetStatusModal(false);
        }}
      >
        <Dialog.Title>{t('asset_status')}</Dialog.Title>
        <Dialog.Content>
          <Text
            variant="bodyMedium"
            style={{ marginBottom: qpmLayoutTokens.space.sm }}
          >
            {t('select_asset_status')}
          </Text>
          <ScrollView style={{ maxHeight: 320 }}>
            <RadioButton.Group
              value={selectedAssetStatus}
              onValueChange={(value) =>
                setSelectedAssetStatus(value as AssetStatus)
              }
            >
              {assetStatuses.map(({ status }) => (
                <RadioButton.Item
                  key={status}
                  label={t(status)}
                  value={status}
                  disabled={approving}
                  accessibilityLabel={`${t('asset_status')}: ${t(status)}`}
                />
              ))}
            </RadioButton.Group>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            disabled={approving}
            onPress={() => setOpenAssetStatusModal(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            loading={approving}
            disabled={approving}
            accessibilityState={{ disabled: approving, busy: approving }}
            onPress={onApprove}
          >
            {t('approve')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  if (request)
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={requestLoading && !!request}
            onRefresh={loadRequest}
          />
        }
      >
        {renderConfirmDelete()}
        {requestLoadError && (
          <AsyncStateFeedback
            mode="banner"
            message={t('request_details_load_error')}
            onRetry={() => void loadRequest()}
          />
        )}
        {request.image && (
          <Image style={styles.image} source={{ uri: request.image.url }} />
        )}
        <Card
          mode="outlined"
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
        >
          <Card.Content>
            <View style={styles.summaryHeading}>
              <View style={styles.summaryTitle}>
                <Text variant="headlineSmall" style={styles.requestTitle}>
                  {request.title}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {request.customId ? `#${request.customId}` : `#${request.id}`}
                </Text>
              </View>
              <Tag
                text={getStatusMeta(request)[0]}
                color={
                  request.workOrder
                    ? theme.colors.onSuccess
                    : request.cancelled
                    ? theme.colors.onError
                    : theme.colors.onPrimary
                }
                backgroundColor={getStatusMeta(request)[1]}
              />
            </View>
            {request.description ? (
              <Text variant="bodyMedium" style={styles.description}>
                {request.description}
              </Text>
            ) : null}
          </Card.Content>
        </Card>
        <Card
          mode="outlined"
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
        >
          <Card.Content>
            <Text
              variant="titleMedium"
              style={styles.sectionTitle}
              accessibilityRole="header"
            >
              {t('request_details')}
            </Text>
            {fieldsToRender
              .filter((field) => field.label !== t('description'))
              .map((field) => (
                <BasicField
                  key={field.label}
                  label={field.label}
                  value={field.value}
                  isLink={(field as any).isLink}
                />
              ))}
          </Card.Content>
        </Card>
        {request.audioDescription && (
          <Card
            mode="outlined"
            style={[
              styles.sectionCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant
              }
            ]}
          >
            <Card.Content>
              <Text
                variant="titleMedium"
                style={styles.sectionTitle}
                accessibilityRole="header"
              >
                {t('audio_description')}
              </Text>
              <AudioPlayer url={request.audioDescription.url} />
            </Card.Content>
          </Card>
        )}
        <ObjectField
          label={t('requested_by')}
          value={getUserNameById(request.createdBy)}
          link={{ route: 'UserDetails', id: request.createdBy }}
        />
        {request.asset && (
          <ObjectField
            label={t('asset')}
            value={request.asset.name}
            link={{ route: 'AssetDetails', id: request.asset.id }}
          />
        )}
        {request.location && (
          <ObjectField
            label={t('location')}
            value={request.location.name}
            link={{ route: 'LocationDetails', id: request.location.id }}
          />
        )}
        {request.primaryUser && (
          <ObjectField
            label={t('primary_worker')}
            value={`${request.primaryUser.firstName} ${request.primaryUser.lastName}`}
            link={{ route: 'UserDetails', id: request.primaryUser.id }}
          />
        )}
        {request.team && (
          <ObjectField
            label={t('team')}
            value={request.team.name}
            link={{ route: 'TeamDetails', id: request.team.id }}
          />
        )}
        {!request.workOrder &&
          !request.cancelled &&
          hasViewPermission(PermissionEntity.SETTINGS) && (
            <Button
              onPress={() => setOpenRejectModal(true)}
              mode="contained"
              style={styles.rejectButton}
              buttonColor={theme.colors.error}
            >
              {t('reject')}
            </Button>
          )}
        {renderRejectDialog()}
        {renderAssetStatusDialog()}
      </ScrollView>
    );
  else if (requestLoading)
    return <AsyncStateFeedback mode="loading" message={t('please_wait')} />;
  else
    return (
      <AsyncStateFeedback
        mode="error"
        message={t('request_details_load_error')}
        onRetry={() => void loadRequest()}
      />
    );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 112 },
  image: {
    height: 200,
    borderRadius: qpmLayoutTokens.radius.card,
    marginBottom: 12
  },
  summaryCard: {
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    borderWidth: 1,
    marginBottom: 12
  },
  summaryHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10
  },
  summaryTitle: { flex: 1, gap: 5 },
  requestTitle: { fontWeight: '700' },
  description: { marginTop: 14, lineHeight: 21 },
  sectionCard: {
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    borderWidth: 1,
    marginBottom: 12
  },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  infoValue: { fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  objectCard: {
    borderRadius: qpmLayoutTokens.radius.card,
    marginBottom: 10
  },
  objectContent: { gap: 4 },
  rejectButton: {
    marginVertical: 6,
    minHeight: 50,
    justifyContent: 'center',
    borderRadius: qpmLayoutTokens.radius.control
  },
  headerProgress: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
