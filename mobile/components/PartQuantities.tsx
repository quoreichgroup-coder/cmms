import { View } from './Themed';
import {
  ActivityIndicator,
  Button,
  Divider,
  IconButton,
  List,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme
} from 'react-native-paper';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import * as React from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import PartQuantity from '../models/partQuantity';
import { CompanySettingsContext } from '../contexts/CompanySettingsContext';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import ActionSheet, { ActionSheetRef } from 'react-native-actions-sheet';
import { deletePartQuantity, editPartQuantity } from '../slices/partQuantity';
import { useDispatch } from '../store';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';
import { getFormattedCostPerUnit } from '../utils/formatters';
import { createQpmActionSheetContainerStyle } from '../theme/actionSheet';
import { getErrorMessage } from '../utils/api';
import { qpmLayoutTokens } from '../theme/tokens';

export default function PartQuantities({
  partQuantities,
  rootId,
  navigation,
  isPO,
  disabled
}: {
  partQuantities: PartQuantity[];
  rootId: number;
  isPO: boolean;
  navigation: any;
  disabled?: boolean;
}) {
  const { getFormattedCurrency } = useContext(CompanySettingsContext);
  const theme = useTheme();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const actionSheetRef = useRef<ActionSheetRef>(null);
  const [openModal, setOpenModal] = React.useState(false);
  const [quantity, setQuantity] = useState<string>('0');
  const [currentPartQuantity, setCurrentPartQuantity] =
    useState<PartQuantity>();
  const [loading, setLoading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const savingQuantityRef = useRef(false);
  const showModal = () => {
    actionSheetRef.current.hide();
    setOpenModal(true);
  };
  useEffect(() => {
    if (currentPartQuantity)
      setQuantity(currentPartQuantity.quantity.toString());
  }, [currentPartQuantity]);

  const hideModal = () => setOpenModal(false);
  const onPartQuantityChange = (value: number, partQuantityId: number) => {
    if (savingQuantityRef.current) return;
    savingQuantityRef.current = true;
    setLoading(true);
    dispatch(editPartQuantity(rootId, partQuantityId, value, isPO))
      .then(() => {
        showSnackBar(t('quantity_change_success'), 'success');
        hideModal();
      })
      .catch((err) => {
        showSnackBar(
          getErrorMessage(err) || t('quantity_change_failure'),
          'error'
        );
      })
      .finally(() => {
        savingQuantityRef.current = false;
        setLoading(false);
      });
  };
  const onDeletePartQuantity = async () => {
    if (deletingRef.current || !currentPartQuantity) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await dispatch(deletePartQuantity(currentPartQuantity.id));
      showSnackBar(t('operation_success'), 'success');
      actionSheetRef.current.hide();
    } catch (error) {
      showSnackBar(getErrorMessage(error) || t('an_error_occured'), 'error');
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };
  const renderActionSheet = () => {
    const options: {
      title: string;
      icon: IconSource;
      onPress: () => void;
      color?: string;
    }[] = [
      {
        title: t('edit_quantity'),
        icon: 'pencil',
        onPress: showModal
      },
      {
        title: t('to_delete'),
        icon: 'delete-outline',
        onPress: () => {
          if (!currentPartQuantity || deleting) return;
          Alert.alert(t('confirmation'), t('delete_row_confirm_message'), [
            { text: t('cancel'), style: 'cancel' },
            {
              text: t('to_delete'),
              style: 'destructive',
              onPress: () => void onDeletePartQuantity()
            }
          ]);
        },
        color: theme.colors.error
      }
    ];

    return (
      <ActionSheet
        ref={actionSheetRef}
        containerStyle={createQpmActionSheetContainerStyle(
          theme.colors.surface
        )}
      >
        <View style={{ padding: qpmLayoutTokens.space.md }}>
          <Divider />
          <List.Section>
            {options.map((entity, index) => (
              <List.Item
                key={index}
                titleStyle={{ color: entity.color }}
                title={entity.title}
                left={() => (
                  <List.Icon icon={entity.icon} color={entity.color} />
                )}
                right={() =>
                  entity.icon === 'delete-outline' && deleting ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                      accessibilityLabel={t('loading')}
                    />
                  ) : null
                }
                onPress={entity.onPress}
              />
            ))}
          </List.Section>
        </View>
      </ActionSheet>
    );
  };
  const renderModal = () => {
    return (
      <Portal theme={theme}>
        <Modal
          visible={openModal}
          onDismiss={hideModal}
          style={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
            {t('quantity')}
          </Text>
          <TextInput
            style={{ width: '100%', marginTop: qpmLayoutTokens.space.md }}
            mode="outlined"
            label={t('quantity')}
            onChangeText={(newQuantity) => setQuantity(newQuantity)}
            value={quantity}
          />
          <Button
            disabled={loading || deleting}
            loading={loading}
            style={{ marginTop: qpmLayoutTokens.space.md }}
            mode={'contained'}
            buttonColor={theme.colors.primary}
            onPress={() =>
              onPartQuantityChange(Number(quantity), currentPartQuantity.id)
            }
          >
            {t('save')}
          </Button>
        </Modal>
      </Portal>
    );
  };
  return (
    <View>
      {renderActionSheet()}
      {renderModal()}
      {partQuantities.length === 0 ? (
        <Text variant={'titleMedium'}>{t('no_parts')}</Text>
      ) : (
        partQuantities.map((partQuantity) => (
          <View
            key={partQuantity.id}
            style={[
              styles.rowCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant
              }
            ]}
          >
            <Text
              style={[
                styles.quantityBadge,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  color: theme.colors.onSurfaceVariant
                }
              ]}
            >{`${partQuantity.quantity}${partQuantity.part.unit ?? 'x'}`}</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.push('PartDetails', { id: partQuantity.part.id })
              }
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginLeft: qpmLayoutTokens.space.sm,
                flex: 1,
                minWidth: 0,
                paddingRight: qpmLayoutTokens.space.xs
              }}
              accessibilityRole="button"
            >
              <Text
                style={{ fontWeight: 'bold' }}
                variant="bodyLarge"
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {partQuantity.part.name}
              </Text>
              <Text>
                {getFormattedCostPerUnit(
                  partQuantity.part.cost,
                  partQuantity.part.unit,
                  getFormattedCurrency
                )}
              </Text>
            </TouchableOpacity>
            <IconButton
              disabled={disabled}
              accessibilityLabel={t('more_options')}
              onPress={() => {
                setCurrentPartQuantity(partQuantity);
                actionSheetRef.current.show();
              }}
              icon="dots-vertical"
            />
          </View>
        ))
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: qpmLayoutTokens.space.sm,
    paddingLeft: qpmLayoutTokens.space.sm,
    paddingVertical: qpmLayoutTokens.space.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: qpmLayoutTokens.radius.card
  },
  quantityBadge: {
    paddingHorizontal: qpmLayoutTokens.space.sm,
    paddingVertical: qpmLayoutTokens.space.xs,
    borderRadius: qpmLayoutTokens.radius.pill,
    fontWeight: 'bold'
  },
  modal: {
    marginHorizontal: 20,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    padding: qpmLayoutTokens.space.xl,
    shadowOffset: {
      width: 0,
      height: 2
    },
    height: '45%',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2
  }
});
