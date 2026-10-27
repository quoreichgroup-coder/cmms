import {
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Collapse,
  Grid,
  IconButton,
  Link,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import Field from '../Field';
import NoteOutlinedIcon from '@mui/icons-material/NoteOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import { Task, TaskOption, TaskType } from '../../../../../models/owns/tasks';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import debounce from 'lodash.debounce';
import { getAssetUrl, getUserUrl } from '../../../../../utils/urlPaths';
import useAuth from '../../../../../hooks/useAuth';
import { PermissionEntity } from '../../../../../models/owns/role';
import { PlanFeature } from '../../../../../models/owns/subscriptionPlan';

interface SingleTaskProps {
  task: Task;
  taskNumber?: number;
  saving?: boolean;
  preview?: boolean;
  disabled?: boolean;
  handleChange?: (value: string | number, id: number) => void;
  handleSaveNotes?: (value: string, id: number) => Promise<void>;
  handleNoteChange?: (value: string, id: number) => void;
  handleSelectImages?: (id: number) => void;
  handleZoomImage?: (images: string[], image: string) => void;
  handleDeleteImage?: (id: number) => void;
  toggleNotes?: (id: number) => void;
  notes?: Map<number, boolean>;
}

export default function SingleTask({
  task,
  taskNumber,
  saving = false,
  handleChange,
  handleNoteChange,
  handleSaveNotes,
  preview,
  toggleNotes,
  notes,
  handleSelectImages,
  handleZoomImage,
  handleDeleteImage,
  disabled
}: SingleTaskProps) {
  const theme = useTheme();
  const { t }: { t: any } = useTranslation();
  const navigate = useNavigate();
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string | number>(
    task.value ?? ''
  );
  const { user, hasCreatePermission, hasDeletePermission, hasFeature } =
    useAuth();

  useEffect(() => {
    setInputValue(task.value ?? '');
  }, [task.value]);

  const latestChangeHandler = useRef(handleChange);
  useEffect(() => {
    latestChangeHandler.current = handleChange;
  }, [handleChange]);

  const debouncedChangeHandler = useMemo(
    () =>
      debounce((value: string | number, taskId: number) => {
        if (!preview) latestChangeHandler.current?.(value, taskId);
      }, 600),
    [preview]
  );
  useEffect(
    () => () => debouncedChangeHandler.cancel(),
    [debouncedChangeHandler]
  );

  const subtaskOptions = [
    { label: t('OPEN'), value: 'OPEN' },
    { label: t('IN_PROGRESS'), value: 'IN_PROGRESS' },
    { label: t('ON_HOLD'), value: 'ON_HOLD' },
    { label: t('COMPLETE'), value: 'COMPLETE' }
  ];
  const inspectionOptions = [
    { label: t('PASS'), value: 'PASS' },
    { label: t('FLAG'), value: 'FLAG' },
    { label: t('FAIL'), value: 'FAIL' }
  ];
  const taskTypeLabel = {
    SUBTASK: t('sub_task_status'),
    TEXT: t('text_field'),
    NUMBER: t('number_field'),
    INSPECTION: t('inspection_check'),
    MULTIPLE: t('multiple_choices'),
    METER: t('meter_reading')
  }[task.taskBase.taskType];
  const meterId = task.taskBase.meter?.id;

  const getOptions = (type: TaskType, options: TaskOption[]) => {
    switch (type) {
      case 'SUBTASK':
        return subtaskOptions;
      case 'INSPECTION':
        return inspectionOptions;
      case 'MULTIPLE':
        return (options ?? [])
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
  return (
    <Box
      key={task.id}
      sx={{
        mt: 1,
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: theme.palette.background.paper,
        transition: theme.transitions.create('border-color'),
        '&:hover': { borderColor: theme.palette.action.active }
      }}
    >
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        justifyContent="space-between"
        gap={1.5}
      >
        <Box
          display="flex"
          alignItems="flex-start"
          gap={1.25}
          minWidth={0}
          flex={1}
        >
          {taskNumber !== undefined && (
            <Box
              aria-hidden="true"
              sx={{
                width: 28,
                height: 28,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                backgroundColor: theme.palette.action.hover,
                color: theme.palette.text.secondary,
                fontSize: 13,
                fontWeight: 700
              }}
            >
              {taskNumber}
            </Box>
          )}
          <Box minWidth={0} flex={1}>
            <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="subtitle1" fontWeight={600}>
                {task.taskBase.label || `<${t('enter_task_name')}>`}
              </Typography>
              {task.taskBase.taskType === 'SUBTASK' && (
                <Chip
                  size="small"
                  variant="outlined"
                  color={
                    task.value === 'COMPLETE'
                      ? 'success'
                      : task.value === 'IN_PROGRESS'
                      ? 'info'
                      : task.value === 'ON_HOLD'
                      ? 'warning'
                      : 'default'
                  }
                  label={t(String(task.value || 'OPEN'))}
                />
              )}
              {task.taskBase.taskType !== 'SUBTASK' && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    task.taskBase.taskType === 'METER' &&
                    task.taskBase.meter?.unit
                      ? `${taskTypeLabel} · ${task.taskBase.meter.unit}`
                      : taskTypeLabel
                  }
                />
              )}
              {saving && (
                <Chip
                  size="small"
                  icon={<CircularProgress size={14} />}
                  label={t('saving')}
                />
              )}
            </Box>
            {['SUBTASK', 'INSPECTION', 'MULTIPLE'].includes(
              task.taskBase.taskType
            ) ? (
              <Select
                value={
                  preview
                    ? getOptions(
                        task.taskBase.taskType,
                        task.taskBase.options
                      )?.[0]?.value
                    : task?.value
                }
                size="small"
                fullWidth
                aria-label={`${task.taskBase.label || t('tasks')} — ${t(
                  'value'
                )}`}
                onChange={(event) =>
                  !preview && handleChange(event.target.value, task.id)
                }
                sx={{ mt: 1, maxWidth: 320 }}
                disabled={
                  (task.taskBase.user && task.taskBase.user.id !== user.id) ||
                  saving ||
                  disabled
                }
              >
                {getOptions(task.taskBase.taskType, task.taskBase.options).map(
                  (option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  )
                )}
              </Select>
            ) : (
              <Box sx={{ backgroundColor: theme.palette.background.paper }}>
                <TextField
                  onChange={(event) => {
                    setInputValue(event.target.value);
                    debouncedChangeHandler(event.target.value, task.id);
                  }}
                  onBlur={() => debouncedChangeHandler.flush()}
                  value={inputValue}
                  label={
                    task.taskBase.taskType === 'METER' &&
                    task.taskBase.meter?.unit
                      ? `${t('value')} (${task.taskBase.meter.unit})`
                      : t('value')
                  }
                  size="small"
                  fullWidth
                  sx={{ mt: 1, maxWidth: 320 }}
                  disabled={
                    (task.taskBase.user && task.taskBase.user.id !== user.id) ||
                    saving ||
                    disabled
                  }
                  type={
                    task.taskBase.taskType === 'METER'
                      ? 'number'
                      : (task.taskBase.taskType as 'number' | 'text')
                  }
                />
              </Box>
            )}
          </Box>
        </Box>
        <Box display="flex" alignItems="center" justifyContent="flex-end">
          {task.taskBase.taskType === 'METER' && meterId && (
            <IconButton
              aria-label={t('meter_reading')}
              onClick={() => !preview && navigate(`/app/meters/${meterId}`)}
            >
              <SpeedOutlinedIcon color="primary" />
            </IconButton>
          )}
          <Tooltip
            arrow
            placement="top"
            title={t(notes?.get(task.id) ? 'hide_notes' : 'add_notes')}
          >
            <IconButton
              aria-label={t(notes?.get(task.id) ? 'hide_notes' : 'add_notes')}
              aria-expanded={!!notes?.get(task.id)}
              onClick={() => !preview && toggleNotes(task.id)}
            >
              <NoteOutlinedIcon color="primary" />
            </IconButton>
          </Tooltip>
          <Tooltip
            arrow
            placement="top"
            title={t(
              hasCreatePermission(PermissionEntity.FILES) &&
                hasFeature(PlanFeature.FILE)
                ? 'attach_images'
                : 'upgrade_to_attach_images'
            )}
          >
            <span>
              <IconButton
                aria-label={t('attach_images')}
                onClick={() => handleSelectImages(task.id)}
                disabled={
                  preview ||
                  disabled ||
                  !(
                    hasCreatePermission(PermissionEntity.FILES) &&
                    hasFeature(PlanFeature.FILE)
                  )
                }
              >
                <AttachFileOutlinedIcon color="primary" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
      {task.taskBase.asset && (
        <Box
          display="flex"
          flexDirection="row"
          justifyContent="space-between"
          sx={{ mt: 1 }}
        >
          <Typography variant="h6" fontWeight="bold">
            {t('concerned_asset')}
          </Typography>
          <Link variant="h6" href={getAssetUrl(task.taskBase.asset.id)}>
            {task.taskBase.asset.name}
          </Link>
        </Box>
      )}
      {task.taskBase.user && (
        <Box
          display="flex"
          flexDirection="row"
          justifyContent="space-between"
          sx={{ mt: 1 }}
        >
          <Typography variant="h6" fontWeight="bold">
            {t('assigned_to')}
          </Typography>
          {task.taskBase.user.id === user.id ? (
            <Typography variant="h6">{t('me')}</Typography>
          ) : (
            <Link variant="h6" href={getUserUrl(task.taskBase.user.id)}>
              {`${task.taskBase.user.firstName} ${task.taskBase.user.lastName}`}
            </Link>
          )}
        </Box>
      )}
      <Collapse sx={{ mt: 2 }} in={preview ? false : notes.get(task.id)}>
        <Box sx={{ p: 1, backgroundColor: theme.palette.background.paper }}>
          <Field
            multiple={true}
            onChange={(event) =>
              !preview && handleNoteChange(event.target.value, task.id)
            }
            value={task.notes}
            label={t('notes')}
            type={'text'}
            name={'singleTask' + task.id.toString()}
          />
          <Button
            sx={{ mt: 1 }}
            variant="contained"
            startIcon={savingNotes ? <CircularProgress size="1rem" /> : null}
            disabled={savingNotes || disabled}
            onClick={() => {
              setSavingNotes(true);
              handleSaveNotes(task.notes, task.id).finally(() =>
                setSavingNotes(false)
              );
            }}
          >
            {t('save')}
          </Button>
        </Box>
        <Grid container spacing={1} sx={{ mt: 2 }}>
          {task.images.map((image, index) => (
            <Grid item key={image.id}>
              <ButtonBase
                aria-label={`${t('view_image')}: ${
                  task.taskBase.label || t('tasks')
                } ${index + 1}`}
                onClick={() =>
                  handleZoomImage?.(
                    task.images.map((img) => img.url),
                    image.url
                  )
                }
                sx={{
                  borderRadius: 1,
                  overflow: 'hidden',
                  '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2
                  }
                }}
              >
                <img
                  src={image.url}
                  alt={`${task.taskBase.label || t('tasks')} ${index + 1}`}
                  style={{ display: 'block', height: 150, cursor: 'pointer' }}
                />
              </ButtonBase>
              {!disabled &&
                !preview &&
                hasDeletePermission(PermissionEntity.FILES, image) && (
                  <Tooltip arrow title={t('delete')}>
                    <IconButton
                      size="small"
                      aria-label={`${t('delete')}: ${image.name}`}
                      onClick={() => handleDeleteImage?.(image.id)}
                      sx={{ ml: 0.5 }}
                    >
                      <DeleteOutlineIcon fontSize="small" color="error" />
                    </IconButton>
                  </Tooltip>
                )}
            </Grid>
          ))}
        </Grid>
      </Collapse>
    </Box>
  );
}
