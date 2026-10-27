import React, { useMemo, useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text as NativeText,
  TouchableOpacity,
  Alert,
  Linking,
  StyleSheet
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IFile } from '../../models/file';
import { IconButton, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import {
  AudioQuality,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  type RecordingOptions
} from 'expo-audio';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';

export default function AudioRecorder({
  title,
  onChange,
  onRecordingChange,
  disabled = false,
  disabledMessage
}: {
  title: string;
  onChange: (audio: IFile) => void;
  onRecordingChange?: (recording: boolean) => void;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  const [recordingURI, setRecordingURI] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<
    'idle' | 'playing' | 'paused'
  >('idle');
  const [recordingActionBusy, setRecordingActionBusy] = useState(false);
  const recordingActionBusyRef = useRef(false);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const recordingOptions = useMemo<RecordingOptions>(
    () => ({
      extension: '.m4a',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      android: {
        extension: '.m4a',
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
        sampleRate: 44100
      },
      ios: {
        extension: '.m4a',
        outputFormat: IOSOutputFormat.MPEG4AAC,
        audioQuality: AudioQuality.MEDIUM,
        sampleRate: 44100
      },
      web: {}
    }),
    []
  );
  const recorder = useAudioRecorder(recordingOptions);
  const player = useAudioPlayer(recordingURI ? { uri: recordingURI } : null);
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    if (recordingURI) {
      player.replace({ uri: recordingURI });
    }
  }, [player, recordingURI]);

  useEffect(() => {
    if (!playerStatus) return;

    if (playerStatus.didJustFinish) {
      player.pause();
      player
        .seekTo(0)
        .catch(() => showSnackBar(t('audio_playback_error'), 'error'));
      setPlaybackStatus('idle');
      return;
    }

    if (playerStatus.playing) {
      setPlaybackStatus('playing');
    } else if (playerStatus.currentTime > 0) {
      setPlaybackStatus('paused');
    } else {
      setPlaybackStatus('idle');
    }
  }, [player, playerStatus, showSnackBar, t]);

  const startRecording = async () => {
    if (recordingActionBusyRef.current || isRecording) return;
    recordingActionBusyRef.current = true;
    setRecordingActionBusy(true);
    try {
      const permissionResponse = await requestRecordingPermissionsAsync();

      if (permissionResponse.status !== 'granted') {
        const actions = permissionResponse.canAskAgain
          ? [{ text: t('ok') }]
          : [
              { text: t('cancel'), style: 'cancel' as const },
              {
                text: t('open_settings'),
                onPress: () => {
                  void Linking.openSettings().catch(() =>
                    showSnackBar(t('an_error_occured'), 'error')
                  );
                }
              }
            ];
        Alert.alert(
          t('permission_denied_title'),
          t('permission_denied_message', { permission: t('microphone') }),
          actions
        );
        return;
      }

      // Set audio mode
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false
      });
      setPlaybackStatus('idle');
      setRecordingURI(null);

      await recorder.prepareToRecordAsync(recordingOptions);
      recorder.record();
      setIsRecording(true);
      onRecordingChange?.(true);
    } catch (_error) {
      showSnackBar(t('audio_recording_error'), 'error');
    } finally {
      recordingActionBusyRef.current = false;
      setRecordingActionBusy(false);
    }
  };

  const stopRecording = async () => {
    if (recordingActionBusyRef.current || !isRecording) return;
    recordingActionBusyRef.current = true;
    setRecordingActionBusy(true);
    try {
      await recorder.stop();
      setIsRecording(false);
      onRecordingChange?.(false);
      const uri = recorder.uri;
      if (uri) {
        setRecordingURI(uri);
        const sanitizedTitle = title
          ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
          : 'audio_recording';
        onChange({
          uri,
          name: `${sanitizedTitle}.m4a`,
          type: 'audio/m4a'
        });
      }
    } catch (_error) {
      showSnackBar(t('audio_recording_error'), 'error');
    } finally {
      recordingActionBusyRef.current = false;
      setRecordingActionBusy(false);
    }
  };

  const playRecording = async () => {
    try {
      if (!recordingURI) return;

      player.play();
    } catch (_error) {
      showSnackBar(t('audio_playback_error'), 'error');
    }
  };

  const pausePlayback = async () => {
    try {
      player.pause();
    } catch (_error) {
      showSnackBar(t('audio_playback_error'), 'error');
    }
  };

  const stopPlayback = async () => {
    try {
      player.pause();
      await player.seekTo(0);
    } catch (_error) {
      showSnackBar(t('audio_playback_error'), 'error');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text
        variant="titleSmall"
        style={{ color: theme.colors.onSurfaceVariant }}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {disabledMessage ? (
        <Text
          variant="bodySmall"
          accessibilityRole="text"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
        >
          {disabledMessage}
        </Text>
      ) : null}
      <TouchableOpacity
        onPress={isRecording ? stopRecording : startRecording}
        disabled={disabled || recordingActionBusy}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={
          isRecording ? t('stop_recording') : t('start_recording')
        }
        accessibilityState={{
          busy: recordingActionBusy,
          disabled: disabled || recordingActionBusy
        }}
        accessibilityHint={
          disabled
            ? disabledMessage ?? t('form_submission_in_progress')
            : undefined
        }
        style={[
          styles.recordButton,
          disabled && styles.disabledRecordButton,
          {
            backgroundColor: isRecording
              ? theme.colors.errorContainer
              : theme.colors.primaryContainer
          }
        ]}
      >
        <MaterialCommunityIcons
          name="microphone"
          color={isRecording ? theme.colors.error : theme.colors.primary}
          size={28}
          accessible={false}
        />
        <NativeText
          style={{ color: theme.colors.onSurface }}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {isRecording ? t('stop_recording') : t('start_recording')}
        </NativeText>
      </TouchableOpacity>

      {recordingURI && (
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          {playbackStatus !== 'playing' && (
            <IconButton
              icon="play"
              iconColor={theme.colors.primary}
              accessibilityLabel={t('play_audio')}
              onPress={playRecording}
            />
          )}
          {playbackStatus === 'playing' && (
            <IconButton
              icon="pause"
              accessibilityLabel={t('pause_audio')}
              onPress={pausePlayback}
            />
          )}
          {(playbackStatus === 'playing' || playbackStatus === 'paused') && (
            <IconButton
              icon="stop"
              iconColor={theme.colors.error}
              accessibilityLabel={t('stop_audio')}
              onPress={stopPlayback}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recordButton: {
    minWidth: 64,
    minHeight: 64,
    padding: qpmLayoutTokens.space.sm,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    alignItems: 'center',
    justifyContent: 'center',
    gap: qpmLayoutTokens.space.xs
  },
  disabledRecordButton: { opacity: 0.55 }
});
