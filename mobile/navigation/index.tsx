import { logSafeError } from '../utils/safeErrorLog';
/**
 * If you are not familiar with React Navigation, refer to the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import {
  BottomTabBar,
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
  type BottomTabBarProps
} from '@react-navigation/bottom-tabs';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import * as Notifications from 'expo-notifications';
import {
  Keyboard,
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import ModalScreen from '../screens/ModalScreen';
import NotFoundScreen from '../screens/NotFoundScreen';
import HomeScreen from '../screens/HomeScreen';
import AuthenticationScreen from '../screens/auth/AuthenticationScreen';
import VerifyScreen from '../screens/auth/VerifyScreen';
import LoadingScreen from '../screens/auth/LoadingScreen';
import WODetailsScreen from '../screens/workOrders/WODetailsScreen';
import CreateWorkOrder from '../screens/workOrders/CreateWorkOrderScreen';
import EditWorkOrder from '../screens/workOrders/EditWorkOrderScreen';
import CreateRequestScreen from '../screens/requests/CreateRequestScreen';
import CreateAssetScreen from '../screens/assets/CreateAssetScreen';
import CreateLocationScreen from '../screens/locations/CreateLocationScreen';
import CreateMeterScreen from '../screens/meters/CreateMeterScreen';
import CreatePartScreen from '../screens/parts/CreatePartScreen';
import WorkOrderStatsScreen from '../screens/WorkOrderStatsScreen';
import {
  AuthStackParamList,
  RootStackParamList,
  RootTabParamList,
  RootTabScreenProps,
  SuperUserStackParamList
} from '../types';
import LinkingConfiguration from './LinkingConfiguration';
import useAuth from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { FAB, IconButton, Text } from 'react-native-paper';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import MoreEntitiesScreen from '../screens/MoreEntitiesScreen';
import MyShiftAvailabilityScreen from '../screens/MyShiftAvailabilityScreen';
import MetersScreen from '../screens/meters/MetersScreen';
import WorkOrdersScreen from '../screens/workOrders/WorkOrdersScreen';
import { SheetManager } from 'react-native-actions-sheet';
import CompleteWorkOrderModal from '../screens/workOrders/CompleteWorkOrderModal';
import SelectPartsModal from '../screens/modals/SelectPartsModal';
import TasksScreen from '../screens/workOrders/TasksScreen';
import SelectCustomersModal from '../screens/modals/SelectCustomersModal';
import SelectVendorsModal from '../screens/modals/SelectVendorsModal';
import SelectUsersModal from '../screens/modals/SelectUsersModal';
import SelectTeamsModal from '../screens/modals/SelectTeamsModal';
import SelectLocationsModal from '../screens/modals/SelectLocationsModal';
import SelectAssetsModal from '../screens/modals/SelectAssetsModal';
import SelectCategoriesModal from '../screens/modals/SelectCategoryModal';
import SelectTasksModal from '../screens/modals/SelectTasksModal';
import SelectChecklistsModal from '../screens/modals/SelectChecklistsModal';
import SelectTasksOrChecklistModal from '../screens/modals/SelectTasksOrChecklistModal';
import PartsScreen from '../screens/parts/PartsScreen';
import PurchaseOrdersScreen from '../screens/purchaseOrders/PurchaseOrdersScreen';
import PurchaseOrderDetailsScreen from '../screens/purchaseOrders/PurchaseOrderDetailsScreen';
import VendorsAndCustomersScreen from '../screens/vendorsCustomers';
import PeopleAndTeamsScreen from '../screens/peopleTeams';
import NotificationsScreen from '../screens/NotificationsScreen';
import AssetsScreen from '../screens/assets/AssetsScreen';
import LocationsScreen from '../screens/locations/LocationsScreen';
import AssetDetails from '../screens/assets/details';
import EditAssetScreen from '../screens/assets/EditAssetScreen';
import LocationDetails from '../screens/locations/details';
import EditLocationScreen from '../screens/locations/EditLocationScreen';
import PartDetails from '../screens/parts/details';
import EditPartScreen from '../screens/parts/EditPartScreen';
import CustomerDetailsScreen from '../screens/vendorsCustomers/details/CustomerDetailsScreen';
import EditCustomerScreen from '../screens/vendorsCustomers/EditCustomerScreen';
import VendorDetailsScreen from '../screens/vendorsCustomers/details/VendorDetailsScreen';
import EditVendorScreen from '../screens/vendorsCustomers/EditVendorScreen';
import MeterDetails from '../screens/meters/MeterDetails';
import EditMeterScreen from '../screens/meters/EditMeterScreen';
import TeamDetails from '../screens/peopleTeams/TeamDetails';
import EditTeamScreen from '../screens/peopleTeams/EditTeamScreen';
import RequestDetails from '../screens/requests/RequestDetails';
import EditRequestScreen from '../screens/requests/EditRequestScreen';
import UserDetails from '../screens/peopleTeams/UserDetails';
import UserProfile from '../screens/peopleTeams/Profile';
import InviteUserScreen from '../screens/peopleTeams/InviteUserScreen';
import { navigate, navigationRef } from './RootNavigation';
import { getNotificationUrlFromData } from '../utils/urlPaths';
import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LicenseScreen from '../screens/LicenseScreen';
import CompanyProfileScreen from '../screens/CompanyProfileScreen';
import WorkOrderFilters from '../screens/workOrders/WorkOrderFilters';
import CreateAdditionalCost from '../screens/workOrders/CreateAdditionalCost';
import EditAdditionalCost from '../screens/workOrders/EditAdditionalCost';
import CreateAdditionalTime from '../screens/workOrders/CreateAdditionalTime';
import EditAdditionalTime from '../screens/workOrders/EditAdditionalTime';
import SelectNfcModal from '../screens/modals/SelectNfcModal';
import SelectBarcodeModal from '../screens/modals/SelectBarcodeModal';
import ScanAssetScreen from '../screens/ScanAssetScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import SelectMetersModal from '../screens/modals/SelectMetersModal';
import PreventiveMaintenancesScreen from '../screens/preventiveMaintenance/PreventiveMaintenancesScreen';
import PreventiveMaintenanceDetailsScreen from '../screens/preventiveMaintenance/PreventiveMaintenanceDetailsScreen';
import {
  createEntities,
  PermissionEntity,
  viewMoreEntities
} from '../models/role';
import RequestsScreen from '../screens/requests/RequestsScreen';
import SwitchAccountScreen from '../screens/superUser/SwitchAccountScreen';
import { FontAwesome, Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppearance } from '../contexts/AppearanceContext';
import { qpmLayoutTokens, useAppTheme } from '../custom-theme';
import { shouldShowOnboarding } from '../utils/onboardingState';
import { PlanFeature } from '../models/subscriptionPlan';

export default function Navigation() {
  const { colorScheme, theme } = useAppearance();
  const { isAuthenticated, isInitialized, isRecoveringSession, user } =
    useAuth();
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const [navigationReady, setNavigationReady] = React.useState(false);
  const navigationTheme = React.useMemo(() => {
    const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.onSurface,
        border: theme.colors.outlineVariant,
        notification: theme.colors.error
      }
    };
  }, [colorScheme, theme]);

  React.useEffect(() => {
    if (
      !isInitialized ||
      !isAuthenticated ||
      !navigationReady ||
      !lastNotificationResponse
    ) {
      return;
    }

    const destination = getNotificationUrlFromData(
      lastNotificationResponse.notification.request.content.data
    );
    if (destination) navigate(destination.route, destination.params);

    Notifications.clearLastNotificationResponseAsync().catch((error) =>
      logSafeError('Could not clear handled notification response:', error)
    );
  }, [
    isAuthenticated,
    isInitialized,
    lastNotificationResponse,
    navigationReady
  ]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setNavigationReady(true)}
      linking={LinkingConfiguration}
      theme={navigationTheme}
    >
      {isInitialized ? (
        isAuthenticated ? (
          user.superAccountRelations.length ? (
            <SuperUserNavigator />
          ) : (
            <RootNavigator />
          )
        ) : (
          <AuthNavigator />
        )
      ) : (
        <LoadingScreen recovering={isRecoveringSession} />
      )}
    </NavigationContainer>
  );
}

/**
 * A root stack navigator is often used for displaying modals on top of all other content.
 * https://reactnavigation.org/docs/modal
 */
const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { t } = useTranslation();
  const {
    hasViewPermission,
    hasFeature,
    user,
    userSettings,
    fetchUserSettings
  } = useAuth();
  const [startupRoute, setStartupRoute] = React.useState<
    'Root' | 'Onboarding' | null
  >(null);
  const attemptedSettingsForUser = React.useRef<number | null>(null);
  const canViewRequests =
    hasViewPermission(PermissionEntity.REQUESTS) &&
    user.uiConfiguration.requests;
  const canViewPurchaseOrders =
    hasViewPermission(PermissionEntity.PURCHASE_ORDERS) &&
    hasFeature(PlanFeature.PURCHASE_ORDER);

  React.useEffect(() => {
    if (!user) return;
    if (userSettings?.id === user.userSettingsId) {
      setStartupRoute(
        shouldShowOnboarding(userSettings) ? 'Onboarding' : 'Root'
      );
      return;
    }
    if (attemptedSettingsForUser.current === user.userSettingsId) return;
    attemptedSettingsForUser.current = user.userSettingsId;
    void fetchUserSettings().catch((error) => {
      logSafeError(
        'Could not load user settings before mobile startup:',
        error
      );
      // A settings service outage must not lock a user out of QPM.
      setStartupRoute('Root');
    });
  }, [fetchUserSettings, user, userSettings]);

  if (!startupRoute) return <LoadingScreen />;

  return (
    <Stack.Navigator initialRouteName={startupRoute}>
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="Root"
        component={BottomTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WODetails"
        component={WODetailsScreen}
        options={{ title: t('wo_details') }}
      />
      <Stack.Screen
        name="Tasks"
        component={TasksScreen}
        options={{ title: t('tasks') }}
      />
      <Stack.Screen
        name="NotFound"
        component={NotFoundScreen}
        options={{ title: 'Oops!' }}
      />
      <Stack.Screen
        name="AddWorkOrder"
        component={CreateWorkOrder}
        options={{ title: t('create_work_order') }}
      />
      <Stack.Screen
        name="EditWorkOrder"
        component={EditWorkOrder}
        options={{ title: t('edit_work_order') }}
      />
      <Stack.Screen
        name="AddRequest"
        component={CreateRequestScreen}
        options={{ title: t('create_request') }}
      />
      <Stack.Screen
        name="AddAsset"
        component={CreateAssetScreen}
        options={({ route }) => ({
          title: t('create_asset'),
          presentation: route.params?.openedFromSelector ? 'modal' : 'card'
        })}
      />
      <Stack.Screen
        name="AddLocation"
        component={CreateLocationScreen}
        options={({ route }) => ({
          title: t('create_location'),
          presentation: route.params?.openedFromSelector ? 'modal' : 'card'
        })}
      />
      <Stack.Screen
        name="AddPart"
        component={CreatePartScreen}
        options={({ route }) => ({
          title: t('create_part'),
          presentation: route.params?.openedFromSelector ? 'modal' : 'card'
        })}
      />
      <Stack.Screen
        name="AddMeter"
        component={CreateMeterScreen}
        options={{ title: t('create_meter') }}
      />
      <Stack.Screen
        name="AddUser"
        component={InviteUserScreen}
        options={({ route }) => ({
          title: t('invite_users'),
          presentation: route.params?.openedFromSelector ? 'modal' : 'card'
        })}
      />
      <Stack.Screen
        name="WorkOrderStats"
        component={WorkOrderStatsScreen}
        options={{ title: t('stats') }}
      />
      {canViewRequests && (
        <Stack.Screen
          name="Requests"
          component={RequestsScreen}
          options={{ title: t('requests') }}
        />
      )}
      <Stack.Screen
        name="Meters"
        component={MetersScreen}
        options={{ title: t('meters') }}
      />
      <Stack.Screen
        name="PreventiveMaintenances"
        component={PreventiveMaintenancesScreen}
        options={{ title: t('preventive_maintenance') }}
      />
      <Stack.Screen
        name="PreventiveMaintenanceDetails"
        component={PreventiveMaintenanceDetailsScreen}
        options={{ title: t('pm_details') }}
      />
      <Stack.Screen
        name="MeterDetails"
        component={MeterDetails}
        options={{ title: t('meter_details') }}
      />
      <Stack.Screen
        name="EditMeter"
        component={EditMeterScreen}
        options={{ title: t('edit_meter') }}
      />
      <Stack.Screen
        name="Parts"
        component={PartsScreen}
        options={{ title: t('parts') }}
      />
      {canViewPurchaseOrders && (
        <>
          <Stack.Screen
            name="PurchaseOrders"
            component={PurchaseOrdersScreen}
            options={{ title: t('purchase_orders') }}
          />
          <Stack.Screen
            name="PurchaseOrderDetails"
            component={PurchaseOrderDetailsScreen}
            options={{ title: t('purchase_order_details') }}
          />
        </>
      )}
      <Stack.Screen
        name="PartDetails"
        component={PartDetails}
        options={{ title: t('part') }}
      />
      <Stack.Screen
        name="RequestDetails"
        component={RequestDetails}
        options={{ title: t('request_details') }}
      />
      <Stack.Screen
        name="EditRequest"
        component={EditRequestScreen}
        options={{ title: t('edit_request') }}
      />
      <Stack.Screen
        name="EditPart"
        component={EditPartScreen}
        options={{ title: t('update_part') }}
      />
      <Stack.Screen
        name="VendorsCustomers"
        component={VendorsAndCustomersScreen}
        options={{
          title: t('vendors_and_customers'),
          contentStyle: Platform.OS === 'ios' ? { paddingTop: 10 } : undefined
        }}
      />
      <Stack.Screen
        name="CustomerDetails"
        component={CustomerDetailsScreen}
        options={{ title: t('customer') }}
      />
      <Stack.Screen
        name="EditCustomer"
        component={EditCustomerScreen}
        options={{ title: t('edit_customer') }}
      />
      <Stack.Screen
        name="VendorDetails"
        component={VendorDetailsScreen}
        options={{ title: t('vendor') }}
      />
      <Stack.Screen
        name="EditVendor"
        component={EditVendorScreen}
        options={{ title: t('edit_vendor') }}
      />
      <Stack.Screen
        name="Assets"
        component={AssetsScreen}
        options={{ title: t('assets') }}
      />
      <Stack.Screen
        name="AssetDetails"
        component={AssetDetails}
        options={{ title: t('asset') }}
      />
      <Stack.Screen
        name="EditAsset"
        component={EditAssetScreen}
        options={{ title: t('edit_asset') }}
      />
      <Stack.Screen
        name="Locations"
        component={LocationsScreen}
        options={{ title: t('locations') }}
      />
      <Stack.Screen
        name="LocationDetails"
        component={LocationDetails}
        options={{ title: t('location') }}
      />
      <Stack.Screen
        name="EditLocation"
        component={EditLocationScreen}
        options={{ title: t('edit_location') }}
      />
      <Stack.Screen
        name="PeopleTeams"
        component={PeopleAndTeamsScreen}
        options={{
          title: t('people_teams'),
          contentStyle: Platform.OS === 'ios' ? { paddingTop: 10 } : undefined
        }}
      />
      <Stack.Screen
        name="TeamDetails"
        component={TeamDetails}
        options={{ title: t('team') }}
      />
      <Stack.Screen
        name="UserDetails"
        component={UserDetails}
        options={{ title: t('user_details') }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfile}
        options={{ title: t('profile') }}
      />
      <Stack.Screen
        name="EditTeam"
        component={EditTeamScreen}
        options={{ title: t('edit') }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t('Notifications') }}
      />
      <Stack.Screen
        name="License"
        component={LicenseScreen}
        options={{ title: t('company_license') }}
      />
      <Stack.Screen
        name="CompanyProfile"
        component={CompanyProfileScreen}
        options={{ title: t('company_profile') }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('settings') }}
      />
      <Stack.Screen
        name="MyShiftAvailability"
        component={MyShiftAvailabilityScreen}
        options={{ title: t('my_shift_availability') }}
      />
      <Stack.Screen
        name="WorkOrderFilters"
        component={WorkOrderFilters}
        options={{ title: t('filters') }}
      />
      <Stack.Screen
        name="ScanAsset"
        component={ScanAssetScreen}
        options={{ title: t('to_scan') }}
      />
      <Stack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ title: t('feedback_title') }}
      />
      <Stack.Group
        screenOptions={{
          presentation: 'modal',
          contentStyle: Platform.OS === 'ios' ? { paddingTop: 20 } : undefined
        }}
      >
        <Stack.Screen name="Modal" component={ModalScreen} />
        <Stack.Screen
          name="CompleteWorkOrder"
          component={CompleteWorkOrderModal}
          options={{ title: t('complete_work_order') }}
        />
        <Stack.Screen
          name="SelectParts"
          component={SelectPartsModal}
          options={{ title: t('select_parts') }}
        />
        <Stack.Screen
          name="SelectMeters"
          component={SelectMetersModal}
          options={{ title: t('select_meter') }}
        />
        <Stack.Screen
          name="SelectNfc"
          component={SelectNfcModal}
          options={{ title: t('to_scan') }}
        />
        <Stack.Screen
          name="SelectBarcode"
          component={SelectBarcodeModal}
          options={{ title: t('to_scan') }}
        />
        <Stack.Screen
          name="SelectCustomers"
          component={SelectCustomersModal}
          options={{ title: t('select_customers') }}
        />
        <Stack.Screen
          name="SelectVendors"
          component={SelectVendorsModal}
          options={{ title: t('select_vendors') }}
        />
        <Stack.Screen
          name="SelectUsers"
          component={SelectUsersModal}
          options={{ title: t('select_users') }}
        />
        <Stack.Screen
          name="SelectTeams"
          component={SelectTeamsModal}
          options={{ title: t('select_teams') }}
        />
        <Stack.Screen
          name="SelectLocations"
          component={SelectLocationsModal}
          options={{ title: t('select_locations') }}
        />
        <Stack.Screen
          name="SelectAssets"
          component={SelectAssetsModal}
          options={{ title: t('select_assets') }}
        />
        <Stack.Screen
          name="SelectCategories"
          component={SelectCategoriesModal}
          options={{ title: t('select_categories') }}
        />
        <Stack.Screen
          name="SelectTasks"
          component={SelectTasksModal}
          options={{ title: t('add_task') }}
        />
        <Stack.Screen
          name="SelectChecklists"
          component={SelectChecklistsModal}
          options={{ title: t('add_task') }}
        />
        <Stack.Screen
          name="SelectTasksOrChecklist"
          component={SelectTasksOrChecklistModal}
          options={{ title: t('add_task') }}
        />
        <Stack.Screen
          name="AddAdditionalCost"
          component={CreateAdditionalCost}
          options={{ title: t('add_cost') }}
        />
        <Stack.Screen
          name="EditAdditionalCost"
          component={EditAdditionalCost}
          options={{ title: t('edit_additional_cost') }}
        />
        <Stack.Screen
          name="AddAdditionalTime"
          component={CreateAdditionalTime}
          options={{ title: t('add_time') }}
        />
        <Stack.Screen
          name="EditAdditionalTime"
          component={EditAdditionalTime}
          options={{ title: t('edit_additional_time') }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const SuperUserStack = createNativeStackNavigator<SuperUserStackParamList>();

function AuthNavigator() {
  const { t } = useTranslation();
  return (
    <AuthStack.Navigator initialRouteName="AuthFlow">
      <AuthStack.Screen
        name="AuthFlow"
        component={AuthenticationScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="Verify"
        component={VerifyScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="CustomServer"
        component={React.lazy(
          () => import('../screens/auth/CustomServerScreen')
        )}
        options={{ title: t('custom_server') }}
      />
    </AuthStack.Navigator>
  );
}

function SuperUserNavigator() {
  const { t } = useTranslation();
  return (
    <SuperUserStack.Navigator>
      <SuperUserStack.Screen
        name="SwitchAccount"
        component={SwitchAccountScreen}
        options={{ title: t('switch_account') }}
      />
    </SuperUserStack.Navigator>
  );
}

/**
 * A bottom tab navigator displays tab buttons on the bottom of the display to switch screens.
 * https://reactnavigation.org/docs/bottom-tab-navigator
 */
const BottomTab = createBottomTabNavigator<RootTabParamList>();

function ScanTabBarButton({
  children,
  style,
  ...buttonProps
}: BottomTabBarButtonProps) {
  const theme = useAppTheme();
  return (
    <TouchableOpacity
      {...buttonProps}
      accessible
      accessibilityRole="button"
      style={[
        style,
        { top: -18, alignItems: 'center', justifyContent: 'center' }
      ]}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.navigationActive,
          elevation: 7,
          shadowColor: theme.colors.shadow,
          shadowOpacity: 0.22,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 }
        }}
      >
        {children}
      </View>
    </TouchableOpacity>
  );
}

function QpmBottomTabBar(props: BottomTabBarProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { hasCreatePermission, user } = useAuth();
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const canCreate = createEntities.some((entity) =>
    hasCreatePermission(entity)
  );
  const activeRoute = props.state.routes[props.state.index]?.name;
  const showCreate =
    canCreate && ['Home', 'WorkOrders', 'Requests'].includes(activeRoute);
  const rootNavigation = props.navigation.getParent();

  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  const handleCreate = () => {
    if (user.role.code === 'REQUESTER') {
      rootNavigation?.navigate('AddRequest' as never);
      return;
    }
    SheetManager.show('create-entities-sheet', {
      payload: { navigation: rootNavigation as never }
    });
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <BottomTabBar {...props} />
      {showCreate && (
        <FAB
          icon="plus"
          accessibilityLabel={t('create')}
          onPress={handleCreate}
          color={theme.colors.onNavigationActive}
          style={{
            position: 'absolute',
            right: 20,
            bottom: Math.max(12, insets.bottom) + 82,
            backgroundColor: theme.colors.navigationActive,
            borderRadius: 28
          }}
        />
      )}
    </View>
  );
}

function BottomTabNavigator({ navigation }: RootTabScreenProps<'Home'>) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const { hasViewPermission, hasFeature, user } = useAuth();
  const uiConfiguration = user.uiConfiguration;
  const isRequester = user.role.code === 'REQUESTER';
  const canViewRequests =
    hasViewPermission(PermissionEntity.REQUESTS) && uiConfiguration.requests;
  const canViewMoreEntities = viewMoreEntities.some(
    (entity) =>
      hasViewPermission(entity) &&
      (entity !== PermissionEntity.PURCHASE_ORDERS ||
        hasFeature(PlanFeature.PURCHASE_ORDER))
  );

  return (
    <BottomTab.Navigator
      initialRouteName={isRequester ? 'Requests' : 'Home'}
      tabBar={(props) => <QpmBottomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: theme.colors.onNavigationActive,
        tabBarInactiveTintColor: theme.colors.onNavigationSurface,
        tabBarActiveBackgroundColor: theme.colors.navigationActive,
        tabBarShowLabel: width >= 440,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: -2 },
        tabBarItemStyle: {
          height: 54,
          marginHorizontal: 2,
          borderRadius: qpmLayoutTokens.radius.pill,
          justifyContent: 'center',
          alignItems: 'center'
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Math.max(12, insets.bottom) + 4,
          left: 14,
          right: 14,
          elevation: 10,
          borderRadius: qpmLayoutTokens.radius.pill,
          zIndex: 10,
          height: 70,
          paddingTop: 8,
          paddingBottom: 8,
          paddingHorizontal: 6,
          backgroundColor: theme.colors.navigationSurface,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.outlineVariant,
          overflow: 'visible',
          shadowColor: theme.colors.shadow,
          shadowOpacity: 0.22,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 }
        },
        tabBarHideOnKeyboard: true
      }}
    >
      {!isRequester && (
        <BottomTab.Screen
          name="Home"
          component={HomeScreen}
          options={({
            navigation: homeNavigation
          }: RootTabScreenProps<'Home'>) => ({
            headerTitle: () => (
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: 22,
                  fontWeight: 'bold'
                }}
              >
                QPM
              </Text>
            ),
            title: t('home'),
            tabBarAccessibilityLabel: t('home'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                color={color}
                size={24}
              />
            ),
            headerRight: () => (
              <IconButton
                icon="cog-outline"
                accessibilityLabel={t('settings')}
                onPress={() => homeNavigation.navigate('Settings')}
              />
            )
          })}
        />
      )}
      {isRequester && canViewRequests && (
        <BottomTab.Screen
          name="Requests"
          component={RequestsScreen}
          options={{
            title: t('requests'),
            tabBarAccessibilityLabel: t('requests'),
            tabBarIcon: ({ color }) => (
              <Feather name="inbox" color={color} size={22} />
            )
          }}
        />
      )}
      <BottomTab.Screen
        name="WorkOrders"
        component={WorkOrdersScreen}
        options={{
          title: t('work_orders'),
          tabBarAccessibilityLabel: t('work_orders'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'clipboard' : 'clipboard-outline'}
              size={24}
              color={color}
            />
          )
        }}
      />
      {hasViewPermission(PermissionEntity.ASSETS) && (
        <BottomTab.Screen
          name="Scan"
          component={View}
          listeners={{
            tabPress: (event) => {
              event.preventDefault();
              navigation.navigate('ScanAsset');
            }
          }}
          options={{
            title: t('to_scan'),
            tabBarAccessibilityLabel: t('to_scan'),
            tabBarShowLabel: false,
            tabBarIcon: () => (
              <Ionicons
                name="scan-outline"
                size={27}
                color={theme.colors.onNavigationActive}
              />
            ),
            tabBarButton: (props) => <ScanTabBarButton {...props} />
          }}
        />
      )}
      {hasViewPermission(PermissionEntity.ANALYTICS) &&
        hasFeature(PlanFeature.ANALYTICS) && (
          <BottomTab.Screen
            name="Stats"
            component={WorkOrderStatsScreen as React.ComponentType<any>}
            options={{
              title: t('stats'),
              tabBarAccessibilityLabel: t('stats'),
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? 'stats-chart' : 'stats-chart-outline'}
                  size={23}
                  color={color}
                />
              )
            }}
          />
        )}
      {(canViewMoreEntities || canViewRequests) && (
        <BottomTab.Screen
          name="MoreEntities"
          component={MoreEntitiesScreen}
          options={{
            title: t('more'),
            tabBarAccessibilityLabel: t('more'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'grid' : 'grid-outline'}
                size={23}
                color={color}
              />
            )
          }}
        />
      )}
    </BottomTab.Navigator>
  );
}
