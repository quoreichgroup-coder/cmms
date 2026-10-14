import { StyleSheet, View } from 'react-native';
import NativeImageViewer from 'react-native-image-viewing';
import { IconButton, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { ImageViewerProps } from './ImageViewer.types';

export default function ImageViewer(props: ImageViewerProps) {
  const { t } = useTranslation();

  return (
    <NativeImageViewer
      {...props}
      backgroundColor="rgba(0, 0, 0, 0.94)"
      HeaderComponent={() => (
        <View style={styles.header}>
          <IconButton
            icon="close"
            iconColor="white"
            size={24}
            accessibilityLabel={t('close_image_preview')}
            onPress={props.onRequestClose}
            style={styles.closeButton}
          />
        </View>
      )}
      FooterComponent={({ imageIndex }) =>
        props.images.length > 1 ? (
          <View style={styles.footer} pointerEvents="none">
            <Text style={styles.counter}>
              {t('image_count', {
                current: imageIndex + 1,
                total: props.images.length
              })}
            </Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'flex-end', paddingTop: 8, paddingRight: 8 },
  closeButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0, 0, 0, 0.47)'
  },
  footer: { alignItems: 'center', paddingBottom: 24 },
  counter: { color: 'white' }
});
