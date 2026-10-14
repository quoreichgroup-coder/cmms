import { View } from 'react-native';
import React, { useContext, useEffect } from 'react';
import { IconButton, useTheme } from 'react-native-paper';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTranslation } from 'react-i18next';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';

export function AudioPlayer({ url }: { url: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const player = useAudioPlayer(url ? { uri: url } : null);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status?.playing ?? false;

  useEffect(() => {
    if (url) {
      player.replace({ uri: url });
    }
  }, [player, url]);

  useEffect(() => {
    if (status?.didJustFinish) {
      player
        .seekTo(0)
        .catch(() => showSnackBar(t('audio_playback_error'), 'error'));
    }
  }, [player, showSnackBar, status?.didJustFinish, t]);

  const playRecording = async () => {
    try {
      if (!url) return;
      player.play();
    } catch (error) {
      showSnackBar(t('audio_playback_error'), 'error');
    }
  };
  const pausePlayback = async () => {
    try {
      player.pause();
    } catch (error) {
      showSnackBar(t('audio_playback_error'), 'error');
    }
  };

  const stopPlayback = async () => {
    try {
      player.pause();
      await player.seekTo(0);
    } catch (error) {
      showSnackBar(t('audio_playback_error'), 'error');
    }
  };

  return (
    <View>
      {url && !isPlaying && (
        <IconButton
          icon="play"
          iconColor={theme.colors.primary}
          accessibilityLabel={t('play_audio')}
          onPress={playRecording}
        />
      )}
      {isPlaying && (
        <View style={{ display: 'flex', flexDirection: 'row' }}>
          <IconButton
            icon="pause"
            accessibilityLabel={t('pause_audio')}
            onPress={pausePlayback}
          />
          <IconButton
            icon="stop"
            iconColor={theme.colors.error}
            accessibilityLabel={t('stop_audio')}
            onPress={stopPlayback}
          />
        </View>
      )}
    </View>
  );
}
