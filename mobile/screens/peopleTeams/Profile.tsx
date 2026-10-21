import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions
} from 'react-native';
import * as React from 'react';
import { Fragment, useContext, useEffect, useRef, useState } from 'react';
import { RootStackScreenProps } from '../../types';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Dialog,
  Divider,
  HelperText,
  Portal,
  RadioButton,
  Switch,
  Text,
  TextInput
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Formik } from 'formik';
import useAuth from '../../hooks/useAuth';
import UserSettings from '../../models/userSettings';
import { getUserInitials } from '../../utils/displayers';
import * as Yup from 'yup';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import * as ImagePicker from 'expo-image-picker';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { OwnUser } from '../../models/user';
import { formatImages } from '../../utils/overall';
import { useAppTheme } from '../../custom-theme';
import { IconWithLabel } from '../../components/IconWithLabel';
import internationalization, { supportedLanguages } from '../../i18n/i18n';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import { qpmLayoutTokens } from '../../theme/tokens';
import { createAsyncActionLock } from '../../utils/asyncActionLock';

export default function UserProfile({
  navigation,
  route
}: RootStackScreenProps<'UserProfile'>) {
  const {
    user,
    fetchUserSettings,
    patchUserSettings,
    userSettings,
    updatePassword,
    patchUser,
    deleteAccount,
    companySettings
  } = useAuth();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [changingPicture, setChangingPicture] = useState<boolean>(false);
  const [loadingUserSettings, setLoadingUserSettings] = useState(true);
  const [userSettingsLoadError, setUserSettingsLoadError] = useState(false);
  const [savingNotificationSetting, setSavingNotificationSetting] =
    useState(false);
  const [notificationSettingOverride, setNotificationSettingOverride] =
    useState<{ accessor: keyof UserSettings; value: boolean } | null>(null);
  const savingNotificationSettingRef = useRef(false);
  const loadingUserSettingsRef = useRef(false);
  const profileMountedRef = useRef(true);
  const [openChangePassword, setOpenChangePassword] = useState<boolean>();
  const [openDeleteAccountDialog, setOpenDeleteAccountDialog] =
    useState<boolean>(false);
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);
  const deletingAccountRef = useRef(false);
  const [openLanguageDialog, setOpenLanguageDialog] = useState<boolean>(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const savingLanguageRef = useRef(false);
  const changePasswordLockRef = useRef<ReturnType<
    typeof createAsyncActionLock
  > | null>(null);
  const changePasswordLock =
    changePasswordLockRef.current ??
    (changePasswordLockRef.current = createAsyncActionLock());
  const getPersistedLanguage = () =>
    (
      user.language ||
      companySettings?.generalPreferences?.language ||
      'EN'
    ).toLowerCase();
  const [selectedLanguage, setSelectedLanguage] =
    useState<string>(getPersistedLanguage);
  const { uploadFiles } = useContext(CompanySettingsContext);
  const switches: {
    title: string;
    accessor: keyof UserSettings;
  }[] = [
    {
      title: t('email_notifications'),
      accessor: 'emailNotified'
    },
    {
      title: t('email_updates_wo'),
      accessor: 'emailUpdatesForWorkOrders'
    },
    {
      title: t('email_updates_requests'),
      accessor: 'emailUpdatesForRequests'
    },
    {
      title: t('po_emails'),
      accessor: 'emailUpdatesForPurchaseOrders'
    }
  ];

  const loadUserSettings = async () => {
    if (loadingUserSettingsRef.current) return;
    loadingUserSettingsRef.current = true;
    setUserSettingsLoadError(false);
    setLoadingUserSettings(true);
    try {
      await fetchUserSettings();
    } catch (_error) {
      if (profileMountedRef.current) setUserSettingsLoadError(true);
    } finally {
      loadingUserSettingsRef.current = false;
      if (profileMountedRef.current) setLoadingUserSettings(false);
    }
  };

  useEffect(() => {
    profileMountedRef.current = true;
    void loadUserSettings();
    return () => {
      profileMountedRef.current = false;
    };
  }, []);

  const onNotificationSettingChange = async (
    accessor: keyof UserSettings,
    checked: boolean
  ) => {
    if (!userSettings || savingNotificationSettingRef.current) return;
    savingNotificationSettingRef.current = true;
    setSavingNotificationSetting(true);
    setNotificationSettingOverride({ accessor, value: checked });
    try {
      await patchUserSettings({ ...userSettings, [accessor]: checked });
      setNotificationSettingOverride(null);
    } catch (_error) {
      setNotificationSettingOverride(null);
      showSnackBar(t('an_error_occured'), 'error');
    } finally {
      savingNotificationSettingRef.current = false;
      setSavingNotificationSetting(false);
    }
  };

  const onPictureChange = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showSnackBar(t('profile_image_permission_denied'), 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 1
      });

      if (result.canceled) return;

      setChangingPicture(true);
      const files = await uploadFiles([], formatImages(result), true);
      if (!files?.[0]?.id)
        throw new Error('Profile image upload returned no file');
      await patchUser({ image: { id: files[0].id } } as Partial<OwnUser>);
      showSnackBar(t('profile_image_update_success'), 'success');
    } catch (_error) {
      showSnackBar(t('profile_image_update_failure'), 'error');
    } finally {
      setChangingPicture(false);
    }
  };

  const renderChangePassword = () => {
    return (
      <Portal theme={theme}>
        <Dialog
          visible={openChangePassword}
          onDismiss={() => setOpenChangePassword(false)}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: qpmLayoutTokens.radius.sheet
          }}
        >
          <Dialog.Title>{t('change_password')}</Dialog.Title>
          <Formik
            initialValues={{
              oldPassword: '',
              newPassword: '',
              confirmPassword: ''
            }}
            validationSchema={Yup.object().shape({
              oldPassword: Yup.string().required(t('required_old_password')),
              newPassword: Yup.string()
                .required(t('required_new_password'))
                .min(12, t('invalid_password')),
              confirmPassword: Yup.string().oneOf(
                [Yup.ref('newPassword'), null],
                t('passwords_must_match')
              )
            })}
            onSubmit={async (
              _values,
              { resetForm, setErrors, setStatus, setSubmitting }
            ) => {
              return changePasswordLock(async () => {
                setSubmitting(true);
                try {
                  await updatePassword(_values);
                  setOpenChangePassword(false);
                  showSnackBar(t('password_change_success'), 'success');
                } catch {
                  showSnackBar(t('wrong_password'), 'error');
                } finally {
                  setSubmitting(false);
                }
              });
            }}
          >
            {({
              errors,
              handleBlur,
              handleChange,
              handleSubmit,
              isSubmitting,
              touched,
              values
            }) => (
              <Fragment>
                <Dialog.Content>
                  <TextInput
                    error={Boolean(touched.oldPassword && errors.oldPassword)}
                    label={t('current_password')}
                    onBlur={handleBlur('oldPassword')}
                    onChangeText={handleChange('oldPassword')}
                    value={values.oldPassword}
                    secureTextEntry={true}
                    mode="outlined"
                  />
                  {Boolean(touched.oldPassword && errors.oldPassword) && (
                    <HelperText type="error">
                      {errors.oldPassword?.toString()}
                    </HelperText>
                  )}
                  <TextInput
                    error={Boolean(touched.newPassword && errors.newPassword)}
                    label={t('new_password')}
                    onBlur={handleBlur('newPassword')}
                    onChangeText={handleChange('newPassword')}
                    value={values.newPassword}
                    secureTextEntry={true}
                    mode="outlined"
                  />
                  {Boolean(touched.newPassword && errors.newPassword) && (
                    <HelperText type="error">
                      {errors.newPassword?.toString()}
                    </HelperText>
                  )}
                  <TextInput
                    error={Boolean(
                      touched.confirmPassword && errors.confirmPassword
                    )}
                    label={t('confirm_password')}
                    onBlur={handleBlur('confirmPassword')}
                    onChangeText={handleChange('confirmPassword')}
                    value={values.confirmPassword}
                    secureTextEntry={true}
                    mode="outlined"
                  />
                  {Boolean(
                    touched.confirmPassword && errors.confirmPassword
                  ) && (
                    <HelperText type="error">
                      {errors.confirmPassword?.toString()}
                    </HelperText>
                  )}
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={() => setOpenChangePassword(false)}>
                    {t('cancel')}
                  </Button>
                  <Button
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    onPress={() => handleSubmit()}
                  >
                    {t('change_password')}
                  </Button>
                </Dialog.Actions>
              </Fragment>
            )}
          </Formik>
        </Dialog>
      </Portal>
    );
  };

  const handleCloseDeleteAccountDialog = () => {
    if (deletingAccountRef.current) return;
    setOpenDeleteAccountDialog(false);
  };

  const handleConfirmDeleteAccount = async () => {
    if (deletingAccountRef.current) return;
    deletingAccountRef.current = true;
    setDeletingAccount(true);

    try {
      await deleteAccount();
      setOpenDeleteAccountDialog(false);
      showSnackBar(t('delete_account_email_confirmation'), 'info');
    } catch (err) {
      showSnackBar(t('account_delete_error'), 'error');
    } finally {
      deletingAccountRef.current = false;
      setDeletingAccount(false);
    }
  };

  const handleSaveLanguage = async () => {
    if (savingLanguageRef.current) return;
    savingLanguageRef.current = true;
    setSavingLanguage(true);

    try {
      await patchUser({ language: selectedLanguage.toUpperCase() as any });
      await internationalization.changeLanguage(selectedLanguage);
      setOpenLanguageDialog(false);
    } catch (_error) {
      showSnackBar(t('an_error_occured'), 'error');
    } finally {
      savingLanguageRef.current = false;
      if (profileMountedRef.current) setSavingLanguage(false);
    }
  };

  const renderLanguageDialog = () => {
    return (
      <Portal theme={theme}>
        <Dialog
          visible={openLanguageDialog}
          onDismiss={() => {
            if (!savingLanguage) {
              setSelectedLanguage(getPersistedLanguage());
              setOpenLanguageDialog(false);
            }
          }}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: qpmLayoutTokens.radius.sheet
          }}
        >
          <Dialog.Title>{t('language')}</Dialog.Title>
          <Dialog.Content>
            <ScrollView
              style={{ maxHeight: Dimensions.get('window').height * 0.5 }}
            >
              <RadioButton.Group
                onValueChange={(value) => {
                  if (!savingLanguage) setSelectedLanguage(value);
                }}
                value={selectedLanguage}
              >
                {supportedLanguages.map((language) => (
                  <RadioButton.Item
                    key={language.code}
                    label={language.label}
                    value={language.code}
                    disabled={savingLanguage}
                    style={[
                      styles.languageOption,
                      {
                        backgroundColor:
                          selectedLanguage === language.code
                            ? theme.colors.primaryContainer
                            : theme.colors.surface,
                        borderColor:
                          selectedLanguage === language.code
                            ? theme.colors.primary
                            : theme.colors.outlineVariant
                      }
                    ]}
                  />
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={savingLanguage}
              onPress={() => {
                setSelectedLanguage(getPersistedLanguage());
                setOpenLanguageDialog(false);
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              loading={savingLanguage}
              disabled={savingLanguage}
              onPress={handleSaveLanguage}
            >
              {t('save')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  const renderDeleteAccountDialog = () => {
    return (
      <Portal theme={theme}>
        <Dialog
          visible={openDeleteAccountDialog}
          onDismiss={handleCloseDeleteAccountDialog}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: qpmLayoutTokens.radius.sheet
          }}
        >
          <Dialog.Title>{t('delete_account')}</Dialog.Title>
          <Dialog.Content>
            <Text>{t('delete_account_confirmation')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              accessibilityLabel={t('cancel')}
              disabled={deletingAccount}
              onPress={handleCloseDeleteAccountDialog}
            >
              {t('cancel')}
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              accessibilityLabel={t('confirm_delete_account')}
              loading={deletingAccount}
              disabled={deletingAccount}
              onPress={handleConfirmDeleteAccount}
            >
              {t('confirm_delete_account')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };
  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: theme.colors.background
      }}
    >
      {renderChangePassword()}
      {renderLanguageDialog()}
      {renderDeleteAccountDialog()}
      <View
        style={{
          alignItems: 'center',
          paddingVertical: 30,
          backgroundColor: theme.colors.surface
        }}
      >
        {changingPicture ? (
          <ActivityIndicator size="large" />
        ) : (
          <TouchableOpacity onPress={onPictureChange}>
            {user.image ? (
              <Avatar.Image size={100} source={{ uri: user.image.url }} />
            ) : (
              <Avatar.Text
                size={100}
                label={getUserInitials(user)}
                style={{ backgroundColor: theme.colors.background }}
              />
            )}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: theme.colors.primary,
                borderRadius: 20,
                padding: 4,
                borderWidth: 2,
                borderColor: theme.colors.surface
              }}
            >
              <Avatar.Icon
                size={20}
                icon="camera"
                color={theme.colors.onPrimary}
                style={{ backgroundColor: 'transparent' }}
              />
            </View>
          </TouchableOpacity>
        )}
        <Text
          variant="headlineSmall"
          style={{ marginTop: 15, fontWeight: 'bold' }}
        >
          {`${user.firstName} ${user.lastName}`}
        </Text>
        <Text
          variant="bodyLarge"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {user.jobTitle}
        </Text>
      </View>

      <View style={styles.section}>
        <Text
          variant="titleMedium"
          style={[
            styles.sectionTitle,
            { color: theme.colors.onSurfaceVariant }
          ]}
        >
          {t('informations')}
        </Text>
        <View
          style={[
            styles.sectionContent,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
        >
          {user.email && (
            <IconWithLabel
              label={user.email}
              icon="email-outline"
              color={theme.colors.onSurfaceVariant}
            />
          )}
          {user.phone && (
            <IconWithLabel
              label={user.phone}
              icon="phone-outline"
              color={theme.colors.onSurfaceVariant}
            />
          )}
          {user.role && (
            <IconWithLabel
              label={user.role.name}
              icon="shield-account-outline"
              color={theme.colors.onSurfaceVariant}
            />
          )}
          {user.rate > 0 && (
            <IconWithLabel
              label={`${user.rate} / ${t('hour')}`}
              icon="currency-usd"
              color={theme.colors.onSurfaceVariant}
            />
          )}
        </View>
      </View>

      {user?.role.code !== 'REQUESTER' && (
        <View style={styles.section}>
          <Text
            variant="titleMedium"
            style={[
              styles.sectionTitle,
              { color: theme.colors.onSurfaceVariant }
            ]}
          >
            {t('notifications')}
          </Text>
          <View
            style={[
              styles.sectionContent,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant
              }
            ]}
          >
            {userSettingsLoadError && (
              <AsyncStateFeedback
                mode="banner"
                message={t('user_settings_load_error')}
                onRetry={() => void loadUserSettings()}
              />
            )}
            {loadingUserSettings && !userSettings && (
              <ActivityIndicator
                accessibilityLabel={t('loading')}
                color={theme.colors.primary}
              />
            )}
            {switches.map(({ title, accessor }) => (
              <Fragment key={accessor}>
                <View style={styles.switchRow}>
                  <Text variant="bodyMedium" style={{ flexShrink: 1 }}>
                    {title}
                  </Text>
                  <Switch
                    accessibilityLabel={title}
                    value={
                      notificationSettingOverride?.accessor === accessor
                        ? notificationSettingOverride.value
                        : Boolean(userSettings?.[accessor])
                    }
                    disabled={
                      !userSettings ||
                      loadingUserSettings ||
                      savingNotificationSetting
                    }
                    onValueChange={(checked) =>
                      void onNotificationSettingChange(accessor, checked)
                    }
                  />
                  {savingNotificationSetting &&
                    notificationSettingOverride?.accessor === accessor && (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.primary}
                      />
                    )}
                </View>
              </Fragment>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text
          variant="titleMedium"
          style={[
            styles.sectionTitle,
            { color: theme.colors.onSurfaceVariant }
          ]}
        >
          {t('language')}
        </Text>
        <View
          style={[
            styles.sectionContent,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
        >
          <TouchableOpacity onPress={() => setOpenLanguageDialog(true)}>
            <IconWithLabel
              label={
                supportedLanguages.find(
                  (l) =>
                    l.code ===
                    (
                      user.language ||
                      companySettings?.generalPreferences?.language ||
                      'EN'
                    ).toLowerCase()
                )?.label || 'English'
              }
              icon="translate"
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ padding: 20 }}>
        <Button
          style={{ marginBottom: 12 }}
          mode={'outlined'}
          onPress={() => setOpenChangePassword(true)}
        >
          {t('change_password')}
        </Button>
        <Button
          mode="contained"
          buttonColor={theme.colors.error}
          textColor={theme.colors.onError}
          onPress={() => setOpenDeleteAccountDialog(true)}
        >
          {t('delete_account')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {},
  sectionTitle: {
    marginHorizontal: 20,
    marginVertical: 8,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: 'bold'
  },
  sectionContent: {
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    marginHorizontal: 16
  },
  infoRow: {},
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  languageOption: {
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  }
});
