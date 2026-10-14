import { Task, TaskOption, TaskType } from '../models/tasks';
import {
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { Button, Card, IconButton, Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useAuth from '../hooks/useAuth';
import debounce from 'lodash.debounce';
import { SheetManager } from 'react-native-actions-sheet';
import { qpmLayoutTokens, useAppTheme } from '../custom-theme';
import { useFileUploadAccess } from '../hooks/useFileUploadAccess';
import {
  normalizeNumericInput,
  shouldPersistTaskInput,
  toggleNumericSign
} from '../utils/numericInput';
import { enqueueTaskSave } from '../utils/taskSaveQueue';

interface SingleTaskProps {
  task: Task;
  preview?: boolean;
  handleChange?: (value: string | number, id: number) => void | Promise<void>;
  handleSaveNotes?: (value: string, id: number) => Promise<void>;
  handleNoteChange?: (value: string, id: number) => void;
  handleSelectImages?: (id: number) => void;
  isUploadingImages?: boolean;
  isSelectingImages?: boolean;
  handleZoomImage?: (images: string[], image: string) => void;
  toggleNotes?: (id: number) => void;
  notes?: Map<number, boolean>;
}

export default function SingleTask({
  task,
  handleChange,
  handleNoteChange,
  handleSaveNotes,
  preview,
  toggleNotes,
  notes,
  handleSelectImages,
  isUploadingImages = false,
  isSelectingImages = false,
  handleZoomImage
}: SingleTaskProps) {
  const theme = useAppTheme();
  const { t }: { t: any } = useTranslation();
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const savingNotesRef = useRef(false);
  const { user } = useAuth();
  const { canUpload: canUploadTaskImages, hasFileEntitlement } =
    useFileUploadAccess();
  const isTaskAssignedToAnotherUser = Boolean(
    task.taskBase.user && task.taskBase.user.id !== user.id
  );
  const isTaskReadOnly = Boolean(preview || isTaskAssignedToAnotherUser);
  const imagesBusy = isUploadingImages || isSelectingImages;
  const imageActionDisabled =
    imagesBusy || isTaskReadOnly || !canUploadTaskImages;
  const handleChangeRef = useRef(handleChange);
  const [inputValue, setInputValue] = useState<string>(
    task.value?.toString() ?? ''
  );
  const [taskSaveStatus, setTaskSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const saveRevision = useRef(0);
  const taskSaveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const lastAttemptedValue = useRef<string | number>('');

  useEffect(() => {
    handleChangeRef.current = handleChange;
  }, [handleChange]);

  const saveTaskValue = useCallback(
    (value: string | number) => {
      if (isTaskReadOnly || !handleChangeRef.current) return;
      const requestRevision = ++saveRevision.current;
      lastAttemptedValue.current = value;
      setTaskSaveStatus('saving');
      const pendingSave = enqueueTaskSave(taskSaveQueue.current, () =>
        Promise.resolve(handleChangeRef.current?.(value, task.id))
      );
      taskSaveQueue.current = pendingSave;
      pendingSave
        .then(() => {
          if (saveRevision.current === requestRevision)
            setTaskSaveStatus('saved');
        })
        .catch(() => {
          if (saveRevision.current === requestRevision)
            setTaskSaveStatus('error');
        });
    },
    [isTaskReadOnly, task.id]
  );

  const isNumericTask =
    task.taskBase.taskType === 'METER' || task.taskBase.taskType === 'NUMBER';
  const debouncedNumericSave = useMemo(
    () => debounce((value: string) => saveTaskValue(value), 700),
    [saveTaskValue]
  );
  const debouncedTextSave = useMemo(
    () => debounce((value: string) => saveTaskValue(value), 700),
    [saveTaskValue]
  );

  const changeHandler = useCallback(
    (newValue: string) => {
      if (isTaskReadOnly) return;
      // An older request must not report "saved" while this edit is pending.
      saveRevision.current += 1;
      const value = isNumericTask
        ? normalizeNumericInput(newValue ?? '')
        : newValue;
      setInputValue(value);
      setTaskSaveStatus('idle');

      if (
        task.taskBase.taskType === 'METER' ||
        task.taskBase.taskType === 'NUMBER'
      ) {
        if (shouldPersistTaskInput(task.taskBase.taskType, value)) {
          debouncedNumericSave(value);
        } else debouncedNumericSave.cancel();
      } else debouncedTextSave(value);
    },
    [
      debouncedNumericSave,
      debouncedTextSave,
      isNumericTask,
      isTaskReadOnly,
      task.taskBase.taskType
    ]
  );

  useEffect(
    () => () => {
      // Persist the last edit if a technician leaves before its debounce fires.
      debouncedNumericSave.flush();
      debouncedTextSave.flush();
    },
    [debouncedNumericSave, debouncedTextSave]
  );

  useEffect(() => {
    setInputValue(task.value?.toString() ?? '');
  }, [task.value]);

  const onDropdownValueChange = (value) => {
    !isTaskReadOnly && saveTaskValue(value);
  };

  const subtaskOptions = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETE'];
  const inspectionOptions = ['PASS', 'FLAG', 'FAIL'];

  const getOptions = (type: TaskType, options: TaskOption[]) => {
    switch (type) {
      case 'SUBTASK':
        return subtaskOptions.map((status) => ({
          value: status,
          label: t(status)
        }));
      case 'INSPECTION':
        return inspectionOptions.map((option) => ({
          value: option,
          label: t(option)
        }));
      case 'MULTIPLE':
        return options
          .map((option) => option.label)
          .map((option) => {
            return {
              label: option,
              value: option
            };
          });
      default:
        break;
    }
  };
  const dropdownOptions =
    getOptions(task.taskBase.taskType, task.taskBase.options) ?? [];
  const dropdownValue = preview ? dropdownOptions[0]?.value : task.value;
  const selectedDropdownLabel =
    dropdownOptions.find((option) => option.value === dropdownValue)?.label ??
    t('task_value_not_recorded');

  return (
    <Card
      mode="outlined"
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant
        }
      ]}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.taskTitle}>
            {task.taskBase.label || `<${t('enter_task_name')}>`}
          </Text>
          <View style={styles.headerActions}>
            <IconButton
              iconColor={theme.colors.primary}
              icon="image"
              accessibilityLabel={t('upload')}
              accessibilityHint={
                !canUploadTaskImages && !isTaskReadOnly
                  ? t(
                      hasFileEntitlement
                        ? 'file_upload_unavailable'
                        : 'you_need_a_license'
                    )
                  : undefined
              }
              loading={imagesBusy}
              accessibilityState={{
                busy: imagesBusy,
                disabled: imageActionDisabled
              }}
              onPress={() => !isTaskReadOnly && handleSelectImages?.(task.id)}
              disabled={imageActionDisabled}
            />
            <IconButton
              iconColor={theme.colors.primary}
              icon={notes?.get(task.id) ? 'note-edit-outline' : 'note-outline'}
              accessibilityLabel={
                notes?.get(task.id) ? t('hide_notes') : t('add_notes')
              }
              accessibilityState={{
                disabled: isTaskReadOnly,
                expanded: Boolean(notes?.get(task.id))
              }}
              onPress={() => !isTaskReadOnly && toggleNotes?.(task.id)}
              disabled={isTaskReadOnly}
            />
          </View>
        </View>
        {['SUBTASK', 'INSPECTION', 'MULTIPLE'].includes(
          task.taskBase.taskType
        ) ? (
          <TouchableOpacity
            disabled={isTaskReadOnly}
            accessibilityRole="button"
            accessibilityLabel={`${
              task.taskBase.label || t('value')
            }, ${selectedDropdownLabel}`}
            accessibilityState={{
              disabled: isTaskReadOnly
            }}
            style={{
              opacity: isTaskReadOnly ? 0.65 : 1
            }}
            onPress={() => {
              SheetManager.show('dropdown-sheet', {
                payload: {
                  value: dropdownValue,
                  items: dropdownOptions,
                  setValue: onDropdownValueChange
                }
              });
            }}
          >
            <View pointerEvents="none">
              <TextInput
                editable={false}
                value={selectedDropdownLabel}
                mode="outlined"
                right={<TextInput.Icon icon="menu-down" />}
              />
            </View>
          </TouchableOpacity>
        ) : task.taskBase.taskType === 'METER' ||
          task.taskBase.taskType === 'NUMBER' ? (
          <TextInput
            onChangeText={changeHandler}
            label={t('value')}
            value={inputValue}
            mode={'outlined'}
            keyboardType={
              Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'
            }
            disabled={isTaskReadOnly}
            onBlur={() => debouncedNumericSave.flush()}
            right={
              <TextInput.Affix
                text="±"
                accessibilityLabel={t('toggle_numeric_sign')}
                textStyle={{
                  minWidth: 44,
                  minHeight: 44,
                  textAlign: 'center',
                  textAlignVertical: 'center'
                }}
                onPress={
                  isTaskReadOnly
                    ? undefined
                    : () =>
                        changeHandler(
                          normalizeNumericInput(toggleNumericSign(inputValue))
                        )
                }
              />
            }
          />
        ) : (
          <TextInput
            value={inputValue}
            onChangeText={changeHandler}
            onBlur={() => debouncedTextSave.flush()}
            label={t('value')}
            mode={'outlined'}
            disabled={isTaskReadOnly}
          />
        )}
        {task.taskBase.asset && (
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>{t('concerned_asset')}</Text>
            <Text
              style={[
                styles.metadataValue,
                { color: theme.colors.onSurfaceVariant }
              ]}
            >
              {task.taskBase.asset.name}
            </Text>
          </View>
        )}
        {taskSaveStatus === 'error' ? (
          <View style={styles.saveError} accessibilityRole="alert">
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.error, flex: 1 }}
            >
              {t('task_update_failure')}
            </Text>
            <Button
              compact
              disabled={preview || isTaskAssignedToAnotherUser}
              onPress={() => saveTaskValue(lastAttemptedValue.current)}
            >
              {t('retry')}
            </Button>
          </View>
        ) : taskSaveStatus !== 'idle' ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
            accessibilityLiveRegion="polite"
          >
            {taskSaveStatus === 'saving' ? t('saving_task') : t('task_saved')}
          </Text>
        ) : null}
        {task.taskBase.user && (
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>{t('assigned_to')}</Text>
            <Text
              style={[
                styles.metadataValue,
                { color: theme.colors.onSurfaceVariant }
              ]}
            >
              {`${task.taskBase.user.firstName} ${task.taskBase.user.lastName}`}
            </Text>
          </View>
        )}
        {notes.get(task.id) && (
          <View>
            <TextInput
              mode={'outlined'}
              multiline
              value={task.notes}
              label={t('notes')}
              onChangeText={(value) =>
                !isTaskReadOnly &&
                !savingNotes &&
                handleNoteChange?.(value, task.id)
              }
              disabled={isTaskReadOnly || savingNotes}
            />
            <Button
              style={{ marginTop: 10 }}
              mode="contained"
              loading={savingNotes}
              disabled={savingNotes || isTaskReadOnly}
              onPress={() => {
                // Prevent duplicate PATCH requests before React commits the
                // loading state after a fast repeated tap.
                if (savingNotesRef.current) return;
                savingNotesRef.current = true;
                setSavingNotes(true);
                Promise.resolve(handleSaveNotes?.(task.notes, task.id)).finally(
                  () => {
                    savingNotesRef.current = false;
                    setSavingNotes(false);
                  }
                );
              }}
            >
              {t('save')}
            </Button>
          </View>
        )}
        {task.images.map((image, index) => (
          <TouchableOpacity
            key={image.id}
            accessibilityRole="button"
            accessibilityLabel={t('task_image_accessibility_label', {
              name: image.name || `${t('image')} ${index + 1}`
            })}
            accessibilityHint={t('task_image_accessibility_hint')}
            onPress={() =>
              handleZoomImage?.(
                task.images.map((img) => img.url),
                image.url
              )
            }
            style={{ marginTop: 10 }}
          >
            <Image
              source={{ uri: image.url }}
              style={styles.taskImage}
              resizeMode="cover"
              accessible={false}
            />
          </TouchableOpacity>
        ))}
      </Card.Content>
    </Card>
  );
}
const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  },
  cardContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  taskTitle: { flex: 1, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  saveError: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metadataRow: {
    marginVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  metadataLabel: { fontWeight: '600' },
  metadataValue: { flexShrink: 1, textAlign: 'right' },
  taskImage: {
    borderRadius: qpmLayoutTokens.radius.control,
    height: 180,
    width: '100%',
    marginTop: 10
  }
});
