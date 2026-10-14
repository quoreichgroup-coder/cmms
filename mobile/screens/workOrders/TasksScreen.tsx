import { isTaskComplete, Task } from '../../models/tasks';
import { getTasks, patchTask } from '../../slices/task';
import { useTranslation } from 'react-i18next';
import { useContext, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from '../../store';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import { FlatList, StyleSheet, View } from 'react-native';
import SingleTask from '../../components/SingleTask';
import { RootStackScreenProps } from '../../types';
import { addFiles } from '../../slices/file';
import * as ImagePicker from 'expo-image-picker';
import { formatImages } from '../../utils/overall';
import { createImageUploadFile } from '../../utils/uploadFiles';
import ImageView from '../../components/ImageViewer';
import { SheetManager } from 'react-native-actions-sheet';
import { openLibraryWithPermission } from '../../utils/mediaPermissions';
import {
  getPersistedTaskNote,
  isTaskNoteDirty,
  mergeTaskNotesWithDrafts
} from '../../utils/taskNoteDrafts';
import InAppCamera from '../../components/InAppCamera';
import { ProgressBar, Text, useTheme } from 'react-native-paper';
import { qpmLayoutTokens } from '../../custom-theme';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';

export default function TasksScreen({
  navigation,
  route
}: RootStackScreenProps<'Tasks'>) {
  const { t }: { t: any } = useTranslation();
  const { tasksProps, workOrderId } = route.params;
  const [isImageViewerOpen, setIsImageViewerOpen] = useState<boolean>(false);
  const [currentImage, setCurrentImage] = useState<string>();
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const initialNotes = new Map();
  tasksProps.forEach((task) => {
    if (task.notes) {
      initialNotes.set(task.id, true);
    }
  });
  const [notes, setNotes] = useState<Map<number, boolean>>(initialNotes);
  const [tasks, setTasks] = useState<Task[]>(tasksProps);
  const [dirtyNoteTaskIds, setDirtyNoteTaskIds] = useState<Set<number>>(
    () => new Set()
  );
  useUnsavedChanges(navigation, dirtyNoteTaskIds.size > 0);
  const storedTasks = useSelector(
    (state) => state.tasks.tasksByWorkOrder[workOrderId]
  );
  const [cameraTaskId, setCameraTaskId] = useState<number | null>(null);
  const [uploadingTaskIds, setUploadingTaskIds] = useState<Set<number>>(
    () => new Set()
  );
  const uploadingTaskIdsRef = useRef<Set<number>>(new Set());
  const [selectingTaskIds, setSelectingTaskIds] = useState<Set<number>>(
    () => new Set()
  );
  const selectingTaskIdsRef = useRef<Set<number>>(new Set());
  const dispatch = useDispatch();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const theme = useTheme();
  const completedTasks = tasks.filter(isTaskComplete).length;
  const completionProgress = tasks.length ? completedTasks / tasks.length : 0;

  useEffect(
    () =>
      setTasks((currentTasks) =>
        mergeTaskNotesWithDrafts(tasksProps, currentTasks, dirtyNoteTaskIds)
      ),
    [dirtyNoteTaskIds, tasksProps]
  );
  useEffect(() => {
    if (storedTasks)
      setTasks((currentTasks) =>
        mergeTaskNotesWithDrafts(storedTasks, currentTasks, dirtyNoteTaskIds)
      );
  }, [dirtyNoteTaskIds, storedTasks]);

  function handleChange(value: string | number, id: number): Promise<void> {
    const task = tasks.find((task) => task.id === id);
    if (!task) return Promise.resolve();

    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === id ? { ...currentTask, value } : currentTask
      )
    );
    const savedNote = getPersistedTaskNote(
      id,
      task.notes,
      storedTasks,
      tasksProps
    );
    return dispatch(
      patchTask(workOrderId, id, { ...task, notes: savedNote, value })
    ).catch((error) => {
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === id && currentTask.value === value
            ? { ...currentTask, value: task.value }
            : currentTask
        )
      );
      showSnackBar(t('task_update_failure'), 'error');
      throw error;
    });
  }

  function handleNoteChange(value: string, id: number) {
    const savedNote =
      storedTasks?.find((task) => task.id === id)?.notes ??
      tasksProps.find((task) => task.id === id)?.notes ??
      '';
    setDirtyNoteTaskIds((current) => {
      const next = new Set(current);
      if (isTaskNoteDirty(value, savedNote)) next.add(id);
      else next.delete(id);
      return next;
    });
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, notes: value } : task
      )
    );
  }

  function toggleNotes(id: number) {
    const newNotes = new Map(notes);
    newNotes.set(id, !newNotes.get(id));
    setNotes(newNotes);
  }

  function handleSaveNotes(value: string, id: number) {
    const task = tasks.find((task) => task.id === id);
    if (!task) return Promise.resolve();
    return dispatch(patchTask(workOrderId, id, { ...task, notes: value }))
      .then(() => {
        showSnackBar(t('notes_save_success'), 'success');
        setDirtyNoteTaskIds((current) => {
          const next = new Set(current);
          next.delete(task.id);
          return next;
        });
        toggleNotes(task.id);
      })
      .catch(() => showSnackBar(t('notes_save_failure'), 'error'));
  }

  const onImageUploadSuccess = () => {
    showSnackBar(t('images_add_task_success'), 'success');
  };
  const onImageUploadFailure = (err) =>
    showSnackBar(t('images_add_task_failure'), 'error');
  const handleZoomImage = (images: string[], image: string) => {
    setCurrentImage(image);
    setCurrentImages(images);
    setIsImageViewerOpen(true);
  };

  const uploadImage = async (taskId: number) => {
    if (
      selectingTaskIdsRef.current.has(taskId) ||
      uploadingTaskIdsRef.current.has(taskId)
    )
      return;

    selectingTaskIdsRef.current.add(taskId);
    setSelectingTaskIds(new Set(selectingTaskIdsRef.current));
    try {
      const result = await openLibraryWithPermission('TasksScreen', {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1
      });

      if (!result || result.canceled) return;

      await onImagePicked(result, taskId);
    } catch (_error) {
      showSnackBar(t('file_pick_error'), 'error');
    } finally {
      selectingTaskIdsRef.current.delete(taskId);
      setSelectingTaskIds(new Set(selectingTaskIdsRef.current));
    }
  };
  const takePhoto = (taskId: number) => {
    if (
      selectingTaskIdsRef.current.has(taskId) ||
      uploadingTaskIdsRef.current.has(taskId)
    )
      return;
    setCameraTaskId(taskId);
  };

  const uploadTaskImages = async (
    taskId: number,
    files: ReturnType<typeof createImageUploadFile>[]
  ) => {
    if (uploadingTaskIdsRef.current.has(taskId)) return;

    uploadingTaskIdsRef.current.add(taskId);
    setUploadingTaskIds((current) => new Set(current).add(taskId));
    try {
      await dispatch(addFiles(files, 'IMAGE', taskId));
      onImageUploadSuccess();
      await dispatch(getTasks(workOrderId));
    } catch (error) {
      onImageUploadFailure(error);
    } finally {
      uploadingTaskIdsRef.current.delete(taskId);
      setUploadingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleInAppCapture = async (uri: string) => {
    if (cameraTaskId === null) return;
    const taskId = cameraTaskId;
    setCameraTaskId(null);
    const files = [createImageUploadFile({ uri }, 1)];
    return uploadTaskImages(taskId, files);
  };
  const onImagePicked = async (
    result: ImagePicker.ImagePickerResult,
    taskId: number
  ) => {
    if (!result.canceled) {
      return uploadTaskImages(taskId, formatImages(result));
    }
  };
  return (
    <>
      <InAppCamera
        visible={cameraTaskId !== null}
        onCapture={handleInAppCapture}
        onClose={() => setCameraTaskId(null)}
      />
      <FlatList
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[
          styles.content,
          tasks.length === 0 && styles.emptyContent
        ]}
        data={tasks}
        keyExtractor={(task) => String(task.id)}
        extraData={notes}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        ListHeaderComponent={
          tasks.length > 0 ? (
            <View
              style={[
                styles.progressCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant
                }
              ]}
            >
              <View style={styles.progressHeading}>
                <Text variant="titleMedium" style={styles.progressTitle}>
                  {t('tasks')}
                </Text>
                <Text
                  variant="labelLarge"
                  style={{ color: theme.colors.primary, fontWeight: '700' }}
                >
                  {completedTasks}/{tasks.length}
                </Text>
              </View>
              <ProgressBar
                progress={completionProgress}
                color={theme.colors.primary}
                accessibilityRole="progressbar"
                accessibilityLabel={t('task_completion_progress')}
                accessibilityValue={{
                  min: 0,
                  max: tasks.length,
                  now: completedTasks
                }}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant
              }
            ]}
          >
            <Text variant="titleMedium">{t('tasks')}</Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t('no_tasks_for_work_order')}
            </Text>
          </View>
        }
        renderItem={({ item: task }) => (
          <SingleTask
            task={task}
            isUploadingImages={
              uploadingTaskIds.has(task.id) || cameraTaskId === task.id
            }
            isSelectingImages={selectingTaskIds.has(task.id)}
            handleChange={handleChange}
            handleNoteChange={handleNoteChange}
            handleSaveNotes={handleSaveNotes}
            toggleNotes={toggleNotes}
            handleSelectImages={(taskId) => {
              SheetManager.show('upload-file-sheet', {
                payload: {
                  onPickImage: () => uploadImage(taskId),
                  onTakePhoto: () => takePhoto(taskId)
                }
              });
            }}
            handleZoomImage={handleZoomImage}
            notes={notes}
          />
        )}
      />
      <ImageView
        images={currentImages.map((uri) => ({ uri }))}
        imageIndex={currentImages.findIndex((img) => img === currentImage)}
        visible={isImageViewerOpen}
        onRequestClose={() => setIsImageViewerOpen(false)}
      />
    </>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  emptyContent: { flexGrow: 1 },
  progressCard: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    gap: 12
  },
  progressHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  progressTitle: { fontWeight: '700' },
  emptyState: {
    minHeight: 150,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    gap: 8
  }
});
