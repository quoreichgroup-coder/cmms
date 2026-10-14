import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { qpmLayoutTokens, useAppTheme } from '../custom-theme';
import AsyncStateFeedback from './AsyncStateFeedback';

type DirectoryPaginationFooterProps = {
  loading: boolean;
  error: boolean;
  errorMessage?: string;
  loadingMessage?: string;
  onRetry: () => void;
};

export default function DirectoryPaginationFooter({
  loading,
  error,
  errorMessage,
  loadingMessage,
  onRetry
}: DirectoryPaginationFooterProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const message = loadingMessage ?? t('loading');

  if (error) {
    return (
      <AsyncStateFeedback
        mode="banner"
        message={errorMessage ?? t('directory_load_error')}
        onRetry={onRetry}
      />
    );
  }

  if (!loading) return null;

  return (
    <View
      style={styles.loading}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <ActivityIndicator color={theme.colors.primary} size="small" />
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: qpmLayoutTokens.space.md,
    paddingHorizontal: qpmLayoutTokens.space.lg,
    paddingVertical: qpmLayoutTokens.space.md
  }
});
