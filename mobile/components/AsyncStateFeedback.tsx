import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { qpmLayoutTokens, useAppTheme } from '../custom-theme';

type AsyncStateFeedbackProps = {
  mode: 'loading' | 'error' | 'banner' | 'permissionDenied';
  message: string;
  onRetry?: () => void;
};

export default function AsyncStateFeedback({
  mode,
  message,
  onRetry
}: AsyncStateFeedbackProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  if (mode === 'loading') {
    return (
      <View
        style={[styles.loading, { backgroundColor: theme.colors.background }]}
        accessibilityRole="progressbar"
        accessibilityLabel={message}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={{ color: theme.colors.onSurfaceVariant }}>{message}</Text>
      </View>
    );
  }

  if (mode === 'banner') {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: theme.colors.errorContainer,
            borderColor: theme.colors.outlineVariant
          }
        ]}
        accessibilityRole="alert"
      >
        <Text style={{ color: theme.colors.onErrorContainer, flex: 1 }}>
          {message}
        </Text>
        {onRetry && (
          <Button compact onPress={onRetry} style={styles.retryButton}>
            {t('retry')}
          </Button>
        )}
      </View>
    );
  }

  if (mode === 'permissionDenied') {
    return (
      <View
        style={[
          styles.permissionDenied,
          { backgroundColor: theme.colors.surface }
        ]}
        accessibilityRole="alert"
      >
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          {t('permission_denied_title')}
        </Text>
        <Text
          style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
        >
          {message}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.error, { backgroundColor: theme.colors.background }]}
      accessibilityRole="alert"
    >
      <Text variant="titleMedium">{message}</Text>
      {onRetry && (
        <Button mode="contained" onPress={onRetry} style={styles.retryButton}>
          {t('retry')}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: qpmLayoutTokens.space.md
  },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: qpmLayoutTokens.space.lg,
    padding: qpmLayoutTokens.space.xl
  },
  permissionDenied: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: qpmLayoutTokens.space.sm,
    margin: qpmLayoutTokens.space.lg,
    padding: qpmLayoutTokens.space.xl,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  },
  banner: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: qpmLayoutTokens.space.sm,
    margin: qpmLayoutTokens.space.md,
    paddingHorizontal: qpmLayoutTokens.space.md,
    paddingVertical: qpmLayoutTokens.space.sm,
    borderRadius: qpmLayoutTokens.radius.control
  },
  retryButton: {
    minHeight: qpmLayoutTokens.touchTarget.minimum,
    justifyContent: 'center'
  }
});
