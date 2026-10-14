import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View
} from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { ImageViewerProps } from './ImageViewer.types';

export default function ImageViewer({
  images,
  imageIndex,
  visible,
  onRequestClose
}: ImageViewerProps) {
  const { width, height } = useWindowDimensions();
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(imageIndex);

  useEffect(() => setActiveIndex(imageIndex), [imageIndex, visible]);

  if (!images.length) return null;

  const safeIndex = Math.min(Math.max(activeIndex, 0), images.length - 1);
  const goToPrevious = () =>
    setActiveIndex((index) => (index - 1 + images.length) % images.length);
  const goToNext = () =>
    setActiveIndex((index) => (index + 1) % images.length);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('close_image_preview')}
          onPress={onRequestClose}
          style={styles.closeButton}
        >
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
        <View style={styles.imageRow}>
          {images.length > 1 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('previous_image')}
              onPress={goToPrevious}
              style={styles.navigationButton}
            >
              <Text style={styles.navigationLabel}>‹</Text>
            </Pressable>
          )}
          <Image
            source={images[safeIndex]}
            resizeMode="contain"
            accessibilityLabel={t('image_count', {
              current: safeIndex + 1,
              total: images.length
            })}
            style={{ width: Math.min(width * 0.82, 1100), height: height * 0.82 }}
          />
          {images.length > 1 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('next_image')}
              onPress={goToNext}
              style={styles.navigationButton}
            >
              <Text style={styles.navigationLabel}>›</Text>
            </Pressable>
          )}
        </View>
        {images.length > 1 && (
          <Text style={styles.counter}>
            {t('image_count', { current: safeIndex + 1, total: images.length })}
          </Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.94)'
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 18,
    zIndex: 1,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.14)'
  },
  closeLabel: { color: 'white', fontSize: 32, lineHeight: 36 },
  imageRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  navigationButton: {
    width: 44,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)'
  },
  navigationLabel: { color: 'white', fontSize: 36, lineHeight: 42 },
  counter: { position: 'absolute', bottom: 22, color: 'white' }
});
