import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import {
  ShiftConfigurationShowDTO,
  ShiftDayConfiguration,
  ShiftException,
  UserResponseDTO
} from '../../../../models/user';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNewOutlined';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIosOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { useDispatch } from '../../../../store';
import { patchShiftConfiguration } from '../../../../slices/shiftConfiguration';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
import userSlice from '../../../../slices/user';
import ConfirmDialog from '../../components/ConfirmDialog';

const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
];
const MAX_DAILY_AVAILABILITY_MINUTES = 24 * 60;

const getMinutesUntilMidnight = (startTime: string) => {
  const match = /^(?:([01]\d|2[0-3])):([0-5]\d)$/.exec(startTime);
  return match
    ? MAX_DAILY_AVAILABILITY_MINUTES - Number(match[1]) * 60 - Number(match[2])
    : MAX_DAILY_AVAILABILITY_MINUTES;
};

const getInitialConfiguration = (
  configuration?: ShiftConfigurationShowDTO
) => ({
  enabled: configuration?.enabled ?? true,
  days: DAYS_OF_WEEK.map((day) => {
    const savedDay = configuration?.days?.find(
      (item) => item.dayOfWeek === day
    );
    return savedDay
      ? { ...savedDay, startTime: savedDay.startTime ?? '08:00' }
      : {
          dayOfWeek: day,
          availabilityMinutes: 0,
          startTime: '08:00',
          enabled: false
        };
  }),
  exceptions:
    configuration?.exceptions?.map((exception) => ({
      ...exception,
      startTime: exception.startTime ?? '08:00'
    })) ?? []
});

interface DayRowProps {
  dayOfWeek: string;
  date?: string;
  saving: boolean;
  enabled: boolean;
  startTime: string;
  hours: number;
  minutes: number;
  onToggle: (enabled: boolean) => void;
  onStartTimeChange: (startTime: string) => void;
  onHoursChange: (hours: number) => void;
  onMinutesChange: (minutes: number) => void;
  onClearOverride?: () => void;
}

function DayRow({
  dayOfWeek,
  date,
  saving,
  enabled,
  startTime,
  hours,
  minutes,
  onToggle,
  onStartTimeChange,
  onHoursChange,
  onMinutesChange,
  onClearOverride
}: DayRowProps) {
  const { t }: { t: any } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);

  const handleHoursChange = (value: string) => {
    const num = Number(value);
    if (
      Number.isInteger(num) &&
      num >= 0 &&
      num <= Math.floor((getMinutesUntilMidnight(startTime) - minutes) / 60)
    ) {
      onHoursChange(num);
    } else if (value === '') {
      onHoursChange(0);
    }
  };

  const handleMinutesChange = (value: string) => {
    const maxMinutes = Math.min(
      59,
      getMinutesUntilMidnight(startTime) - hours * 60
    );
    const num = Number(value);
    if (Number.isInteger(num) && num >= 0 && num <= maxMinutes) {
      onMinutesChange(num);
    } else if (value === '') {
      onMinutesChange(0);
    }
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent={'space-between'}
      spacing={2}
      sx={{ py: 1, px: 2 }}
    >
      <Stack direction="row" alignItems="center" sx={{ minWidth: 0 }}>
        <Switch
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={saving}
          inputProps={{
            'aria-label': `${t(dayOfWeek.toLowerCase())} ${
              date ? getFormattedDate(date, true) : ''
            } ${t('capacity_available')}`
          }}
        />
        <Typography sx={{ minWidth: date ? 90 : 90, fontWeight: 500 }}>
          {t(dayOfWeek.toLowerCase())}
        </Typography>
        {date && (
          <Typography sx={{ minWidth: 90, color: 'text.secondary' }}>
            {getFormattedDate(date, true)}
          </Typography>
        )}
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          width: { xs: '100%', sm: 'auto' },
          pl: { xs: 6, sm: 0 },
          flexWrap: 'wrap',
          '& > :first-of-type': { flexBasis: { xs: '100%', sm: 130 } },
          '& > :nth-of-type(2), & > :nth-of-type(3)': {
            flex: { xs: '1 1 65px', sm: '0 0 90px' }
          }
        }}
      >
        <TextField
          type="time"
          label={t('work_start_time')}
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value || '08:00')}
          disabled={!enabled || saving}
          size="small"
          sx={{ width: { xs: '100%', sm: 130 } }}
          inputProps={{ 'aria-label': `${dayOfWeek} ${t('work_start_time')}` }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="number"
          value={hours}
          onChange={(e) => handleHoursChange(e.target.value)}
          disabled={!enabled || saving}
          size="small"
          sx={{ width: { xs: '100%', sm: 90 } }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {t('hours_abbrev')}
              </InputAdornment>
            )
          }}
          inputProps={{
            min: 0,
            max: Math.floor(
              (getMinutesUntilMidnight(startTime) - minutes) / 60
            ),
            step: 1,
            style: { textAlign: 'right' },
            'aria-label': `${t(dayOfWeek.toLowerCase())} ${t('hours_abbrev')}`
          }}
        />
        <TextField
          type="number"
          value={minutes}
          onChange={(e) => handleMinutesChange(e.target.value)}
          disabled={!enabled || saving}
          size="small"
          sx={{ width: { xs: '100%', sm: 90 } }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {t('minutes_abbrev')}
              </InputAdornment>
            )
          }}
          inputProps={{
            min: 0,
            max: Math.min(59, getMinutesUntilMidnight(startTime) - hours * 60),
            step: 1,
            style: { textAlign: 'right' },
            'aria-label': `${t(dayOfWeek.toLowerCase())} ${t('minutes_abbrev')}`
          }}
        />
        {onClearOverride && (
          <Tooltip title={t('clear_capacity_override')}>
            <IconButton
              size="small"
              onClick={onClearOverride}
              disabled={saving}
              aria-label={t('clear_capacity_override')}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {enabled && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            {t('capacity_end_by_midnight')}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

interface PropsType {
  user: UserResponseDTO;
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

function ShiftConfigurationModal({ user, open, onClose, onSave }: PropsType) {
  const { t }: { t: any } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const dispatch = useDispatch();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [currentTab, setCurrentTab] = useState<string>('default');
  const [enabled, setEnabled] = useState<boolean>(
    () => getInitialConfiguration(user.shiftConfiguration).enabled
  );
  const [days, setDays] = useState<ShiftDayConfiguration[]>(
    () => getInitialConfiguration(user.shiftConfiguration).days
  );
  const [exceptions, setExceptions] = useState<ShiftException[]>(
    () => getInitialConfiguration(user.shiftConfiguration).exceptions
  );
  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    JSON.stringify(getInitialConfiguration(user.shiftConfiguration))
  );
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial = getInitialConfiguration(user.shiftConfiguration);
    setEnabled(initial.enabled);
    setDays(initial.days);
    setExceptions(initial.exceptions);
    setInitialSnapshot(JSON.stringify(initial));
    setConfirmDiscard(false);
  }, [open, user.id, user.shiftConfiguration]);

  const handleTabsChange = (_event: React.ChangeEvent<{}>, value: string) => {
    setCurrentTab(value);
  };

  const handleDayToggle = (dayOfWeek: string, enabled: boolean) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              enabled,
              availabilityMinutes: enabled
                ? Math.min(
                    day.availabilityMinutes,
                    getMinutesUntilMidnight(day.startTime)
                  )
                : day.availabilityMinutes
            }
          : day
      )
    );
  };

  const handleDayStartTimeChange = (dayOfWeek: string, startTime: string) => {
    const maxMinutes = getMinutesUntilMidnight(startTime);
    setDays((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              startTime,
              availabilityMinutes: Math.min(day.availabilityMinutes, maxMinutes)
            }
          : day
      )
    );
  };

  const handleDayHoursChange = (dayOfWeek: string, hours: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? {
              ...d,
              availabilityMinutes: hours * 60 + (d.availabilityMinutes % 60)
            }
          : d
      )
    );
  };

  const handleDayMinutesChange = (dayOfWeek: string, minutes: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? {
              ...d,
              availabilityMinutes:
                Math.floor(d.availabilityMinutes / 60) * 60 + minutes
            }
          : d
      )
    );
  };

  const getDefaultDayForDate = (date: string) => {
    const weekdayIndex = new Date(`${date}T12:00:00`).getDay();
    const dayOfWeek = DAYS_OF_WEEK[weekdayIndex === 0 ? 6 : weekdayIndex - 1];
    return days.find((day) => day.dayOfWeek === dayOfWeek);
  };

  const handleExceptionToggle = (date: string, enabled: boolean) => {
    setExceptions((prev) => {
      const existing = prev.find((e) => e.exceptionDate === date);
      if (existing) {
        return prev.map((e) =>
          e.exceptionDate === date
            ? {
                ...e,
                enabled,
                availabilityMinutes: enabled
                  ? Math.min(
                      e.availabilityMinutes,
                      getMinutesUntilMidnight(e.startTime)
                    )
                  : e.availabilityMinutes
              }
            : e
        );
      }
      const defaultDay = getDefaultDayForDate(date);
      return [
        ...prev,
        {
          exceptionDate: date,
          enabled,
          availabilityMinutes: enabled
            ? Math.min(
                defaultDay?.availabilityMinutes ?? 0,
                getMinutesUntilMidnight(defaultDay?.startTime ?? '08:00')
              )
            : defaultDay?.availabilityMinutes ?? 0,
          startTime: defaultDay?.startTime ?? '08:00'
        }
      ];
    });
  };

  const handleExceptionStartTimeChange = (date: string, startTime: string) => {
    const maxMinutes = getMinutesUntilMidnight(startTime);
    setExceptions((prev) => {
      const existing = prev.find(
        (exception) => exception.exceptionDate === date
      );
      if (existing) {
        return prev.map((exception) =>
          exception.exceptionDate === date
            ? {
                ...exception,
                startTime,
                availabilityMinutes: Math.min(
                  exception.availabilityMinutes,
                  maxMinutes
                )
              }
            : exception
        );
      }
      const defaultDay = getDefaultDayForDate(date);
      return [
        ...prev,
        {
          exceptionDate: date,
          availabilityMinutes: Math.min(
            defaultDay?.availabilityMinutes ?? 0,
            maxMinutes
          ),
          startTime,
          enabled: true
        }
      ];
    });
  };

  const handleExceptionHoursChange = (date: string, hours: number) => {
    setExceptions((prev) => {
      const existing = prev.find((e) => e.exceptionDate === date);
      if (existing) {
        return prev.map((e) =>
          e.exceptionDate === date
            ? {
                ...e,
                availabilityMinutes: hours * 60 + (e.availabilityMinutes % 60)
              }
            : e
        );
      }
      return [
        ...prev,
        {
          exceptionDate: date,
          availabilityMinutes: hours * 60,
          startTime: getDefaultDayForDate(date)?.startTime ?? '08:00',
          enabled: true
        }
      ];
    });
  };

  const handleExceptionMinutesChange = (date: string, minutes: number) => {
    setExceptions((prev) => {
      const existing = prev.find((e) => e.exceptionDate === date);
      if (existing) {
        return prev.map((e) =>
          e.exceptionDate === date
            ? {
                ...e,
                availabilityMinutes:
                  Math.floor(e.availabilityMinutes / 60) * 60 + minutes
              }
            : e
        );
      }
      return [
        ...prev,
        {
          exceptionDate: date,
          availabilityMinutes: minutes,
          startTime: getDefaultDayForDate(date)?.startTime ?? '08:00',
          enabled: true
        }
      ];
    });
  };

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const getExceptionForDate = (dateStr: string) => {
    return exceptions.find((e) => e.exceptionDate === dateStr);
  };

  const totalWeeklyMinutes = enabled
    ? days
        .filter((d) => d.enabled)
        .reduce((sum, d) => sum + d.availabilityMinutes, 0)
    : 0;
  const totalHours = Math.floor(totalWeeklyMinutes / 60);
  const totalMins = totalWeeklyMinutes % 60;
  const totalCustomWeekMinutes = enabled
    ? weekDays.reduce((sum, weekDay) => {
        const dateStr = format(weekDay, 'yyyy-MM-dd');
        const dayOfWeek =
          DAYS_OF_WEEK[weekDay.getDay() === 0 ? 6 : weekDay.getDay() - 1];
        const defaultDay = days.find((day) => day.dayOfWeek === dayOfWeek);
        const exception = getExceptionForDate(dateStr);
        const dayEnabled = exception?.enabled ?? defaultDay?.enabled ?? false;
        const availability =
          exception?.availabilityMinutes ??
          defaultDay?.availabilityMinutes ??
          0;
        return sum + (dayEnabled ? availability : 0);
      }, 0)
    : 0;
  const totalCustomWeekHours = Math.floor(totalCustomWeekMinutes / 60);
  const totalCustomWeekMins = totalCustomWeekMinutes % 60;
  const currentSnapshot = JSON.stringify({ enabled, days, exceptions });
  const hasUnsavedChanges = currentSnapshot !== initialSnapshot;

  const requestClose = () => {
    if (saving) return;
    if (hasUnsavedChanges) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await dispatch(
        patchShiftConfiguration(user.id, { days, exceptions, enabled })
      );
      dispatch(
        userSlice.actions.editUser({
          user: {
            ...user,
            shiftConfiguration: {
              ...user.shiftConfiguration,
              days,
              exceptions,
              enabled
            } as ShiftConfigurationShowDTO
          }
        })
      );
      showSnackBar(t('changes_saved_success'), 'success');
      setInitialSnapshot(currentSnapshot);
      onSave?.();
      onClose();
    } catch {
      showSnackBar(t('shift_capacity_save_error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog fullWidth maxWidth="sm" fullScreen={fullScreen} open={open} onClose={requestClose}>
      <DialogTitle sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>
            {t('customize_shift')} ({user.firstName + ' ' + user.lastName})
          </Typography>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography variant="body2">{t('capacity_enabled_state')}</Typography>
            <Switch
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={saving}
              inputProps={{ 'aria-label': t('capacity_enabled') }}
            />
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 0, pb: 1 }}>
        <Alert severity="info" sx={{ borderRadius: 1 }}>
          {t('shift_capacity_not_roster')}
        </Alert>
        {enabled &&
          !days.some((day) => day.enabled && day.availabilityMinutes > 0) && (
            <Alert severity="warning" sx={{ mt: 1, borderRadius: 1 }}>
              {t('capacity_not_configured_help')}
            </Alert>
          )}
        {!enabled && (
          <Alert severity="warning" sx={{ mt: 1, borderRadius: 1 }}>
            {t('capacity_schedule_disabled_help')}
          </Alert>
        )}
      </DialogContent>
      <Tabs
        value={currentTab}
        onChange={handleTabsChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ px: { xs: 1, sm: 3 }, '& .MuiTab-root': { minWidth: { xs: 130, sm: 160 } } }}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab label={t('default_schedule')} value="default" disabled={saving} />
        <Tab
          label={t('custom_capacity_by_week')}
          value="custom"
          disabled={saving}
        />
      </Tabs>
      <DialogContent sx={{ p: { xs: 0.5, sm: 1 } }}>
        {currentTab === 'default' && (
          <Box>
            {days.map((day) => (
              <DayRow
                key={day.dayOfWeek}
                dayOfWeek={day.dayOfWeek}
                saving={saving}
                enabled={day.enabled}
                startTime={day.startTime ?? '08:00'}
                hours={Math.floor(day.availabilityMinutes / 60)}
                minutes={day.availabilityMinutes % 60}
                onToggle={(enabled) => handleDayToggle(day.dayOfWeek, enabled)}
                onStartTimeChange={(startTime) =>
                  handleDayStartTimeChange(day.dayOfWeek, startTime)
                }
                onHoursChange={(hours) =>
                  handleDayHoursChange(day.dayOfWeek, hours)
                }
                onMinutesChange={(minutes) =>
                  handleDayMinutesChange(day.dayOfWeek, minutes)
                }
              />
            ))}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ textAlign: 'right', px: 2 }}>
              {t('total_weekly_capacity', {
                hours: totalHours,
                minutes: totalMins
              })}
            </Typography>
          </Box>
        )}
        {currentTab === 'custom' && (
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="center"
              spacing={2}
              sx={{ mb: 2, px: { xs: 0.5, sm: 0 } }}
            >
              <IconButton
                onClick={() => setWeekStart((prev) => subWeeks(prev, 1))}
                disabled={saving}
                aria-label={t('previous_week')}
              >
                <ArrowBackIosNewIcon />
              </IconButton>
              <Typography
                variant="subtitle1"
                sx={{ minWidth: 0, flex: 1, textAlign: 'center', fontSize: { xs: '0.9rem', sm: '1rem' } }}
              >
                {getFormattedDate(format(weekDays[0], 'yyyy-MM-dd'), true)} -{' '}
                {getFormattedDate(format(weekDays[6], 'yyyy-MM-dd'), true)}
              </Typography>
              <IconButton
                onClick={() => setWeekStart((prev) => addWeeks(prev, 1))}
                disabled={saving}
                aria-label={t('next_week')}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </Stack>
            {weekDays.map((weekDay) => {
              const dateStr = format(weekDay, 'yyyy-MM-dd');
              const equivalentDayOfWeek = days.find(
                (day) =>
                  day.dayOfWeek ===
                  DAYS_OF_WEEK[
                    weekDay.getDay() === 0 ? 6 : weekDay.getDay() - 1
                  ]
              );
              const exception = getExceptionForDate(dateStr);
              const isEnabled = exception
                ? exception.enabled
                : equivalentDayOfWeek!.enabled;
              const minutes =
                exception?.availabilityMinutes ??
                equivalentDayOfWeek!.availabilityMinutes;
              const startTime =
                exception?.startTime ??
                equivalentDayOfWeek!.startTime ??
                '08:00';
              return (
                <DayRow
                  key={dateStr}
                  saving={saving}
                  dayOfWeek={
                    DAYS_OF_WEEK[
                      weekDay.getDay() === 0 ? 6 : weekDay.getDay() - 1
                    ]
                  }
                  date={dateStr}
                  enabled={isEnabled}
                  startTime={startTime}
                  hours={Math.floor(minutes / 60)}
                  minutes={minutes % 60}
                  onToggle={(enabled) =>
                    handleExceptionToggle(dateStr, enabled)
                  }
                  onStartTimeChange={(startTime) =>
                    handleExceptionStartTimeChange(dateStr, startTime)
                  }
                  onHoursChange={(hours) =>
                    handleExceptionHoursChange(dateStr, hours)
                  }
                  onMinutesChange={(minutes) =>
                    handleExceptionMinutesChange(dateStr, minutes)
                  }
                  onClearOverride={
                    exception
                      ? () =>
                          setExceptions((prev) =>
                            prev.filter(
                              (item) => item.exceptionDate !== dateStr
                            )
                          )
                      : undefined
                  }
                />
              );
            })}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ textAlign: 'right', px: 2 }}>
              {t('total_weekly_capacity', {
                hours: totalCustomWeekHours,
                minutes: totalCustomWeekMins
              })}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" onClick={requestClose} disabled={saving}>
          {t('cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges}
        >
          {saving ? t('saving') : t('save')}
        </Button>
      </Box>
      <ConfirmDialog
        open={confirmDiscard}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        confirmText={t('discard_changes')}
        question={t('discard_changes_question')}
      />
    </Dialog>
  );
}

export default ShiftConfigurationModal;
