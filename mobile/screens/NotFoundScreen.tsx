import { StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text, View } from '../components/Themed';
import { useAppTheme } from '../custom-theme';
import { RootStackScreenProps } from '../types';

export default function NotFoundScreen({
  navigation
}: RootStackScreenProps<'NotFound'>) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('screen_not_found')}</Text>
      <TouchableOpacity
        onPress={() => navigation.replace('Root')}
        style={styles.link}
        accessibilityRole="button"
        accessibilityLabel={t('return_to_home')}
      >
        <Text style={[styles.linkText, { color: theme.colors.primary }]}>
          {t('return_to_home')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  link: {
    marginTop: 15,
    paddingVertical: 15
  },
  linkText: { fontSize: 14 }
});
