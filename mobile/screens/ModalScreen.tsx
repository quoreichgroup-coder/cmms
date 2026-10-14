import { StyleSheet } from 'react-native';

import EditScreenInfo from '../components/EditScreenInfo';
import { Text, View } from '../components/Themed';
import { useAppTheme } from '../custom-theme';

export default function ModalScreen() {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modal</Text>
      <View
        style={[
          styles.separator,
          { backgroundColor: theme.colors.outlineVariant }
        ]}
      />
      <EditScreenInfo path="/screens/ModalScreen.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%'
  }
});
