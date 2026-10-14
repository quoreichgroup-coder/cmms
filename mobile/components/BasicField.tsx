import { StyleSheet } from 'react-native';
import { View } from './Themed';
import { Divider, Text, TouchableRipple, useTheme } from 'react-native-paper';
import * as React from 'react';
import { Linking } from 'react-native';
import { qpmLayoutTokens } from '../theme/tokens';

export default function BasicField({
  label,
  value,
  isLink
}: {
  label: string;
  value: string | number | null | undefined;
  isLink?: boolean;
}) {
  const theme = useTheme();
  if (value === null || value === undefined || value === '') return null;

  const handlePress = () => {
    if (isLink) {
      const href = value.toString().startsWith('http')
        ? value.toString()
        : `https://${value}`;
      Linking.openURL(href).catch((err) =>
        console.error('Failed to open link:', err)
      );
    }
  };

  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        {isLink ? (
          <TouchableRipple
            onPress={handlePress}
            accessibilityRole="link"
            accessibilityLabel={`${label}: ${value}`}
            style={styles.link}
          >
            <Text style={[styles.value, { color: theme.colors.primary }]}>
              {value}
            </Text>
          </TouchableRipple>
        ) : (
          <Text style={styles.value}>{value}</Text>
        )}
      </View>
      <Divider />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: qpmLayoutTokens.space.lg,
    paddingVertical: qpmLayoutTokens.space.md
  },
  label: {
    flex: 1,
    marginRight: qpmLayoutTokens.space.md
  },
  value: {
    flex: 1,
    flexShrink: 1,
    fontWeight: 'bold',
    textAlign: 'right'
  },
  link: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 44
  }
});
