import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet
} from 'react-native';
import { View } from '../../components/Themed';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { Fragment, useContext, useEffect, useRef, useState } from 'react';
import { AssetMiniDTO } from '../../models/asset';
import {
  Button,
  Divider,
  IconButton,
  List,
  RadioButton,
  Text,
  TextInput,
  useTheme
} from 'react-native-paper';
import { TaskType } from '../../models/tasks';
import { UserMiniDTO } from '../../models/user';
import { randomInt } from '../../utils/generators';
import { getTaskFromTaskBase } from '../../utils/formatters';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import { getTaskTypes } from '../../utils/displayers';
import { MeterMiniDTO } from '../../models/meter';

interface TaskOption {
  id: number;
  value: string;
}

export default function SelectTasksModal({
  navigation,
  route
}: RootStackScreenProps<'SelectTasks'>) {
  const { onChange, selected } = route.params;
  const theme = useTheme();
  const [type, setType] = useState<TaskType>('SUBTASK');
  const [label, setLabel] = useState<string>('');
  const nextOptionId = useRef(2);
  const [options, setOptions] = useState<TaskOption[]>([
    { id: 0, value: '' },
    { id: 1, value: '' }
  ]);
  const [user, setUser] = useState<UserMiniDTO>();
  const [asset, setAsset] = useState<AssetMiniDTO>();
  const [meter, setMeter] = useState<MeterMiniDTO>();
  const { t }: { t: any } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);

  const onTaskTypeChange = (value: string) => {
    const nextType = value as TaskType;
    setType(nextType);
    if (nextType !== 'METER') setMeter(undefined);
  };

  const onOptionChange = (value: string, optionId: number) => {
    setOptions((current) =>
      current.map((option) =>
        option.id === optionId ? { ...option, value } : option
      )
    );
  };
  const onAddNewOption = () => {
    const id = nextOptionId.current++;
    setOptions((current) => [...current, { id, value: '' }]);
  };
  const onRemoveOption = (optionId: number) => {
    setOptions((current) => current.filter((option) => option.id !== optionId));
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('add')}
          onPress={() => {
            if (!label?.trim()) {
              showSnackBar(t('required_task_label'), 'error');
              return;
            }
            if (
              type === 'MULTIPLE' &&
              options.some((option) => !option.value.trim())
            ) {
              showSnackBar(t('remove_blank_options'), 'error');
              return;
            } else if (type === 'METER' && !meter) {
              showSnackBar(t('remove_blank_meter_tasks'), 'error');
              return;
            }
            onChange([
              ...selected,
              getTaskFromTaskBase({
                id: randomInt(),
                label,
                taskType: type,
                options: options.map((option) => ({
                  id: randomInt(),
                  label: option.value
                })),
                user,
                asset,
                meter: type === 'METER' ? meter : null
              })
            ]);
            navigation.pop(2);
          }}
        >
          <Text variant="titleMedium">{t('add')}</Text>
        </Pressable>
      )
    });
  }, [label, type, user, asset, options, meter]);
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text
          style={{
            paddingHorizontal: 15,
            marginVertical: 10
          }}
        >
          {t('select_task_type')}
        </Text>
        <RadioButton.Group value={type} onValueChange={onTaskTypeChange}>
          {getTaskTypes(t).map((taskType) => (
            <RadioButton.Item
              key={taskType.value}
              value={taskType.value}
              label={t(taskType.label)}
              position="leading"
              mode="android"
              style={{ paddingHorizontal: 15 }}
            />
          ))}
        </RadioButton.Group>
        <Text
          style={{
            paddingHorizontal: 15,
            marginVertical: 10
          }}
        >
          {t('enter_task_name')}
        </Text>
        <View style={{ paddingVertical: 10, paddingHorizontal: 15 }}>
          <TextInput
            accessibilityLabel={t('enter_task_name')}
            onChangeText={(value) => setLabel(value)}
            mode={'outlined'}
            value={label}
          />
        </View>
        {type === 'MULTIPLE' ? (
          <Fragment>
            <Text
              style={{
                paddingHorizontal: 15,
                marginVertical: 10
              }}
            >
              {t('add_options')}
            </Text>
            <View style={{ paddingVertical: 10, paddingHorizontal: 15 }}>
              {options.map((option, index) => (
                <View
                  key={option.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 10
                  }}
                >
                  <TextInput
                    accessibilityLabel={t('task_option_number', {
                      number: index + 1
                    })}
                    style={{ width: index < 2 ? '100%' : '80%' }}
                    onChangeText={(value) => onOptionChange(value, option.id)}
                    mode={'outlined'}
                    value={option.value}
                  />
                  {index > 1 && (
                    <IconButton
                      accessibilityLabel={t('remove_task_option', {
                        number: index + 1
                      })}
                      onPress={() => onRemoveOption(option.id)}
                      icon={'close-circle'}
                      iconColor={theme.colors.error}
                    />
                  )}
                </View>
              ))}
              <Button
                style={{ marginTop: 10 }}
                mode={'contained'}
                onPress={onAddNewOption}
              >
                {t('add_new_option')}
              </Button>
            </View>
          </Fragment>
        ) : type === 'METER' ? (
          <View style={{ paddingVertical: 10, paddingHorizontal: 15 }}>
            <List.Item
              title={`${t('select_meter')} *`}
              descriptionStyle={{ color: theme.colors.primary }}
              description={meter ? meter.name : null}
              left={() => <List.Icon icon={'gauge'} />}
              onPress={() =>
                navigation.navigate('SelectMeters', {
                  onChange: (meters) => setMeter(meters[0]),
                  selected: meter ? [meter.id] : [],
                  multiple: false
                })
              }
            />
          </View>
        ) : null}
        <Text
          style={{
            paddingHorizontal: 15,
            marginVertical: 10
          }}
        >
          {t('optional')}
        </Text>
        <View style={{ paddingVertical: 10, paddingHorizontal: 15 }}>
          <List.Item
            title={t('assign_user')}
            descriptionStyle={{ color: theme.colors.primary }}
            description={user ? `${user.firstName} ${user.lastName}` : null}
            left={() => <List.Icon icon={'account'} />}
            onPress={() =>
              navigation.navigate('SelectUsers', {
                onChange: (users) => setUser(users[0]),
                selected: [],
                multiple: false
              })
            }
          />
          <Divider />
          <List.Item
            title={t('assign_asset')}
            descriptionStyle={{ color: theme.colors.primary }}
            description={asset ? asset.name : null}
            left={() => <List.Icon icon={'package-variant-closed'} />}
            onPress={() =>
              navigation.navigate('SelectAssets', {
                onChange: (assets) => setAsset(assets[0]),
                selected: asset ? [asset.id] : [],
                multiple: false,
                locationId: null
              })
            }
          />
          <Divider />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
