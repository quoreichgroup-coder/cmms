import { SafeAreaView, StyleSheet } from 'react-native';
import { SegmentedButtons, useTheme } from 'react-native-paper';
import { getPriorityLabel } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';
import {
  getPriorityColor,
  getPriorityForegroundColor
} from '../../utils/overall';
import { Priority } from '../../models/workOrder';

export default function PriorityPicker({
  value,
  onChange,
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const options = (['NONE', 'LOW', 'MEDIUM', 'HIGH'] as Priority[]).map(
    (option) => {
      return {
        label: getPriorityLabel(option, t),
        value: option,
        style: {
          backgroundColor:
            option === value
              ? getPriorityColor(option, theme)
              : theme.colors.background
        },
        checkedColor: getPriorityForegroundColor(option, theme)
      };
    }
  );
  return (
    <SafeAreaView style={styles.container}>
      <SegmentedButtons
        value={value}
        onValueChange={onChange}
        buttons={options.map((option) => ({ ...option, disabled }))}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center'
  }
});
