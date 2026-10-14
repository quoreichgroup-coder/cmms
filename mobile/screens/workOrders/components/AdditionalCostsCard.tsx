import { Fragment, useContext, useRef, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Divider,
  IconButton,
  Text,
  useTheme
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useDispatch } from '../../../store';
import { deleteAdditionalCost } from '../../../slices/additionalCost';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { getErrorMessage } from '../../../utils/api';
import { PermissionEntity } from '../../../models/role';
import { PlanFeature } from '../../../models/subscriptionPlan';
import type { RootStackParamList } from '../../../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type AdditionalCost from '../../../models/additionalCost';
import type WorkOrder from '../../../models/workOrder';
import { View } from '../../../components/Themed';
import { qpmLayoutTokens } from '../../../custom-theme';
import AsyncStateFeedback from '../../../components/AsyncStateFeedback';

interface AdditionalCostsCardProps {
  additionalCosts: AdditionalCost[];
  workOrder: WorkOrder;
  workOrderId: number;
  hasEditPermission: (entity: PermissionEntity, data?: any) => boolean;
  hasFeature: (feature: PlanFeature) => boolean;
  getFormattedCurrency: (amount: number) => string;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  loading: boolean;
  loadError: boolean;
  onRetry: () => void;
}

export default function AdditionalCostsCard({
  additionalCosts,
  workOrder,
  workOrderId,
  hasEditPermission,
  hasFeature,
  getFormattedCurrency,
  navigation,
  loading,
  loadError,
  onRetry
}: AdditionalCostsCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const deletingIdsRef = useRef(new Set<number>());

  const handleDelete = async (costId: number) => {
    if (deletingIdsRef.current.has(costId)) return;
    deletingIdsRef.current.add(costId);
    setDeletingIds([...deletingIdsRef.current]);
    try {
      await dispatch(deleteAdditionalCost(workOrderId, costId));
      showSnackBar(t('operation_success'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error) || t('an_error_occured'), 'error');
    } finally {
      deletingIdsRef.current.delete(costId);
      setDeletingIds([...deletingIdsRef.current]);
    }
  };

  const canEdit = hasEditPermission(PermissionEntity.WORK_ORDERS, workOrder);
  const canAdd = canEdit && hasFeature(PlanFeature.ADDITIONAL_COST);

  return (
    <View
      style={[
        styles.shadowedCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          shadowColor: theme.colors.shadow
        }
      ]}
    >
      <Text
        style={{
          marginBottom: 10,
          color: theme.colors.onSurfaceVariant
        }}
      >
        {t('additional_costs')}
      </Text>
      {loadError ? (
        <AsyncStateFeedback
          mode="banner"
          message={t('additional_costs_load_error')}
          onRetry={onRetry}
        />
      ) : loading ? (
        <View
          style={{ alignItems: 'center', paddingVertical: 16 }}
          accessibilityRole="progressbar"
          accessibilityLabel={t('loading')}
        >
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {t('loading')}
          </Text>
        </View>
      ) : !additionalCosts.length ? (
        <Text style={{ fontWeight: 'bold' }}>{t('no_additional_cost')}</Text>
      ) : (
        <View>
          {additionalCosts.map((cost) => (
            <View key={cost.id} style={styles.costRow}>
              <View style={styles.costInfo}>
                <Text style={{ fontWeight: 'bold' }} variant="bodyLarge">
                  {cost.description}
                </Text>
                {cost.assignedTo && (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {`${cost.assignedTo.firstName} ${cost.assignedTo.lastName}`}
                  </Text>
                )}
                <Text>{getFormattedCurrency(cost.cost)}</Text>
              </View>
              {canEdit && (
                <View style={styles.actions}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    accessibilityLabel={t('edit_additional_cost')}
                    disabled={deletingIds.includes(cost.id)}
                    onPress={() =>
                      navigation.navigate('EditAdditionalCost', {
                        workOrderId,
                        additionalCost: cost
                      })
                    }
                  />
                  {deletingIds.includes(cost.id) ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                      accessibilityRole="progressbar"
                      accessibilityLabel={t('loading')}
                      style={{ marginHorizontal: 12 }}
                    />
                  ) : (
                    <IconButton
                      icon="delete"
                      size={20}
                      accessibilityLabel={t('delete_additional_cost')}
                      onPress={() =>
                        Alert.alert(
                          t('confirmation'),
                          t('confirm_delete_additional_cost'),
                          [
                            { text: t('cancel'), style: 'cancel' },
                            {
                              text: t('to_delete'),
                              style: 'destructive',
                              onPress: () => void handleDelete(cost.id)
                            }
                          ]
                        )
                      }
                    />
                  )}
                </View>
              )}
            </View>
          ))}
          <Text style={{ fontWeight: 'bold' }} variant="bodyLarge">
            {t('total')}
          </Text>
          <Text>
            {getFormattedCurrency(
              additionalCosts.reduce(
                (acc, additionalCost) =>
                  additionalCost.includeToTotalCost
                    ? acc + additionalCost.cost
                    : acc,
                0
              )
            )}
          </Text>
        </View>
      )}
      {canAdd && (
        <Fragment>
          <Divider style={{ marginTop: 5 }} />
          <Button
            onPress={() =>
              navigation.navigate('AddAdditionalCost', {
                workOrderId
              })
            }
          >
            {t('add_additional_cost')}
          </Button>
        </Fragment>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shadowedCard: {
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    marginVertical: 10,
    marginHorizontal: 5,
    elevation: 1
  },
  costRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },
  costInfo: {
    flex: 1
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center'
  }
});
