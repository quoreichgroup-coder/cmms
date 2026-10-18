import { Text } from 'react-native-paper';
import { FilterField } from '../../../models/page';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';
import * as React from 'react';
import { useAppTheme } from '../../../custom-theme';
import { qpmLayoutTokens } from '../../../theme/tokens';

interface OwnProps {
  filterFields: FilterField[];
  activeFilterField: FilterField;
  onChange: (filterFields: FilterField[]) => void;
  accessibilityLabel?: string;
}

export default function QuickFilter({
  filterFields,
  onChange,
  activeFilterField,
  accessibilityLabel
}: OwnProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isSelected: boolean = filterFields.some(
    (filterField) => filterField.field === activeFilterField.field
  );
  return (
    <TouchableOpacity
      onPress={() => {
        let newFilterFields = [...filterFields];
        if (isSelected) {
          newFilterFields = newFilterFields.filter(
            (filterField) => filterField.field !== activeFilterField.field
          );
        } else {
          newFilterFields.push(activeFilterField);
        }
        onChange(newFilterFields);
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={accessibilityLabel ?? t(activeFilterField.field)}
      style={{
        backgroundColor: isSelected
          ? theme.colors.primary
          : theme.colors.surface,
        borderWidth: 1,
        borderColor: isSelected
          ? theme.colors.primary
          : theme.colors.controlOutline,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: qpmLayoutTokens.touchTarget.minimum,
        borderRadius: qpmLayoutTokens.radius.pill,
        paddingHorizontal: 15,
        margin: 5
      }}
    >
      <Text
        style={{
          color: isSelected ? theme.colors.onPrimary : theme.colors.onSurface,
          fontWeight: 'bold'
        }}
      >
        {t(activeFilterField.field)}
      </Text>
    </TouchableOpacity>
  );
}
