import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet
} from 'react-native';
import { View } from '../components/Themed';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import Notification, { NotificationType } from '../models/notification';
import {
  editNotification,
  getNotifications,
  getMoreNotifications,
  readAllNotifications
} from '../slices/notification';
import { RootStackParamList, RootStackScreenProps } from '../types';
import { useDispatch, useSelector } from '../store';
import { getNotificationUrl } from '../utils/urlPaths';
import { List, Text, useTheme } from 'react-native-paper';
import * as React from 'react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CompanySettingsContext } from '../contexts/CompanySettingsContext';
import { useTranslation } from 'react-i18next';
import { SearchCriteria } from '../models/page';
import { isCloseToBottom } from '../utils/overall';
import AsyncStateFeedback from '../components/AsyncStateFeedback';
import { getErrorMessage } from '../utils/api';
import DirectoryPaginationFooter from '../components/DirectoryPaginationFooter';
import { qpmLayoutTokens } from '../custom-theme';

const notificationsCriteria: SearchCriteria = {
  filterFields: [],
  pageSize: 15,
  pageNum: 0,
  direction: 'DESC'
};

export default function NotificationsScreen({
  navigation
}: RootStackScreenProps<'Notifications'>) {
  const dispatch = useDispatch();
  const { notifications, loadingGet, lastPage, currentPageNum } = useSelector(
    (state) => state.notifications
  );
  const [loadError, setLoadError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [pendingNotificationIds, setPendingNotificationIds] = useState<
    number[]
  >([]);
  const loadingMoreRef = useRef(false);
  const markAllLoadingRef = useRef(false);
  const pendingNotificationIdsRef = useRef(new Set<number>());
  const theme = useTheme();
  const { t } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);

  const loadNotifications = useCallback(() => {
    setLoadError('');
    setLoadMoreError('');
    return dispatch(getNotifications(notificationsCriteria))
      .catch((error) => {
        setLoadError(getErrorMessage(error));
      })
      .finally(() => setHasLoaded(true));
  }, [dispatch]);

  const refreshNotifications = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [loadNotifications]);

  const markAllAsSeen = useCallback(async () => {
    if (markAllLoadingRef.current) return;
    markAllLoadingRef.current = true;
    setMutationError('');
    setMarkAllLoading(true);
    try {
      await dispatch(readAllNotifications());
    } catch (error) {
      setMutationError(getErrorMessage(error));
    } finally {
      markAllLoadingRef.current = false;
      setMarkAllLoading(false);
    }
  }, [dispatch]);

  const loadMore = useCallback(
    async (retry = false) => {
      if (
        loadingMoreRef.current ||
        loadingGet ||
        lastPage ||
        (loadMoreError && !retry)
      )
        return;

      loadingMoreRef.current = true;
      setLoadingMore(true);
      setLoadMoreError('');
      try {
        await dispatch(
          getMoreNotifications(notificationsCriteria, currentPageNum + 1)
        );
      } catch (error) {
        setLoadMoreError(getErrorMessage(error));
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    },
    [currentPageNum, dispatch, lastPage, loadingGet, loadMoreError]
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const hasUnreadNotifications = notifications.content.some(
      (notification) => !notification.seen
    );
    navigation.setOptions({
      headerRight: hasUnreadNotifications
        ? () => (
            <Pressable
              disabled={markAllLoading}
              onPress={markAllAsSeen}
              accessibilityRole="button"
              accessibilityLabel={t('mark_all_as_seen')}
              accessibilityState={{
                busy: markAllLoading,
                disabled: markAllLoading
              }}
              style={({ pressed }) => ({
                opacity: markAllLoading ? 0.5 : pressed ? 0.65 : 1,
                padding: 8
              })}
            >
              {markAllLoading ? (
                <ActivityIndicator color={theme.colors.primary} size="small" />
              ) : (
                <Text
                  style={{ color: theme.colors.primary }}
                  variant="labelLarge"
                >
                  {t('mark_all_as_seen')}
                </Text>
              )}
            </Pressable>
          )
        : undefined
    });
  }, [
    markAllAsSeen,
    markAllLoading,
    navigation,
    notifications.content,
    t,
    theme.colors.primary
  ]);

  const onReadNotification = async (notification: Notification) => {
    let url: { route: keyof RootStackParamList; params: {} };
    const id = notification.resourceId;
    url = getNotificationUrl(notification.notificationType, id);
    if (notification.seen) {
      if (url) {
        // @ts-ignore
        navigation.navigate(url.route, url.params);
      }
    } else {
      if (pendingNotificationIdsRef.current.has(notification.id)) return;
      pendingNotificationIdsRef.current.add(notification.id);
      setPendingNotificationIds([...pendingNotificationIdsRef.current]);
      setMutationError('');
      try {
        await dispatch(editNotification(notification.id, { seen: true }));
        if (url) {
          // @ts-ignore
          navigation.navigate(url.route, url.params);
        }
      } catch (error) {
        setMutationError(getErrorMessage(error));
      } finally {
        pendingNotificationIdsRef.current.delete(notification.id);
        setPendingNotificationIds([...pendingNotificationIdsRef.current]);
      }
    }
  };
  const notificationIcons: Record<NotificationType, IconSource> = {
    ASSET: 'package-variant-closed',
    LOCATION: 'map-marker-outline',
    METER: 'gauge',
    PART: 'archive-outline',
    REQUEST: 'inbox-arrow-down-outline',
    TEAM: 'account-outline',
    WORK_ORDER: 'clipboard-text-outline',
    INFO: 'information',
    PURCHASE_ORDER: 'comma-circle-outline'
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          onRefresh={() => void refreshNotifications()}
          refreshing={refreshing}
          colors={[theme.colors.primary]}
          progressBackgroundColor={theme.colors.surface}
        />
      }
      onScroll={({ nativeEvent }) => {
        if (isCloseToBottom(nativeEvent)) void loadMore();
      }}
      scrollEventThrottle={400}
    >
      {loadError && notifications.content.length > 0 && (
        <AsyncStateFeedback
          mode="banner"
          message={loadError}
          onRetry={loadNotifications}
        />
      )}
      {mutationError && (
        <AsyncStateFeedback mode="banner" message={mutationError} />
      )}
      {Boolean(notifications.content.length) ? (
        <List.Section>
          {notifications.content.map((notification) => (
            <React.Fragment key={notification.id}>
              {/* @ts-ignore */}
              <List.Item
                title={notification.message}
                titleNumberOfLines={3}
                titleStyle={{
                  color: theme.colors.onSurface,
                  fontWeight: notification.seen ? '400' : '700'
                }}
                description={getFormattedDate(notification.createdAt)}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={notificationIcons[notification.notificationType]}
                    color={
                      notification.seen
                        ? theme.colors.onSurfaceVariant
                        : theme.colors.primary
                    }
                  />
                )}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                  borderLeftColor: notification.seen
                    ? theme.colors.outlineVariant
                    : theme.colors.primary,
                  borderWidth: 1,
                  borderLeftWidth: notification.seen ? 1 : 4,
                  borderRadius: qpmLayoutTokens.radius.cardLarge,
                  marginHorizontal: qpmLayoutTokens.space.lg,
                  marginBottom: qpmLayoutTokens.space.sm,
                  overflow: 'hidden',
                  paddingVertical: qpmLayoutTokens.space.xs
                }}
                accessibilityLabel={`${
                  notification.message
                }, ${getFormattedDate(notification.createdAt)}, ${t(
                  notification.seen
                    ? 'notification_status_read'
                    : 'notification_status_unread'
                )}`}
                accessibilityHint={t(
                  getNotificationUrl(
                    notification.notificationType,
                    notification.resourceId
                  )
                    ? 'notification_open_related_hint'
                    : 'notification_mark_read_hint'
                )}
                accessibilityRole="button"
                accessibilityState={{
                  busy: pendingNotificationIds.includes(notification.id),
                  disabled: pendingNotificationIds.includes(notification.id)
                }}
                right={() =>
                  pendingNotificationIds.includes(notification.id) ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : null
                }
                onPress={() => void onReadNotification(notification)}
              />
            </React.Fragment>
          ))}
        </List.Section>
      ) : loadingGet || !hasLoaded ? (
        <AsyncStateFeedback mode="loading" message={t('please_wait')} />
      ) : loadError ? (
        <AsyncStateFeedback
          mode="error"
          message={loadError}
          onRetry={loadNotifications}
        />
      ) : (
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
            padding: qpmLayoutTokens.space.xl,
            alignItems: 'center',
            borderWidth: 1,
            borderRadius: qpmLayoutTokens.radius.cardLarge,
            margin: qpmLayoutTokens.space.lg,
            gap: qpmLayoutTokens.space.xs
          }}
        >
          <Text
            variant="titleMedium"
            style={{ fontWeight: 'bold', color: theme.colors.onSurface }}
          >
            {t('no_notification')}
          </Text>
          <Text
            variant="bodyMedium"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center'
            }}
          >
            {t('no_notification_message')}
          </Text>
        </View>
      )}
      {!!notifications.content.length && !lastPage && (
        <DirectoryPaginationFooter
          loading={loadingMore}
          error={!!loadMoreError}
          errorMessage={loadMoreError}
          onRetry={() => void loadMore(true)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%'
  }
});
