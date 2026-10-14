import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../custom-theme';
import { AuthStackScreenProps } from '../../types';
import { BrandWaveHeader } from './AuthenticationScreen';

export default function VerifyScreen({
  navigation
}: AuthStackScreenProps<'Verify'>) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const goToSignIn = () =>
    navigation.navigate('AuthFlow', { initialMode: 'signin' });

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <BrandWaveHeader mode="verify" onBack={goToSignIn} />
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.colors.primaryContainer }
          ]}
        >
          <Icon
            source="email-check-outline"
            size={38}
            color={theme.colors.primary}
          />
        </View>
        <Text
          variant="headlineSmall"
          accessibilityRole="header"
          style={[styles.title, { color: theme.colors.onSurface }]}
        >
          {t('auth_verify_title')}
        </Text>
        <Text
          variant="bodyLarge"
          style={[
            styles.description,
            {
              color: theme.colors.onSurfaceVariant,
              lineHeight: 24 * fontScale
            }
          ]}
        >
          {t('verify_email_description')}
        </Text>
      </View>
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outlineVariant
          }
        ]}
      >
        <Button
          mode="contained"
          onPress={goToSignIn}
          buttonColor={theme.colors.primary}
          textColor={theme.colors.onPrimary}
          contentStyle={styles.buttonContent}
          style={styles.button}
          labelStyle={styles.buttonLabel}
          accessibilityRole="button"
        >
          {t('login')}
        </Button>
        <Text
          variant="bodySmall"
          style={[
            styles.helper,
            {
              color: theme.colors.onSurfaceVariant,
              lineHeight: 18 * fontScale
            }
          ]}
        >
          {t('auth_verify_signin_hint')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 24
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22
  },
  title: { fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  description: {
    textAlign: 'center',
    maxWidth: 440
  },
  footer: {
    paddingHorizontal: 26,
    paddingTop: 14,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  button: { borderRadius: 15 },
  buttonContent: { minHeight: 48 },
  buttonLabel: { fontWeight: '800', fontSize: 14, textTransform: 'none' },
  helper: { textAlign: 'center', marginTop: 10 }
});
