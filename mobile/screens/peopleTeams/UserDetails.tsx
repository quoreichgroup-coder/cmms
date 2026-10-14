import { ScrollView, StyleSheet, View } from 'react-native';
import LoadingDialog from '../../components/LoadingDialog';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from '../../store';
import { RootStackScreenProps } from '../../types';
import {
  Avatar,
  Card,
  Chip,
  Divider,
  List,
  Text,
  useTheme
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { getUserDetails } from '../../slices/user';
import { getUserInitials } from '../../utils/displayers';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import { qpmLayoutTokens } from '../../theme/tokens';

export default function UserDetails({
  navigation,
  route
}: RootStackScreenProps<'UserDetails'>) {
  const { id, userProp } = route.params;
  const { userInfos } = useSelector((state) => state.users);
  const user = userInfos[id]?.user ?? userProp;
  const theme = useTheme();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [loadError, setLoadError] = useState(false);

  const loadUser = useCallback(async () => {
    setLoadError(false);
    try {
      await dispatch(getUserDetails(id));
    } catch (_error) {
      setLoadError(true);
    }
  }, [dispatch, id]);
  const fieldsToRender = [
    { label: t('id'), value: user?.id },
    { label: t('first_name'), value: user?.firstName },
    { label: t('last_name'), value: user?.lastName },
    { label: t('email'), value: user?.email },
    { label: t('phone'), value: user?.phone },
    { label: t('job_title'), value: user?.jobTitle },
    { label: t('role'), value: user?.role?.name },
    { label: t('hourly_rate'), value: user?.rate }
  ].filter(
    (field) =>
      field.value !== undefined && field.value !== null && field.value !== ''
  );

  useEffect(() => {
    if (!userProp && !user) void loadUser();
  }, [loadUser, user, userProp]);

  useEffect(() => {
    navigation.setOptions({
      title: user ? `${user.firstName} ${user.lastName}` : t('loading')
    });
  }, [user, navigation, t]);

  if (!user)
    return loadError ? (
      <AsyncStateFeedback
        mode="error"
        message={t('directory_load_error')}
        onRetry={() => void loadUser()}
      />
    ) : (
      <LoadingDialog visible={true} />
    );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Card
        mode="outlined"
        style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
      >
        <Card.Content style={styles.profile}>
          {user.image ? (
            <Avatar.Image size={76} source={{ uri: user.image.url }} />
          ) : (
            <Avatar.Text
              size={76}
              label={getUserInitials(user)}
              style={{ backgroundColor: theme.colors.primaryContainer }}
              color={theme.colors.onPrimaryContainer}
            />
          )}
          <View style={styles.profileText}>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, fontWeight: '700' }}
            >
              {`${user.firstName} ${user.lastName}`}
            </Text>
            {user.jobTitle ? (
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {user.jobTitle}
              </Text>
            ) : null}
            {user.role?.name ? (
              <Chip
                compact
                style={styles.roleChip}
                textStyle={{ color: theme.colors.onSecondaryContainer }}
              >
                {user.role.name}
              </Chip>
            ) : null}
          </View>
        </Card.Content>
      </Card>

      <Card
        mode="outlined"
        style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
      >
        <Card.Title
          title={t('informations')}
          titleStyle={{ fontWeight: '700' }}
        />
        <Divider />
        {fieldsToRender.map((field, index) => (
          <React.Fragment key={field.label}>
            <List.Item
              title={field.label}
              description={String(field.value)}
              titleStyle={{ color: theme.colors.onSurfaceVariant }}
              descriptionStyle={{
                color: theme.colors.onSurface,
                fontWeight: '600'
              }}
              descriptionNumberOfLines={3}
              style={styles.field}
            />
            {index < fieldsToRender.length - 1 ? <Divider /> : null}
          </React.Fragment>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: {
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    overflow: 'hidden'
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18
  },
  profileText: { flex: 1, minWidth: 0, gap: 6 },
  roleChip: { alignSelf: 'flex-start', marginTop: 2 },
  field: { paddingVertical: 6 }
});
