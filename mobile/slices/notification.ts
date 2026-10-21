import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from '../store';
import Notification from '../models/notification';
import api from '../utils/api';
import { getInitialPage, Page, SearchCriteria } from '../models/page';
import { revertAll } from '../utils/redux';
import { getWorkOrders } from './workOrder';

const basePath = 'notifications';

interface NotificationState {
  notifications: Page<Notification>;
  currentPageNum: number;
  lastPage: boolean;
  loadingGet: boolean;
  latestListRequestId: number;
  unreadCount: number | null;
  unreadCountLoading: boolean;
  unreadCountError: boolean;
  unreadCountRequestId: number;
}

const initialState: NotificationState = {
  notifications: getInitialPage<Notification>(),
  currentPageNum: 0,
  lastPage: true,
  loadingGet: false,
  latestListRequestId: 0,
  unreadCount: null,
  unreadCountLoading: false,
  unreadCountError: false,
  unreadCountRequestId: 0
};

const slice = createSlice({
  name: 'notifications',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getNotifications(
      state: NotificationState,
      action: PayloadAction<{
        notifications: Page<Notification>;
        requestId: number;
      }>
    ) {
      const { notifications, requestId } = action.payload;
      if (requestId !== state.latestListRequestId) return;
      state.notifications = notifications;
      state.currentPageNum = 0;
      state.lastPage = notifications.last;
    },
    getMoreNotifications(
      state: NotificationState,
      action: PayloadAction<{
        notifications: Page<Notification>;
        requestId: number;
      }>
    ) {
      const { notifications, requestId } = action.payload;
      if (requestId !== state.latestListRequestId) return;
      // A realtime notification can be inserted while the user is paging.
      // Since the API uses offset pagination, that shifts the next page and
      // can repeat its last record. Keep the already-rendered item/state.
      const existingIds = new Set(
        state.notifications.content.map((notification) => notification.id)
      );
      state.notifications.content = state.notifications.content.concat(
        notifications.content.filter((notification) => {
          if (existingIds.has(notification.id)) return false;
          existingIds.add(notification.id);
          return true;
        })
      );
      state.currentPageNum = state.currentPageNum + 1;
      state.lastPage = notifications.last;
    },
    newReceivedNotification(
      state: NotificationState,
      action: PayloadAction<{ notification: Notification }>
    ) {
      const { notification } = action.payload;
      state.notifications.content.unshift(notification);
    },
    editNotification(
      state: NotificationState,
      action: PayloadAction<{ notification: Notification }>
    ) {
      const { notification } = action.payload;
      state.notifications.content = state.notifications.content.map(
        (notification1) => {
          if (notification1.id === notification.id) {
            return notification;
          }
          return notification1;
        }
      );
    },
    readAll(state: NotificationState, action: PayloadAction<{}>) {
      state.notifications.content = state.notifications.content.map(
        (notification1) => {
          return { ...notification1, seen: true };
        }
      );
    },
    setLoadingGet(
      state: NotificationState,
      action: PayloadAction<{ loading: boolean }>
    ) {
      const { loading } = action.payload;
      state.loadingGet = loading;
    },
    beginListRequest(state: NotificationState, action: PayloadAction<number>) {
      state.latestListRequestId = action.payload;
      state.loadingGet = true;
    },
    finishListRequest(state: NotificationState, action: PayloadAction<number>) {
      if (action.payload === state.latestListRequestId) {
        state.loadingGet = false;
      }
    },
    beginUnreadCountRequest(
      state: NotificationState,
      action: PayloadAction<number>
    ) {
      state.unreadCountRequestId = action.payload;
      state.unreadCountLoading = true;
      state.unreadCountError = false;
    },
    receiveUnreadCount(
      state: NotificationState,
      action: PayloadAction<{ count: number; requestId: number }>
    ) {
      if (action.payload.requestId !== state.unreadCountRequestId) return;
      state.unreadCount = action.payload.count;
    },
    failUnreadCountRequest(
      state: NotificationState,
      action: PayloadAction<number>
    ) {
      if (action.payload !== state.unreadCountRequestId) return;
      state.unreadCount = null;
      state.unreadCountError = true;
    },
    finishUnreadCountRequest(
      state: NotificationState,
      action: PayloadAction<number>
    ) {
      if (action.payload === state.unreadCountRequestId) {
        state.unreadCountLoading = false;
      }
    }
  }
});

export const reducer = slice.reducer;

let listRequestSequence = 0;
let unreadCountRequestSequence = 0;

export const getUnreadNotificationCount = (): AppThunk => async (dispatch) => {
  const requestId = ++unreadCountRequestSequence;
  dispatch(slice.actions.beginUnreadCountRequest(requestId));
  try {
    const page = await api.post<Page<Notification>>(`${basePath}/search`, {
      filterFields: [{ field: 'seen', operation: 'eq', value: false }],
      pageSize: 1,
      pageNum: 0,
      direction: 'DESC'
    });
    dispatch(
      slice.actions.receiveUnreadCount({ count: page.totalElements, requestId })
    );
  } catch (_error) {
    dispatch(slice.actions.failUnreadCountRequest(requestId));
  } finally {
    dispatch(slice.actions.finishUnreadCountRequest(requestId));
  }
};

export const getNotifications =
  (criteria: SearchCriteria): AppThunk =>
  async (dispatch) => {
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const notifications = await api.post<Page<Notification>>(
        `${basePath}/search`,
        criteria
      );
      dispatch(slice.actions.getNotifications({ notifications, requestId }));
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };

export const getMoreNotifications =
  (criteria: SearchCriteria, pageNum: number): AppThunk =>
  async (dispatch) => {
    criteria = { ...criteria, pageNum };
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const notifications = await api.post<Page<Notification>>(
        `${basePath}/search`,
        criteria
      );
      dispatch(
        slice.actions.getMoreNotifications({ notifications, requestId })
      );
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const editNotification =
  (id: number, notification): AppThunk =>
  async (dispatch) => {
    const notificationResponse = await api.patch<Notification>(
      `${basePath}/${id}`,
      notification
    );
    dispatch(
      slice.actions.editNotification({ notification: notificationResponse })
    );
  };
export const readAllNotifications = (): AppThunk => async (dispatch) => {
  const notificationResponse = await api.get<{ success: boolean }>(
    `${basePath}/read-all`
  );
  if (notificationResponse.success) dispatch(slice.actions.readAll({}));
};
export const newReceivedNotification =
  (notification: Notification): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.newReceivedNotification({ notification }));
    if (notification.notificationType === 'WORK_ORDER')
      dispatch(
        getWorkOrders({
          filterFields: [
            {
              field: 'priority',
              operation: 'in',
              values: ['NONE', 'LOW', 'MEDIUM', 'HIGH'],
              value: '',
              enumName: 'PRIORITY'
            },
            {
              field: 'status',
              operation: 'in',
              values: ['OPEN', 'IN_PROGRESS', 'ON_HOLD'],
              value: '',
              enumName: 'STATUS'
            },
            {
              field: 'archived',
              operation: 'eq',
              value: false
            }
          ],
          pageSize: 10,
          pageNum: 0,
          direction: 'DESC'
        })
      );
  };
export default slice;
