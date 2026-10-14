import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Labor from '../../../models/labor';
import { controlTimer } from '../../../slices/labor';
import { useDispatch } from '../../../store';
import { durationToHours } from '../../../utils/formatters';
import { getErrorMessage } from '../../../utils/api';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { useAppTheme } from '../../../custom-theme';
import {
  getWorkOrderTimerColors,
  getWorkOrderTimerLabel
} from '../../../utils/workOrderTimer';

interface WorkOrderTimerFabProps {
  labor?: Labor;
  workOrderId: number;
  isExtended: boolean;
  canControl: boolean;
  isLoading: boolean;
  onTimerStarted: () => void;
}

function WorkOrderTimerFab({
  labor,
  workOrderId,
  isExtended,
  canControl,
  isLoading,
  onTimerStarted
}: WorkOrderTimerFabProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const running = labor?.status === 'RUNNING';
  const [durationLabel, setDurationLabel] = useState<string>();
  const [controlling, setControlling] = useState(false);
  const controlInFlight = useRef(false);
  const actionBusy = controlling || isLoading;
  const actionDisabled = actionBusy || !canControl;
  const timerColors = getWorkOrderTimerColors(
    theme.colors,
    running,
    actionDisabled
  );

  useEffect(() => {
    if (!labor) {
      setDurationLabel(undefined);
      return;
    }

    const updateDuration = () => {
      const elapsed = running
        ? labor.duration +
          (Date.now() - new Date(labor.startedAt).getTime()) / 1000
        : labor.duration;
      setDurationLabel(durationToHours(elapsed));
    };

    updateDuration();
    if (!running) return;

    const intervalId = setInterval(updateDuration, 1000);
    return () => clearInterval(intervalId);
  }, [labor, running]);

  const toggleTimer = useCallback(() => {
    if (controlInFlight.current || !canControl || isLoading) return;
    controlInFlight.current = true;
    setControlling(true);
    dispatch(controlTimer(!running, workOrderId))
      .then(() => {
        if (!running) onTimerStarted();
      })
      .catch((error) => showSnackBar(getErrorMessage(error), 'error'))
      .finally(() => {
        controlInFlight.current = false;
        setControlling(false);
      });
  }, [
    canControl,
    dispatch,
    isLoading,
    onTimerStarted,
    running,
    showSnackBar,
    workOrderId
  ]);

  return (
    <FAB
      icon={running ? 'stop' : 'play'}
      accessibilityLabel={
        running ? t('stop_work_order_timer') : t('start_work_order_timer')
      }
      accessibilityHint={
        isLoading
          ? t('loading')
          : !canControl
          ? t('labor_load_error')
          : durationLabel
          ? t('work_order_timer_duration', { duration: durationLabel })
          : undefined
      }
      label={getWorkOrderTimerLabel(
        isExtended,
        running,
        durationLabel,
        t('run_timer')
      )}
      disabled={actionDisabled}
      loading={actionBusy}
      accessibilityState={{
        disabled: actionDisabled,
        busy: actionBusy
      }}
      theme={theme}
      variant="primary"
      color={timerColors.foreground}
      onPress={toggleTimer}
      visible
      style={{
        position: 'absolute',
        right: 16,
        bottom: Math.max(16, insets.bottom + 8),
        backgroundColor: timerColors.background
      }}
    />
  );
}

export default memo(WorkOrderTimerFab);
