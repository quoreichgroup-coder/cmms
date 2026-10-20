import { StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { View } from '../../components/Themed';

export default function LoadingScreen({
  recovering = false
}: {
  recovering?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      {recovering && (
        <Text style={styles.message}>{t('auth_recovering_session')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    gap: 16
  },
  message: {
    textAlign: 'center'
  }
});
