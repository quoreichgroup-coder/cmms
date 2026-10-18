import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme, qpmLayoutTokens } from '../custom-theme';

type Props = {
  onRetry: () => void;
  onClose: () => void;
  onOpenSettings?: () => void;
};

export default function CameraPreviewError({
  onRetry,
  onClose,
  onOpenSettings
}: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text
        variant="bodyLarge"
        style={[styles.message, { color: theme.colors.onSurface }]}
      >
        {t('camera_preview_error')}
      </Text>
      <Button mode="contained" onPress={onRetry} style={styles.action}>
        {t('retry')}
      </Button>
      {onOpenSettings ? (
        <Button mode="text" onPress={onOpenSettings} style={styles.action}>
          {t('open_settings')}
        </Button>
      ) : null}
      <Button mode="text" onPress={onClose} style={styles.action}>
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
  message: {
    marginBottom: qpmLayoutTokens.space.md,
    textAlign: 'center'
  },
  action: {
    minHeight: qpmLayoutTokens.touchTarget.minimum,
    justifyContent: 'center',
    marginBottom: qpmLayoutTokens.space.sm
  }
});
