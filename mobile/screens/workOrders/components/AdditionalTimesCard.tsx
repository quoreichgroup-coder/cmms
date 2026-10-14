import { Fragment, useContext, useRef, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Divider,
  IconButton,
  List,
  Text,
  useTheme
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useDispatch } from '../../../store';
import { deleteLabor } from '../../../slices/labor';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { getErrorMessage } from '../../../utils/api';
import { getHoursAndMinutesAndSeconds } from '../../../utils/formatters';
import { PermissionEntity } from '../../../models/role';
import { PlanFeature } from '../../../models/subscriptionPlan';
import type { RootStackParamList } from '../../../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type Labor from '../../../models/labor';
import type WorkOrder from '../../../models/workOrder';
import useAuth from '../../../hooks/useAuth';
import { View } from '../../../components/Themed';
import { qpmLayoutTokens } from '../../../custom-theme';

interface AdditionalTimesCardProps {
  labors: Labor[];
  workOrder: WorkOrder;
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

export default function AdditionalTimesCard({
  labors,
  workOrder,
  navigation
}: AdditionalTimesCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const { hasEditPermission, hasFeature } = useAuth();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const deletingIdsRef = useRef(new Set<number>());

  const handleDelete = async (laborId: number) => {
    if (deletingIdsRef.current.has(laborId)) return;
    deletingIdsRef.current.add(laborId);
    setDeletingIds([...deletingIdsRef.current]);
    try {
      await dispatch(deleteLabor(workOrder.id, laborId));
      showSnackBar(t('operation_success'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error) || t('an_error_occured'), 'error');
    } finally {
      deletingIdsRef.current.delete(laborId);
      setDeletingIds([...deletingIdsRef.current]);
    }
  };

  const canAddTime =
    hasEditPermission(PermissionEntity.WORK_ORDERS, workOrder) &&
    hasFeature(PlanFeature.ADDITIONAL_TIME);
  const unloggedLabors = labors.filter((labor) => !labor.logged);

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
        {t('labors')}
      </Text>
      {!unloggedLabors.length ? (
        <Text style={{ fontWeight: 'bold' }}>{t('no_labor')}</Text>
      ) : (
        unloggedLabors.map((labor) => (
          <View key={labor.id} style={styles.laborRow}>
            <List.Item
              style={styles.laborInfo}
              titleStyle={{ fontSize: 14 }}
              title={
                labor.assignedTo
                  ? `${labor.assignedTo.firstName} ${labor.assignedTo.lastName}`
                  : t('not_assigned')
              }
              description={`${
                getHoursAndMinutesAndSeconds(labor.duration)[0]
              }h ${getHoursAndMinutesAndSeconds(labor.duration)[1]}m`}
            />
            {canAddTime && (
              <View style={styles.actions}>
                <IconButton
                  icon="pencil"
                  size={20}
                  accessibilityLabel={t('edit_additional_time')}
                  disabled={deletingIds.includes(labor.id)}
                  onPress={() =>
                    navigation.navigate('EditAdditionalTime', {
                      workOrderId: workOrder.id,
                      labor
                    })
                  }
                />
                {deletingIds.includes(labor.id) ? (
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
                    accessibilityLabel={t('delete_additional_time')}
                    onPress={() =>
                      Alert.alert(
                        t('confirmation'),
                        t('confirm_delete_additional_time'),
                        [
                          { text: t('cancel'), style: 'cancel' },
                          {
                            text: t('to_delete'),
                            style: 'destructive',
                            onPress: () => void handleDelete(labor.id)
                          }
                        ]
                      )
                    }
                  />
                )}
              </View>
            )}
          </View>
        ))
      )}
      {canAddTime && (
        <Fragment>
          <Divider style={{ marginTop: 5 }} />
          <Button
            mode="contained"
            icon="clock-plus-outline"
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            style={{ marginTop: 8 }}
            onPress={() =>
              navigation.navigate('AddAdditionalTime', {
                workOrderId: workOrder.id
              })
            }
          >
            {t('add_time')}
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
  laborRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  laborInfo: {
    flex: 1
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center'
  }
});
