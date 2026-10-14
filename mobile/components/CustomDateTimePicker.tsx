import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useContext, useEffect, useState } from 'react';
import { View } from './Themed';
import { Text, useTheme } from 'react-native-paper';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { CompanySettingsContext } from '../contexts/CompanySettingsContext';
import { useTranslation } from 'react-i18next';
import { qpmLayoutTokens } from '../theme/tokens';

export default function CustomDateTimePicker({
  onChange,
  value,
  label,
  disabled = false
}: {
  onChange: (date: Date) => void;
  value: Date | null;
  label: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };
  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };
  useEffect(() => {
    if (disabled) setDatePickerVisibility(false);
  }, [disabled]);

  return (
    <View>
      <TouchableOpacity
        onPress={showDatePicker}
        disabled={disabled}
        style={[styles.trigger, disabled && styles.disabledTrigger]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${
          value ? getFormattedDate(value) : t('select_date')
        }`}
        accessibilityHint={t('select_date')}
        accessibilityState={{ disabled, expanded: isDatePickerVisible }}
      >
        <Text style={styles.label}>{label}</Text>
        <Text
          style={[
            styles.value,
            {
              color: value
                ? theme.colors.primary
                : theme.colors.onSurfaceVariant
            }
          ]}
          numberOfLines={2}
        >
          {value ? getFormattedDate(value) : t('select_date')}
        </Text>
      </TouchableOpacity>
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="datetime"
        onConfirm={(newValue) => {
          if (!disabled) onChange(newValue);
          hideDatePicker();
        }}
        date={value ?? new Date()}
        onCancel={hideDatePicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: qpmLayoutTokens.space.sm
  },
  disabledTrigger: { opacity: 0.55 },
  label: {
    flex: 1,
    marginRight: qpmLayoutTokens.space.md
  },
  value: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right'
  }
});
