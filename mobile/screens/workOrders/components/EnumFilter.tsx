import { Checkbox, Dialog, Portal, Text } from 'react-native-paper';
import { FilterField } from '../../../models/page';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { pushOrRemove } from '../../../utils/overall';
import _ from 'lodash';
import { useAppTheme } from '../../../custom-theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getEnumFilterStatuses } from '../../../utils/filter';

interface OwnProps {
  filterFields: FilterField[];
  onChange: (filterFields: FilterField[]) => void;
  completeOptions: string[];
  initialOptions: string[];
  fieldName: string;
  icon: string;
}

export default function EnumFilter({
  filterFields,
  onChange,
  completeOptions,
  fieldName,
  initialOptions,
  icon
}: OwnProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [newFilterFields, setNewFilterFields] =
    useState<FilterField[]>(filterFields);
  const [statuses, setStatuses] = useState<boolean[]>([]);
  //do not trigger change if statuses didn't change
  const [statusesJustOnOpen, setStatusesJustOnOpen] = useState<boolean[]>(null);
  const isSelected = !_.isEqual(
    statuses,
    completeOptions.map((option) => initialOptions.includes(option))
  );
  const switchValue = (index: number, option: string) => {
    const updatedFilterFields = [...newFilterFields];
    const filterFieldIndex = updatedFilterFields.findIndex(
      (filterField) => filterField.field === fieldName
    );
    if (filterFieldIndex >= 0) {
      updatedFilterFields[filterFieldIndex] = {
        ...updatedFilterFields[filterFieldIndex],
        values: pushOrRemove(
          updatedFilterFields[filterFieldIndex].values ?? [],
          !statuses[index],
          option
        )
      };
    } else {
      updatedFilterFields.push({
        field: fieldName,
        operation: 'in',
        value: '',
        enumName: fieldName === 'priority' ? 'PRIORITY' : 'STATUS',
        values: [option]
      });
    }
    const newStatuses = [...statuses];
    newStatuses[index] = !newStatuses[index];
    setStatuses(newStatuses);
    setNewFilterFields(updatedFilterFields);
  };

  useEffect(() => {
    setNewFilterFields(filterFields);
    setStatuses(
      getEnumFilterStatuses(filterFields, fieldName, completeOptions)
    );
  }, [filterFields]);

  const renderDialog = () => {
    return (
      <Portal>
        <Dialog
          visible={openDialog}
          onDismiss={() => {
            setOpenDialog(false);
            if (!_.isEqual(statusesJustOnOpen, statuses)) {
              onChange(newFilterFields);
              setStatusesJustOnOpen(null);
            }
          }}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>{t('select')}</Dialog.Title>
          <Dialog.Content>
            {completeOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!statuses[index] }}
                accessibilityLabel={t(option)}
                style={{
                  marginTop: 5,
                  minHeight: 48,
                  padding: 10,
                  display: 'flex',
                  borderRadius: 5,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                onPress={() => switchValue(index, option)}
              >
                <Checkbox status={statuses[index] ? 'checked' : 'unchecked'} />
                <Text>{t(option)}</Text>
              </TouchableOpacity>
            ))}
          </Dialog.Content>
        </Dialog>
      </Portal>
    );
  };
  return (
    <TouchableOpacity
      onPress={() => {
        setOpenDialog(true);
        setNewFilterFields([...filterFields]);
        setStatusesJustOnOpen(
          getEnumFilterStatuses(filterFields, fieldName, completeOptions)
        );
      }}
      style={{
        backgroundColor: isSelected
          ? theme.colors.primary
          : theme.colors.background,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        borderRadius: 20,
        paddingHorizontal: 12,
        margin: 5
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={[
        t(fieldName),
        isSelected
          ? t('filters_selected_count', {
              count: statuses.filter(Boolean).length
            })
          : undefined
      ]
        .filter(Boolean)
        .join(', ')}
    >
      {renderDialog()}
      <MaterialCommunityIcons
        name={icon as any}
        size={16}
        color={isSelected ? theme.colors.onPrimary : theme.colors.onSurface}
        style={{ marginRight: 6 }}
      />
      <Text
        style={{
          color: isSelected ? theme.colors.onPrimary : theme.colors.onSurface,
          fontWeight: 'bold'
        }}
      >
        {t(fieldName)}
        {isSelected && (
          <Text style={{ fontWeight: 'bold' }}>
            {' · '}
            {statuses.filter(Boolean).length}
          </Text>
        )}
      </Text>
      <MaterialCommunityIcons
        name="chevron-down"
        size={16}
        color={isSelected ? theme.colors.onPrimary : theme.colors.onSurface}
        style={{ marginLeft: 4 }}
      />
    </TouchableOpacity>
  );
}
