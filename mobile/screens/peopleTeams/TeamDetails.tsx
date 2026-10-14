import { Linking, ScrollView, StyleSheet } from 'react-native';
import LoadingDialog from '../../components/LoadingDialog';
import * as React from 'react';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from '../../store';
import { RootStackScreenProps } from '../../types';
import {
  Button,
  Dialog,
  IconButton,
  Portal,
  Text,
  useTheme
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { View } from '../../components/Themed';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import { deleteTeam, getTeamDetails } from '../../slices/team';
import { SheetManager } from 'react-native-actions-sheet';
import DirectoryCard from '../../components/DirectoryCard';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import { qpmLayoutTokens } from '../../theme/tokens';

export default function TeamDetails({
  navigation,
  route
}: RootStackScreenProps<'TeamDetails'>) {
  const { id, teamProp } = route.params;
  const { teamInfos } = useSelector((state) => state.teams);
  const team = teamInfos[id]?.team ?? teamProp;
  const theme = useTheme();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = React.useRef(false);
  const [loadError, setLoadError] = useState(false);

  const loadTeam = useCallback(async () => {
    setLoadError(false);
    try {
      await dispatch(getTeamDetails(id));
    } catch (_error) {
      setLoadError(true);
    }
  }, [dispatch, id]);

  const onDeleteSuccess = () => {
    showSnackBar(t('team_delete_success'), 'success');
    navigation.goBack();
  };
  const onDeleteFailure = (err) =>
    showSnackBar(t('team_delete_failure'), 'error');

  const handleDelete = async () => {
    if (deletingRef.current || !team) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await dispatch(deleteTeam(team.id));
      setOpenDelete(false);
      onDeleteSuccess();
    } catch (err) {
      onDeleteFailure(err);
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };
  const renderConfirmDelete = () => {
    return (
      <Portal>
        <Dialog
          visible={openDelete}
          onDismiss={() => {
            if (!deleting) setOpenDelete(false);
          }}
        >
          <Dialog.Title>{t('confirmation')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('confirm_delete_team')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={deleting} onPress={() => setOpenDelete(false)}>
              {t('cancel')}
            </Button>
            <Button
              loading={deleting}
              disabled={deleting}
              accessibilityState={{ disabled: deleting, busy: deleting }}
              onPress={handleDelete}
            >
              {t('to_delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  useEffect(() => {
    if (!teamProp && !team) void loadTeam();
  }, [loadTeam, team, teamProp]);

  useEffect(() => {
    navigation.setOptions({
      title: team?.name ?? t('loading'),
      headerRight: team
        ? () => (
            <IconButton
              icon="dots-vertical"
              accessibilityLabel={t('actions')}
              onPress={() => {
                SheetManager.show('team-details-sheet', {
                  payload: {
                    onEdit: () => navigation.navigate('EditTeam', { team }),
                    onDelete: () => setOpenDelete(true),
                    team
                  }
                });
              }}
            />
          )
        : undefined
    });
  }, [navigation, t, team]);

  if (!team)
    return loadError ? (
      <AsyncStateFeedback
        mode="error"
        message={t('directory_load_error')}
        onRetry={() => void loadTeam()}
      />
    ) : (
      <LoadingDialog visible={true} />
    );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      {renderConfirmDelete()}
      <View
        style={[
          styles.teamSummary,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant
          }
        ]}
      >
        <Text
          variant="titleLarge"
          style={{ color: theme.colors.onSurface, fontWeight: '700' }}
        >
          {team.name}
        </Text>
        {team.description ? (
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {team.description}
          </Text>
        ) : null}
        <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
          {t('team_members_count', { count: team.users?.length ?? 0 })}
        </Text>
      </View>
      {(team.users ?? []).map((user) => (
        <DirectoryCard
          key={user.id}
          title={`${user.firstName} ${user.lastName}`}
          icon="account-outline"
          avatarSource={user.image ? { uri: user.image.url } : undefined}
          accessibilityLabel={`${user.firstName} ${user.lastName}${
            user.phone ? `, ${user.phone}` : ''
          }`}
          details={
            user.phone
              ? [{ label: user.phone, icon: 'phone-outline' as const }]
              : []
          }
          trailingAction={
            user.phone
              ? {
                  icon: 'phone' as const,
                  label: `${t('phone')} ${user.firstName} ${user.lastName}`,
                  onPress: () => Linking.openURL(`tel:${user.phone}`)
                }
              : undefined
          }
          onPress={() => {
            navigation.push('UserDetails', { id: user.id });
          }}
        />
      ))}
      {!team.users?.length && (
        <View
          style={[
            styles.emptyState,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
        >
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {t('no_element_match_criteria')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 12, gap: 4 },
  teamSummary: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  },
  emptyState: {
    marginHorizontal: 16,
    padding: 18,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  }
});
