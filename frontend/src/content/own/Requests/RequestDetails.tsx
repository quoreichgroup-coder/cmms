import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Link,
  MenuItem,
  Select,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import Request from '../../../models/owns/request';
import { useDispatch } from '../../../store';
import { approveRequest, editRequest } from '../../../slices/request';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAssetUrl,
  getLocationUrl,
  getTeamUrl,
  getUserUrl,
  getWorkOrderUrl
} from '../../../utils/urlPaths';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';
import ImageViewer from 'react-simple-image-viewer';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import FilesList from '../components/FilesList';
import RequestCancellationModal from './RequestCancellationModal';
import BasicField from '../components/BasicField';
import { AssetStatus, assetStatuses } from '../../../models/owns/asset';
import { getCustomFieldValuesForDetails } from '../type';
import RequestStatusChip from './RequestStatusChip';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { getErrorMessage } from '../../../utils/api';
import PriorityWrapper from '../components/PriorityWrapper';

interface RequestDetailsProps {
  request: Request;
  handleOpenUpdate: () => void;
  handleOpenDelete: () => void;
  onClose: () => void;
}

export default function RequestDetails({
  request,
  handleOpenUpdate,
  handleOpenDelete,
  onClose
}: RequestDetailsProps) {
  const [approving, setApproving] = useState<boolean>(false);
  const [openApprovalConfirmation, setOpenApprovalConfirmation] =
    useState(false);
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [showAssetStatuses, setShowAssetStatuses] = useState<boolean>(false);
  const [selectedAssetStatus, setSelectedAssetStatus] = useState<AssetStatus>(
    'INSPECTION_SCHEDULED'
  );
  const {
    hasEditPermission,
    hasDeletePermission,
    hasViewPermission,
    hasCreatePermission,
    user
  } = useAuth();
  const navigate = useNavigate();
  const { getFormattedDate, getUserNameById } = useContext(
    CompanySettingsContext
  );
  const [isImageViewerOpen, setIsImageViewerOpen] = useState<boolean>(false);
  const [openCancellationModal, setOpenCancellationModal] =
    useState<boolean>(false);
  const onApprove = () => {
    setApproving(true);
    dispatch(
      approveRequest(request.id, request.asset ? selectedAssetStatus : null)
    )
      .then((workOrderId) => {
        navigate(`/app/work-orders/${workOrderId}`);
      })
      .catch((error) => {
        showSnackBar(getErrorMessage(error, t('an_error_occured')), 'error');
      })
      .finally(() => setApproving(false));
  };

  const confirmApproval = () => {
    setOpenApprovalConfirmation(false);
    onApprove();
  };

  const fieldsToRender = (
    request: Request
  ): { label: string; value: string | number }[] => [
    {
      label: t('contact'),
      value: request.contact
    },
    {
      label: t('description'),
      value: request.description
    },
    {
      label: t('id'),
      value: request.customId
    },
    {
      label: t('priority'),
      value: request.priority
    },
    {
      label: t('due_date'),
      value: getFormattedDate(request.dueDate)
    },
    {
      label: t('estimated_start_date'),
      value: getFormattedDate(request.estimatedStartDate)
    },
    {
      label: t('estimated_duration'),
      value: !!request.estimatedDuration
        ? t('estimated_hours_in_text', { hours: request.estimatedDuration })
        : null
    },
    {
      label: t('category'),
      value: request.category?.name
    },
    {
      label: t('feedback'),
      value: request.cancellationReason
    },
    {
      label: t('created_at'),
      value: getFormattedDate(request.createdAt)
    },
    ...getCustomFieldValuesForDetails(
      request.customFieldValues,
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
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
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
            {request.customId && (
              <Typography variant="overline" color="text.secondary">
                {request.customId}
              </Typography>
            )}
            <RequestStatusChip
              status={
                request.cancelled
                  ? 'CANCELLED'
                  : request.workOrder
                  ? 'APPROVED'
                  : 'PENDING'
              }
              labelKey={
                request.cancelled
                  ? 'rejected'
                  : request.workOrder
                  ? 'approved'
                  : 'pending'
              }
            />
            <PriorityWrapper priority={request.priority} />
          </Stack>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '1.5rem', sm: '2rem' },
              overflowWrap: 'anywhere'
            }}
          >
            {request?.title}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignSelf: { xs: 'flex-end', sm: 'flex-start' } }}
        >
          {!request.cancelled &&
            hasEditPermission(PermissionEntity.REQUESTS, request) && (
              <IconButton aria-label={t('edit')} onClick={handleOpenUpdate}>
                <EditOutlinedIcon color="primary" />
              </IconButton>
            )}
          {hasDeletePermission(PermissionEntity.REQUESTS, request) && (
            <IconButton aria-label={t('delete')} onClick={handleOpenDelete}>
              <DeleteOutlinedIcon color="error" />
            </IconButton>
          )}
        </Stack>
      </Grid>
      {!showAssetStatuses ? (
        !request.workOrder &&
        !request.cancelled &&
        (hasViewPermission(PermissionEntity.SETTINGS) ||
          user.role.code === 'LIMITED_ADMIN') &&
        hasCreatePermission(PermissionEntity.WORK_ORDERS) && (
          <>
            <Divider />
            <Grid
              item
              xs={12}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column-reverse', sm: 'row' },
                justifyContent: 'flex-end',
                gap: 1.5,
                '& .MuiButton-root': {
                  minHeight: 44,
                  minWidth: { sm: 128 },
                  borderRadius: 2,
                  textTransform: 'none'
                }
              }}
            >
              <Button
                startIcon={<ClearOutlinedIcon />}
                onClick={() => setOpenCancellationModal(true)}
                disabled={approving}
                variant="outlined"
              >
                {t('reject')}
              </Button>
              <Button
                startIcon={
                  approving ? (
                    <CircularProgress size="1rem" sx={{ color: 'white' }} />
                  ) : (
                    <CheckOutlinedIcon />
                  )
                }
                onClick={() => {
                  if (request.asset) setShowAssetStatuses(true);
                  else setOpenApprovalConfirmation(true);
                }}
                disabled={approving}
                aria-busy={approving}
                variant="contained"
              >
                {t('approve')}
              </Button>
            </Grid>
          </>
        )
      ) : (
        <Stack direction={'column'} spacing={2}>
          <Box>
            <Typography fontWeight={'bold'} gutterBottom>
              {t('asset_status')}
            </Typography>
            <Select
              value={selectedAssetStatus}
              fullWidth
              inputProps={{ 'aria-label': t('asset_status') }}
              disabled={approving}
              onChange={(event) => {
                setSelectedAssetStatus(event.target.value as AssetStatus);
              }}
            >
              {assetStatuses.map((assetStatusConfig) => (
                <MenuItem
                  key={assetStatusConfig.status}
                  value={assetStatusConfig.status}
                >
                  {t(assetStatusConfig.status)}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Stack
            direction={{ xs: 'column-reverse', sm: 'row' }}
            spacing={1.5}
            sx={{ '& .MuiButton-root': { minHeight: 44, borderRadius: 2 } }}
          >
            <Button
              onClick={() => setShowAssetStatuses(false)}
              disabled={approving}
              variant={'outlined'}
            >
              {t('go_back')}
            </Button>
            <Button
              startIcon={
                approving ? (
                  <CircularProgress size="1rem" sx={{ color: 'white' }} />
                ) : (
                  <CheckOutlinedIcon />
                )
              }
              variant={'contained'}
              onClick={() => setOpenApprovalConfirmation(true)}
              disabled={approving}
              aria-busy={approving}
            >
              {t('approve')}
            </Button>
          </Stack>
        </Stack>
      )}
      <Divider />
      <Grid item xs={12}>
        <Box>
          <Typography sx={{ mt: 2, mb: 1 }} variant="h4">
            {t('request_details')}
          </Typography>
          {request.workOrder && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              {t('work_order')}:{' '}
              <Link href={getWorkOrderUrl(request.workOrder.id)}>
                {request.workOrder.customId || `#${request.workOrder.id}`} ·{' '}
                {request.workOrder.title}
              </Link>
            </Alert>
          )}
          <Grid container spacing={2}>
            <>
              {request.image && (
                <Grid
                  item
                  xs={12}
                  lg={12}
                  display="flex"
                  justifyContent="center"
                >
                  <ButtonBase
                    component="button"
                    type="button"
                    aria-label={t('view_request_image')}
                    onClick={() => setIsImageViewerOpen(true)}
                    sx={{
                      borderRadius: 1,
                      '&:focus-visible': {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: 2
                      }
                    }}
                  >
                    <img
                      src={request.image.url}
                      alt=""
                      style={{
                        borderRadius: 5,
                        height: 250,
                        maxWidth: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  </ButtonBase>
                </Grid>
              )}
              {request.requestPortal && (
                <Box
                  sx={{
                    mt: 1,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center'
                  }}
                >
                  <Alert severity={'info'}>
                    {t('requested_from_portal')}{' '}
                    {
                      <Link
                        href={`/app/settings/features/request-portals/${request.requestPortal.id}`}
                      >
                        {request.requestPortal.title}
                      </Link>
                    }
                  </Alert>
                </Box>
              )}
              {fieldsToRender(request).map((field) => (
                <BasicField
                  key={field.label}
                  label={field.label}
                  value={field.value}
                  isPriority={field.label === t('priority')}
                  {...field}
                />
              ))}
              {request?.createdBy && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {t('requested_by')}
                  </Typography>
                  <Link variant="h6" href={getUserUrl(request.createdBy)}>
                    {getUserNameById(request.createdBy)}
                  </Link>
                </Grid>
              )}
              {request?.asset && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {t('asset')}
                  </Typography>
                  <Link variant="h6" href={getAssetUrl(request.asset.id)}>
                    {request.asset.name}
                  </Link>
                </Grid>
              )}
              {request?.location && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {t('location')}
                  </Typography>
                  <Link variant="h6" href={getLocationUrl(request.location.id)}>
                    {request.location.name}
                  </Link>
                </Grid>
              )}
              {request?.primaryUser && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {t('assigned_to')}
                  </Typography>
                  <Link variant="h6" href={getUserUrl(request.primaryUser.id)}>
                    {`${request.primaryUser.firstName} ${request.primaryUser.lastName}`}
                  </Link>
                </Grid>
              )}
              {request?.team && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {t('team')}
                  </Typography>
                  <Link variant="h6" href={getTeamUrl(request.team.id)}>
                    {request.team.name}
                  </Link>
                </Grid>
              )}
              {!!request.files.length && (
                <Grid item xs={12} lg={12}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {t('files')}
                  </Typography>
                  <FilesList
                    confirmMessage={t(
                      'Are you sure you want to remove this file from this Request ?'
                    )}
                    removeDisabled={
                      !hasEditPermission(PermissionEntity.REQUESTS, request)
                    }
                    files={request.files}
                    onRemove={(id: number) => {
                      dispatch(
                        editRequest(request.id, {
                          ...request,
                          files: request.files.filter((f) => f.id !== id)
                        })
                      );
                    }}
                  />
                </Grid>
              )}
            </>
          </Grid>
        </Box>
      </Grid>
      {isImageViewerOpen && (
        <div style={{ zIndex: 100 }}>
          <ImageViewer
            src={[request.image.url]}
            currentIndex={0}
            onClose={() => setIsImageViewerOpen(false)}
            disableScroll={true}
            backgroundStyle={{
              backgroundColor: 'rgba(0,0,0,0.9)'
            }}
            closeOnClickOutside={true}
          />
        </div>
      )}
      <RequestCancellationModal
        requestId={request.id}
        open={openCancellationModal}
        onClose={() => setOpenCancellationModal(false)}
        onCancel={() => {
          setOpenCancellationModal(false);
          onClose();
        }}
      />
      <Dialog
        open={openApprovalConfirmation}
        onClose={() => {
          if (!approving) setOpenApprovalConfirmation(false);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('confirm_request_approval')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {t('confirm_request_approval_message')}
          </Typography>
          <Typography sx={{ mt: 1.5 }} fontWeight={600}>
            {request.customId || request.title}
          </Typography>
          {request.asset && (
            <Typography sx={{ mt: 1 }} fontWeight={600}>
              {t('asset_status')}: {t(selectedAssetStatus)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setOpenApprovalConfirmation(false)}
            disabled={approving}
            variant="outlined"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={confirmApproval}
            disabled={approving}
            aria-busy={approving}
            variant="contained"
            startIcon={
              approving ? (
                <CircularProgress size="1rem" sx={{ color: 'white' }} />
              ) : undefined
            }
          >
            {t('approve')}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
