import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar, IconButton, Text } from 'react-native-paper';
import { ImageSourcePropType } from 'react-native';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import { qpmLayoutTokens, useAppTheme } from '../custom-theme';
import { IconWithLabel } from './IconWithLabel';

type DirectoryCardProps = {
  title: string;
  icon: IconSource;
  accessibilityLabel?: string;
  details?: { label: string; icon: IconSource }[];
  avatarSource?: ImageSourcePropType;
  avatarLabel?: string;
  trailingAction?: { icon: IconSource; label: string; onPress: () => void };
  onPress: () => void;
};

export default function DirectoryCard({
  title,
  icon,
  accessibilityLabel,
  details = [],
  avatarSource,
  avatarLabel,
  trailingAction,
  onPress
}: DirectoryCardProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant
        }
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.72 : 1 }]}
      >
        {avatarSource ? (
          <Avatar.Image size={48} source={avatarSource} />
        ) : avatarLabel ? (
          <Avatar.Text
            size={48}
            label={avatarLabel}
            style={{ backgroundColor: theme.colors.primaryContainer }}
            color={theme.colors.onPrimaryContainer}
          />
        ) : (
          <Avatar.Icon
            size={48}
            icon={icon}
            style={{ backgroundColor: theme.colors.primaryContainer }}
            color={theme.colors.onPrimaryContainer}
          />
        )}
        <View style={styles.content}>
          <Text variant="titleMedium" numberOfLines={2} style={styles.title}>
            {title}
          </Text>
          {details.length > 0 && (
            <View style={styles.details}>
              {details.map((detail) => (
                <IconWithLabel
                  key={`${detail.icon}-${detail.label}`}
                  label={detail.label}
                  icon={detail.icon}
                  color={theme.colors.onSurfaceVariant}
                />
              ))}
            </View>
          )}
        </View>
      </Pressable>
      {trailingAction && (
        <IconButton
          icon={trailingAction.icon}
          accessibilityLabel={trailingAction.label}
          onPress={trailingAction.onPress}
          style={styles.trailingAction}
          iconColor={theme.colors.primary}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: qpmLayoutTokens.space.sm,
    padding: qpmLayoutTokens.space.sm,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: qpmLayoutTokens.space.md,
    minHeight: 76
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: qpmLayoutTokens.space.md,
    padding: qpmLayoutTokens.space.md
  },
  content: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontWeight: '700', flexShrink: 1 },
  details: { gap: qpmLayoutTokens.space.xs },
  trailingAction: { margin: qpmLayoutTokens.space.xs }
});
