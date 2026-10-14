import { useCallback } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View
} from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssetDTO, getAssetStatusConfig } from '../models/asset';
import { qpmLayoutTokens, useAppTheme } from '../custom-theme';

type Props = {
  items: AssetDTO[];
  loading: boolean;
  error: boolean;
  emptyMessage: string;
  onRefresh: () => void;
  navigation: any;
};

export default function RelatedAssetList({
  items,
  loading,
  error,
  emptyMessage,
  onRefresh,
  navigation
}: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const openAsset = useCallback(
    (id: number) => navigation.push('AssetDetails', { id }),
    [navigation]
  );

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={items.length ? styles.list : styles.emptyList}
      data={items}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
        />
      }
      renderItem={({ item }) => {
        const statusColor = getAssetStatusConfig(item.status).color(theme);
        return (
          <Pressable
            onPress={() => openAsset(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`${item.customId ?? ''} ${item.name}, ${t(
              item.status
            )}`.trim()}
            accessibilityHint={t('related_asset_open_hint')}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                opacity: pressed ? 0.76 : 1
              }
            ]}
          >
            <View
              style={[
                styles.assetIcon,
                { backgroundColor: theme.colors.primaryContainer }
              ]}
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={22}
                color={theme.colors.onPrimaryContainer}
              />
            </View>
            <View style={styles.identity}>
              <Text variant="titleSmall" style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              {!!item.customId && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  #{item.customId}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.status,
                { backgroundColor: theme.colors.surfaceVariant }
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurface }}
              >
                {t(item.status)}
              </Text>
            </View>
          </Pressable>
        );
      }}
      ListHeaderComponent={
        error && items.length > 0 ? (
          <View style={styles.errorBanner}>
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              {t('assets_load_error')}
            </Text>
            <Button compact onPress={onRefresh}>
              {t('retry')}
            </Button>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : error ? (
            <>
              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: 'center'
                }}
              >
                {t('assets_load_error')}
              </Text>
              <Button onPress={onRefresh}>{t('retry')}</Button>
            </>
          ) : (
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center'
              }}
            >
              {emptyMessage}
            </Text>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: qpmLayoutTokens.space.lg,
    paddingTop: qpmLayoutTokens.space.sm,
    paddingBottom: qpmLayoutTokens.space.xl
  },
  emptyList: { flexGrow: 1, padding: qpmLayoutTokens.space.lg },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: qpmLayoutTokens.space.sm,
    paddingHorizontal: qpmLayoutTokens.space.xs
  },
  card: {
    minHeight: 76,
    marginBottom: qpmLayoutTokens.space.sm,
    padding: qpmLayoutTokens.space.md,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: qpmLayoutTokens.space.md
  },
  assetIcon: {
    width: 42,
    height: 42,
    borderRadius: qpmLayoutTokens.radius.control,
    alignItems: 'center',
    justifyContent: 'center'
  },
  identity: { flex: 1, minWidth: 0, gap: qpmLayoutTokens.space.xs },
  name: { fontWeight: '700' },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: qpmLayoutTokens.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 7
  },
  statusDot: {
    width: qpmLayoutTokens.space.sm,
    height: qpmLayoutTokens.space.sm,
    borderRadius: qpmLayoutTokens.space.xs
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: qpmLayoutTokens.space.sm,
    padding: qpmLayoutTokens.space.xl
  }
});
