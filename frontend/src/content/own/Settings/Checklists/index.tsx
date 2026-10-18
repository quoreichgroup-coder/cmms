import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SettingsLayout from '../SettingsLayout';
import CustomDataGrid from '../../components/CustomDatagrid';
import { GridEnrichedColDef } from '@mui/x-data-grid/models/colDef/gridColDef';
import {
  GridActionsCellItem,
  GridRenderCellParams,
  GridRowParams,
  GridToolbar,
  GridValueGetterParams
} from '@mui/x-data-grid';
import { Checklist } from '../../../../models/owns/checklists';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import SelectTasksModal from '../../components/form/SelectTasks';
import { useContext, useEffect, useState } from 'react';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useDispatch, useSelector } from '../../../../store';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
import {
  addChecklist,
  deleteChecklist,
  editChecklist,
  getChecklists
} from '../../../../slices/checklist';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getTaskFromTaskBase } from '../../../../utils/formatters';
import useAuth from '../../../../hooks/useAuth';
import { PlanFeature } from '../../../../models/owns/subscriptionPlan';
import FeatureErrorMessage from '../../components/FeatureErrorMessage';
import { getErrorMessage } from '../../../../utils/api';

function Checklists() {
  const { t }: { t: any } = useTranslation();
  const [openCreateChecklist, setOpenCreateChecklist] = useState(false);
  const [openEditChecklist, setOpenEditChecklist] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [currentChecklist, setCurrentChecklist] = useState<Checklist>();
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const { hasFeature } = useAuth();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { companySettingsId } = user;
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { checklists, loadingGet } = useSelector((state) => state.checklists);

  useEffect(() => {
    if (hasFeature(PlanFeature.CHECKLIST)) dispatch(getChecklists());
  }, []);
  const onDeleteSuccess = () => {
    showSnackBar(t('checklist_delete_success'), 'success');
  };
  const onDeleteFailure = (err) =>
    showSnackBar(t('checklist_delete_failure'), 'error');
  const onEditSuccess = () => {
    setOpenEditChecklist(false);
    showSnackBar(t('changes_saved_success'), 'success');
  };
  const onEditFailure = (err) => showSnackBar(getErrorMessage(err), 'error');
  const openChecklistDetails = (checklist: Checklist) => {
    setCurrentChecklist(checklist);
    setOpenDetails(true);
  };
  const openChecklistEditor = (checklist: Checklist) => {
    setCurrentChecklist(checklist);
    setOpenEditChecklist(true);
  };
  const handleDelete = async (id: number) => {
    try {
      const deleted = await dispatch(deleteChecklist(id));
      setOpenDelete(false);
      if (deleted) onDeleteSuccess();
      else onDeleteFailure(new Error('Checklist deletion was not confirmed'));
    } catch (err) {
      setOpenDelete(false);
      onDeleteFailure(err);
    }
  };
  const columns: GridEnrichedColDef[] = [
    {
      field: 'name',
      headerName: t('name'),
      description: t('name'),
      resizable: true,
      flex: 2,
      renderCell: (params: GridRenderCellParams<string>) => (
        <Box sx={{ fontWeight: 'bold' }}>{params.value}</Box>
      )
    },
    {
      field: 'description',
      headerName: t('description'),
      description: t('description'),
      flex: 2
    },
    {
      field: 'category',
      headerName: t('category'),
      description: t('category'),
      width: 150
    },
    {
      field: 'tasks',
      headerName: t('tasks'),
      description: t('tasks'),
      valueGetter: (params: GridValueGetterParams<null, Checklist>) =>
        params.row.taskBases?.length ?? 0,
      width: 150
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('actions'),
      description: t('actions'),
      getActions: (params: GridRowParams<Checklist>) => [
        <GridActionsCellItem
          key="view"
          icon={<VisibilityOutlinedIcon fontSize="small" />}
          onClick={() => openChecklistDetails(params.row)}
          label={t('view_task_list')}
        />,
        <GridActionsCellItem
          key="edit"
          icon={<EditOutlinedIcon fontSize="small" />}
          onClick={() => openChecklistEditor(params.row)}
          label={t('edit_task_list')}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteOutlinedIcon fontSize="small" color="error" />}
          onClick={() => {
            setCurrentChecklist(params.row);
            setOpenDelete(true);
          }}
          label="Remove Checklist"
        />
      ]
    }
  ];
  return (
    <>
      {hasFeature(PlanFeature.CHECKLIST) ? (
        <>
          <Grid item xs={12}>
            <Box
              sx={{
                width: '95%',
                p: 4
              }}
            >
              <Button
                sx={{
                  mb: 2
                }}
                variant="contained"
                onClick={() => setOpenCreateChecklist(true)}
                startIcon={<AddOutlinedIcon fontSize="small" />}
              >
                {t('create_checklist')}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('task_list_library_help')}
              </Typography>
              <CustomDataGrid
                columns={columns}
                rows={checklists}
                loading={loadingGet}
                components={{
                  Toolbar: GridToolbar
                }}
                onRowClick={(params: GridRowParams<Checklist>) => {
                  openChecklistDetails(params.row);
                }}
                initialState={{
                  columns: {
                    columnVisibilityModel: {}
                  }
                }}
              />
            </Box>
          </Grid>
          <Dialog
            open={openDetails}
            onClose={() => setOpenDetails(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>{currentChecklist?.name}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                {currentChecklist?.description && (
                  <Typography color="text.secondary">
                    {currentChecklist.description}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={t('general_task_list')}
                    size="small"
                    color="primary"
                  />
                  {currentChecklist?.category && (
                    <Chip label={currentChecklist.category} size="small" />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {t('task_count', {
                      count: currentChecklist?.taskBases?.length ?? 0
                    })}
                  </Typography>
                </Stack>
                <Divider />
                <Typography variant="subtitle2">{t('operations')}</Typography>
                {(currentChecklist?.taskBases ?? []).length ? (
                  <Stack spacing={1}>
                    {(currentChecklist?.taskBases ?? []).map((task, index) => (
                      <Box
                        key={task.id || `${task.label}-${index}`}
                        sx={{
                          p: 1.5,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          spacing={1}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ minWidth: 42 }}
                            >
                              {String((index + 1) * 10).padStart(4, '0')}
                            </Typography>
                            <Typography>{task.label}</Typography>
                          </Stack>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={
                              {
                                SUBTASK: t('sub_task_status'),
                                TEXT: t('text_field'),
                                NUMBER: t('number_field'),
                                INSPECTION: t('inspection_check'),
                                MULTIPLE: t('multiple_choices'),
                                METER: t('meter_reading')
                              }[task.taskType] ?? task.taskType
                            }
                          />
                        </Stack>
                        {task.options?.length > 0 && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.75 }}
                          >
                            {task.options
                              .map((option) => option.label)
                              .join(' · ')}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">
                    {t('task_list_empty')}
                  </Typography>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDetails(false)}>
                {t('close')}
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setOpenDetails(false);
                  if (currentChecklist) openChecklistEditor(currentChecklist);
                }}
              >
                {t('edit_task_list')}
              </Button>
            </DialogActions>
          </Dialog>
          <SelectTasksModal
            open={openCreateChecklist}
            onClose={() => setOpenCreateChecklist(false)}
            selected={[]}
            onSelect={async (tasks, infos): Promise<void> => {
              await dispatch(
                addChecklist(
                  {
                    ...infos,
                    taskBases: tasks.map((task) => {
                      return {
                        ...task.taskBase,
                        options: (task.taskBase.options ?? []).map(
                          (option) => option.label
                        )
                      };
                    })
                  },
                  companySettingsId
                )
              );
              showSnackBar(
                t('checklist_create_success', {
                  name: infos.name,
                  taskCount: tasks.length
                }),
                'success'
              );
            }}
            action="createChecklist"
          />
          <SelectTasksModal
            open={openEditChecklist}
            onClose={() => setOpenEditChecklist(false)}
            selected={
              currentChecklist?.taskBases.map((taskBase) =>
                getTaskFromTaskBase(taskBase)
              ) ?? []
            }
            onSelect={async (tasks, infos) => {
              try {
                await dispatch(
                  editChecklist(currentChecklist.id, {
                    ...infos,
                    taskBases: tasks.map((task) => {
                      return {
                        ...task.taskBase,
                        options: (task.taskBase.options ?? []).map(
                          (option) => option.label
                        )
                      };
                    })
                  })
                );
                onEditSuccess();
              } catch (err) {
                onEditFailure(err);
                throw err;
              }
            }}
            action="editChecklist"
            infos={{
              name: currentChecklist?.name,
              description: currentChecklist?.description,
              category: currentChecklist?.category
            }}
          />
          <ConfirmDialog
            open={openDelete}
            onCancel={() => {
              setOpenDelete(false);
            }}
            onConfirm={() => handleDelete(currentChecklist?.id)}
            confirmText={t('to_delete')}
            question={t('confirm_delete_checklist')}
          />
        </>
      ) : (
        <FeatureErrorMessage message="upgrade_checklist" />
      )}
    </>
  );
}

export default Checklists;
