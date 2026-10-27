import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CustomDataGrid from '../../components/CustomDatagrid';
import {
  GridActionsCellItem,
  GridRowParams,
  GridToolbar,
  GridValueGetterParams
} from '@mui/x-data-grid';
import { GridEnrichedColDef } from '@mui/x-data-grid/models/colDef/gridColDef';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { AssetDTO } from '../../../../models/owns/asset';
import { useDispatch, useSelector } from '../../../../store';
import { editAsset } from '../../../../slices/asset';
import useAuth from '../../../../hooks/useAuth';
import { PermissionEntity } from '../../../../models/owns/role';
import {
  createAssetDowntime,
  deleteAssetDowntime,
  editAssetDowntime,
  getAssetDowntimes
} from '../../../../slices/assetDowntime';
import { useContext, useEffect, useRef, useState } from 'react';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AssetStatusSelect from '../components/AssetStatusSelect';
import Form from '../../components/form';
import * as Yup from 'yup';
import { IField } from '../../type';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
import {
  getHMSString,
  getHoursAndMinutesAndSeconds
} from '../../../../utils/formatters';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import AssetDowntime from '../../../../models/owns/assetDowntime';
import { getErrorMessage } from '../../../../utils/api';
import ConfirmDialog from '../../components/ConfirmDialog';

interface PropsType {
  asset: AssetDTO;
}

const AssetDowntimes = ({ asset }: PropsType) => {
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { assetDowntimesByAsset } = useSelector((state) => state.downtimes);
  const downtimes = assetDowntimesByAsset[asset?.id] ?? [];
  const { hasEditPermission, hasDeletePermission } = useAuth();
  const [openAddModal, setOpenAddModal] = useState<boolean>(false);
  const [openEditModal, setOpenEditModal] = useState<boolean>(false);
  const [currentDowntime, setCurrentDowntime] = useState<AssetDowntime>();
  const [downtimeToDelete, setDowntimeToDelete] = useState<number | null>(null);
  const deleteInProgressRef = useRef(false);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!asset?.id) return undefined;

    let active = true;
    setLoading(true);
    setLoadError(null);
    dispatch(getAssetDowntimes(asset.id))
      .catch((error) => {
        if (active) {
          setLoadError(getErrorMessage(error, t('an_error_occured')));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [asset?.id, dispatch, reloadKey, t]);
  const handleDelete = async () => {
    if (
      downtimeToDelete === null ||
      deleteInProgressRef.current ||
      !hasDeletePermission(PermissionEntity.ASSETS, asset)
    ) {
      return;
    }

    deleteInProgressRef.current = true;
    try {
      const deleted = await dispatch(
        deleteAssetDowntime(asset.id, downtimeToDelete)
      );
      if (!deleted) {
        showSnackBar(t('downtime_delete_failure'), 'error');
        return;
      }
      setDowntimeToDelete(null);
      showSnackBar(t('downtime_delete_success'), 'success');
    } catch (error) {
      showSnackBar(
        getErrorMessage(error, t('downtime_delete_failure')),
        'error'
      );
    } finally {
      deleteInProgressRef.current = false;
    }
  };
  const onCreationSuccess = () => {
    setOpenAddModal(false);
    showSnackBar(t('create_downtime_success'), 'success');
  };
  const onCreationFailure = (err) =>
    showSnackBar(getErrorMessage(err, t('create_downtime_failure')), 'error');
  const onEditSuccess = () => {
    setOpenEditModal(false);
    showSnackBar(t('edit_downtime_success'), 'success');
  };
  const onEditFailure = (err) =>
    showSnackBar(
      getErrorMessage(err, t('edit_downtime_failure')),
      'error'
    );

  const handleEdit = (id: number) => {
    setCurrentDowntime(downtimes.find((downtime) => downtime.id === id));
    setOpenEditModal(true);
  };
  const verifyValues = (values): boolean => {
    const seconds = values.hours * 60 * 60 + values.minutes * 60;
    let startsOn = new Date(values.startsOn);
    startsOn.setSeconds(startsOn.getSeconds() + seconds);
    if (startsOn > new Date()) {
      showSnackBar(
        'The end of the downtime should not be in the future',
        'error'
      );
      return false;
    }
    return true;
  };
  const columns: GridEnrichedColDef[] = [
    {
      field: 'duration',
      headerName: t('duration'),
      description: t('duration'),
      width: 150,
      valueGetter: (params: GridValueGetterParams<number>) =>
        getHMSString(params.value)
    },
    {
      field: 'startsOn',
      headerName: t('started_on'),
      description: t('started_on'),
      width: 150,
      valueGetter: (params: GridValueGetterParams<string>) =>
        getFormattedDate(params.value)
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('actions'),
      description: t('actions'),
      getActions: (params: GridRowParams) => {
        const actions: JSX.Element[] = [];
        if (hasEditPermission(PermissionEntity.ASSETS, asset)) {
          actions.push(
            <GridActionsCellItem
              key="edit"
              icon={<EditOutlinedIcon fontSize="small" color="primary" />}
              onClick={() => handleEdit(Number(params.id))}
              label={t('edit_downtime')}
            />
          );
        }
        if (hasDeletePermission(PermissionEntity.ASSETS, asset)) {
          actions.push(
            <GridActionsCellItem
              key="delete"
              icon={<DeleteOutlinedIcon fontSize="small" color="error" />}
              onClick={() => setDowntimeToDelete(Number(params.id))}
              label={t('remove_downtime')}
            />
          );
        }
        return actions;
      }
    }
  ];
  const fields: Array<IField> = [
    { name: 'startsOn', type: 'date', label: t('started_on') },
    {
      name: 'hours',
      type: 'number',
      label: t('hours'),
      placeholder: t('hours'),
      required: true,
      midWidth: true
    },
    {
      name: 'minutes',
      type: 'number',
      label: t('minutes'),
      placeholder: t('minutes'),
      required: true,
      midWidth: true
    }
  ];
  const shape = {
    startsOn: Yup.string().required(t('required_startsOn')),
    hours: Yup.number().required(t('required_hours')),
    minutes: Yup.number().required(t('required_minutes'))
  };
  const renderAddModal = () => (
    <Dialog
      fullWidth
      maxWidth="md"
      open={openAddModal}
      onClose={() => setOpenAddModal(false)}
    >
      <DialogTitle
        sx={{
          p: 3
        }}
      >
        <Typography variant="h4" gutterBottom>
          {t('add_downtime')}
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
            fields={fields}
            validation={Yup.object().shape(shape)}
            submitText={t('add')}
            values={{}}
            onChange={({ field, e }) => {}}
            onSubmit={async (values) => {
              if (verifyValues(values))
                return dispatch(
                  createAssetDowntime(asset.id, {
                    ...values,
                    duration: values.hours * 60 * 60 + values.minutes * 60
                  })
                )
                  .then(onCreationSuccess)
                  .catch(onCreationFailure);
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
  const renderEditModal = () => (
    <Dialog
      fullWidth
      maxWidth="md"
      open={openEditModal}
      onClose={() => setOpenEditModal(false)}
    >
      <DialogTitle
        sx={{
          p: 3
        }}
      >
        <Typography variant="h4" gutterBottom>
          {t('Edit Downtime')}
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
            fields={fields}
            validation={Yup.object().shape(shape)}
            submitText={t('save')}
            values={{
              ...currentDowntime,
              hours: currentDowntime
                ? getHoursAndMinutesAndSeconds(currentDowntime.duration)[0]
                : 0,
              minutes: currentDowntime
                ? getHoursAndMinutesAndSeconds(currentDowntime.duration)[1]
                : 0
            }}
            onChange={({ field, e }) => {}}
            onSubmit={async (values) => {
              if (!currentDowntime) return;
              if (verifyValues(values))
                return dispatch(
                  editAssetDowntime(currentDowntime.id, asset.id, {
                    ...currentDowntime,
                    startsOn: values.startsOn,
                    duration: values.hours * 60 * 60 + values.minutes * 60
                  })
                )
                  .then(onEditSuccess)
                  .catch(onEditFailure);
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
  return (
    <Box sx={{ px: { xs: 1, sm: 2, md: 4 } }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ p: { xs: 1, sm: 2 }, minWidth: 0 }}>
            <Box
              sx={{
                height: { xs: 420, sm: 550 },
                width: '100%',
                minWidth: 0
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={2}
                justifyContent="space-between"
                py={{ xs: 1, sm: 3 }}
              >
                <AssetStatusSelect
                  value={asset?.status ?? 'OPERATIONAL'}
                  onChange={(status) => {
                    dispatch(
                      editAsset(asset.id, {
                        ...asset,
                        status
                      })
                    );
                  }}
                  disabled={!hasEditPermission(PermissionEntity.ASSETS, asset)}
                />
                {hasEditPermission(PermissionEntity.ASSETS, asset) && (
                  <Button
                    startIcon={<AddOutlinedIcon />}
                    variant="contained"
                    onClick={() => setOpenAddModal(true)}
                  >
                    {t('add_downtime')}
                  </Button>
                )}
              </Stack>
              {loadError ? (
                <Alert
                  severity="error"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => setReloadKey((key) => key + 1)}
                    >
                      {t('retry')}
                    </Button>
                  }
                >
                  {loadError}
                </Alert>
              ) : (
                <CustomDataGrid
                  columns={columns}
                  rows={downtimes.filter((downtime) => downtime.duration)}
                  components={{
                    Toolbar: GridToolbar
                  }}
                  onRowClick={(params) => null}
                  initialState={{
                    columns: {
                      columnVisibilityModel: {}
                    }
                  }}
                  loading={loading}
                />
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>
      {renderAddModal()}
      {renderEditModal()}
      <ConfirmDialog
        open={downtimeToDelete !== null}
        onCancel={() => setDowntimeToDelete(null)}
        onConfirm={handleDelete}
        confirmText={t('remove_downtime')}
        question={t('confirm_delete_asset_downtime')}
      />
    </Box>
  );
};

export default AssetDowntimes;
