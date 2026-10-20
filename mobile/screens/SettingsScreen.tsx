import { ScrollView, StyleSheet } from 'react-native';
import { View } from '../components/Themed';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Dialog,
  List,
  Portal,
  SegmentedButtons,
  Text,
  useTheme
} from 'react-native-paper';
import useAuth from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { getUserInitials } from '../utils/displayers';
import * as React from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import { RootStackScreenProps } from '../types';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';
import { PermissionEntity } from '../models/role';
import {
  AppearancePreference,
  useAppearance
} from '../contexts/AppearanceContext';
import Tag from '../components/Tag';
import { getStatusColor, getStatusForegroundColor } from '../utils/overall';
import { qpmLayoutTokens } from '../theme/tokens';

export default function SettingsScreen({
  navigation
}: RootStackScreenProps<'Settings'>) {
  const theme = useTheme();
  const { preference, setPreference, resetPreference } = useAppearance();
  const { user, switchAccount, logout, hasViewPermission } = useAuth();
  const canViewCompanySettings =
    user?.ownsCompany || hasViewPermission(PermissionEntity.SETTINGS);
  const [switchingAccount, setSwitchingAccount] = useState<boolean>(false);
  const switchingAccountRef = useRef(false);
  const { t } = useTranslation();
  const [versionPressCount, setVersionPressCount] = useState<number>(0);
  const [openLogout, setOpenLogout] = useState<boolean>(false);
  const [openDevInfo, setOpenDevInfo] = useState<boolean>(false);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [devMode, setDevMode] = useState<boolean>(false);
  const handleSwitchAccount = async (accountId: number) => {
    if (switchingAccountRef.current) return;
    switchingAccountRef.current = true;
    setSwitchingAccount(true);
    try {
      await switchAccount(accountId);
    } catch (_error) {
      showSnackBar(t('an_error_occured'), 'error');
    } finally {
      switchingAccountRef.current = false;
      setSwitchingAccount(false);
    }
  };
  useEffect(() => {
    if (versionPressCount > 2 && versionPressCount < 6) {
      showSnackBar(`Dev mode in ${6 - versionPressCount}`, 'info');
    } else if (versionPressCount === 6) {
      setOpenDevInfo(true);
      setDevMode(true);
      setVersionPressCount(0);
    }
  }, [versionPressCount]);
  const renderConfirmLogout = () => {
    return (
      <Portal theme={theme}>
        <Dialog visible={openLogout} onDismiss={() => setOpenLogout(false)}>
          <Dialog.Title>{t('confirmation')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('confirm_logout')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOpenLogout(false)}>{t('cancel')}</Button>
            <Button onPress={logout}>{t('Sign out')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };
  const renderDevInfo = () => {
    return (
      <Portal theme={theme}>
        <Dialog visible={openDevInfo} onDismiss={() => setOpenDevInfo(false)}>
          <Dialog.Title>{t('Dev Info')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="titleMedium">{t('Build ID')}</Text>
            <Text variant="bodyMedium">{Updates.updateId}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOpenDevInfo(false)}>{t('cancel')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      {renderConfirmLogout()}
      {renderDevInfo()}
      <View style={styles.group}>
        <View
          style={[
            styles.appearanceCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
        >
          <Text variant="titleMedium" style={styles.appearanceTitle}>
            {t('appearance')}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
          >
            {t('appearance_description')}
          </Text>
          <SegmentedButtons
            value={preference}
            onValueChange={(value) => {
              void setPreference(value as AppearancePreference).catch(() =>
                showSnackBar(t('appearance_save_failure'), 'error')
              );
            }}
            buttons={[
              {
                value: 'system',
                label: t('appearance_system'),
                style: styles.appearanceOption
              },
              {
                value: 'light',
                label: t('appearance_light'),
                style: styles.appearanceOption
              },
              {
                value: 'dark',
                label: t('appearance_dark'),
                style: styles.appearanceOption
              }
            ]}
          />
          {preference !== 'system' && (
            <Button
              compact
              mode="text"
              onPress={() => {
                void resetPreference().catch(() =>
                  showSnackBar(t('appearance_save_failure'), 'error')
                );
              }}
              style={styles.resetAppearance}
            >
              {t('appearance_reset')}
            </Button>
          )}
          <View
            style={[
              styles.appearancePreview,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.outlineVariant
              }
            ]}
          >
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onSurface }}
            >
              {t('appearance_preview')}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t('appearance_preview_caption')}
            </Text>
            <View
              style={[
                styles.previewWorkOrder,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant
                }
              ]}
            >
              <View style={styles.previewWorkOrderHeader}>
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {t('appearance_preview_work_order_id')}
                </Text>
                <Tag
                  text={t('IN_PROGRESS')}
                  color={getStatusForegroundColor('IN_PROGRESS', theme)}
                  backgroundColor={getStatusColor('IN_PROGRESS', theme)}
                />
              </View>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.onSurface }}
              >
                {t('appearance_preview_work_order')}
              </Text>
              <View
                style={[
                  styles.previewAction,
                  { backgroundColor: theme.colors.primary }
                ]}
                accessible
                accessibilityRole="text"
                accessibilityLabel={t('appearance_preview_action')}
              >
                <Text
                  variant="labelLarge"
                  style={{ color: theme.colors.onPrimary }}
                >
                  {t('appearance_preview_action')}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <List.Item
          style={[
            styles.settingItem,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
          left={(props) => <List.Icon {...props} icon="play-circle-outline" />}
          title={t('onboarding_replay')}
          description={t('onboarding_replay_description')}
          onPress={() => navigation.navigate('Onboarding', { replay: true })}
        />
        <List.Item
          style={[
            styles.settingItem,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
          left={(props) =>
            user.image ? (
              <Avatar.Image source={{ uri: user.image.url }} />
            ) : (
              <Avatar.Text size={50} label={getUserInitials(user)} />
            )
          }
          title={user.email}
          description={t('update_profile')}
          onPress={() => navigation.navigate('UserProfile')}
        />
        {user.parentSuperAccount && (
          <List.Item
            disabled={switchingAccount}
            style={[
              styles.settingItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant
              }
            ]}
            left={(props) => <List.Icon {...props} icon="swap-horizontal" />}
            title={t('switch_to_super_user')}
            right={(props) =>
              switchingAccount ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : null
            }
            onPress={() =>
              void handleSwitchAccount(user.parentSuperAccount.superUserId)
            }
          />
        )}
        <List.Item
          style={[
            styles.settingItem,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
          left={(props) => (
            <List.Icon {...props} color={theme.colors.error} icon="logout" />
          )}
          title={t('Sign out')}
          titleStyle={{ color: theme.colors.error }}
          onPress={() => setOpenLogout(true)}
        />
        <List.Item
          style={[
            styles.settingItem,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
          title={t('company_license')}
          left={(props) => <List.Icon {...props} icon="license" />}
          onPress={() => navigation.navigate('License')}
        />
        {canViewCompanySettings && (
          <List.Item
            style={[
              styles.settingItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant
              }
            ]}
            title={t('company_profile')}
            description={t('company_profile_mobile_description')}
            left={(props) => <List.Icon {...props} icon="domain" />}
            onPress={() => navigation.navigate('CompanyProfile')}
          />
        )}
        <List.Item
          onPress={() => {
            if (devMode) {
              setOpenDevInfo(true);
            } else {
              setVersionPressCount((state) => state + 1);
            }
          }}
          style={[
            styles.settingItem,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
          left={(props) => <List.Icon {...props} icon="information-outline" />}
          title={t('Version')}
          description={Constants.expoConfig.version}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  group: { gap: 8 },
  settingItem: {
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    overflow: 'hidden'
  },
  appearanceCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  },
  appearanceOption: {
    minHeight: qpmLayoutTokens.touchTarget.minimum,
    justifyContent: 'center'
  },
  appearanceTitle: { marginBottom: 4 },
  resetAppearance: { alignSelf: 'flex-start', marginTop: 4, marginLeft: -8 },
  appearancePreview: {
    marginTop: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.card
  },
  previewWorkOrder: {
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.card
  },
  previewWorkOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  previewAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  }
});
