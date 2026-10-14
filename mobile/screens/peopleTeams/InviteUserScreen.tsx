import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { View } from '../../components/Themed';
import {
  Button,
  HelperText,
  List,
  RadioButton,
  TextInput,
  useTheme
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { emailRegExp } from '../../utils/validators';
import { useDispatch, useSelector } from '../../store';
import { getRoles } from '../../slices/role';
import { Role, RoleCode } from '../../models/role';
import { inviteUsers } from '../../slices/user';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import { RootStackScreenProps } from '../../types';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { qpmLayoutTokens } from '../../custom-theme';

export default function InviteUserScreen({
  navigation
}: RootStackScreenProps<'AddUser'>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [email, setEmail] = useState<string>('');
  const { roles, loadingGet } = useSelector((state) => state.roles);
  const [selectedRole, setSelectedRole] = useState<number>();
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isInviteSubmitting, setIsInviteSubmitting] = useState<boolean>(false);
  const isInviteSubmittingRef = useRef(false);
  const [rolesLoadError, setRolesLoadError] = useState(false);
  const [hasLoadedRoles, setHasLoadedRoles] = useState(false);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const markFormClean = useUnsavedChanges(
    navigation,
    email.trim().length > 0 || selectedRole !== undefined
  );

  const loadRoles = useCallback(async () => {
    setRolesLoadError(false);
    try {
      await dispatch(getRoles());
    } catch (_error) {
      setRolesLoadError(true);
    } finally {
      setHasLoadedRoles(true);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);
  const defaultRoles: Partial<
    Record<RoleCode, { name: string; description: string }>
  > = {
    ADMIN: {
      name: 'ADMIN_name',
      description: 'ADMIN_description'
    },
    LIMITED_ADMIN: {
      name: 'LIMITED_ADMIN_name',
      description: 'LIMITED_ADMIN_description'
    },
    TECHNICIAN: {
      name: 'TECHNICIAN_name',
      description: 'TECHNICIAN_description'
    },
    LIMITED_TECHNICIAN: {
      name: 'LIMITED_TECHNICIAN_name',
      description: 'LIMITED_TECHNICIAN_description'
    },
    VIEW_ONLY: {
      name: 'VIEW_ONLY_name',
      description: 'VIEW_ONLY_description'
    },
    REQUESTER: {
      name: 'REQUESTER_name',
      description: 'REQUESTER_description'
    }
  };
  const getOrderedRoles = (): Role[] => {
    if (roles.length) {
      const defaultRolesOnly: Role[] = Object.keys(defaultRoles).flatMap(
        (code) => roles.filter((role) => role.code === code)
      );
      const customRoles = roles.filter((role) => role.code === 'USER_CREATED');
      return [...defaultRolesOnly, ...customRoles];
    } else return [];
  };
  const onInvite = async () => {
    if (isInviteSubmittingRef.current) return;
    setHasSubmitted(true);
    if (selectedRole == null) {
      showSnackBar(t('please_select_role'), 'error');
      return;
    }
    if (!emailRegExp.test(email)) {
      showSnackBar(t('invalid_email'), 'error');
      return;
    }

    isInviteSubmittingRef.current = true;
    setIsInviteSubmitting(true);
    try {
      await dispatch(inviteUsers(selectedRole, [email]));
      markFormClean();
      navigation.goBack();
      showSnackBar(t('user_invite_success'), 'success');
    } catch (_error) {
      showSnackBar(t('user_invite_failure'), 'error');
    } finally {
      isInviteSubmittingRef.current = false;
      setIsInviteSubmitting(false);
    }
  };
  return (
    <ScrollView
      style={{ ...styles.container, backgroundColor: theme.colors.background }}
      refreshControl={
        <RefreshControl
          refreshing={loadingGet}
          onRefresh={loadRoles}
          colors={[theme.colors.primary]}
        />
      }
    >
      <View style={{ padding: 20 }}>
        <TextInput
          error={hasSubmitted && !emailRegExp.test(email)}
          label={t('email')}
          onChangeText={(text) => setEmail(text)}
          value={email}
          mode="outlined"
        />
        {!emailRegExp.test(email) && hasSubmitted && (
          <HelperText type="error">{t('invalid_email')}</HelperText>
        )}
        {rolesLoadError && (
          <AsyncStateFeedback
            mode={roles.length ? 'banner' : 'error'}
            message={t('roles_load_error')}
            onRetry={() => void loadRoles()}
          />
        )}
        {(loadingGet || !hasLoadedRoles) && !roles.length ? (
          <AsyncStateFeedback mode="loading" message={t('loading')} />
        ) : rolesLoadError && !roles.length ? null : !getOrderedRoles()
            .length ? (
          <HelperText type="info" visible>
            {t('no_roles_available')}
          </HelperText>
        ) : (
          getOrderedRoles().map((role) => (
            <List.Item
              key={role.id}
              style={[
                styles.roleOption,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    selectedRole === role.id
                      ? theme.colors.primary
                      : theme.colors.outlineVariant
                }
              ]}
              title={
                role.code === 'USER_CREATED'
                  ? role.name
                  : defaultRoles[role.code]
                  ? t(defaultRoles[role.code].name)
                  : role.name
              }
              description={
                role.code === 'USER_CREATED'
                  ? role.description
                  : defaultRoles[role.code]
                  ? t(defaultRoles[role.code].description)
                  : role.description
              }
              descriptionNumberOfLines={10}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedRole === role.id }}
              onPress={() => setSelectedRole(role.id)}
              left={(props) => (
                <RadioButton
                  value="first"
                  status={selectedRole === role.id ? 'checked' : 'unchecked'}
                  onPress={() => setSelectedRole(role.id)}
                />
              )}
            />
          ))
        )}
        <Button
          disabled={
            isInviteSubmitting ||
            loadingGet ||
            !!rolesLoadError ||
            !getOrderedRoles().length
          }
          loading={isInviteSubmitting}
          onPress={onInvite}
          style={{ marginTop: 20 }}
          mode="contained"
        >
          {t('invite')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  roleOption: {
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  }
});
