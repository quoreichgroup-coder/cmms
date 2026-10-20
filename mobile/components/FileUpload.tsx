import { logSafeError } from '../utils/safeErrorLog';
import { View } from './Themed';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as React from 'react';
import { useContext, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import { Image, ScrollView, Text, TouchableOpacity } from 'react-native';
import {
  ActivityIndicator,
  Icon,
  IconButton,
  useTheme
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SheetManager } from 'react-native-actions-sheet';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';
import { IFile } from '../models/file';
import {
  DocumentPickerOptions,
  DocumentPickerResult
} from 'expo-document-picker';
import { openLibraryWithPermission } from '../utils/mediaPermissions';
import { createImageUploadFile, createUploadFile } from '../utils/uploadFiles';
import InAppCamera from './InAppCamera';
import { useFileUploadAccess } from '../hooks/useFileUploadAccess';

interface OwnProps {
  title: string;
  type: 'image' | 'file' | 'spreadsheet';
  multiple: boolean;
  description: string;
  onChange: (files: IFile[]) => void;
  files?: IFile[];
  disabled?: boolean;
}

export default function FileUpload({
  title,
  type,
  multiple,
  onChange,
  files: defaultFiles,
  disabled = false
}: OwnProps) {
  const theme = useTheme();
  const [images, setImages] = useState<IFile[]>(defaultFiles || []);
  const [files, setFiles] = useState<IFile[]>(defaultFiles || []);
  const [inAppCameraVisible, setInAppCameraVisible] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const pickingRef = useRef(false);
  const { t } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { canUpload, hasFileEntitlement } = useFileUploadAccess();
  const maxFileSize: number = 7;

  const onChangeInternal = (files: IFile[], type: 'file' | 'image') => {
    if (type === 'file') {
      setFiles(files);
    } else {
      setImages(files);
    }
    onChange(files);
  };
  const getFileInfo = async (fileURI: string) => {
    const fileInfo = await FileSystem.getInfoAsync(fileURI);
    return fileInfo;
  };
  const isMoreThanTheMB = (fileSize: number, limit: number) => {
    return fileSize / 1024 / 1024 > limit;
  };
  const takePhoto = () => {
    if (pickingRef.current || disabled || !canUpload) return;
    setInAppCameraVisible(true);
  };
  const handleInAppCapture = async (uri: string) => {
    setInAppCameraVisible(false);
    try {
      await checkSize(uri);
      onChangeInternal(
        [...images, createImageUploadFile({ uri }, images.length + 1)],
        'image'
      );
    } catch (_error) {
      // checkSize already displays a localized message.
    }
  };
  const pickImage = async () => {
    if (pickingRef.current || disabled || !canUpload) return;
    pickingRef.current = true;
    setIsPicking(true);
    try {
      const result = await openLibraryWithPermission('ImageUpload', {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: multiple,
        selectionLimit: multiple ? 10 : 1,
        quality: 0.5
      });

      if (!result || result.canceled) return;
      await onImagePicked(result);
    } catch (error) {
      logSafeError('Error picking image:', error);
      const message = error instanceof Error ? error.message : '';
      if (
        message !== t('file_size_unknown') &&
        message !== t('max_file_size_error', { size: maxFileSize })
      ) {
        showSnackBar(t('file_pick_error'), 'error');
      }
    } finally {
      pickingRef.current = false;
      setIsPicking(false);
    }
  };
  const checkSize = async (uri: string) => {
    const fileInfo = await getFileInfo(uri);
    if (!('size' in fileInfo)) return;
    if (!fileInfo?.size) {
      showSnackBar(t('file_size_unknown'), 'error');
      throw new Error(t('file_size_unknown'));
    }
    if (isMoreThanTheMB(fileInfo.size, maxFileSize)) {
      showSnackBar(t('max_file_size_error', { size: maxFileSize }), 'error');
      throw new Error(t('max_file_size_error', { size: maxFileSize }));
    }
  };
  const onImagePicked = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled) {
      for (const asset of result.assets) {
        const { uri } = asset;
        await checkSize(uri);
      }
      onChangeInternal(
        [
          ...(multiple ? images : []),
          ...result.assets.map((asset, index) =>
            createImageUploadFile(asset, images.length + index + 1)
          )
        ],
        'image'
      );
    }
  };
  const pickFile = async () => {
    if (pickingRef.current || disabled || !canUpload) return;
    pickingRef.current = true;
    setIsPicking(true);
    try {
      // Pass the 'multiple' prop to enable multi-file selection if needed
      const options: DocumentPickerOptions = {
        type:
          type === 'spreadsheet'
            ? [
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/csv'
              ]
            : '*/*', // Default to all file types
        copyToCacheDirectory: true,
        multiple
      };

      const result: DocumentPickerResult =
        await DocumentPicker.getDocumentAsync(options);
      if (
        result.canceled === true ||
        !result.assets ||
        result.assets.length === 0
      ) {
        console.log('Document picker was canceled or no file selected');
        return;
      }

      // Process selected files (currently only handles the first asset due to existing component logic)
      const selectedAssets = result.assets;
      const filesToUpload: IFile[] = [];

      // Loop through selected assets to perform size checks
      for (const asset of selectedAssets) {
        await checkSize(asset.uri);

        filesToUpload.push(createUploadFile(asset));

        // Break the loop if 'multiple' is false, as the current display logic only shows one file.
        if (!multiple) break;
      }

      // Pass the selected file(s) to the internal change handler
      onChangeInternal(
        multiple ? [...files, ...filesToUpload] : filesToUpload,
        'file'
      );
    } catch (error) {
      logSafeError('Error picking document:', error);
      const message = error instanceof Error ? error.message : '';
      if (
        message !== t('file_size_unknown') &&
        message !== t('max_file_size_error', { size: maxFileSize })
      ) {
        showSnackBar(t('file_pick_error'), 'error');
      }
    } finally {
      pickingRef.current = false;
      setIsPicking(false);
    }
  };
  const onPress = () => {
    if (type === 'image')
      SheetManager.show('upload-file-sheet', {
        payload: {
          onPickImage: pickImage,
          onTakePhoto: takePhoto
        }
      });
    else pickFile();
  };

  return (
    <View style={{ display: 'flex', flexDirection: 'column' }}>
      <InAppCamera
        visible={inAppCameraVisible}
        onCapture={handleInAppCapture}
        onClose={() => setInAppCameraVisible(false)}
      />
      <TouchableOpacity
        onPress={onPress}
        disabled={!canUpload || disabled || isPicking}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${t(isPicking ? 'loading' : 'upload')}`}
        accessibilityState={{
          disabled: !canUpload || disabled || isPicking,
          busy: isPicking
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Text style={{ color: theme.colors.onSurface }}>{title}</Text>
          {isPicking ? (
            <ActivityIndicator
              size={24}
              color={theme.colors.primary}
              accessibilityLabel={t('loading')}
            />
          ) : (
            <View
              style={{
                width: 48,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon
                source="plus-circle"
                size={24}
                color={theme.colors.primary}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
      {!canUpload && (
        <Text style={{ color: theme.colors.error, marginHorizontal: 12 }}>
          {t(
            hasFileEntitlement
              ? 'file_upload_unavailable'
              : 'you_need_a_license'
          )}
        </Text>
      )}
      <View>
        {type === 'image' &&
          !!images.length &&
          images.map((image) => (
            <View key={image.uri} style={{ margin: 3 }}>
              <Image source={{ uri: image.uri }} style={{ height: 200 }} />
              <IconButton
                style={{ position: 'absolute', top: 10, right: 10 }}
                onPress={() => {
                  onChangeInternal(
                    images.filter((item) => item.uri !== image.uri),
                    'image'
                  );
                }}
                disabled={disabled}
                accessibilityLabel={`${t('to_delete')} ${image.name}`}
                icon={'close-circle'}
                iconColor={theme.colors.error}
              />
            </View>
          ))}
        {type !== 'image' && // Covers 'file' and 'spreadsheet' types
          !!files.length &&
          files.map((file, index) => (
            <View
              key={file.uri} // <--- Use a unique key
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 1 // Optional: Add padding for separation
              }}
            >
              <Text style={{ color: theme.colors.primary, flexShrink: 1 }}>
                {file.name}
              </Text>
              <IconButton
                onPress={() => {
                  onChangeInternal(
                    files.filter((_, i) => i !== index),
                    'file'
                  );
                }}
                disabled={disabled}
                accessibilityLabel={`${t('to_delete')} ${file.name}`}
                icon={'close-circle'}
                iconColor={theme.colors.error}
              />
            </View>
          ))}
      </View>
    </View>
  );
}
