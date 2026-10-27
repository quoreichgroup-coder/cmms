import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import { List, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { RootStackParamList, RootTabScreenProps } from '../types';
import useAuth from '../hooks/useAuth';
import { PermissionEntity } from '../models/role';
import { UiConfiguration } from '../models/uiConfiguration';
import { PlanFeature } from '../models/subscriptionPlan';
import { useLicenseEntitlement } from '../hooks/useLicenseEntitlement';
import { qpmLayoutTokens } from '../theme/tokens';

export default function MoreEntitiesScreen({
  navigation
}: RootTabScreenProps<'MoreEntities'>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { hasViewPermission, hasFeature, user } = useAuth();
  const hasResourcePlanningLicense = useLicenseEntitlement('RESOURCE_PLANNING');
  const entities: {
    label: string;
    icon: IconSource;
    link: keyof RootStackParamList;
    visible: boolean;
    uiConfigKey?: keyof UiConfiguration;
  }[] = [
    {
      label: 'my_shift_availability',
      icon: 'calendar-account',
      link: 'MyShiftAvailability',
      visible:
        hasFeature(PlanFeature.RESOURCE_PLANNING) && hasResourcePlanningLicense
    },
    {
      label: 'locations',
      icon: 'map-marker',
      link: 'Locations',
      visible: hasViewPermission(PermissionEntity.LOCATIONS),
      uiConfigKey: 'locations'
    },
    {
      label: 'assets',
      icon: 'package-variant-closed',
      link: 'Assets',
      visible: hasViewPermission(PermissionEntity.ASSETS)
    },
    {
      label: 'requests',
      icon: 'inbox-outline',
      link: 'Requests',
      visible:
        hasViewPermission(PermissionEntity.REQUESTS) &&
        user.uiConfiguration.requests,
      uiConfigKey: 'requests'
    },
    {
      label: 'parts',
      icon: 'archive-outline',
      link: 'Parts',
      visible: hasViewPermission(PermissionEntity.PARTS_AND_MULTIPARTS)
    },
    {
      label: 'purchase_orders',
      icon: 'clipboard-list-outline',
      link: 'PurchaseOrders',
      visible:
        hasViewPermission(PermissionEntity.PURCHASE_ORDERS) &&
        hasFeature(PlanFeature.PURCHASE_ORDER)
    },
    {
      label: 'meters',
      icon: 'gauge',
      link: 'Meters',
      visible:
        hasViewPermission(PermissionEntity.METERS) &&
        hasFeature(PlanFeature.METER),
      uiConfigKey: 'meters'
    },
    {
      label: 'preventive_maintenance',
      icon: 'calendar-clock',
      link: 'PreventiveMaintenances',
      visible:
        hasViewPermission(PermissionEntity.PREVENTIVE_MAINTENANCES) &&
        hasFeature(PlanFeature.PREVENTIVE_MAINTENANCE)
    },
    {
      label: 'people_teams',
      icon: 'account',
      link: 'PeopleTeams',
      visible: hasViewPermission(PermissionEntity.PEOPLE_AND_TEAMS)
    },
    {
      label: 'vendors_and_customers',
      icon: 'vector-circle',
      link: 'VendorsCustomers',
      visible: hasViewPermission(PermissionEntity.VENDORS_AND_CUSTOMERS),
      uiConfigKey: 'vendorsAndCustomers'
    }
  ];
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {entities
        .filter(
          (entity) =>
            entity.visible &&
            (entity.uiConfigKey
              ? user.uiConfiguration[entity.uiConfigKey]
              : true)
        )
        .map(({ label, icon, link }) => (
          <Pressable
            key={label}
            onPress={() => navigation.navigate(link as never)}
            accessibilityRole="button"
            accessibilityLabel={t(label)}
            style={({ pressed }) => [
              styles.entityRow,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                opacity: pressed ? 0.72 : 1
              }
            ]}
          >
            <View
              accessible={false}
              style={[
                styles.iconContainer,
                { backgroundColor: theme.colors.secondaryContainer }
              ]}
            >
              <List.Icon
                icon={icon}
                color={theme.colors.onSecondaryContainer}
                style={styles.entityIcon}
              />
            </View>
            <Text
              variant="titleMedium"
              numberOfLines={2}
              style={[styles.entityTitle, { color: theme.colors.onSurface }]}
            >
              {t(label)}
            </Text>
            <List.Icon
              icon="chevron-right"
              color={theme.colors.onSurfaceVariant}
              style={styles.chevron}
            />
          </Pressable>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 104,
    gap: 10
  },
  entityRow: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: qpmLayoutTokens.radius.control,
    alignItems: 'center',
    justifyContent: 'center'
  },
  entityIcon: { margin: 0 },
  entityTitle: { flex: 1, fontWeight: '600' },
  chevron: { margin: 0 }
});
