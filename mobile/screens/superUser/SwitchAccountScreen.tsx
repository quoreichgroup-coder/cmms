import { ScrollView, StyleSheet } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Card,
  Text,
  useTheme
} from 'react-native-paper';
import { View } from '../../components/Themed';
import { SuperUserStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import { useContext, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import { qpmLayoutTokens } from '../../theme/tokens';

export default function SwitchAccountScreen({
  navigation
}: SuperUserStackScreenProps<'SwitchAccount'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [switching, setSwitching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const switchingRef = useRef(false);
  const { user, switchAccount } = useAuth();
  const { showSnackBar } = useContext(CustomSnackBarContext);

  const handleSwitchAccount = async (userId: number) => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    setSwitching(true);
    setSelectedUserId(userId);
    try {
      await switchAccount(userId);
    } catch (_error) {
      showSnackBar(t('an_error_occured'), 'error');
    } finally {
      switchingRef.current = false;
      setSwitching(false);
      setSelectedUserId(null);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      accessibilityLabel={t('switch_account_description')}
    >
      <Text
        style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        variant="titleMedium"
      >
        {t('switch_account_description')}
      </Text>
      <View style={styles.accountList}>
        {(user.superAccountRelations ?? []).map((relation) => {
          const isSelectedAccountLoading =
            switching && relation.childUserId === selectedUserId;
          return (
            <Card
              mode="outlined"
              style={[
                styles.accountCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant
                }
              ]}
              disabled={switching}
              key={relation.childUserId}
              onPress={() => void handleSwitchAccount(relation.childUserId)}
              accessibilityRole="button"
              accessibilityLabel={relation.childCompanyName}
              accessibilityState={{
                disabled: switching,
                busy: isSelectedAccountLoading
              }}
            >
              <Card.Content style={styles.accountContent}>
                {relation.childCompanyLogo ? (
                  <Avatar.Image
                    size={56}
                    source={{ uri: relation.childCompanyLogo.url }}
                    accessibilityLabel={relation.childCompanyName}
                  />
                ) : (
                  <Avatar.Icon
                    size={56}
                    icon="domain"
                    accessibilityLabel={relation.childCompanyName}
                  />
                )}
                <Text
                  style={[styles.companyName, { color: theme.colors.onSurface }]}
                  variant="titleMedium"
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {relation.childCompanyName}
                </Text>
                {isSelectedAccountLoading ? (
                  <ActivityIndicator
                    color={theme.colors.primary}
                    accessibilityLabel={t('loading')}
                  />
                ) : null}
              </Card.Content>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    alignItems: 'center',
    padding: qpmLayoutTokens.space.lg,
    paddingBottom: qpmLayoutTokens.space.xxxl
  },
  description: {
    maxWidth: 480,
    width: '100%',
    marginBottom: qpmLayoutTokens.space.xl
  },
  accountList: {
    width: '100%',
    alignItems: 'center',
    gap: qpmLayoutTokens.space.md
  },
  accountCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  },
  accountContent: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: qpmLayoutTokens.space.md
  },
  companyName: { flex: 1, fontWeight: '700' }
});
