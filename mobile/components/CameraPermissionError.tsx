import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme, qpmLayoutTokens } from '../custom-theme';

type Props = {
  onRetry: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
  retrying?: boolean;
};

export default function CameraPermissionError({
  onRetry,
  onOpenSettings,
  onClose,
  retrying = false
}: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      accessibilityRole="alert"
    >
      <View
        accessible={false}
        style={[
          styles.iconContainer,
          { backgroundColor: theme.colors.errorContainer }
        ]}
      >
        <MaterialCommunityIcons
          name="camera-off-outline"
          size={28}
          color={theme.colors.onErrorContainer}
        />
      </View>
      <Text
        variant="titleLarge"
        style={[styles.title, { color: theme.colors.onSurface }]}
        accessibilityRole="header"
      >
        {t('no_access_to_camera')}
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
      >
        {t('camera_permission_explanation')}
      </Text>
      <Button
        mode="contained"
        onPress={onRetry}
        loading={retrying}
        disabled={retrying}
        style={styles.action}
        accessibilityState={{ busy: retrying, disabled: retrying }}
      >
        {t('retry')}
      </Button>
      <Button
        mode="text"
        onPress={onOpenSettings}
        disabled={retrying}
        style={styles.action}
      >
        {t('open_settings')}
      </Button>
      <Button
        mode="text"
        onPress={onClose}
        disabled={retrying}
        style={styles.action}
      >
        {t('go_back')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: qpmLayoutTokens.space.xl
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: qpmLayoutTokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: qpmLayoutTokens.space.md
  },
  title: {
    textAlign: 'center',
    marginBottom: qpmLayoutTokens.space.sm
  },
  description: {
    maxWidth: 360,
    textAlign: 'center',
    marginBottom: qpmLayoutTokens.space.lg
  },
  action: {
    minWidth: 200,
    minHeight: qpmLayoutTokens.touchTarget.minimum,
    marginBottom: qpmLayoutTokens.space.xs
  }
});
