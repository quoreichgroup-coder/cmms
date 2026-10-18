import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { View } from '../components/Themed';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import Notification, { NotificationType } from '../models/notification';
import {
  editNotification,
  getNotifications,
  getMoreNotifications,
  readAllNotifications,
  getUnreadNotificationCount
} from '../slices/notification';
import { RootStackScreenProps } from '../types';
import { useDispatch, useSelector } from '../store';
import { getNotificationUrl } from '../utils/urlPaths';
import { List, Text, useTheme } from 'react-native-paper';
import * as React from 'react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CompanySettingsContext } from '../contexts/CompanySettingsContext';
import { useTranslation } from 'react-i18next';
import { SearchCriteria } from '../models/page';
import AsyncStateFeedback from '../components/AsyncStateFeedback';
import { getErrorMessage } from '../utils/api';
import DirectoryPaginationFooter from '../components/DirectoryPaginationFooter';
import { qpmLayoutTokens } from '../custom-theme';
import { beginRequest, isCurrentRequest } from '../utils/requestSequence';

const notificationsCriteria: SearchCriteria = {
  filterFields: [],
  pageSize: 15,
  pageNum: 0,
  direction: 'DESC'
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

export default function NotificationsScreen({
  navigation
}: RootStackScreenProps<'Notifications'>) {
  const dispatch = useDispatch();
  const {
    notifications,
    loadingGet,
    lastPage,
    currentPageNum,
    unreadCount,
    unreadCountError
  } = useSelector((state) => state.notifications);
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
  const firstPageRequestSequence = useRef(0);
  const refreshRequestSequence = useRef(0);
  const paginationRequestSequence = useRef(0);
  const pendingNotificationIdsRef = useRef(new Set<number>());
  const theme = useTheme();
  const { t } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);

  const refreshUnreadCount = useCallback(
    () => dispatch(getUnreadNotificationCount()),
    [dispatch]
  );

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  const loadNotifications = useCallback(() => {
    const requestSequence = beginRequest(firstPageRequestSequence);
    beginRequest(paginationRequestSequence);
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setLoadError('');
    setLoadMoreError('');
    return dispatch(getNotifications(notificationsCriteria))
      .catch((error) => {
        if (requestSequence === firstPageRequestSequence.current) {
          setLoadError(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (requestSequence === firstPageRequestSequence.current) {
          setHasLoaded(true);
        }
      });
  }, [dispatch]);

  const refreshNotifications = useCallback(async () => {
    const requestSequence = beginRequest(refreshRequestSequence);
    setRefreshing(true);
    try {
      await Promise.all([loadNotifications(), refreshUnreadCount()]);
    } finally {
      if (isCurrentRequest(requestSequence, refreshRequestSequence)) {
        setRefreshing(false);
      }
    }
  }, [loadNotifications, refreshUnreadCount]);

  const markAllAsSeen = useCallback(async () => {
    if (markAllLoadingRef.current) return;
    markAllLoadingRef.current = true;
    setMutationError('');
    setMarkAllLoading(true);
    try {
      await dispatch(readAllNotifications());
      await refreshUnreadCount();
    } catch (error) {
      setMutationError(getErrorMessage(error));
    } finally {
      markAllLoadingRef.current = false;
      setMarkAllLoading(false);
    }
  }, [dispatch, refreshUnreadCount]);

  const loadMore = useCallback(
    async (retry = false) => {
      if (
        loadingMoreRef.current ||
        loadingGet ||
        lastPage ||
        (loadMoreError && !retry)
      )
        return;

      const requestSequence = firstPageRequestSequence.current;
      const paginationSequence = beginRequest(paginationRequestSequence);
      loadingMoreRef.current = true;
      setLoadingMore(true);
      setLoadMoreError('');
      try {
        await dispatch(
          getMoreNotifications(notificationsCriteria, currentPageNum + 1)
        );
      } catch (error) {
        if (
          isCurrentRequest(requestSequence, firstPageRequestSequence) &&
          isCurrentRequest(paginationSequence, paginationRequestSequence)
        ) {
          setLoadMoreError(getErrorMessage(error));
        }
      } finally {
        if (
          isCurrentRequest(requestSequence, firstPageRequestSequence) &&
          isCurrentRequest(paginationSequence, paginationRequestSequence)
        ) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    },
    [currentPageNum, dispatch, lastPage, loadingGet, loadMoreError]
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const hasUnreadNotifications =
      (unreadCount ?? 0) > 0 ||
      notifications.content.some((notification) => !notification.seen);
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
                minWidth: qpmLayoutTokens.touchTarget.minimum,
                minHeight: qpmLayoutTokens.touchTarget.minimum,
                paddingHorizontal: qpmLayoutTokens.space.sm,
                borderRadius: qpmLayoutTokens.radius.control,
                alignItems: 'center' as const,
                justifyContent: 'center' as const
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
    unreadCount,
    theme.colors.primary
  ]);

  const onReadNotification = useCallback(
    async (notification: Notification) => {
      const url = getNotificationUrl(
        notification.notificationType,
        notification.resourceId
      );
      if (notification.seen) {
        if (url) {
          // @ts-ignore
          navigation.navigate(url.route, url.params);
        }
        return;
      }

      if (pendingNotificationIdsRef.current.has(notification.id)) return;
      pendingNotificationIdsRef.current.add(notification.id);
      setPendingNotificationIds([...pendingNotificationIdsRef.current]);
      setMutationError('');
      try {
        await dispatch(editNotification(notification.id, { seen: true }));
        await refreshUnreadCount();
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
    },
    [dispatch, navigation, refreshUnreadCount]
  );

  const renderNotification = useCallback(
    ({ item: notification }: { item: Notification }) => {
      const notificationUrl = getNotificationUrl(
        notification.notificationType,
        notification.resourceId
      );
      const isPending = pendingNotificationIds.includes(notification.id);

      return (
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
          accessibilityLabel={`${notification.message}, ${getFormattedDate(
            notification.createdAt
          )}, ${t(
            notification.seen
              ? 'notification_status_read'
              : 'notification_status_unread'
          )}`}
          accessibilityHint={t(
            notificationUrl
              ? 'notification_open_related_hint'
              : 'notification_mark_read_hint'
          )}
          accessibilityRole="button"
          accessibilityState={{ busy: isPending, disabled: isPending }}
          right={() =>
            isPending ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : null
          }
          onPress={() => void onReadNotification(notification)}
        />
      );
    },
    [
      getFormattedDate,
      onReadNotification,
      pendingNotificationIds,
      t,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.outlineVariant,
      theme.colors.primary,
      theme.colors.surface
    ]
  );

  const listHeader = (
    <>
      {unreadCountError && (
        <AsyncStateFeedback
          mode="banner"
          message={t('notifications_load_error')}
          onRetry={() => void refreshUnreadCount()}
        />
      )}
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
    </>
  );

  const listEmpty =
    loadingGet || !hasLoaded ? (
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
    );

  const listFooter =
    notifications.content.length > 0 && !lastPage ? (
      <DirectoryPaginationFooter
        loading={loadingMore}
        error={Boolean(loadMoreError)}
        errorMessage={loadMoreError}
        onRetry={() => void loadMore(true)}
      />
    ) : null;

  return (
    <FlatList<Notification>
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      data={notifications.content}
      keyExtractor={(notification) => String(notification.id)}
      renderItem={renderNotification}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      ListFooterComponent={listFooter}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.35}
      refreshControl={
        <RefreshControl
          onRefresh={() => void refreshNotifications()}
          refreshing={refreshing}
          colors={[theme.colors.primary]}
          progressBackgroundColor={theme.colors.surface}
        />
      }
      progressViewOffset={0}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingBottom: 100 },
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
