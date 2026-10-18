import * as React from 'react';
import { useContext, useRef, useState } from 'react';
import { useDispatch } from '../../../store';
import { useTranslation } from 'react-i18next';
import { AssetDTO } from '../../../models/asset';
import { editAsset } from '../../../slices/asset';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View as RNView
} from 'react-native';
import {
  Button,
  Dialog,
  Divider,
  ActivityIndicator,
  IconButton,
  Portal,
  Text,
  useTheme
} from 'react-native-paper';
import { View } from '../../../components/Themed';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { getErrorMessage } from '../../../utils/api';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/role';

export default function AssetParts({
  asset,
  navigation
}: {
  asset: AssetDTO;
  navigation: any;
}) {
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const { hasEditPermission, hasViewPermission } = useAuth();
  const canEditAsset = hasEditPermission(PermissionEntity.ASSETS, asset);
  const canViewParts = hasViewPermission(PermissionEntity.PARTS_AND_MULTIPARTS);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const [currentPartId, setCurrentPartId] = useState<number>();

  const handleDelete = async () => {
    if (
      deletingRef.current ||
      !canViewParts ||
      !canEditAsset ||
      currentPartId === undefined
    )
      return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await dispatch(
        editAsset(asset.id, {
          ...asset,
          parts: asset.parts.filter((part) => part.id !== currentPartId)
        })
      );
      setOpenDelete(false);
      showSnackBar(t('operation_success'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error) || t('an_error_occured'), 'error');
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };
  const renderConfirmDialog = () => {
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
            <Text variant="bodyMedium">{t('confirm_delete_part_asset')}</Text>
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
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {renderConfirmDialog()}
      <FlatList
        style={styles.list}
        data={canViewParts ? asset.parts ?? [] : []}
        keyExtractor={(part) => String(part.id)}
        renderItem={({ item: part }) => (
          <RNView style={styles.partRow}>
            <TouchableOpacity
              style={styles.partLink}
              accessibilityRole="button"
              accessibilityLabel={`${part.name}, ${part.description ?? ''}`}
              onPress={() => navigation.push('PartDetails', { id: part.id })}
            >
              <View style={styles.partText}>
                <Text style={styles.partName}>{part.name}</Text>
                {!!part.description && (
                  <Text style={styles.partDescription}>{part.description}</Text>
                )}
              </View>
            </TouchableOpacity>
            {canEditAsset && (
              <IconButton
                icon="delete-outline"
                iconColor={theme.colors.error}
                accessibilityLabel={t('remove_part_from_asset', {
                  name: part.name
                })}
                onPress={() => {
                  setCurrentPartId(part.id);
                  setOpenDelete(true);
                }}
              />
            )}
          </RNView>
        )}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          <View style={styles.emptyState} accessibilityRole="text">
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {t(canViewParts ? 'no_parts' : 'no_access_inventory')}
            </Text>
          </View>
        }
        initialNumToRender={8}
        windowSize={7}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  list: { flex: 1 },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center'
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20
  },
  partLink: {
    flex: 1,
    paddingVertical: 16
  },
  partText: {
    flex: 1
  },
  partName: {
    fontWeight: 'bold',
    flexShrink: 1,
    marginRight: 10
  },
  partDescription: {
    flexShrink: 1
  }
});
