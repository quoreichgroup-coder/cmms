import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { qpmLayoutTokens } from '../../theme/tokens';

type ScanIdentifierFieldProps = {
  kind: 'nfc' | 'barcode';
  label: string;
  value?: string | null;
  hint: string;
  disabled?: boolean;
  onPress: () => void;
};

export default function ScanIdentifierField({
  kind,
  label,
  value,
  hint,
  disabled = false,
  onPress
}: ScanIdentifierFieldProps) {
  const icon = kind === 'nfc' ? 'nfc' : 'barcode-scan';

  return (
    <View style={styles.container}>
      <Button
        mode="outlined"
        icon={icon}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}, ${value}` : label}
        accessibilityHint={hint}
        accessibilityState={{ disabled }}
        contentStyle={styles.buttonContent}
        style={styles.button}
      >
        {label}
      </Button>
      {Boolean(value) && (
        <Text variant="bodySmall" style={styles.value} selectable>
          {value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    gap: 6
  },
  button: {
    borderRadius: qpmLayoutTokens.radius.control
  },
  buttonContent: {
    minHeight: qpmLayoutTokens.touchTarget.minimum
  },
  value: {
    marginHorizontal: 12
  }
});
