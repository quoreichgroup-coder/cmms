import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { View } from '../../components/Themed';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from '../../store';
import { getCustomersMini } from '../../slices/customer';
import { ActivityIndicator, Avatar, Searchbar, Text } from 'react-native-paper';
import { useAppTheme } from '../../custom-theme';
import SelectionIndicator from '../../components/SelectionIndicator';

export default function SelectCustomersModal({
  navigation,
  route
}: RootStackScreenProps<'SelectCustomers'>) {
  const { onChange, selected, multiple } = route.params;
  const theme = useAppTheme();
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { customersMini, loadingGet } = useSelector((state) => state.customers);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedCustomers = React.useMemo(
    () =>
      selectedIds.flatMap((id) =>
        customersMini.filter((customer) => customer.id === id)
      ),
    [selectedIds, customersMini]
  );

  useEffect(() => {
    if (!selectedIds.length) setSelectedIds(selected);
  }, [selected]);

  useEffect(() => {
    if (multiple)
      navigation.setOptions({
        headerRight: () => (
          <Pressable
            disabled={!selectedCustomers.length}
            accessibilityRole="button"
            accessibilityLabel={`${t('add')} (${selectedCustomers.length})`}
            accessibilityState={{ disabled: !selectedCustomers.length }}
            onPress={() => {
              onChange(selectedCustomers);
              navigation.goBack();
            }}
          >
            <Text variant="titleMedium">{t('add')}</Text>
          </Pressable>
        )
      });
  }, [selectedCustomers, navigation, onChange, t]);

  useEffect(() => {
    dispatch(getCustomersMini());
  }, []);

  const toggle = (id: number) => {
    if (multiple) {
      setSelectedIds((previous) =>
        previous.includes(id)
          ? previous.filter((selectedId) => selectedId !== id)
          : [...previous, id]
      );
      return;
    }
    const customer = customersMini.find((item) => item.id === id);
    if (customer) onChange([customer]);
    navigation.goBack();
  };

  const normalizedSearch = searchQuery.toLowerCase().trim();
  const filteredCustomers = customersMini.filter((customer) =>
    customer.name.toLowerCase().includes(normalizedSearch)
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Searchbar
        placeholder={t('search')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={{ backgroundColor: theme.colors.background }}
      />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={loadingGet}
            onRefresh={() => dispatch(getCustomersMini())}
          />
        }
        style={{
          flex: 1,
          backgroundColor: theme.colors.background
        }}
      >
        {loadingGet && !customersMini.length ? (
          <ActivityIndicator
            animating
            accessibilityLabel={t('loading')}
            style={{ marginTop: 24 }}
          />
        ) : (
          filteredCustomers.map((customer) => (
            <TouchableOpacity
              onPress={() => {
                toggle(customer.id);
              }}
              accessibilityRole={multiple ? 'checkbox' : 'button'}
              accessibilityLabel={customer.name}
              accessibilityState={
                multiple
                  ? { checked: selectedIds.includes(customer.id) }
                  : undefined
              }
              key={customer.id}
            >
              <View
                style={[styles.card, { backgroundColor: theme.colors.surface }]}
              >
                <View style={styles.cardRow}>
                  <Avatar.Icon
                    size={50}
                    icon="account-tie-outline"
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={styles.cardTitle}>
                          {customer.name}
                        </Text>
                        <Text
                          variant={'bodySmall'}
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >{`#${customer.id}`}</Text>
                      </View>
                      {multiple && (
                        <SelectionIndicator
                          checked={selectedIds.includes(customer.id)}
                          color={theme.colors.primary}
                          uncheckedColor={theme.colors.controlOutline}
                        />
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        {!loadingGet && filteredCustomers.length === 0 && (
          <Text
            accessibilityRole="alert"
            style={{
              textAlign: 'center',
              marginTop: 24,
              color: theme.colors.onSurfaceVariant
            }}
          >
            {customersMini.length
              ? t('no_results_found')
              : t('no_customers_available')}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  card: {
    marginBottom: 1,
    padding: 10
  },
  cardRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontWeight: 'bold',
    flexShrink: 1
  }
});
