import * as React from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Button,
  IconButton,
  ProgressBar,
  Surface,
  Text,
  useTheme
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackScreenProps } from '../types';
import useAuth from '../hooks/useAuth';
import { PermissionEntity } from '../models/role';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';
import { qpmLayoutTokens } from '../theme/tokens';
import { CURRENT_ONBOARDING_VERSION } from '../utils/onboardingState';

const slides = [
  {
    title: 'onboarding_welcome_title',
    body: 'onboarding_welcome_body',
    icon: 'factory'
  },
  {
    title: 'onboarding_work_title',
    body: 'onboarding_work_body',
    icon: 'clipboard-check-outline'
  },
  {
    title: 'onboarding_scan_title',
    body: 'onboarding_scan_body',
    icon: 'qrcode-scan'
  },
  {
    title: 'onboarding_plan_title',
    body: 'onboarding_plan_body',
    icon: 'calendar-clock'
  },
  {
    title: 'onboarding_ready_title',
    body: 'onboarding_ready_body',
    icon: 'check-decagram-outline'
  }
] as const;

export default function OnboardingScreen({
  navigation,
  route
}: RootStackScreenProps<'Onboarding'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { user, updateOnboardingPreference, hasViewPermission } = useAuth();
  const { showSnackBar } = React.useContext(CustomSnackBarContext);
  const scrollRef = React.useRef<ScrollView>(null);
  const [page, setPage] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const isReplay = Boolean(route.params?.replay);
  const roleCode = user?.role?.code;
  const roleAudience =
    roleCode === 'TECHNICIAN' || roleCode === 'LIMITED_TECHNICIAN'
      ? 'technician'
      : roleCode === 'REQUESTER'
      ? 'requester'
      : roleCode === 'ADMIN' || roleCode === 'LIMITED_ADMIN'
      ? 'administrator'
      : 'team';
  const availableModules = [
    hasViewPermission(PermissionEntity.WORK_ORDERS) && 'work_orders',
    hasViewPermission(PermissionEntity.ASSETS) && 'equipment',
    hasViewPermission(PermissionEntity.PREVENTIVE_MAINTENANCES) && 'preventive',
    user?.uiConfiguration?.requests &&
      hasViewPermission(PermissionEntity.REQUESTS) &&
      'requests'
  ].filter(Boolean) as string[];
  const canScanEquipment = hasViewPermission(PermissionEntity.ASSETS);
  const welcomeFeatures = [
    hasViewPermission(PermissionEntity.WORK_ORDERS) && 'work_orders',
    hasViewPermission(PermissionEntity.ASSETS) && 'equipment',
    hasViewPermission(PermissionEntity.PREVENTIVE_MAINTENANCES) && 'maintenance'
  ].filter(Boolean) as string[];

  const moveToPage = (nextPage: number) => {
    const boundedPage = Math.max(0, Math.min(slides.length - 1, nextPage));
    setPage(boundedPage);
    scrollRef.current?.scrollTo({ x: boundedPage * width, animated: true });
  };

  const handleSwipe = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
    setPage(Math.max(0, Math.min(slides.length - 1, nextPage)));
  };

  const resolveOnboarding = async (status: 'SKIPPED' | 'COMPLETED') => {
    if (saving) return;
    setSaving(true);
    try {
      await updateOnboardingPreference(CURRENT_ONBOARDING_VERSION, status);
      navigation.replace('Root');
    } catch (_error) {
      showSnackBar(t('onboarding_save_error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderArtwork = (
    icon: (typeof slides)[number]['icon'],
    index: number
  ) => (
    <View
      style={styles.artwork}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t(
        index === 2 && !canScanEquipment
          ? 'onboarding_scan_unavailable_title'
          : slides[index].title
      )}
    >
      <View
        style={[
          styles.artworkHalo,
          { backgroundColor: theme.colors.primaryContainer }
        ]}
      />
      <Surface
        elevation={2}
        style={[
          styles.artworkCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant
          }
        ]}
      >
        <View
          style={[styles.iconTile, { backgroundColor: theme.colors.primary }]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={34}
            color={theme.colors.onPrimary}
          />
        </View>
        <View style={styles.previewLines}>
          <View
            style={[
              styles.previewLine,
              styles.previewLineLong,
              { backgroundColor: theme.colors.onSurface }
            ]}
          />
          <View
            style={[
              styles.previewLine,
              styles.previewLineShort,
              { backgroundColor: theme.colors.onSurfaceVariant }
            ]}
          />
        </View>
        {index === 1 && (
          <View style={styles.previewStatusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: theme.colors.tertiary }
              ]}
            />
            <Text variant="labelSmall">{t('IN_PROGRESS')}</Text>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              WO · 2048
            </Text>
          </View>
        )}
        {index === 2 && (
          <View style={styles.scanPreview}>
            <MaterialCommunityIcons
              name="barcode-scan"
              size={24}
              color={theme.colors.primary}
            />
            <Text variant="labelMedium">QPM · EQ-204</Text>
          </View>
        )}
        {index === 3 && (
          <View style={styles.moduleChips}>
            {availableModules.slice(0, 3).map((module) => (
              <View
                key={module}
                style={[
                  styles.moduleChip,
                  { backgroundColor: theme.colors.secondaryContainer }
                ]}
              >
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSecondaryContainer }}
                >
                  {t(`onboarding_module_${module}`)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Surface>
      <View
        style={[
          styles.floatingMark,
          { backgroundColor: theme.colors.tertiaryContainer }
        ]}
      >
        <MaterialCommunityIcons
          name={index === 4 ? 'check' : 'shield-check-outline'}
          size={22}
          color={theme.colors.onTertiaryContainer}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View
            style={[
              styles.brandMark,
              { backgroundColor: theme.colors.primary }
            ]}
          >
            <MaterialCommunityIcons
              name="wrench-clock"
              size={18}
              color={theme.colors.onPrimary}
            />
          </View>
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, fontWeight: '700' }}
          >
            QPM
          </Text>
        </View>
        <Button
          compact
          mode="text"
          disabled={saving}
          onPress={() => void resolveOnboarding('SKIPPED')}
        >
          {t('onboarding_skip')}
        </Button>
      </View>

      <View
        style={styles.progressRow}
        accessibilityLabel={t('onboarding_progress', {
          current: page + 1,
          total: slides.length
        })}
      >
        <ProgressBar
          progress={(page + 1) / slides.length}
          color={theme.colors.primary}
          style={styles.progressBar}
        />
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {page + 1}/{slides.length}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={!saving}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleSwipe}
        accessibilityRole="adjustable"
        accessibilityLabel={t('onboarding_swipe_hint')}
        style={styles.pager}
      >
        {slides.map((slide, index) => (
          <ScrollView
            key={slide.title}
            style={{ width }}
            contentContainerStyle={styles.slideContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {renderArtwork(
              index === 2 && !canScanEquipment
                ? 'clipboard-check-outline'
                : slide.icon,
              index
            )}
            <Text
              variant="labelMedium"
              style={[styles.eyebrow, { color: theme.colors.primary }]}
            >
              {t('onboarding_eyebrow')}
            </Text>
            <Text
              variant="headlineMedium"
              style={[styles.title, { color: theme.colors.onSurface }]}
              accessibilityRole="header"
            >
              {t(
                index === 2 && !canScanEquipment
                  ? 'onboarding_scan_unavailable_title'
                  : slide.title
              )}
            </Text>
            <Text
              variant="bodyLarge"
              style={[styles.body, { color: theme.colors.onSurfaceVariant }]}
            >
              {t(
                index === 2 && !canScanEquipment
                  ? 'onboarding_scan_unavailable_body'
                  : slide.body
              )}
            </Text>
            {index === 0 && (
              <View style={styles.featureList}>
                {(welcomeFeatures.length ? welcomeFeatures : ['workspace']).map(
                  (feature) => (
                    <View key={feature} style={styles.featureRow}>
                      <MaterialCommunityIcons
                        name={
                          feature === 'work_orders'
                            ? 'clipboard-check-outline'
                            : feature === 'equipment'
                            ? 'cog-outline'
                            : feature === 'maintenance'
                            ? 'calendar-check-outline'
                            : 'view-dashboard-outline'
                        }
                        size={19}
                        color={theme.colors.primary}
                      />
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.onSurface }}
                      >
                        {t(`onboarding_feature_${feature}`)}
                      </Text>
                    </View>
                  )
                )}
              </View>
            )}
            {index === 1 && (
              <Text
                variant="labelMedium"
                style={[
                  styles.roleHint,
                  { color: theme.colors.onSurfaceVariant }
                ]}
              >
                {t(`onboarding_role_${roleAudience}`)}
              </Text>
            )}
            {index === 3 && availableModules.length === 0 && (
              <Text
                variant="labelMedium"
                style={[
                  styles.roleHint,
                  { color: theme.colors.onSurfaceVariant }
                ]}
              >
                {t('onboarding_no_modules')}
              </Text>
            )}
          </ScrollView>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {page > 0 ? (
          <IconButton
            icon="arrow-left"
            accessibilityLabel={t('onboarding_back')}
            onPress={() => moveToPage(page - 1)}
            disabled={saving}
            size={22}
            style={[
              styles.backButton,
              { borderColor: theme.colors.outlineVariant }
            ]}
          />
        ) : isReplay ? (
          <IconButton
            icon="close"
            accessibilityLabel={t('onboarding_close')}
            onPress={() => navigation.goBack()}
            disabled={saving}
            size={22}
            style={[
              styles.backButton,
              { borderColor: theme.colors.outlineVariant }
            ]}
          />
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        {page < slides.length - 1 ? (
          <Button
            mode="contained"
            onPress={() => moveToPage(page + 1)}
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
          >
            {t('onboarding_next')}
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={() => void resolveOnboarding('COMPLETED')}
            disabled={saving}
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
            icon={saving ? undefined : 'arrow-right'}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : (
              t('onboarding_start')
            )}
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    minHeight: 52
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: {
    height: 32,
    width: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 8
  },
  progressBar: { flex: 1, height: 5, borderRadius: 3 },
  pager: { flex: 1, marginTop: 2 },
  slideContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 20
  },
  artwork: {
    height: 245,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15
  },
  artworkHalo: {
    position: 'absolute',
    width: 214,
    height: 214,
    borderRadius: 107,
    opacity: 0.72
  },
  artworkCard: {
    width: '86%',
    maxWidth: 360,
    minHeight: 170,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    justifyContent: 'center'
  },
  iconTile: {
    width: 58,
    height: 58,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18
  },
  previewLines: { gap: 9 },
  previewLine: { height: 7, borderRadius: 5, opacity: 0.72 },
  previewLineLong: { width: '72%' },
  previewLineShort: { width: '48%', opacity: 0.35 },
  previewStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  scanPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'transparent'
  },
  moduleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 16
  },
  moduleChip: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
  floatingMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    position: 'absolute',
    right: '9%',
    bottom: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontWeight: '700',
    marginBottom: 8
  },
  title: { fontWeight: '700', letterSpacing: -0.5, marginBottom: 10 },
  body: { lineHeight: 25, maxWidth: 460 },
  featureList: { marginTop: 20, gap: 13 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleHint: { marginTop: 16, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 10
  },
  backButton: { borderWidth: StyleSheet.hairlineWidth, margin: 0 },
  backPlaceholder: { width: 48, height: 48 },
  primaryButton: { flex: 1, borderRadius: 14 },
  primaryButtonContent: { height: 52 }
});
