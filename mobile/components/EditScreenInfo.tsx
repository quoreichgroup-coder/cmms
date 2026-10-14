import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { useAppTheme } from '../custom-theme';
import { MonoText } from './StyledText';
import { Text, View } from './Themed';

export default function EditScreenInfo({ path }: { path: string }) {
  const theme = useAppTheme();

  return (
    <View>
      <View style={styles.getStartedContainer}>
        <Text
          style={[styles.getStartedText, { color: theme.colors.onSurface }]}
        >
          Open up the code for this screen:
        </Text>

        <View
          style={[
            styles.codeHighlightContainer,
            styles.homeScreenFilename,
            { backgroundColor: theme.colors.surfaceVariant }
          ]}
        >
          <MonoText style={{ color: theme.colors.onSurface }}>{path}</MonoText>
        </View>

        <Text
          style={[styles.getStartedText, { color: theme.colors.onSurface }]}
        >
          Change any of the text, save the file, and your app will automatically
          update.
        </Text>
      </View>

      <View style={styles.helpContainer}>
        <TouchableOpacity onPress={handleHelpPress} style={styles.helpLink}>
          <Text style={[styles.helpLinkText, { color: theme.colors.primary }]}>
            Tap here if your app doesn't automatically update after making
            changes
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function handleHelpPress() {
  WebBrowser.openBrowserAsync(
    'https://docs.expo.io/get-started/create-a-new-app/#opening-the-app-on-your-phonetablet'
  );
}

const styles = StyleSheet.create({
  getStartedContainer: {
    alignItems: 'center',
    marginHorizontal: 50
  },
  homeScreenFilename: {
    marginVertical: 7
  },
  codeHighlightContainer: {
    borderRadius: 3,
    paddingHorizontal: 4
  },
  getStartedText: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center'
  },
  helpContainer: {
    marginTop: 15,
    marginHorizontal: 20,
    alignItems: 'center'
  },
  helpLink: {
    paddingVertical: 15
  },
  helpLinkText: {
    textAlign: 'center'
  }
});
