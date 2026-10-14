import { View } from 'react-native';
import { Avatar } from 'react-native-paper';

/** Decorative selection mark; its accessible state belongs to the parent control. */
export default function SelectionIndicator({
  checked,
  color,
  uncheckedColor
}: {
  checked: boolean;
  color: string;
  uncheckedColor: string;
}) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ padding: 6 }}
    >
      <Avatar.Icon
        size={24}
        icon={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
        color={checked ? color : uncheckedColor}
        style={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
}
