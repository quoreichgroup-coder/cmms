import { useContext, useRef, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Button, Dialog, IconButton, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FileMiniDTO, FileType } from '../models/file';
import { useAppTheme } from '../custom-theme';
import { qpmLayoutTokens } from '../theme/tokens';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';
import { getErrorMessage } from '../utils/api';

type Props = {
  files: (FileMiniDTO & { type?: FileType })[];
  confirmationMessage: string;
  canDelete: boolean;
  onDelete: (id: number) => Promise<unknown>;
};

export default function AttachmentList({
  files,
  confirmationMessage,
  canDelete,
  onDelete
}: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [deletingFile, setDeletingFile] = useState<
    (FileMiniDTO & { type?: FileType }) | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  const confirmDelete = async () => {
    if (!deletingFile || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await onDelete(deletingFile.id);
      setDeletingFile(null);
      showSnackBar(t('file_delete_success'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error) || t('error'), 'error');
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  const openFile = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      showSnackBar(getErrorMessage(error) || t('error'), 'error');
    }
  };

  return (
    <>
      <Portal>
        <Dialog
          visible={!!deletingFile}
          onDismiss={() => !deleting && setDeletingFile(null)}
        >
          <Dialog.Title>{t('confirmation')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{confirmationMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={deleting} onPress={() => setDeletingFile(null)}>
              {t('cancel')}
            </Button>
            <Button
              loading={deleting}
              disabled={deleting}
              accessibilityState={{ disabled: deleting, busy: deleting }}
              onPress={confirmDelete}
            >
              {t('to_delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <FlatList
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={files.length ? styles.list : styles.emptyList}
        data={files}
        keyExtractor={(file) => String(file.id)}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant
              }
            ]}
          >
            <Pressable
              onPress={() => void openFile(item.url)}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              style={({ pressed }) => [
                styles.fileAction,
                { opacity: pressed ? 0.72 : 1 }
              ]}
            >
              <View
                style={[
                  styles.fileIcon,
                  { backgroundColor: theme.colors.primaryContainer }
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    item.type === 'IMAGE'
                      ? 'image-outline'
                      : 'file-document-outline'
                  }
                  color={theme.colors.onPrimaryContainer}
                  size={21}
                />
              </View>
              <View style={styles.fileNameBlock}>
                <Text
                  variant="titleSmall"
                  numberOfLines={2}
                  style={styles.fileName}
                >
                  {item.name}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {item.type === 'IMAGE' ? t('image') : t('file')}
                </Text>
              </View>
            </Pressable>
            {canDelete && (
              <IconButton
                icon="delete-outline"
                accessibilityLabel={`${t('to_delete')} ${item.name}`}
                iconColor={theme.colors.error}
                disabled={deleting}
                onPress={() => setDeletingFile(item)}
              />
            )}
          </View>
        )}
        ListEmptyComponent={
          <View
            style={[
              styles.emptyState,
              { borderColor: theme.colors.outlineVariant }
            ]}
          >
            <MaterialCommunityIcons
              name="file-outline"
              color={theme.colors.onSurfaceVariant}
              size={28}
              accessible={false}
            />
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center'
              }}
            >
              {t('no_files_available')}
            </Text>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: 14, paddingBottom: 24, gap: 8 },
  emptyList: { flexGrow: 1, padding: 16 },
  card: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    paddingLeft: 10,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  fileAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: qpmLayoutTokens.radius.control,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fileNameBlock: { flex: 1, minWidth: 0, gap: 3 },
  fileName: { fontWeight: '600' },
  emptyState: {
    flexGrow: 1,
    minHeight: 180,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  }
});
