import { RootStackParamList } from '../types';
import { View } from './Themed';
import { Divider, Text, useTheme } from 'react-native-paper';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { qpmLayoutTokens } from '../theme/tokens';

export default function ListField<T>({
  values,
  label,
  getHref,
  getValueLabel
}: {
  values: T[];
  label: string;
  getHref: (value: T) => { route: keyof RootStackParamList; params: {} };
  getValueLabel: (value: T) => string;
}) {
  const theme = useTheme();
  const navigation = useNavigation();
  return (
    !!values?.length && (
      <View>
        <View style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.values}>
            {values.map((value, index) => (
              <TouchableOpacity
                style={styles.valueLink}
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${getValueLabel(value)}`}
                onPress={() => {
                  const destination = getHref(value);
                  // @ts-ignore The route-to-parameter relationship is supplied by each caller.
                  navigation.push(destination.route, destination.params);
                }}
              >
                <Text
                  style={[styles.valueText, { color: theme.colors.primary }]}
                >
                  {getValueLabel(value)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Divider />
      </View>
    )
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
  values: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch'
  },
  valueLink: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingVertical: qpmLayoutTokens.space.xs
  },
  valueText: {
    fontWeight: 'bold',
    flexShrink: 1,
    textAlign: 'right'
  }
});
