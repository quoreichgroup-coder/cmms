import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import ConfirmDialog from '../../components/ConfirmDialog';
import { deleteFile } from '../../../../slices/file';
import { useContext, useEffect, useRef, useState } from 'react';
import SingleTask from '../../components/form/SelectTasks/SingleTask';
import { Task } from '../../../../models/owns/tasks';
import { getTasksByWorkOrder, patchTask } from '../../../../slices/task';
import { useDispatch } from '../../../../store';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
import Form from '../../components/form';
import * as Yup from 'yup';
import { addFiles } from '../../../../slices/file';
import { IField } from '../../type';

interface TasksProps {
  tasksProps: Task[];
  workOrderId: number;
  disabled: boolean;
  handleZoomImage: (images: string[], image: string) => void;
}

export default function Tasks({
  tasksProps,
  workOrderId,
  handleZoomImage,
  disabled
}: TasksProps) {
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const [openSelectImages, setOpenSelectImages] = useState<boolean>(false);
  const [notes, setNotes] = useState<Map<number, boolean>>(() => {
    const initialNotes = new Map<number, boolean>();
    tasksProps.forEach((task) => {
      if (task.notes || task.images.length) {
        initialNotes.set(task.id, true);
      }
    });
    return initialNotes;
  });
  const [tasks, setTasks] = useState<Task[]>(tasksProps);
  const [savingTaskIds, setSavingTaskIds] = useState<Set<number>>(new Set());
  const savingTaskIdsRef = useRef<Set<number>>(new Set());
  const [currentTask, setCurrentTask] = useState<Task>();
  const [imageToDelete, setImageToDelete] = useState<number>();
  const [deletingImage, setDeletingImage] = useState(false);
  const dispatch = useDispatch();
  const { showSnackBar } = useContext(CustomSnackBarContext);

  useEffect(() => {
    setTasks(tasksProps);
    setNotes((current) => {
      const next = new Map<number, boolean>();
      tasksProps.forEach((task) => {
        next.set(
          task.id,
          current.get(task.id) ?? Boolean(task.notes || task.images.length)
        );
      });
      return next;
    });
  }, [tasksProps]);

  const recordedTaskCount = tasks.filter((task) => {
    if (task.taskBase.taskType === 'SUBTASK') return task.value === 'COMPLETE';
    return task.value !== undefined && String(task.value).trim().length > 0;
  }).length;
  const taskProgress = tasks.length
    ? Math.round((recordedTaskCount / tasks.length) * 100)
    : 0;

  async function handleChange(value: string | number, id: number) {
    if (savingTaskIdsRef.current.has(id)) return;
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    savingTaskIdsRef.current.add(id);
    setSavingTaskIds((current) => new Set(current).add(id));
    setTasks((current) =>
      current.map((item) => (item.id === id ? { ...item, value } : item))
    );
    try {
      await dispatch(patchTask(workOrderId, id, { ...task, value }));
      showSnackBar(t('task_update_success'), 'success');
    } catch {
      setTasks((current) =>
        current.map((item) =>
          item.id === id && item.value === value
            ? { ...item, value: task.value }
            : item
        )
      );
      showSnackBar(t('task_update_failure'), 'error');
    } finally {
      savingTaskIdsRef.current.delete(id);
      setSavingTaskIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  function handleNoteChange(value: string, id: number) {
    const newTasks = tasks.map((task) => {
      if (task.id === id) {
        return { ...task, notes: value };
      }
      return task;
    });
    setTasks(newTasks);
  }

  function toggleNotes(id: number) {
    setNotes((current) => {
      const next = new Map(current);
      next.set(id, !next.get(id));
      return next;
    });
  }

  function handleSaveNotes(value: string, id: number) {
    const task = tasks.find((task) => task.id === id);
    if (!task) return Promise.resolve();
    return dispatch(patchTask(workOrderId, id, { ...task, notes: value }))
      .then(() => {
        showSnackBar(t('notes_save_success'), 'success');
        setNotes((current) => new Map(current).set(task.id, false));
      })
      .catch(() => showSnackBar(t('notes_save_failure'), 'error'));
  }

  function handleSelectImages(id: number) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    setCurrentTask(task);
    setOpenSelectImages(true);
  }

  async function handleDeleteImage() {
    if (imageToDelete === undefined || deletingImage) return;
    setDeletingImage(true);
    try {
      const deleted = await dispatch(deleteFile(imageToDelete));
      if (!deleted) throw new Error('Image deletion was not confirmed');
      setTasks((current) =>
        current.map((task) => ({
          ...task,
          images: task.images.filter((image) => image.id !== imageToDelete)
        }))
      );
      setImageToDelete(undefined);
      showSnackBar(t('file_delete_success'), 'success');
    } catch {
      showSnackBar(t('file_delete_failure'), 'error');
    } finally {
      setDeletingImage(false);
    }
  }

  const onImageUploadSuccess = () => {
    setOpenSelectImages(false);
    showSnackBar(t('images_add_task_success'), 'success');
  };
  const onImageUploadFailure = (err) =>
    showSnackBar(t('images_add_task_failure'), 'error');

  const fields: Array<IField> = [
    {
      name: 'images',
      type: 'file',
      label: t('images'),
      fileType: 'image',
      multiple: true
    }
  ];
  const shape = {
    images: Yup.array().required(t('required_images'))
  };
  const renderSelectImages = () => {
    return (
      <Dialog
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreenDialog}
        open={openSelectImages}
        onClose={() => setOpenSelectImages(false)}
      >
        <DialogTitle
          sx={{
            p: { xs: 2, sm: 3 }
          }}
        >
          <Typography variant="h4" gutterBottom>
            {t('add_images')}
          </Typography>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: { xs: 1.5, sm: 3 }
          }}
        >
          <Form
            fields={fields}
            validation={Yup.object().shape(shape)}
            submitText={t('add')}
            values={{}}
            onChange={({ field, e }) => {}}
            onSubmit={async (values) => {
              const task = currentTask;
              if (!task) return;
              return dispatch(addFiles(values.images, 'IMAGE', task.id))
                .then(onImageUploadSuccess)
                .then(() =>
                  dispatch(getTasksByWorkOrder(workOrderId)).then(() => {
                    setNotes((current) => new Map(current).set(task.id, true));
                  })
                )
                .catch(onImageUploadFailure);
            }}
          />
        </DialogContent>
      </Dialog>
    );
  };
  return (
    <Card>
      <CardHeader
        title={t('tasks')}
        avatar={<TaskAltOutlinedIcon />}
        action={
          tasks.length > 0 ? (
            <Chip
              size="small"
              color={taskProgress === 100 ? 'success' : 'default'}
              variant="outlined"
              label={t('task_progress', {
                done: recordedTaskCount,
                total: tasks.length
              })}
            />
          ) : undefined
        }
      />
      <Divider />
      <CardContent>
        {tasks.length ? (
          <Stack spacing={1.5}>
            <LinearProgress
              variant="determinate"
              value={taskProgress}
              aria-label={t('task_progress', {
                done: recordedTaskCount,
                total: tasks.length
              })}
              sx={{ height: 5, borderRadius: 5 }}
            />
            <FormControl fullWidth>
              {tasks.map((task, index) => (
                <SingleTask
                  key={task.id}
                  taskNumber={index + 1}
                  saving={savingTaskIds.has(task.id)}
                  disabled={disabled}
                  task={task}
                  handleChange={handleChange}
                  handleNoteChange={handleNoteChange}
                  handleSaveNotes={handleSaveNotes}
                  toggleNotes={toggleNotes}
                  handleSelectImages={handleSelectImages}
                  handleZoomImage={handleZoomImage}
                  handleDeleteImage={(id) => setImageToDelete(id)}
                  notes={notes}
                />
              ))}
            </FormControl>
          </Stack>
        ) : (
          <Typography color="text.secondary" variant="body2">
            {t('no_checklist_tasks')}
          </Typography>
        )}
      </CardContent>
      {renderSelectImages()}
      <ConfirmDialog
        open={imageToDelete !== undefined}
        onCancel={() => {
          if (!deletingImage) setImageToDelete(undefined);
        }}
        onConfirm={handleDeleteImage}
        confirmText={t('delete')}
        question={t('confirm_delete_file')}
      />
    </Card>
  );
}
