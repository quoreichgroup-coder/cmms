import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Alert,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Zoom
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import { ChangeEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DropResult } from 'react-beautiful-dnd';
import { reorder } from '../../../../../utils/items';
import { Task, TaskType } from '../../../../../models/owns/tasks';
import DraggableTaskList from './DraggableTaskList';
import { randomInt } from '../../../../../utils/generators';
import SingleTask from './SingleTask';
import { useSnackbar } from 'notistack';
import { Checklist } from '../../../../../models/owns/checklists';
import { getTaskFromTaskBase } from '../../../../../utils/formatters';
import { useDispatch, useSelector } from '../../../../../store';
import { addChecklist, getChecklists } from '../../../../../slices/checklist';
import { getErrorMessage } from '../../../../../utils/api';
import useAuth from '../../../../../hooks/useAuth';
import { PlanFeature } from '../../../../../models/owns/subscriptionPlan';
import { AssetMiniDTO } from '../../../../../models/owns/asset';
import { UserMiniDTO } from '../../../../../models/user';
import { MeterMiniDTO } from 'src/models/owns/meter';

interface SelectTasksProps {
  selected: Task[];
  infos?: { name: string; description: string; category: string };
  open: boolean;
  onClose: () => void;
  onSelect: (tasks: Task[], { name, description, category }) => Promise<void>;
  action?: 'createChecklist' | 'editChecklist';
}

export default function SelectTasks({
                                      selected,
                                      onSelect,
                                      onClose,
                                      open,
                                      action,
                                      infos
                                    }: SelectTasksProps) {
  const { t }: { t: any } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [currentTab, setCurrentTab] = useState<string>('edit');
  const [openChecklist, setOpenChecklist] = useState<boolean>(false);
  const [saveAsChecklist, setSaveAsChecklist] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const handleTabsChange = (_event: ChangeEvent<{}>, value: string): void => {
    setCurrentTab(value);
  };
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const dispatch = useDispatch();
  const { hasFeature, user } = useAuth();
  const { checklists } = useSelector((state) => state.checklists);

  useEffect(() => {
    if (!checklists.length) dispatch(getChecklists());
  }, []);
  useEffect(() => {
    setTasks(selected);
  }, [selected]);
  useEffect(() => {
    if (!open) setSaveAsChecklist(false);
  }, [open]);

  useEffect(() => {
    setName(infos?.name ?? '');
    setDescription(infos?.description ?? '');
    setCategory(infos?.category ?? '');
  }, [infos]);

  const showError = (error: string) => {
    enqueueSnackbar(error, {
      variant: 'error',
      anchorOrigin: {
        vertical: 'bottom',
        horizontal: 'center'
      },
      TransitionComponent: Zoom
    });
  };
  const onLabelChange = (value: string, id: number) => {
    const newTasks = tasks.map((task) => {
      if (task.id === id) {
        return { ...task, taskBase: { ...task.taskBase, label: value } };
      }
      return task;
    });
    setTasks(newTasks);
  };
  const onTypeChange = (value: TaskType, id: number) => {
    const newTasks = tasks.map((task) => {
      if (task.id === id) {
        const result = { ...task, taskBase: { ...task.taskBase, taskType: value } };
        if (value !== 'METER')
          result.taskBase.meter = null;
        return result;
      }
      return task;
    });
    setTasks(newTasks);
  };
  const onUserChange = (user: UserMiniDTO, id: number) => {
    const newTasks = tasks.map((task) => {
      if (task.id === id) {
        return { ...task, taskBase: { ...task.taskBase, user } };
      }
      return task;
    });
    setTasks(newTasks);
  };
  const onAssetChange = (asset: AssetMiniDTO, id: number) => {
    const newTasks = tasks.map((task) => {
      if (task.id === id) {
        return { ...task, taskBase: { ...task.taskBase, asset } };
      }
      return task;
    });
    setTasks(newTasks);
  };
  const onMeterChange = (meter: MeterMiniDTO, id: number) => {
    const newTasks = tasks.map((task) => {
      if (task.id === id) {
        return { ...task, taskBase: { ...task.taskBase, meter } };
      }
      return task;
    });
    setTasks(newTasks);
  };
  const onChoicesChange = (choices: string[], id: number) => {
    const newTasks = tasks.map((task) => {
      if (task.id === id) {
        return {
          ...task,
          taskBase: {
            ...task.taskBase,
            options: choices.map((choice) => {
              return { id: randomInt(), label: choice };
            })
          }
        };
      }
      return task;
    });
    setTasks(newTasks);
  };
  const onSave = () => {
    const isChecklistAction = ['createChecklist', 'editChecklist'].includes(action);
    if ((saveAsChecklist || isChecklistAction) && !name?.trim()) {
      showError(t('required_name'));
    } else if (
      !tasks.length &&
      (saveAsChecklist || isChecklistAction)
    ) {
      showError(t('task_list_requires_operation'));
    } else if (tasks.some((task) => !task.taskBase.label?.trim())) {
      showError(t('remove_blank_tasks'));
    } else if (
      tasks.some(
        (task) =>
          task.taskBase.taskType === 'MULTIPLE' &&
          (task.taskBase.options ?? []).filter((option) => option.label.trim()).length < 2
      )
    ) {
      showError(t('multiple_task_requires_two_options'));
    } else if (
      tasks.some(
        (task) =>
          task.taskBase.taskType === 'MULTIPLE' &&
          (task.taskBase.options ?? []).some((option) => !option.label.trim())
      )
    ) {
      showError(t('remove_blank_options'));
    } else if (
      tasks.some(
        (task) => task.taskBase.taskType === 'METER' && !task.taskBase.meter
      )
    ) {
      showError(t('remove_blank_meter_tasks'));
    } else {
      setSubmitting(true);
      const saveTasks = async () => {
        try {
          if (saveAsChecklist) {
            if (!hasFeature(PlanFeature.CHECKLIST)) {
              throw new Error(t('upgrade_checklist'));
            }
            await dispatch(addChecklist({
              name: name.trim(),
              description: description?.trim(),
              category: category?.trim(),
              taskBases: tasks.map((task) => ({
                ...task.taskBase,
                options: (task.taskBase.options ?? []).map((option) => option.label)
              }))
            }, user.companySettingsId));
          }
          await onSelect(tasks, { name, description, category });
          if (saveAsChecklist) {
            enqueueSnackbar(t('checklist_create_success', {
              name: name.trim(),
              taskCount: tasks.length
            }), { variant: 'success' });
          }
          setSaveAsChecklist(false);
          onClose();
        } catch (error) {
          showError(getErrorMessage(error, t('an_error_occured')));
        } finally {
          setSubmitting(false);
        }
      };
      void saveTasks();
    }
  };

  const onRemove = (id: number) => {
    const newTasks = tasks.filter((task) => task.id !== id);
    setTasks(newTasks);
  };
  const tabs = [
    { value: 'edit', label: t('edit') },
    { value: 'preview', label: t('preview') }
  ];
  const addTask = () => {
    setTasks([
      ...tasks,
      {
        id: randomInt(),
        taskBase: {
          id: randomInt(),
          label: '',
          taskType: 'SUBTASK'
        },
        notes: '',
        images: []
      }
    ]);
  };
  const addCheckList = (checklist: Checklist) => {
    setTasks([
      ...tasks,
      ...checklist.taskBases.map((taskBase) => getTaskFromTaskBase(taskBase))
    ]);
  };
  const onDragEnd = ({ destination, source }: DropResult) => {
    // dropped outside the list
    if (!destination) return;
    const newTasks = reorder(tasks, source.index, destination.index);
    setTasks(newTasks);
  };
  return (
    <Box>
      <Dialog fullWidth maxWidth="md" open={open} onClose={() => !submitting && onClose()}>
        <DialogTitle
          sx={{
            p: 3
          }}
        >
          <Typography variant="h4" gutterBottom>
            {saveAsChecklist
              ? t('save_tasks_as_checklist_title')
              : action === 'createChecklist'
              ? t('create_checklist')
              : action === 'editChecklist'
                ? t('edit_checklist')
                : t('add_tasks')}
          </Typography>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 3
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 1.5
            }}
          >
            <Tabs
              sx={{ mb: 2 }}
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
            <Box>
              <Button onClick={addTask} startIcon={<AddOutlinedIcon />}>
                {action || saveAsChecklist
                  ? t('add_task_list_operation')
                  : t('task')}
              </Button>
              <Tooltip
                title={
                  hasFeature(PlanFeature.CHECKLIST)
                    ? t('use_a_checklist')
                    : t('upgrade_checklist')
                }
              >
                <span>
                  <Button
                    disabled={!hasFeature(PlanFeature.CHECKLIST)}
                    startIcon={<AddOutlinedIcon />}
                    onClick={() => setOpenChecklist((current) => !current)}
                  >
                    {t('checklist')}
                  </Button>
                  {!action && hasFeature(PlanFeature.CHECKLIST) && (
                    <Button
                      color="secondary"
                      startIcon={<PlaylistAddCheckOutlinedIcon />}
                      onClick={() => {
                        const next = !saveAsChecklist;
                        setSaveAsChecklist(next);
                        if (next) {
                          setName('');
                          setDescription('');
                          setCategory('');
                          setCurrentTab('edit');
                        }
                        setOpenChecklist(false);
                      }}
                    >
                      {t('create_reusable_task_list')}
                    </Button>
                  )}
                </span>
              </Tooltip>
            </Box>
          </Box>
          {saveAsChecklist && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'secondary.light' }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {t('save_tasks_as_checklist_title')}
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('save_tasks_as_checklist_help')}
              </Alert>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth required label={t('name')} value={name ?? ''}
                    error={!name?.trim()} helperText={!name?.trim() ? t('required_name') : undefined}
                    onChange={(event) => setName(event.target.value)} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label={`${t('description')} (${t('optional')})`} value={description ?? ''}
                    onChange={(event) => setDescription(event.target.value)} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label={`${t('category')} (${t('optional')})`} value={category ?? ''}
                    onChange={(event) => setCategory(event.target.value)} />
                </Grid>
              </Grid>
              <Alert severity="info" sx={{ mt: 2, mb: 0 }}>
                {t('checklist_task_format_help')}
              </Alert>
              <Divider sx={{ mt: 2 }} />
            </Paper>
          )}
          {['createChecklist', 'editChecklist'].includes(action) && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('task_list_header_help')}
            </Alert>
          )}
          <Box>
            {openChecklist && (
              <Select
                displayEmpty
                defaultValue=""
                sx={{ mb: 1 }}
                onChange={(event) => {
                  const checklist = checklists.find(
                    (item) => item.id === Number(event.target.value)
                  );
                  if (checklist) addCheckList(checklist);
                  setOpenChecklist(false);
                }}
              >
                <MenuItem value="">{t('select_checklist')}</MenuItem>
                {checklists.map((checklist) => (
                  <MenuItem key={checklist.id} value={checklist.id}>
                    {checklist.name}
                  </MenuItem>
                ))}
              </Select>
            )}
            {currentTab === 'edit' && (
              <Box>
                <Grid container spacing={1}>
              {['createChecklist', 'editChecklist'].includes(action) && (
                    <>
                      <Grid item>
                        <TextField
                          variant="outlined"
                          label={t('name')}
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          error={name?.trim() === ''}
                          helperText={t('required_name')}
                        />
                      </Grid>
                      <Grid item>
                        <TextField
                          variant="outlined"
                          label={t('description')}
                          value={description}
                          onChange={(event) =>
                            setDescription(event.target.value)
                          }
                        />
                      </Grid>
                      <Grid item>
                        <TextField
                          variant="outlined"
                          value={category}
                          label={t('category')}
                          onChange={(event) => setCategory(event.target.value)}
                        />
                      </Grid>
                    </>
                  )}
                  <Grid item>
                    {!tasks.length && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        {t('task_list_requires_operation')}
                      </Alert>
                    )}
                    <DraggableTaskList
                      tasks={tasks}
                      onDragEnd={onDragEnd}
                      onLabelChange={onLabelChange}
                      onTypeChange={onTypeChange}
                      onRemove={onRemove}
                      onUserChange={onUserChange}
                      onAssetChange={onAssetChange}
                      onMeterChange={onMeterChange}
                      onChoicesChange={onChoicesChange}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
            {currentTab === 'preview' && (
              <Box sx={{ p: 2 }}>
                {tasks.map((task) => (
                  <SingleTask preview task={task} key={task.id} />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button
            disabled={
              submitting ||
              (!tasks.length &&
                !saveAsChecklist &&
                !['createChecklist', 'editChecklist'].includes(action))
            }
            startIcon={submitting ? <CircularProgress size="1rem" /> : null}
            onClick={onSave}
            variant="contained"
          >
            {saveAsChecklist
              ? t('save_checklist_and_add_tasks')
              : ['createChecklist', 'editChecklist'].includes(action)
                ? t('save_checklist')
                : t('add_tasks')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
