import { useTranslation } from 'react-i18next';
import { AssetDTO as Asset } from '../../../models/asset';
import * as React from 'react';
import { useContext } from 'react';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import { Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { View } from '../../../components/Themed';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Divider,
  Text
} from 'react-native-paper';
import { UserMiniDTO } from '../../../models/user';
import { Customer } from '../../../models/customer';
import { Vendor } from '../../../models/vendor';
import Team from '../../../models/team';
import {
  getCustomerUrl,
  getTeamUrl,
  getUserUrl,
  getVendorUrl
} from '../../../utils/urlPaths';
import ListField from '../../../components/ListField';
import BasicField from '../../../components/BasicField';
import { getCustomFieldValuesForDetails } from '../../../models/form';
import Tag from '../../../components/Tag';
import { getAssetStatusConfig } from '../../../models/asset';
import { qpmLayoutTokens, useAppTheme } from '../../../custom-theme';
import { useCallback, useEffect, useState } from 'react';
import api from '../../../utils/api';
import type { AssetDTO as AssetDto } from '../../../models/asset';
import { Page } from '../../../models/page';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/role';
import AsyncStateFeedback from '../../../components/AsyncStateFeedback';

export default function AssetDetails({
  asset,
  navigation
}: {
  asset: Asset;
  navigation: any;
}) {
  const { getFormattedDate, getFormattedCurrency } = useContext(
    CompanySettingsContext
  );
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { hasViewPermission } = useAuth();
  const canViewAssets = hasViewPermission(PermissionEntity.ASSETS);
  const [children, setChildren] = useState<AssetDto[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [childrenError, setChildrenError] = useState(false);
  const loadChildren = useCallback(
    async (signal?: AbortSignal) => {
      if (!asset?.hasChildren || !canViewAssets) return;
      setChildrenLoading(true);
      setChildrenError(false);
      try {
        const page = await api.get<Page<AssetDto>>(
          `assets/children/${asset.id}/paginated?page=0&size=5&sort=id,asc`,
          { signal }
        );
        setChildren(page.content);
      } catch (error) {
        if (!signal?.aborted) setChildrenError(true);
      } finally {
        if (!signal?.aborted) setChildrenLoading(false);
      }
    },
    [asset?.hasChildren, asset?.id, canViewAssets]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadChildren(controller.signal);
    return () => controller.abort();
  }, [loadChildren]);
  const fieldsToRender: {
    label: string;
    value: string | number;
    isLink?: boolean;
  }[] = [
    { label: t('description'), value: asset?.description },
    { label: t('category'), value: asset?.category?.name },
    { label: t('manufacturer'), value: asset?.manufacturer },
    { label: t('model'), value: asset?.model },
    { label: t('serial_number'), value: asset?.serialNumber },
    { label: t('power'), value: asset?.power },
    {
      label: t('acquisition_cost'),
      value:
        asset?.acquisitionCost != null
          ? getFormattedCurrency(asset?.acquisitionCost)
          : null
    },
    { label: t('area'), value: asset?.area },
    { label: t('barcode'), value: asset?.barCode },
    { label: t('nfc_tag'), value: asset?.nfcId },
    {
      label: t('additional_information'),
      value: asset?.additionalInfos
    },
    {
      label: t('placed_in_service'),
      value: getFormattedDate(asset?.inServiceDate)
    },
    {
      label: t('warranty_expiration'),
      value: getFormattedDate(asset?.warrantyExpirationDate)
    },
    ...getCustomFieldValuesForDetails(
      asset?.customFieldValues,
      getFormattedDate
    )
  ];
  return (
    <ScrollView
      style={{ ...styles.container, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <View
        style={[
          styles.identityCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant
          }
        ]}
      >
        {asset.image ? (
          <Image
            style={styles.assetImage}
            source={{ uri: asset.image.url }}
            accessibilityLabel={asset.name}
          />
        ) : (
          <Avatar.Icon
            size={58}
            icon="cog-outline"
            style={{ backgroundColor: theme.colors.surfaceVariant }}
            color={theme.colors.primary}
          />
        )}
        <View style={styles.identityText}>
          <Text variant="titleLarge" style={styles.assetName}>
            {asset.name}
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {asset.customId}
            {asset.category?.name ? ` · ${asset.category.name}` : ''}
          </Text>
          <Tag
            text={t(asset.status)}
            color={getAssetStatusConfig(asset.status).foregroundColor(theme)}
            backgroundColor={getAssetStatusConfig(asset.status).color(theme)}
          />
        </View>
      </View>
      {asset.parentAsset && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${t('parent_asset')}: ${asset.parentAsset.name}`}
          onPress={() =>
            navigation.push('AssetDetails', { id: asset.parentAsset.id })
          }
          style={[
            styles.parentAsset,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
        >
          <View>
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t('parent_asset')}
            </Text>
            <Text variant="titleSmall" style={{ fontWeight: '700' }}>
              {asset.parentAsset.customId} · {asset.parentAsset.name}
            </Text>
          </View>
          <Text style={{ color: theme.colors.primary }}>›</Text>
        </TouchableOpacity>
      )}
      {asset.hasChildren && (
        <View style={styles.childrenSection}>
          <View style={styles.childrenHeading}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('child_assets')}
            </Text>
            {canViewAssets && (
              <Button
                compact
                onPress={() =>
                  navigation.push('Assets', {
                    id: asset.id,
                    hierarchy: [asset.id]
                  })
                }
                accessibilityRole="button"
              >
                {t('view_children')}
              </Button>
            )}
          </View>
          {!canViewAssets ? (
            <AsyncStateFeedback
              mode="permissionDenied"
              message={t('no_access_assets')}
            />
          ) : childrenLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : childrenError ? (
            <AsyncStateFeedback
              mode="banner"
              message={t('asset_children_load_error')}
              onRetry={() => void loadChildren()}
            />
          ) : children.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {t('no_content')}
            </Text>
          ) : (
            children.map((child) => (
              <Card
                key={child.id}
                mode="outlined"
                style={[
                  styles.childCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant
                  }
                ]}
                onPress={() =>
                  navigation.push('AssetDetails', {
                    id: child.id,
                    assetProp: child
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`${child.customId} · ${child.name}`}
              >
                <Card.Content style={styles.childCardContent}>
                  <View style={styles.childText}>
                    <Text variant="titleSmall" style={styles.childName}>
                      {child.name}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {child.customId}
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.primary }}>›</Text>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      )}
      {fieldsToRender.map((field) => (
        <BasicField
          key={field.label}
          label={field.label}
          value={field.value}
          isLink={field.isLink}
        />
      ))}
      {asset.primaryUser && (
        <View>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 20
            }}
          >
            <Text>{t('primary_worker')}</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.push('UserDetails', { id: asset.primaryUser.id })
              }
            >
              <Text
                style={{
                  fontWeight: 'bold',
                  color: theme.colors.primary
                }}
              >{`${asset.primaryUser.firstName} ${asset.primaryUser.lastName}`}</Text>
            </TouchableOpacity>
          </View>
          <Divider />
        </View>
      )}
      {asset.location && (
        <View>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 20
            }}
          >
            <Text>{t('location')}</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.push('LocationDetails', { id: asset.location.id })
              }
            >
              <Text
                style={{
                  fontWeight: 'bold',
                  color: theme.colors.primary
                }}
              >
                {asset.location.name}
              </Text>
            </TouchableOpacity>
          </View>
          <Divider />
        </View>
      )}
      <ListField
        values={asset?.assignedTo}
        label={t('assigned_to')}
        getHref={(user: UserMiniDTO) => getUserUrl(user.id)}
        getValueLabel={(user: UserMiniDTO) =>
          `${user.firstName} ${user.lastName}`
        }
      />
      <ListField
        values={asset?.customers}
        label={t('customers')}
        getHref={(customer: Customer) => getCustomerUrl(customer.id)}
        getValueLabel={(customer: Customer) => customer.name}
      />
      <ListField
        values={asset?.vendors}
        label={t('vendors')}
        getHref={(vendor: Vendor) => getVendorUrl(vendor.id)}
        getValueLabel={(vendor: Vendor) => vendor.companyName}
      />
      <ListField
        values={asset?.teams}
        label={t('teams')}
        getHref={(team) => getTeamUrl(team.id)}
        getValueLabel={(team) => team.name}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: { padding: 14, paddingBottom: 28 },
  identityCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    gap: 14
  },
  assetImage: {
    width: '100%',
    height: 180,
    borderRadius: qpmLayoutTokens.radius.card
  },
  identityText: { gap: 7 },
  assetName: { fontWeight: '700' },
  parentAsset: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  childrenSection: { gap: qpmLayoutTokens.space.sm, marginTop: 16 },
  childrenHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitle: { fontWeight: '700' },
  childCard: {
    borderRadius: qpmLayoutTokens.radius.card,
    borderWidth: 1
  },
  childCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  childText: { flex: 1, gap: 3 },
  childName: { fontWeight: '700' }
});
