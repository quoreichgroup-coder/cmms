import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import Location from '../../../models/owns/location';
import { ChangeEvent, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import Form from '../components/form';
import * as Yup from 'yup';
import { IField } from '../type';
import { useDispatch, useSelector } from '../../../store';
import { getAssetsByLocation } from '../../../slices/asset';
import { useNavigate } from 'react-router-dom';
import { getWorkOrdersByLocation } from '../../../slices/workOrder';
import {
  createFloorPlan,
  deleteFloorPlan,
  getFloorPlans
} from '../../../slices/floorPlan';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { getAssetUrl } from '../../../utils/urlPaths';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';
import { PlanFeature } from '../../../models/owns/subscriptionPlan';
import { openSafeWindow } from '../../../utils/safeWindow';
import ContentState from '../components/ContentState';
import PreventiveMaintenance from '../../../models/owns/preventiveMaintenance';
import MaintenanceRequest from '../../../models/owns/request';
import { Page } from '../../../models/owns/page';
import api from '../../../utils/api';
import Pagination from '@mui/material/Pagination';

interface LocationDetailsProps {
  location: Location;
  handleOpenUpdate: () => void;
  handleOpenDelete: () => void;
  onCopy: (location: Location) => void;
}
type RelatedLoadState = 'loading' | 'ready' | 'error';
export default function LocationDetails(props: LocationDetailsProps) {
  const { location, handleOpenUpdate, handleOpenDelete, onCopy } = props;
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { getFormattedDate, uploadFiles } = useContext(CompanySettingsContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [openAddFloorPlan, setOpenAddFloorPlan] = useState<boolean>(false);
  const [reloadIndex, setReloadIndex] = useState(0);
  const [relatedState, setRelatedState] = useState({
    assets: 'loading' as RelatedLoadState,
    workOrders: 'loading' as RelatedLoadState,
    floorPlans: 'loading' as RelatedLoadState
  });
  const [maintenancePlans, setMaintenancePlans] = useState<PreventiveMaintenance[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [maintenancePage, setMaintenancePage] = useState(0);
  const [maintenancePageCount, setMaintenancePageCount] = useState(0);
  const [maintenanceLoadState, setMaintenanceLoadState] = useState<RelatedLoadState>('loading');
  const [maintenanceRetry, setMaintenanceRetry] = useState(0);
  const [currentTab, setCurrentTab] = useState<string>('assets');
  const { assetsByLocation } = useSelector((state) => state.assets);
  const { workOrdersByLocation } = useSelector((state) => state.workOrders);
  const { floorPlansByLocation } = useSelector((state) => state.floorPlans);
  const {
    hasEditPermission,
    hasDeletePermission,
    getFilteredFields,
    hasCreatePermission,
    hasFeature,
    hasViewPermission
  } = useAuth();
  const locationAssets = assetsByLocation[location.id] ?? [];
  const locationWorkOrders = workOrdersByLocation[location.id] ?? [];
  const floorPlans = floorPlansByLocation[location.id] ?? [];
  const navigate = useNavigate();
  const tabs = [
    { value: 'assets', label: t('assets') },
    { value: 'files', label: t('files') },
    { value: 'workOrders', label: t('work_orders') },
    { value: 'floorPlans', label: t('floor_plans') },
    ...(hasViewPermission(PermissionEntity.PREVENTIVE_MAINTENANCES) &&
    hasFeature(PlanFeature.PREVENTIVE_MAINTENANCE)
      ? [{ value: 'maintenancePlans', label: t('preventive_maintenance') }]
      : []),
    ...(hasViewPermission(PermissionEntity.REQUESTS)
      ? [{ value: 'requests', label: t('requests') }]
      : []),
    { value: 'people', label: t('people') }
  ];

  const fields: Array<IField> = [
    {
      name: 'name',
      type: 'text',
      label: t('name'),
      placeholder: t('floor_plan_name_description'),
      required: true
    },
    {
      name: 'area',
      type: 'number',
      label: t('area'),
      placeholder: t('Floor plan area in m²')
    },
    {
      name: 'image',
      type: 'file',
      fileType: 'image',
      label: 'Image',
      placeholder: t('upload_image')
    }
  ];
  const floorPlanShape = {
    name: Yup.string().required(t('required_floor_plan_name'))
  };

  useEffect(() => {
    let active = true;
    setRelatedState({
      assets: 'loading',
      workOrders: 'loading',
      floorPlans: 'loading'
    });
    Promise.allSettled([
      Promise.resolve(dispatch(getAssetsByLocation(location.id))),
      Promise.resolve(dispatch(getWorkOrdersByLocation(location.id))),
      Promise.resolve(dispatch(getFloorPlans(location.id)))
    ]).then((results) => {
      if (!active) return;
      setRelatedState({
        assets: results[0].status === 'fulfilled' ? 'ready' : 'error',
        workOrders: results[1].status === 'fulfilled' ? 'ready' : 'error',
        floorPlans: results[2].status === 'fulfilled' ? 'ready' : 'error'
      });
    });
    return () => {
      active = false;
    };
  }, [dispatch, location.id, reloadIndex]);

  useEffect(() => {
    if (currentTab !== 'maintenancePlans' && currentTab !== 'requests') return;
    let active = true;
    const controller = new AbortController();
    setMaintenanceLoadState('loading');
    const endpoint = currentTab === 'maintenancePlans'
      ? 'preventive-maintenances/search'
      : 'requests/search';
    const loadPage = async () => {
      try {
        const result = await api.post<Page<PreventiveMaintenance | MaintenanceRequest>>(
          endpoint,
          {
            filterFields: [{ field: 'location.id', operation: 'eq', value: location.id }],
            pageNum: maintenancePage,
            pageSize: 10,
            sortField: 'createdAt',
            direction: 'DESC'
          },
          { signal: controller.signal }
        );
        if (!active) return;
        if (currentTab === 'maintenancePlans') {
          setMaintenancePlans(result.content as PreventiveMaintenance[]);
        } else {
          setMaintenanceRequests(result.content as MaintenanceRequest[]);
        }
        setMaintenancePageCount(result.totalPages);
        setMaintenanceLoadState('ready');
      } catch (_error) {
        if (active && !controller.signal.aborted) setMaintenanceLoadState('error');
      }
    };
    loadPage();
    return () => {
      active = false;
      controller.abort();
    };
  }, [currentTab, location.id, maintenancePage, maintenanceRetry]);

  const renderRelatedState = (key: 'assets' | 'workOrders' | 'floorPlans') => {
    if (relatedState[key] === 'loading') {
      return (
        <ContentState
          variant="loading"
          message={t('loading')}
          minHeight={180}
        />
      );
    }
    if (relatedState[key] === 'error') {
      return (
        <ContentState
          variant="error"
          message={t('an_error_occured')}
          actionLabel={t('retry')}
          onAction={() => setReloadIndex((index) => index + 1)}
          minHeight={180}
        />
      );
    }
    return null;
  };

  const renderAddFloorPlanModal = () => (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={openAddFloorPlan}
      onClose={() => setOpenAddFloorPlan(false)}
    >
      <DialogTitle
        sx={{
          p: 3
        }}
      >
        <Typography variant="h4" gutterBottom>
          {t('add_floor_plan')}
        </Typography>
        <Typography variant="subtitle2">
          {t('add_floor_plan_description')}
        </Typography>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: 3
        }}
      >
        <Box>
          <Form
            fields={getFilteredFields(fields)}
            validation={Yup.object().shape(floorPlanShape)}
            submitText={t('add_floor_plan')}
            values={{}}
            onChange={({ field, e }) => {}}
            onSubmit={async (values) => {
              return new Promise<void>((resolve, rej) => {
                uploadFiles([], values.image)
                  .then((files) => {
                    values = {
                      ...values,
                      image: files.length ? { id: files[0].id } : null
                    };
                    dispatch(createFloorPlan(location.id, values))
                      .then(() => setOpenAddFloorPlan(false))
                      .finally(resolve);
                  })
                  .catch((err) => {
                    rej(err);
                  });
              });
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
  const handleTabsChange = (_event: ChangeEvent<{}>, value: string): void => {
    setCurrentTab(value);
    setMaintenancePage(0);
  };
  return (
    <Grid
      container
      justifyContent="center"
      alignItems="stretch"
      spacing={2}
      padding={{ xs: 1, sm: 2, md: 4 }}
    >
      {renderAddFloorPlanModal()}
      <Grid
        item
        xs={12}
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={1}
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h2" sx={{ overflowWrap: 'anywhere' }}>
            {location?.name}
          </Typography>
          <Typography variant="h6">{location?.address}</Typography>
        </Box>
        <Box display="flex" justifyContent={{ xs: 'flex-end', sm: 'initial' }}>
          {hasEditPermission(PermissionEntity.LOCATIONS, location) && (
            <IconButton aria-label={t('edit')} onClick={handleOpenUpdate} style={{ marginRight: 10 }}>
              <EditOutlinedIcon color="primary" />
            </IconButton>
          )}
          {hasCreatePermission(PermissionEntity.LOCATIONS) && (
            <IconButton aria-label={t('duplicate')}
              style={{ marginRight: 10 }}
              onClick={() => onCopy(location)}
            >
              <ContentCopyOutlinedIcon color="primary" />
            </IconButton>
          )}
          {hasDeletePermission(PermissionEntity.LOCATIONS, location) && (
            <IconButton aria-label={t('to_delete')} onClick={handleOpenDelete}>
              <DeleteOutlinedIcon color="error" />
            </IconButton>
          )}
        </Box>
      </Grid>
      <Divider />
      {location.image && (
        <Grid
          item
          xs={12}
          lg={12}
          display="flex"
          justifyContent="center"
          padding={2}
        >
          <img
            src={location.image.url}
            style={{ borderRadius: 5, height: 200 }}
          />
        </Grid>
      )}
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
        {currentTab === 'assets' && (
          <Box>
            {renderRelatedState('assets') || (
              <>
            {hasCreatePermission(PermissionEntity.ASSETS) && (
              <Box display="flex" justifyContent="right">
                <Button
                  startIcon={<AddOutlinedIcon fontSize="small" />}
                  onClick={() =>
                    navigate(`/app/assets?location=${location.id}`)
                  }
                >
                  {t('asset')}
                </Button>
              </Box>
            )}
            {locationAssets.length ? (
              <List sx={{ width: '100%' }}>
                {locationAssets.map((asset) => (
                  <ListItemButton
                    key={asset.id}
                    divider
                    onClick={() => navigate(getAssetUrl(asset.id))}
                  >
                    <ListItemText
                      primary={asset.name}
                      secondary={getFormattedDate(asset.createdAt)}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Stack direction="row" justifyContent="center" width="100%">
                <Typography variant="h5">
                  {t('no_asset_in_location')}
                </Typography>
              </Stack>
            )}
              </>
            )}
          </Box>
        )}
        {currentTab === 'workOrders' && (
          <Box>
            {renderRelatedState('workOrders') || (
              <>
            {hasCreatePermission(PermissionEntity.WORK_ORDERS) && (
              <Box display="flex" justifyContent="right">
                <Button
                  startIcon={<AddOutlinedIcon fontSize="small" />}
                  onClick={() =>
                    navigate(`/app/work-orders?location=${location.id}`)
                  }
                >
                  {t('work_order')}
                </Button>
              </Box>
            )}
            {locationWorkOrders.length ? (
              <List sx={{ width: '100%' }}>
                {locationWorkOrders.map((workOrder) => (
                  <ListItemButton
                    key={workOrder.id}
                    divider
                    onClick={() => navigate(`/app/work-orders/${workOrder.id}`)}
                  >
                    <ListItemText
                      primary={workOrder.title}
                      secondary={getFormattedDate(workOrder.createdAt)}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Stack direction="row" justifyContent="center" width="100%">
                <Typography variant="h5">{t('no_wo_in_location')}</Typography>
              </Stack>
            )}
              </>
            )}
          </Box>
        )}
        {currentTab === 'files' && (
          <Box>
            {hasCreatePermission(PermissionEntity.FILES) &&
              hasFeature(PlanFeature.FILE) && (
                <Box display="flex" justifyContent="right">
                  <Button
                    startIcon={<AddOutlinedIcon fontSize="small" />}
                    onClick={handleOpenUpdate}
                  >
                    {t('file')}
                  </Button>
                </Box>
              )}
            {location.files.length ? (
              <List sx={{ width: '100%' }}>
                {location.files.map((file) => (
                  <ListItemButton
                    key={file.id}
                    divider
                    onClick={() => openSafeWindow(file.url)}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="h6" fontWeight="bold">
                          {file.name}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Stack direction="row" justifyContent="center" width="100%">
                <Typography variant="h5">{t('no_file_in_location')}</Typography>
              </Stack>
            )}
          </Box>
        )}
        {currentTab === 'floorPlans' && (
          <Box>
            {renderRelatedState('floorPlans') || (
              <>
            {hasEditPermission(PermissionEntity.LOCATIONS, location) && (
              <Box display="flex" justifyContent="right">
                <Button
                  onClick={() => setOpenAddFloorPlan(true)}
                  startIcon={<AddOutlinedIcon fontSize="small" />}
                >
                  {t('floor_plan')}
                </Button>
              </Box>
            )}
            {floorPlans.length ? (
              <List sx={{ width: '100%' }}>
                {floorPlans.map((floorPlan) => (
                  <ListItemButton key={floorPlan.id} divider>
                    <ListItem
                      secondaryAction={
                        <IconButton aria-label={t('to_delete')}
                          sx={{ ml: 1 }}
                          onClick={() => {
                            if (
                              window.confirm(
                                t(
                                  "Are you sure you want to delete this Floor Plan. It can't be undone"
                                )
                              )
                            ) {
                              dispatch(
                                deleteFloorPlan(location.id, floorPlan.id)
                              )
                                .then((deleted) => {
                                  if (!deleted)
                                    showSnackBar(
                                      t('an_error_occured'),
                                      'error'
                                    );
                                })
                                .catch(() =>
                                  showSnackBar(t('an_error_occured'), 'error')
                                );
                            }
                          }}
                        >
                          <DeleteOutlinedIcon fontSize="small" color="error" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={floorPlan.name}
                        secondary={`${floorPlan.area} m²`}
                      />
                    </ListItem>
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Stack direction="row" justifyContent="center" width="100%">
                <Typography variant="h5">
                  {t('no_floor_plan_in_location')}
                </Typography>
              </Stack>
            )}
              </>
            )}
          </Box>
        )}
        {(currentTab === 'maintenancePlans' || currentTab === 'requests') && (
          <Box sx={{ width: '100%', minWidth: 0 }}>
            {maintenanceLoadState === 'loading' ? (
              <ContentState variant="loading" message={t('loading')} minHeight={180} />
            ) : maintenanceLoadState === 'error' ? (
              <ContentState
                variant="error"
                message={t('an_error_occured')}
                actionLabel={t('retry')}
                onAction={() => setMaintenanceRetry((attempt) => attempt + 1)}
                minHeight={180}
              />
            ) : currentTab === 'maintenancePlans' ? (
              maintenancePlans.length ? (
                <List sx={{ width: '100%' }}>
                  {maintenancePlans.map((plan) => (
                    <ListItemButton
                      key={plan.id}
                      divider
                      onClick={() => navigate(`/app/preventive-maintenances/${plan.id}`)}
                    >
                      <ListItemText
                        primary={plan.name || plan.title}
                        secondary={`${plan.customId || `#${plan.id}`}${plan.nextWorkOrderDate ? ` · ${t('next_due')}: ${getFormattedDate(plan.nextWorkOrderDate)}` : ''}${plan.schedule?.disabled ? ` · ${t('disabled')}` : ''}`}
                      />
                    </ListItemButton>
                  ))}
                </List>
              ) : (
                <ContentState variant="empty" message={t('no_preventive_plans_for_location')} minHeight={180} />
              )
            ) : maintenanceRequests.length ? (
              <List sx={{ width: '100%' }}>
                {maintenanceRequests.map((request) => (
                  <ListItemButton
                    key={request.id}
                    divider
                    onClick={() => navigate(`/app/requests/${request.id}`)}
                  >
                    <ListItemText
                      primary={request.title}
                      secondary={`${request.customId || `#${request.id}`} · ${request.cancelled ? t('cancelled') : request.workOrder ? t('approved') : t('pending')}${request.createdAt ? ` · ${getFormattedDate(request.createdAt)}` : ''}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <ContentState variant="empty" message={t('no_requests_for_location')} minHeight={180} />
            )}
            {maintenancePageCount > 1 && maintenanceLoadState === 'ready' && (
              <Box display="flex" justifyContent="center" sx={{ py: 2 }}>
                <Pagination
                  count={maintenancePageCount}
                  page={maintenancePage + 1}
                  onChange={(_event, value) => setMaintenancePage(value - 1)}
                  color="primary"
                  aria-label={t('pagination')}
                />
              </Box>
            )}
          </Box>
        )}
        {currentTab === 'people' && (
          <Grid container>
            {!!location.workers.length && (
              <Grid item xs={12} lg={6}>
                <Typography variant="h6" color="text.secondary">
                  {t('assigned_to')}
                </Typography>
                {location.workers.map((worker, index) => (
                  <Box key={worker.id}>
                    <Link
                      href={`/app/people-teams/people/${worker.id}`}
                      variant="h6"
                      fontWeight="bold"
                    >
                      {`${worker.firstName} ${worker.lastName}`}
                    </Link>
                  </Box>
                ))}
              </Grid>
            )}
            {!!location.teams.length && (
              <Grid item xs={12} lg={6}>
                <Typography variant="h6" color="text.secondary">
                  {t('assigned_teams')}
                </Typography>
                {location.teams.map((team, index) => (
                  <Box key={team.id}>
                    <Link
                      href={`/app/people-teams/teams/${team.id}`}
                      variant="h6"
                      fontWeight="bold"
                    >
                      {team.name}
                    </Link>
                  </Box>
                ))}
              </Grid>
            )}
            {!!location.customers.length && (
              <Grid item xs={12} lg={6}>
                <Typography variant="h6" color="text.secondary">
                  {t('assigned_customers')}
                </Typography>
                {location.customers.map((customer, index) => (
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
            {!!location.vendors.length && (
              <Grid item xs={12} lg={6}>
                <Typography variant="h6" color="text.secondary">
                  {t('assigned_vendors')}
                </Typography>
                {location.vendors.map((vendor, index) => (
                  <Box key={vendor.id}>
                    <Link
                      href={`/app/vendors-customers/vendors/${vendor.id}`}
                      variant="h6"
                      fontWeight="bold"
                    >
                      {vendor.companyName}
                    </Link>
                  </Box>
                ))}
              </Grid>
            )}
          </Grid>
        )}
      </Grid>
    </Grid>
  );
}
