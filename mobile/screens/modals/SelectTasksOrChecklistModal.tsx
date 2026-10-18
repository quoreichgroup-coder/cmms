import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { Card, Icon, Text, useTheme } from 'react-native-paper';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import { qpmLayoutTokens } from '../../theme/tokens';

export default function SelectTasksOrChecklistModal({
  navigation,
  route
}: RootStackScreenProps<'SelectTasksOrChecklist'>) {
  const { onChange, selected } = route.params;
  const theme = useTheme();
  const { t } = useTranslation();
  const options: {
    label: string;
    screen: 'SelectTasks' | 'SelectChecklists';
    icon: IconSource;
  }[] = [
    {
      label: t('task'),
      screen: 'SelectTasks',
      icon: 'checkbox-outline'
    },
    {
      label: t('checklist'),
      icon: 'format-list-bulleted',
      screen: 'SelectChecklists'
    }
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text
        variant="titleLarge"
        style={[styles.title, { color: theme.colors.onSurface }]}
        accessibilityRole="header"
      >
        {t('select_task_type')}
      </Text>
      <View style={styles.options}>
        {options.map((option) => (
          <Pressable
            key={option.screen}
            accessible
            accessibilityRole="button"
            accessibilityLabel={option.label}
            onPress={() =>
              navigation.navigate(option.screen, {
                onChange,
                selected
              })
            }
            style={({ pressed }) => [
              styles.option,
              { opacity: pressed ? 0.78 : 1 }
            ]}
          >
            <Card
              mode="outlined"
              style={[
                styles.optionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant
                }
              ]}
            >
              <Card.Content style={styles.optionContent}>
                <View
                  accessible={false}
                  style={[
                    styles.iconContainer,
                    { backgroundColor: theme.colors.primaryContainer }
                  ]}
                >
                  <Icon
                    source={option.icon}
                    size={24}
                    color={theme.colors.onPrimaryContainer}
                  />
                </View>
                <Text
                  variant="titleMedium"
                  style={[
                    styles.optionLabel,
                    { color: theme.colors.onSurface }
                  ]}
                >
                  {option.label}
                </Text>
                <Icon
                  source="chevron-right"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </Card.Content>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: qpmLayoutTokens.space.lg,
    paddingBottom: qpmLayoutTokens.space.xxl
  },
  title: {
    marginBottom: qpmLayoutTokens.space.lg
  },
  options: {
    gap: qpmLayoutTokens.space.md
  },
  option: {
    minHeight: qpmLayoutTokens.touchTarget.minimum
  },
  optionCard: {
    minHeight: 80,
    justifyContent: 'center',
    borderRadius: qpmLayoutTokens.radius.cardLarge
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: qpmLayoutTokens.space.md,
    paddingVertical: qpmLayoutTokens.space.sm
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: qpmLayoutTokens.radius.control
  },
  optionLabel: {
    flex: 1
  }
});
