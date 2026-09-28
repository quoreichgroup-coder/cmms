import {
  Alert,
  Box,
  ButtonBase,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Link as MuiLink,
  Stack,
  Typography
} from '@mui/material';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import { PermissionEntity } from '../../../../models/owns/role';
import AssetMaintenanceSummary from './AssetMaintenanceSummary';
import AssetDowntimeSummary from './AssetDowntimeSummary';
import AssetChildrenSummary from './AssetChildrenSummary';
import AssetRequestSummary from './AssetRequestSummary';
import AssetMeterSummary from './AssetMeterSummary';
import { PlanFeature } from '../../../../models/owns/subscriptionPlan';
import { isCloudVersion } from '../../../../config';
import { AssetDTO } from '../../../../models/owns/asset';
import {
  getAssetUrl,
  getPartUrl,
  getWorkOrderUrl
} from '../../../../utils/urlPaths';
import useAuth from '../../../../hooks/useAuth';
import { getAssetWorkOrders } from '../../../../slices/asset';
import { useDispatch, useSelector } from '../../../../store';

interface PropsType {
  asset: AssetDTO;
}

const AssetOverview = ({ asset }: PropsType) => {
  const { t, i18n }: { t: any; i18n: any } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { hasCreatePermission, hasViewPermission, hasFeature, user } =
    useAuth();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const canViewWorkOrders = hasViewPermission(PermissionEntity.WORK_ORDERS);
  const canViewParts = hasViewPermission(PermissionEntity.PARTS_AND_MULTIPARTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { assetInfos } = useSelector((state) => state.assets);
  const workOrders = assetInfos[asset.id]?.workOrders ?? [];

  useEffect(() => {
    let active = true;
    setLoading(canViewWorkOrders);
    setLoadError(false);
    if (!canViewWorkOrders) {
      return () => {
        active = false;
      };
    }
    Promise.resolve(dispatch(getAssetWorkOrders(asset.id)))
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [asset.id, canViewWorkOrders, dispatch]);

  const sortedWorkOrders = useMemo(
    () =>
      [...workOrders].sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime()
      ),
    [workOrders]
  );
  const openWorkOrders = sortedWorkOrders.filter(
    (workOrder) => workOrder.status !== 'COMPLETE'
  );
  const openWorkOrderCount = asset.openWorkOrders ?? openWorkOrders.length;
  const warrantyExpired = asset.warrantyExpirationDate
    ? new Date(asset.warrantyExpirationDate).getTime() < Date.now()
    : false;
  const warrantyExpiringSoon = asset.warrantyExpirationDate
    ? !warrantyExpired &&
      new Date(asset.warrantyExpirationDate).getTime() - Date.now() <=
        30 * 24 * 60 * 60 * 1000
    : false;
  const assetStatusColor =
    asset.status === 'OPERATIONAL'
      ? 'success'
      : asset.status === 'DOWN' || asset.status === 'EMERGENCY_SHUTDOWN'
      ? 'error'
      : asset.status === 'INSPECTION_SCHEDULED'
      ? 'warning'
      : asset.status === 'STANDBY' || asset.status === 'COMMISSIONING'
      ? 'info'
      : 'default';

  const DetailItem = ({
    label,
    value,
    href
  }: {
    label: string;
    value?: string;
    href?: string;
  }) => (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      {href ? (
        <Button
          variant="text"
          size="small"
          onClick={() => navigate(href)}
          sx={{ px: 0, minWidth: 0, textTransform: 'none', fontWeight: 600 }}
        >
          {value || t('not_specified')}
        </Button>
      ) : (
        <Typography variant="body1" fontWeight={600}>
          {value || t('not_specified')}
        </Typography>
      )}
    </Grid>
  );

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, pb: 4 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ p: { xs: 2, md: 3 } }}>
            <Grid container spacing={3} alignItems="center">
              {asset.image?.url && (
                <Grid item xs={12} sm={3} md={2}>
                  <Box
                    component="img"
                    src={asset.image.url}
                    alt={asset.name}
                    sx={{
                      display: 'block',
                      width: '100%',
                      maxHeight: 150,
                      objectFit: 'cover',
                      borderRadius: 1
                    }}
                  />
                </Grid>
              )}
              <Grid item xs={12} sm>
                <Stack spacing={1}>
                  <Typography variant="overline" color="text.secondary">
                    {asset.category?.name || t('asset')}
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      overflowWrap: 'anywhere',
                      fontSize: { xs: '1.75rem', sm: '3rem' }
                    }}
                  >
                    {asset.name}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      label={t(asset.status)}
                      size="small"
                      color={assetStatusColor}
                    />
                    <Chip
                      label={
                        asset.customId || asset.serialNumber || `#${asset.id}`
                      }
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </Stack>
              </Grid>
              {hasCreatePermission(PermissionEntity.WORK_ORDERS) && (
                <Grid item xs={12} sm="auto">
                  <Button
                    variant="contained"
                    onClick={() =>
                      navigate(`/app/work-orders?asset=${asset.id}`)
                    }
                  >
                    {t('create_work_order')}
                  </Button>
                </Grid>
              )}
            </Grid>
          </Card>
        </Grid>

        {canViewWorkOrders && (
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2.5, height: '100%' }}>
              <Typography variant="overline" color="text.secondary">
                {t('open_work_orders')}
              </Typography>
              <Typography variant="h2" sx={{ my: 1 }}>
                {openWorkOrderCount}
              </Typography>
              <Button
                size="small"
                onClick={() => navigate(`/app/assets/${asset.id}/work-orders`)}
                sx={{ px: 0, textTransform: 'none' }}
              >
                {t('view_work_orders')}
              </Button>
            </Card>
          </Grid>
        )}
        {canViewParts && (
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2.5, height: '100%' }}>
              <Typography variant="overline" color="text.secondary">
                {t('linked_parts')}
              </Typography>
              <Typography variant="h2" sx={{ my: 1 }}>
                {asset.parts?.length ?? 0}
              </Typography>
              <Button
                size="small"
                onClick={() => navigate(`/app/assets/${asset.id}/parts`)}
                sx={{ px: 0, textTransform: 'none' }}
              >
                {t('view_parts')}
              </Button>
            </Card>
          </Grid>
        )}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="overline" color="text.secondary">
              {t('warranty_expiration')}
            </Typography>
            <Typography variant="h5" sx={{ my: 1 }}>
              {asset.warrantyExpirationDate
                ? getFormattedDate(asset.warrantyExpirationDate)
                : t('not_specified')}
            </Typography>
            <Chip
              size="small"
              color={
                !asset.warrantyExpirationDate
                  ? 'default'
                  : warrantyExpired
                  ? 'error'
                  : warrantyExpiringSoon
                  ? 'warning'
                  : 'success'
              }
              label={
                !asset.warrantyExpirationDate
                  ? t('warranty_not_recorded')
                  : warrantyExpired
                  ? t('warranty_expired')
                  : warrantyExpiringSoon
                  ? t('warranty_expiring_soon')
                  : t('warranty_active')
              }
            />
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              {t('asset_information')}
            </Typography>
            <Grid container spacing={2}>
              <DetailItem
                label={t('location')}
                value={asset.location?.name}
                href={
                  hasViewPermission(PermissionEntity.LOCATIONS) &&
                  asset.location?.id
                    ? `/app/locations/${asset.location.id}`
                    : undefined
                }
              />
              <DetailItem
                label={t('parent_asset')}
                value={asset.parentAsset?.name}
                href={
                  hasViewPermission(PermissionEntity.ASSETS) &&
                  asset.parentAsset?.id
                    ? getAssetUrl(asset.parentAsset.id)
                    : undefined
                }
              />
              <DetailItem
                label={t('manufacturer')}
                value={asset.manufacturer}
              />
              <DetailItem label={t('model')} value={asset.model} />
              <DetailItem
                label={t('serial_number')}
                value={asset.serialNumber}
              />
              <DetailItem
                label={t('placed_in_service')}
                value={
                  asset.inServiceDate
                    ? getFormattedDate(asset.inServiceDate)
                    : undefined
                }
              />
            </Grid>
            {asset.description && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {t('description')}
                </Typography>
                <Typography variant="body1">{asset.description}</Typography>
              </>
            )}
          </Card>
        </Grid>

        {canViewWorkOrders && (
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2.5, height: '100%' }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography variant="h5">{t('recent_work_orders')}</Typography>
                <Button
                  size="small"
                  onClick={() =>
                    navigate(`/app/assets/${asset.id}/work-orders`)
                  }
                  sx={{ textTransform: 'none' }}
                >
                  {t('view_all')}
                </Button>
              </Stack>
              {loadError ? (
                <Alert severity="error">{t('an_error_occured')}</Alert>
              ) : loading && !workOrders.length ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : sortedWorkOrders.length ? (
                <Stack divider={<Divider flexItem />}>
                  {sortedWorkOrders.slice(0, 4).map((workOrder) => (
                    <ButtonBase
                      key={workOrder.id}
                      onClick={() => navigate(getWorkOrderUrl(workOrder.id))}
                      sx={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        py: 1.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={2}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle1"
                            fontWeight={600}
                            noWrap
                          >
                            {workOrder.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            #{workOrder.id}
                            {workOrder.createdAt
                              ? ` · ${getFormattedDate(workOrder.createdAt)}`
                              : ''}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={t(workOrder.status)}
                          color={
                            workOrder.status === 'COMPLETE'
                              ? 'default'
                              : 'warning'
                          }
                        />
                      </Stack>
                    </ButtonBase>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary" sx={{ py: 3 }}>
                  {t('no_recent_work_orders')}
                </Typography>
              )}
            </Card>
          </Grid>
        )}
        {hasViewPermission(PermissionEntity.PREVENTIVE_MAINTENANCES) && (
          <Grid item xs={12} md={6}>
            <AssetMaintenanceSummary key={asset.id} assetId={asset.id} />
          </Grid>
        )}
        {hasViewPermission(PermissionEntity.ASSETS) && (
          <Grid item xs={12} md={6}>
            <AssetChildrenSummary key={asset.id} assetId={asset.id} />
          </Grid>
        )}
        {hasViewPermission(PermissionEntity.PARTS_AND_MULTIPARTS) && (
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2.5, height: '100%' }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Typography variant="h5">{t('linked_parts')}</Typography>
                <Button component={Link} to={`/app/assets/${asset.id}/parts`}>
                  {t('view_all')}
                </Button>
              </Stack>
              {asset.parts?.length ? (
                <Stack divider={<Divider />}>
                  {asset.parts.slice(0, 4).map((part) => (
                    <Box key={part.id} sx={{ py: 1.5 }}>
                      <Button
                        component={Link}
                        to={getPartUrl(part.id)}
                        sx={{
                          px: 0,
                          textTransform: 'none',
                          textAlign: 'left',
                          overflowWrap: 'anywhere'
                        }}
                      >
                        {part.name}
                      </Button>
                      {part.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ overflowWrap: 'anywhere' }}
                        >
                          {part.description}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary" sx={{ py: 3 }}>
                  {t('asset_no_parts')}
                </Typography>
              )}
            </Card>
          </Grid>
        )}
        {hasViewPermission(PermissionEntity.ASSETS) &&
          hasViewPermission(PermissionEntity.FILES) && (
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 2.5, height: '100%' }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="h5">{t('asset_documents')}</Typography>
                  {hasFeature(PlanFeature.FILE) && (
                    <Button
                      component={Link}
                      to={`/app/assets/${asset.id}/files`}
                    >
                      {t('view_all')}
                    </Button>
                  )}
                </Stack>
                {!hasFeature(PlanFeature.FILE) ? (
                  <Alert
                    severity="info"
                    action={
                      user.ownsCompany ? (
                        <Button
                          component={Link}
                          to={isCloudVersion ? '/app/subscription/plans' : '/app/account/company-profile'}
                          color="inherit"
                        >
                          {t('upgrade_now')}
                        </Button>
                      ) : undefined
                    }
                  >
                    {t('upgrade_files')}
                  </Alert>
                ) : asset.files?.length ? (
                  <Stack divider={<Divider />}>
                    {asset.files.slice(0, 4).map((file) => (
                      <Box key={file.id} sx={{ py: 1.5, minWidth: 0 }}>
                        <MuiLink
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ overflowWrap: 'anywhere' }}
                        >
                          {file.name}
                        </MuiLink>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {t('asset_no_documents')}
                  </Typography>
                )}
              </Card>
            </Grid>
          )}
        {hasViewPermission(PermissionEntity.PREVENTIVE_MAINTENANCES) && (
          <Grid item xs={12} md={6}>
            <AssetMaintenanceSummary key={asset.id} assetId={asset.id} />
          </Grid>
        )}
        {hasViewPermission(PermissionEntity.ASSETS) && (
          <Grid item xs={12} md={6}>
            <AssetDowntimeSummary key={asset.id} assetId={asset.id} />
          </Grid>
        )}
        {hasViewPermission(PermissionEntity.REQUESTS) && (
          <Grid item xs={12} md={6}>
            <AssetRequestSummary key={asset.id} assetId={asset.id} />
          </Grid>
        )}
        {hasViewPermission(PermissionEntity.METERS) && (
          <Grid item xs={12} md={6}>
            <AssetMeterSummary key={asset.id} assetId={asset.id} />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AssetOverview;
