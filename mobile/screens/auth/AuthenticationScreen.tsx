import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View as NativeView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { SheetManager } from 'react-native-actions-sheet';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import { AuthStackScreenProps } from '../../types';
import useAuth from '../../hooks/useAuth';
import { useDispatch, useSelector } from '../../store';
import { getInstanceConfig } from '../../slices/instanceConfig';
import { getErrorMessage, isNetworkError } from '../../utils/api';
import { phoneRegExp } from '../../utils/validators';
import { supportedLanguages } from '../../i18n/i18n';

export type AuthScreenMode = 'welcome' | 'signin' | 'signup' | 'verify';
type Mode = Exclude<AuthScreenMode, 'verify'>;
type Values = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  companyName: string;
};
type FieldName = keyof Values;

const initialValues: Values = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  companyName: ''
};

function LineField({
  label,
  value,
  onChangeText,
  error,
  secureTextEntry,
  onToggleSecure,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete,
  textContentType,
  autoCorrect
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  onToggleSecure?: () => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  autoComplete?:
    | 'email'
    | 'username'
    | 'password'
    | 'new-password'
    | 'tel'
    | 'given-name'
    | 'family-name'
    | 'organization';
  textContentType?:
    | 'emailAddress'
    | 'username'
    | 'password'
    | 'newPassword'
    | 'telephoneNumber'
    | 'givenName'
    | 'familyName'
    | 'organizationName';
  autoCorrect?: boolean;
}) {
  const theme = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const { t } = useTranslation();
  return (
    <NativeView style={styles.field}>
      <Text
        variant="labelMedium"
        style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}
      >
        {label}
      </Text>
      <TextInput
        mode="flat"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        textContentType={textContentType}
        autoCorrect={autoCorrect}
        secureTextEntry={secureTextEntry}
        error={!!error}
        underlineColor={theme.colors.controlOutline}
        activeUnderlineColor={theme.colors.primary}
        style={[
          styles.fieldInput,
          { height: Math.max(42, Math.ceil(42 * fontScale)) }
        ]}
        contentStyle={styles.fieldInputContent}
        right={
          onToggleSecure ? (
            <TextInput.Icon
              icon={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
              onPress={onToggleSecure}
              accessibilityLabel={
                secureTextEntry
                  ? t('auth_show_password')
                  : t('auth_hide_password')
              }
            />
          ) : undefined
        }
        accessibilityLabel={label}
      />
      {!!error && (
        <HelperText
          type="error"
          visible
          accessibilityLiveRegion="polite"
          style={styles.fieldError}
        >
          {error}
        </HelperText>
      )}
    </NativeView>
  );
}

function PrimaryAuthAction({
  label,
  onPress,
  loading
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Button
      mode="contained"
      onPress={onPress}
      loading={loading}
      disabled={loading}
      buttonColor={theme.colors.primary}
      textColor={theme.colors.onPrimary}
      contentStyle={styles.primaryContent}
      style={styles.primaryButton}
      labelStyle={styles.primaryLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!loading, busy: !!loading }}
    >
      {label} →
    </Button>
  );
}

export function BrandWaveHeader({
  mode,
  onBack
}: {
  mode: AuthScreenMode;
  onBack: () => void;
}) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const [heroCopyHeight, setHeroCopyHeight] = useState(0);
  const copy = {
    welcome: {
      title: t('auth_welcome_hero_title'),
      subtitle: t('auth_welcome_hero_subtitle')
    },
    signin: {
      title: t('auth_signin_hero_title'),
      subtitle: t('auth_signin_hero_subtitle')
    },
    signup: {
      title: t('auth_signup_hero_title'),
      subtitle: t('auth_signup_hero_subtitle')
    },
    verify: {
      title: t('auth_verify_hero_title'),
      subtitle: t('auth_verify_hero_subtitle')
    }
  }[mode];
  const currentLanguage = (
    i18n.resolvedLanguage || i18n.language
  ).toLowerCase();
  const selectedLanguage =
    supportedLanguages.find(({ code }) => code === currentLanguage) ??
    supportedLanguages[0];
  const languageCode = selectedLanguage.code.split(/[-_]/)[0].toUpperCase();
  const heroBarHeight = Math.max(66, Math.ceil(54 * fontScale));
  const heroHeight = Math.max(245, heroBarHeight + heroCopyHeight + 72);
  const measureHeroCopy = (event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setHeroCopyHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight
    );
  };

  return (
    <NativeView
      style={[
        styles.hero,
        { height: heroHeight, backgroundColor: theme.colors.brandHeader }
      ]}
    >
      <NativeView pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 8 }, (_, index) => (
          <NativeView
            key={index}
            style={[
              styles.contour,
              {
                top: -28 + index * 23,
                left: -58 + (index % 3) * 27,
                borderColor: 'rgba(255,255,255,0.18)',
                transform: [{ rotate: `${-9 + index * 2}deg` }]
              }
            ]}
          />
        ))}
      </NativeView>
      <NativeView style={[styles.heroBar, { height: heroBarHeight }]}>
        <Button
          compact
          mode="text"
          textColor={theme.colors.onBrandHeader}
          onPress={onBack}
          accessibilityLabel={t('auth_back')}
          style={[
            styles.backButton,
            {
              width: Math.max(44, 36 * fontScale),
              height: Math.max(44, 36 * fontScale),
              borderRadius: Math.max(22, 18 * fontScale)
            }
          ]}
          labelStyle={[
            styles.backLabel,
            {
              color: theme.colors.onBrandHeader,
              fontSize: 26 * fontScale,
              lineHeight: 28 * fontScale
            }
          ]}
        >
          ‹
        </Button>
        <NativeView style={styles.wordmark}>
          <Image
            source={require('../../assets/images/qpm-logo-white.png')}
            style={styles.brandMark}
            resizeMode="contain"
            accessible={false}
          />
          <NativeView>
            <Text
              style={[styles.brandName, { color: theme.colors.onBrandHeader }]}
            >
              QPM
            </Text>
            <Text
              style={[
                styles.brandCaption,
                { color: theme.colors.mutedOnBrandHeader }
              ]}
            >
              {t('auth_brand_caption')}
            </Text>
          </NativeView>
        </NativeView>
        <TouchableOpacity
          style={styles.languageTag}
          accessibilityRole="button"
          accessibilityLabel={`${t('language')}: ${selectedLanguage.label}`}
          accessibilityHint={t('auth_language_hint')}
          onPress={() =>
            SheetManager.show('dropdown-sheet', {
              payload: {
                items: supportedLanguages.map(({ code, label }) => ({
                  value: code,
                  label
                })),
                value: selectedLanguage.code,
                setValue: (language: string) => {
                  void i18n.changeLanguage(language);
                }
              }
            })
          }
        >
          <Text
            style={[
              styles.languageTagText,
              { color: theme.colors.onBrandHeader }
            ]}
          >
            {languageCode}
          </Text>
        </TouchableOpacity>
      </NativeView>
      <NativeView onLayout={measureHeroCopy} style={styles.heroCopy}>
        <Text
          style={[
            styles.heroKicker,
            { color: theme.colors.mutedOnBrandHeader }
          ]}
        >
          {t('auth_hero_kicker')}
        </Text>
        <Text
          variant="headlineMedium"
          style={[
            styles.heroTitle,
            {
              color: theme.colors.onBrandHeader,
              lineHeight: 32 * fontScale
            }
          ]}
        >
          {copy.title}
        </Text>
        <Text
          variant="bodySmall"
          style={[
            styles.heroSubtitle,
            {
              color: theme.colors.mutedOnBrandHeader,
              lineHeight: 17 * fontScale
            }
          ]}
        >
          {copy.subtitle}
        </Text>
      </NativeView>
      <NativeView
        style={[
          styles.waveBack,
          { backgroundColor: theme.colors.surfaceVariant }
        ]}
      />
      <NativeView
        style={[styles.waveFront, { backgroundColor: theme.colors.surface }]}
      />
    </NativeView>
  );
}

export default function AuthenticationScreen({
  navigation,
  route
}: AuthStackScreenProps<'AuthFlow'>) {
  const theme = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const dispatch = useDispatch();
  const { ldapEnabled } = useSelector((state) => state.instanceConfig);
  const [mode, setMode] = useState<Mode>(
    route.params?.initialMode ?? 'welcome'
  );
  const [values, setValues] = useState<Values>(initialValues);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  React.useEffect(() => {
    if (route.params?.initialMode) setMode(route.params.initialMode);
  }, [route.params?.initialMode]);

  React.useEffect(() => {
    dispatch(getInstanceConfig());
  }, [dispatch]);

  const update = (field: FieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFeedback('');
  };

  const validate = () => {
    const nextErrors: Partial<Record<FieldName, string>> = {};
    const required: FieldName[] =
      mode === 'signin'
        ? ['email', 'password']
        : ['firstName', 'lastName', 'email', 'password', 'companyName'];
    required.forEach((field) => {
      if (!values[field].trim()) nextErrors[field] = t('auth_required_field');
    });
    if (
      !(mode === 'signin' && ldapEnabled) &&
      values.email &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ||
        values.email.length > 255)
    ) {
      nextErrors.email = t('auth_invalid_email');
    }
    if (mode === 'signup' && values.phone && !phoneRegExp.test(values.phone)) {
      nextErrors.phone = t('auth_invalid_phone');
    }
    if (mode === 'signup' && values.password.length < 12) {
      nextErrors.password = t('auth_password_min_length', { min: 12 });
    } else if (values.password.length > (mode === 'signup' ? 128 : 255)) {
      nextErrors.password = t('auth_password_max_length', {
        max: mode === 'signup' ? 128 : 255
      });
    }
    (['firstName', 'lastName', 'companyName'] as FieldName[]).forEach(
      (field) => {
        if (values[field].length > 255)
          nextErrors[field] = t('auth_text_max_length', { max: 255 });
      }
    );
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    setFeedback('');
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === 'signin') {
        await login(values.email.trim(), values.password, ldapEnabled);
      } else {
        const requiresVerification = await register({
          email: values.email.trim(),
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phone: values.phone.trim(),
          password: values.password,
          companyName: values.companyName.trim()
        });
        if (requiresVerification) navigation.navigate('Verify');
      }
    } catch (error) {
      setFeedback(
        isNetworkError(error)
          ? t('auth_server_unreachable')
          : getErrorMessage(error) ||
              t(
                mode === 'signin'
                  ? 'auth_signin_failure'
                  : 'auth_signup_failure'
              )
      );
    } finally {
      setBusy(false);
    }
  };

  const changeMode = (next: Mode) => {
    setErrors({});
    setFeedback('');
    setShowPassword(false);
    setMode(next);
  };

  const field = (
    name: FieldName,
    label: string,
    options: Partial<React.ComponentProps<typeof LineField>> = {}
  ) => (
    <LineField
      key={name}
      label={label}
      value={values[name]}
      onChangeText={(value) => update(name, value)}
      error={errors[name]}
      {...options}
    />
  );

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <BrandWaveHeader
          mode={mode}
          onBack={() => changeMode(mode === 'signup' ? 'signin' : 'welcome')}
        />
        {mode === 'welcome' ? (
          <>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.welcomeContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.overline, { color: theme.colors.primary }]}>
                {t('auth_welcome_eyebrow')}
              </Text>
              <Text
                variant="headlineMedium"
                style={[
                  styles.pageTitle,
                  {
                    color: theme.colors.onSurface,
                    lineHeight: 33 * fontScale
                  }
                ]}
              >
                {t('auth_welcome_title_line1')}
                {'\n'}
                <Text
                  style={[styles.brandTitle, { color: theme.colors.primary }]}
                >
                  {t('auth_welcome_title_line2')}
                </Text>
              </Text>
              <Text
                style={[
                  styles.description,
                  {
                    color: theme.colors.onSurfaceVariant,
                    lineHeight: 19 * fontScale
                  }
                ]}
              >
                {t('auth_welcome_description')}
              </Text>
              <FeatureRow
                title={t('auth_feature_work_orders_title')}
                subtitle={t('auth_feature_work_orders_subtitle')}
                number="01"
              />
              <FeatureRow
                title={t('auth_feature_assets_title')}
                subtitle={t('auth_feature_assets_subtitle')}
                number="02"
              />
            </ScrollView>
            <NativeView
              style={[
                styles.footer,
                {
                  backgroundColor: theme.colors.surface,
                  borderTopColor: theme.colors.outlineVariant
                }
              ]}
            >
              <PrimaryAuthAction
                label={t('auth_signin_action')}
                onPress={() => changeMode('signin')}
              />
              {!ldapEnabled && (
                <Button mode="text" onPress={() => changeMode('signup')}>
                  {t('auth_create_company_account')}
                </Button>
              )}
              <Button
                compact
                mode="text"
                onPress={() => navigation.navigate('CustomServer')}
                textColor={theme.colors.onSurfaceVariant}
              >
                {t('auth_configure_server')}
              </Button>
            </NativeView>
          </>
        ) : (
          <>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <Text style={[styles.overline, { color: theme.colors.primary }]}>
                {t(
                  mode === 'signin'
                    ? 'auth_signin_eyebrow'
                    : 'auth_signup_eyebrow'
                )}
              </Text>
              <Text
                variant="headlineMedium"
                style={[
                  styles.pageTitle,
                  {
                    color: theme.colors.onSurface,
                    lineHeight: 33 * fontScale
                  }
                ]}
              >
                {mode === 'signin'
                  ? t('auth_signin_title')
                  : t('auth_signup_title')}
              </Text>
              <Text
                style={[
                  styles.description,
                  {
                    color: theme.colors.onSurfaceVariant,
                    lineHeight: 19 * fontScale
                  }
                ]}
              >
                {mode === 'signin'
                  ? t('auth_signin_description')
                  : t('auth_signup_required_hint')}
              </Text>
              {mode === 'signup' && (
                <NativeView style={styles.nameRow}>
                  <NativeView style={styles.nameField}>
                    {field('firstName', `${t('auth_first_name')} *`, {
                      autoCapitalize: 'words',
                      autoComplete: 'given-name',
                      textContentType: 'givenName'
                    })}
                  </NativeView>
                  <NativeView style={styles.nameField}>
                    {field('lastName', `${t('auth_last_name')} *`, {
                      autoCapitalize: 'words',
                      autoComplete: 'family-name',
                      textContentType: 'familyName'
                    })}
                  </NativeView>
                </NativeView>
              )}
              {field(
                'email',
                ldapEnabled && mode === 'signin'
                  ? t('auth_username')
                  : mode === 'signup'
                  ? `${t('email')} *`
                  : t('email'),
                {
                  keyboardType:
                    ldapEnabled && mode === 'signin'
                      ? 'default'
                      : 'email-address',
                  autoCapitalize: 'none',
                  autoComplete:
                    ldapEnabled && mode === 'signin' ? 'username' : 'email',
                  textContentType:
                    ldapEnabled && mode === 'signin'
                      ? 'username'
                      : 'emailAddress',
                  autoCorrect: false
                }
              )}
              {mode === 'signup' &&
                field('phone', t('phone'), {
                  keyboardType: 'phone-pad',
                  autoComplete: 'tel',
                  textContentType: 'telephoneNumber'
                })}
              {field(
                'password',
                mode === 'signup' ? `${t('password')} *` : t('password'),
                {
                  autoCapitalize: 'none',
                  autoComplete: mode === 'signup' ? 'new-password' : 'password',
                  textContentType:
                    mode === 'signup' ? 'newPassword' : 'password',
                  autoCorrect: false,
                  secureTextEntry: !showPassword,
                  onToggleSecure: () => setShowPassword((visible) => !visible)
                }
              )}
              {mode === 'signup' &&
                field('companyName', `${t('company_name')} *`, {
                  autoCapitalize: 'words',
                  autoComplete: 'organization',
                  textContentType: 'organizationName'
                })}
              {mode === 'signup' && (
                <NativeView
                  style={[
                    styles.accountNote,
                    { backgroundColor: theme.colors.primaryContainer }
                  ]}
                >
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.accountNoteText,
                      {
                        color: theme.colors.onPrimaryContainer,
                        lineHeight: 18 * fontScale
                      }
                    ]}
                  >
                    {t('auth_signup_availability')}
                  </Text>
                </NativeView>
              )}
              {!!feedback && (
                <Text
                  accessibilityRole="alert"
                  style={[
                    styles.feedback,
                    {
                      color: theme.colors.error,
                      lineHeight: 18 * fontScale
                    }
                  ]}
                >
                  {feedback}
                </Text>
              )}
            </ScrollView>
            <NativeView
              style={[
                styles.footer,
                {
                  backgroundColor: theme.colors.surface,
                  borderTopColor: theme.colors.outlineVariant
                }
              ]}
            >
              <PrimaryAuthAction
                label={t(
                  mode === 'signin'
                    ? 'auth_signin_action'
                    : 'auth_signup_action'
                )}
                onPress={submit}
                loading={busy}
              />
              <Text
                style={[
                  styles.switchText,
                  { color: theme.colors.onSurfaceVariant }
                ]}
              >
                {mode === 'signin' && !ldapEnabled
                  ? `${t('auth_no_account_prompt')} `
                  : mode === 'signup'
                  ? `${t('auth_has_account_prompt')} `
                  : ''}
                {(mode === 'signup' || (mode === 'signin' && !ldapEnabled)) && (
                  <Text
                    onPress={() =>
                      changeMode(mode === 'signin' ? 'signup' : 'signin')
                    }
                    style={[styles.link, { color: theme.colors.primary }]}
                    accessibilityRole="link"
                  >
                    {t(
                      mode === 'signin'
                        ? 'auth_create_account_link'
                        : 'auth_signin_action'
                    )}
                  </Text>
                )}
              </Text>
              {mode === 'signin' && (
                <Button
                  compact
                  mode="text"
                  onPress={() => navigation.navigate('CustomServer')}
                  textColor={theme.colors.onSurfaceVariant}
                >
                  {t('auth_custom_server')}
                </Button>
              )}
            </NativeView>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FeatureRow({
  title,
  subtitle,
  number
}: {
  title: string;
  subtitle: string;
  number: string;
}) {
  const theme = useAppTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <NativeView style={styles.featureRow}>
      <NativeView
        style={[
          styles.featureIcon,
          {
            borderColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surfaceVariant
          }
        ]}
      >
        <Text style={[styles.featureNumber, { color: theme.colors.primary }]}>
          {number}
        </Text>
      </NativeView>
      <NativeView>
        <Text style={[styles.featureTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
        <Text
          style={[
            styles.featureSubtitle,
            {
              color: theme.colors.onSurfaceVariant,
              lineHeight: 18 * fontScale
            }
          ]}
        >
          {subtitle}
        </Text>
      </NativeView>
    </NativeView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  flex: { flex: 1 },
  hero: { overflow: 'hidden', paddingHorizontal: 26 },
  contour: {
    position: 'absolute',
    width: 440,
    height: 78,
    borderWidth: 1,
    borderRadius: 100
  },
  heroBar: {
    height: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 18,
    justifyContent: 'center'
  },
  backLabel: { margin: 0 },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: {
    width: 31,
    height: 31
  },
  brandName: {
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1.5
  },
  brandCaption: {
    fontSize: 12,
    letterSpacing: 1.2
  },
  languageTag: {
    minWidth: qpmLayoutTokens.touchTarget.minimum,
    minHeight: qpmLayoutTokens.touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)'
  },
  languageTagText: { fontWeight: '800', fontSize: 12 },
  heroCopy: { position: 'absolute', left: 30, right: 26, bottom: 30 },
  heroKicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.7
  },
  heroTitle: { fontWeight: '800', marginTop: 8 },
  heroSubtitle: { marginTop: 4 },
  waveBack: {
    position: 'absolute',
    bottom: -42,
    left: -35,
    width: '115%',
    height: 70,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 70,
    transform: [{ rotate: '-3deg' }]
  },
  waveFront: {
    position: 'absolute',
    bottom: -54,
    left: -20,
    width: '115%',
    height: 75,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 70,
    transform: [{ rotate: '-2deg' }]
  },
  welcomeContent: { paddingHorizontal: 30, paddingTop: 19, paddingBottom: 16 },
  formContent: { paddingHorizontal: 30, paddingTop: 15, paddingBottom: 18 },
  overline: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5
  },
  pageTitle: { fontWeight: '800', marginTop: 9 },
  brandTitle: { fontWeight: '800' },
  description: {
    fontSize: 13,
    marginBottom: 15,
    marginTop: 5
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center'
  },
  featureNumber: { fontSize: 12, fontWeight: '800' },
  featureTitle: { fontSize: 12, fontWeight: '700' },
  featureSubtitle: { fontSize: 12, marginTop: 2 },
  footer: {
    paddingHorizontal: 26,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent'
  },
  primaryButton: { borderRadius: 15, elevation: 2 },
  primaryContent: { minHeight: 48 },
  primaryLabel: { fontWeight: '800', fontSize: 14, textTransform: 'none' },
  switchText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8
  },
  link: { fontWeight: '700' },
  field: { marginBottom: 8 },
  fieldLabel: { fontWeight: '700', marginBottom: 0 },
  fieldInput: { backgroundColor: 'transparent', height: 42 },
  fieldInputContent: { paddingHorizontal: 0, fontSize: 14 },
  fieldError: { marginTop: 0, marginBottom: 0 },
  nameRow: { flexDirection: 'row', gap: 14 },
  nameField: { flex: 1 },
  accountNote: {
    borderRadius: 10,
    padding: 10,
    marginTop: 2
  },
  accountNoteText: { fontSize: 12 },
  feedback: { fontSize: 12, marginTop: 5 }
});
