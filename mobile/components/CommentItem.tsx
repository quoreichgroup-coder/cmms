import React, { useRef, useState, useEffect, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Pressable,
  TextInput as RNTextInput
} from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Icon,
  IconButton,
  useTheme,
  Button
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from '../store';
import { deleteComment, updateComment } from '../slices/comment';
import File from '../models/file';
import mime from 'mime';
import { CompanySettingsContext } from '../contexts/CompanySettingsContext';
import useAuth from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import Comment from '../models/comment';
import ImageView from './ImageViewer';
import { downloadFile } from '../utils/fileDownload';
import { useMentions } from 'react-native-controlled-mentions';
import { TriggersConfig } from 'react-native-controlled-mentions/dist/types/types';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';
import { getErrorMessage } from '../utils/api';
import { qpmLayoutTokens } from '../theme/tokens';

interface CommentItemProps {
  comment: Comment;
  workOrderId: number;
  highlighted?: boolean;
  users?: { id: string; name: string }[];
}

const createTriggersConfig = (primary: string): TriggersConfig<'mention'> => ({
  mention: {
    trigger: '@',
    pattern: /(@\[[^\]]+\]\(user:[^)]+\))/g,
    textStyle: { fontWeight: 'bold', color: primary },
    getTriggerData: (match: string) => {
      const result = match.match(/@\[(.*?)\]\(user:(.*?)\)/);
      return {
        original: match,
        trigger: '@',
        name: result?.[1] ?? '',
        id: result?.[2] ?? ''
      };
    },
    getTriggerValue: (suggestion) =>
      `@[${suggestion.name}](user:${suggestion.id})`
  }
});

const isImage = (file: File) => mime.getType(file.name)?.startsWith('image/');

export default function CommentItem({
  comment,
  workOrderId,
  highlighted = false,
  users = []
}: CommentItemProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { getFormattedDate } = React.useContext(CompanySettingsContext);
  const { showSnackBar } = React.useContext(CustomSnackBarContext);
  const { user } = useAuth();
  const { loadingUpdate } = useSelector((state) => state.comments);
  const triggersConfig = React.useMemo(
    () => createTriggersConfig(theme.colors.primary),
    [theme.colors.primary]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  const isOwner = comment.user?.id === user?.id;
  const isSystem = comment.system;
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { textInputProps, triggers } = useMentions({
    value: editContent,
    onChange: setEditContent,
    triggersConfig
  });

  const mentionKeyword = triggers?.mention?.keyword ?? null;
  const filteredUsers = mentionKeyword
    ? users.filter((u) =>
        u.name.toLowerCase().includes(mentionKeyword.toLowerCase())
      )
    : users;

  const confirmDelete = async () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await dispatch(deleteComment(comment.id, workOrderId));
      showSnackBar(t('comment_delete_success'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error) || t('an_error_occured'), 'error');
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    if (deletingRef.current) return;
    Alert.alert(t('confirmation'), t('confirm_delete_comment'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('to_delete'),
        style: 'destructive',
        onPress: () => void confirmDelete()
      }
    ]);
  };

  const handleUpdate = async () => {
    if (!editContent?.trim() || saving) return;
    setSaving(true);
    try {
      await dispatch(
        updateComment(
          comment.id,
          {
            content: editContent,
            files: comment.files.map((f) => ({ id: f.id }))
          },
          workOrderId
        )
      );
      setIsEditing(false);
      showSnackBar(t('comment_update_success'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error) || t('an_error_occured'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const imageFiles = comment.files?.filter(isImage) || [];
  const otherFiles = comment.files?.filter((f) => !isImage(f)) || [];

  const renderContentWithMentions = (content: string) => {
    const mentionRegex = /@\[([^\]]+)\]\(user:(\d+)\)/g;
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <Text key={key++}>{content.slice(lastIndex, match.index)}</Text>
        );
      }
      const [, displayName, userId] = match;
      parts.push(
        <Text
          key={`mention-${match.index}`}
          style={{ color: theme.colors.primary, fontWeight: '600' }}
          onPress={() =>
            navigation.navigate('UserDetails', { id: Number(userId) })
          }
        >
          @{displayName}
        </Text>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(<Text key={key++}>{content.slice(lastIndex)}</Text>);
    }

    return parts.length > 0 ? <Text>{parts}</Text> : <Text>{content}</Text>;
  };

  return (
    <View
      style={{
        padding: 12,
        borderRadius: qpmLayoutTokens.radius.card,
        backgroundColor: theme.colors.surface,
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted
          ? theme.colors.primary
          : theme.colors.outlineVariant,
        marginBottom: 8
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('UserDetails', { id: comment.user?.id })
          }
        >
          {comment.user.image ? (
            <Avatar.Image size={40} source={{ uri: comment.user.image.url }} />
          ) : (
            <Avatar.Text
              size={40}
              label={`${comment.user?.firstName?.charAt(0) || ''}${
                comment.user?.lastName?.charAt(0) || ''
              }`}
              style={{ backgroundColor: theme.colors.primary }}
            />
          )}
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}
          >
            <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('UserDetails', { id: comment.user?.id })
                }
              >
                <Text style={{ fontWeight: 'bold' }} numberOfLines={2}>
                  {`${comment.user?.firstName || ''} ${
                    comment.user?.lastName || ''
                  }`}
                </Text>
              </TouchableOpacity>
              <Text
                style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}
                numberOfLines={1}
              >
                {getFormattedDate(comment.updatedAt || comment.createdAt)}
              </Text>
            </View>
            {!isSystem && isOwner && !isEditing && (
              <View style={{ flexDirection: 'row' }}>
                {deleting ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                    accessibilityLabel={t('loading')}
                    style={{ marginHorizontal: 12 }}
                  />
                ) : (
                  <>
                    <IconButton
                      icon="pencil"
                      size={20}
                      accessibilityLabel={`${t('edit')} ${t('comments')}`}
                      onPress={() => setIsEditing(true)}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      accessibilityLabel={`${t('to_delete')} ${t('comments')}`}
                      onPress={handleDelete}
                    />
                  </>
                )}
              </View>
            )}
          </View>

          {isEditing ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, marginBottom: 8, marginRight: 8 }}>
                  {mentionKeyword && filteredUsers.length > 0 && (
                    <View
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: qpmLayoutTokens.radius.control,
                        elevation: 5,
                        shadowColor: theme.colors.shadow,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        marginBottom: 8,
                        maxHeight: 200,
                        overflow: 'hidden'
                      }}
                    >
                      {filteredUsers.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            triggers?.mention?.onSelect?.({
                              id: item.id,
                              name: item.name
                            });
                          }}
                          style={{
                            padding: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.colors.outlineVariant
                          }}
                        >
                          <Text>{item.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <RNTextInput
                    multiline
                    numberOfLines={2}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.outline,
                      borderRadius: qpmLayoutTokens.radius.control,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.onSurface
                    }}
                    {...textInputProps}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                <Button
                  mode="contained"
                  onPress={handleUpdate}
                  disabled={!editContent?.trim() || saving}
                  loading={saving}
                  style={{ maxWidth: '40%' }}
                >
                  {t('save')}
                </Button>
                <Button
                  style={{ maxWidth: '40%' }}
                  mode="outlined"
                  disabled={saving}
                  onPress={() => setIsEditing(false)}
                >
                  {t('cancel')}
                </Button>
              </View>
            </View>
          ) : (
            <Text
              style={{
                marginTop: 4,
                color: comment.system
                  ? theme.colors.onSurfaceVariant
                  : undefined
              }}
            >
              {renderContentWithMentions(comment.content)}
            </Text>
          )}

          {comment.files?.length > 0 && !isEditing && (
            <View style={{ marginTop: 8 }}>
              {imageFiles.length > 0 && (
                <ScrollView
                  horizontal
                  style={{ marginBottom: otherFiles.length > 0 ? 8 : 0 }}
                >
                  {imageFiles.map((file, index) => (
                    <TouchableOpacity
                      key={file.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('view_image')} ${file.name}`}
                      onPress={() => {
                        setSelectedImageIndex(index);
                        setImageViewerOpen(true);
                      }}
                    >
                      <Image
                        source={{ uri: file.url }}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: qpmLayoutTokens.radius.control,
                          marginRight: 8
                        }}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {otherFiles.map((file) => (
                <TouchableOpacity
                  key={file.id}
                  accessibilityRole="button"
                  accessibilityLabel={file.name}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    padding: 2,
                    backgroundColor: theme.colors.background,
                    borderRadius: qpmLayoutTokens.radius.control,
                    marginBottom: 4
                  }}
                  onPress={() => downloadFile(file.url, file.name)}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Icon
                      source="file"
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </View>
                  <Text style={{ flex: 1, minWidth: 0 }} numberOfLines={2}>
                    {file.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {imageViewerOpen && (
            <ImageView
              images={imageFiles.map((f) => ({ uri: f.url }))}
              imageIndex={selectedImageIndex}
              visible={imageViewerOpen}
              onRequestClose={() => setImageViewerOpen(false)}
            />
          )}
        </View>
      </View>
    </View>
  );
}
