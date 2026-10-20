import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from 'src/store';
import api from '../utils/api';
import type {
  UnscheduledWorkOrdersDTO,
  WorkloadOverviewDTO,
  WorkloadWorkOrderDTO
} from '../models/owns/workload';
import { updateWorkOrderInContent } from './workOrder';
import { getErrorMessage } from '../utils/api';

const basePath = 'workload';
let overviewRequestId = 0;
let unscheduledRequestId = 0;

interface WorkloadState {
  overview: WorkloadOverviewDTO | null;
  unscheduled: UnscheduledWorkOrdersDTO | null;
  loadingOverview: boolean;
  loadingUnscheduled: boolean;
  overviewError: string | null;
  unscheduledError: string | null;
  overviewRequestId: number;
  unscheduledRequestId: number;
}

const initialState: WorkloadState = {
  overview: null,
  unscheduled: null,
  loadingOverview: false,
  loadingUnscheduled: false,
  overviewError: null,
  unscheduledError: null,
  overviewRequestId: 0,
  unscheduledRequestId: 0
};

const slice = createSlice({
  name: 'workload',
  initialState,
  reducers: {
    getOverview(
      state: WorkloadState,
      action: PayloadAction<{
        overview: WorkloadOverviewDTO;
        requestId?: number;
      }>
    ) {
      const { overview, requestId } = action.payload;
      if (requestId !== undefined && requestId !== state.overviewRequestId)
        return;
      state.overview = overview;
      state.overviewError = null;
      state.loadingOverview = false;
    },
    getUnscheduled(
      state: WorkloadState,
      action: PayloadAction<{
        unscheduled: UnscheduledWorkOrdersDTO;
        requestId?: number;
      }>
    ) {
      const { unscheduled, requestId } = action.payload;
      if (requestId !== undefined && requestId !== state.unscheduledRequestId)
        return;
      state.unscheduled = unscheduled;
      state.unscheduledError = null;
      state.loadingUnscheduled = false;
    },
    setOverviewError(
      state: WorkloadState,
      action: PayloadAction<{ error: string | null; requestId?: number }>
    ) {
      if (
        action.payload.requestId !== undefined &&
        action.payload.requestId !== state.overviewRequestId
      )
        return;
      state.overviewError = action.payload.error;
    },
    setUnscheduledError(
      state: WorkloadState,
      action: PayloadAction<{ error: string | null; requestId?: number }>
    ) {
      if (
        action.payload.requestId !== undefined &&
        action.payload.requestId !== state.unscheduledRequestId
      )
        return;
      state.unscheduledError = action.payload.error;
    },
    removeFromUnscheduled(
      state: WorkloadState,
      action: PayloadAction<{ id: number }>
    ) {
      const { id } = action.payload;
      if (state.unscheduled) {
        const wo = state.unscheduled.workOrders.find((w) => w.id === id);
        if (wo) {
          if (state.unscheduled.statusCounts[wo.status] > 1) {
            state.unscheduled.statusCounts[wo.status]--;
          } else {
            delete state.unscheduled.statusCounts[wo.status];
          }
        }
        state.unscheduled.workOrders = state.unscheduled.workOrders.filter(
          (w) => w.id !== id
        );
      }
    },
    addToUnscheduled(
      state: WorkloadState,
      action: PayloadAction<{ workOrder: WorkloadWorkOrderDTO }>
    ) {
      const { workOrder } = action.payload;
      if (state.unscheduled) {
        state.unscheduled.workOrders.push(workOrder);
        state.unscheduled.statusCounts[workOrder.status] =
          (state.unscheduled.statusCounts[workOrder.status] ?? 0) + 1;
      }
    },
    setLoadingOverview(
      state: WorkloadState,
      action: PayloadAction<{ loading: boolean; requestId?: number }>
    ) {
      const { requestId, loading } = action.payload;
      if (requestId !== undefined) {
        if (loading) {
          state.overviewRequestId = requestId;
          state.overviewError = null;
        } else if (requestId !== state.overviewRequestId) return;
      }
      state.loadingOverview = loading;
    },
    setLoadingUnscheduled(
      state: WorkloadState,
      action: PayloadAction<{ loading: boolean; requestId?: number }>
    ) {
      const { loading, requestId } = action.payload;
      if (requestId !== undefined) {
        if (loading) {
          state.unscheduledRequestId = requestId;
          state.unscheduledError = null;
        } else if (requestId !== state.unscheduledRequestId) return;
      }
      state.loadingUnscheduled = loading;
    },
    addWoToUserDay(
      state: WorkloadState,
      action: PayloadAction<{
        workOrder: WorkloadWorkOrderDTO;
        userId: number;
        date: string;
      }>
    ) {
      const { workOrder, userId, date } = action.payload;
      if (!state.overview) return;
      const day = state.overview.days.find((d) => d.date === date);
      if (!day) return;
      let userDay = day.users.find((u) => u.userId === userId);
      if (!userDay) {
        userDay = {
          userId,
          fullName: '',
          // Capacity must come from the workload API, never from a UI default.
          capacityMinutes: 0,
          allocatedMinutes: 0,
          workOrders: []
        };
        day.users.push(userDay);
      }
      userDay.workOrders.push(workOrder);
      userDay.allocatedMinutes += workOrder.estimatedDuration * 60;
      day.teamAllocatedMinutes += workOrder.estimatedDuration * 60;
      state.overview.teamAllocatedMinutes += workOrder.estimatedDuration * 60;
    },
    removeWoFromOverview(
      state: WorkloadState,
      action: PayloadAction<{ workOrderId: number }>
    ) {
      const { workOrderId } = action.payload;
      if (!state.overview) return;
      for (const day of state.overview.days) {
        for (const userDay of day.users) {
          const idx = userDay.workOrders.findIndex((w) => w.id === workOrderId);
          if (idx !== -1) {
            const removed = userDay.workOrders.splice(idx, 1)[0];
            userDay.allocatedMinutes -= removed.estimatedDuration * 60;
            day.teamAllocatedMinutes -= removed.estimatedDuration * 60;
            state.overview.teamAllocatedMinutes -=
              removed.estimatedDuration * 60;
            return;
          }
        }
      }
    }
  }
});

export const reducer = slice.reducer;

export const getOverview =
  (startDate: string, endDate: string, userIds?: number[]): AppThunk =>
  async (dispatch) => {
    const requestId = ++overviewRequestId;
    dispatch(slice.actions.setLoadingOverview({ loading: true, requestId }));
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (userIds?.length) {
        params.append('userIds', userIds.join(','));
      }
      const overview = await api.get<WorkloadOverviewDTO>(
        `${basePath}/overview?${params}`
      );
      dispatch(slice.actions.getOverview({ overview, requestId }));
    } catch (error) {
      dispatch(
        slice.actions.setOverviewError({
          error: getErrorMessage(error),
          requestId
        })
      );
    } finally {
      dispatch(slice.actions.setLoadingOverview({ loading: false, requestId }));
    }
  };

export const getUnscheduled =
  (statuses?: string[]): AppThunk =>
  async (dispatch) => {
    const requestId = ++unscheduledRequestId;
    dispatch(slice.actions.setLoadingUnscheduled({ loading: true, requestId }));
    try {
      const params = new URLSearchParams();
      if (statuses?.length) {
        params.append('statuses', statuses.join(','));
      }
      const query = params.toString();
      const unscheduled = await api.get<UnscheduledWorkOrdersDTO>(
        `${basePath}/unscheduled${query ? `?${query}` : ''}`
      );
      dispatch(slice.actions.getUnscheduled({ unscheduled, requestId }));
    } catch (error) {
      dispatch(
        slice.actions.setUnscheduledError({
          error: getErrorMessage(error),
          requestId
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoadingUnscheduled({ loading: false, requestId })
      );
    }
  };

interface ScheduleWorkOrderResponse {
  userId: number | null;
  userLastName: string | null;
  userFirstName: string | null;
  estimatedStartDate: string | null;
}
export const scheduleWorkOrder =
  (
    workOrderId: number,
    dto: {
      localDate: string | null;
      estimatedDuration: number | null;
      primaryUserId: number | null;
    }
  ): AppThunk =>
  async (dispatch, getState) => {
    const response = await api.patch<ScheduleWorkOrderResponse>(
      `${basePath}/work-orders/${workOrderId}/schedule`,
      dto
    );
    const woInContent = getState().workOrders.workOrders.content.find(
      (w) => w.id === workOrderId
    );
    const dayWos = getState().workload.overview?.days ?? [];

    const woInDays = dayWos
      .flatMap((day) => day.users)
      .flatMap((user) => user.workOrders)
      .find((workOrder) => workOrder.id === workOrderId);
    if (woInContent) {
      dispatch(
        updateWorkOrderInContent({
          workOrder: {
            ...woInContent,
            estimatedStartDate: response.estimatedStartDate,
            estimatedDuration:
              woInContent.estimatedDuration ?? dto.estimatedDuration,
            primaryUser:
              response.userId === null
                ? null
                : {
                    id: response.userId,
                    firstName: response.userFirstName,
                    lastName: response.userLastName,
                    image: null
                  }
          }
        })
      );
    }
    const woInUnscheduled = getState().workload.unscheduled?.workOrders.find(
      (w) => w.id === workOrderId
    );

    const workOrder = {
      ...woInContent,
      ...woInUnscheduled,
      ...woInDays
    };
    dispatch(slice.actions.removeWoFromOverview({ workOrderId }));
    dispatch(slice.actions.removeFromUnscheduled({ id: workOrderId }));
    dispatch(
      slice.actions.addWoToUserDay({
        workOrder: {
          id: workOrderId,
          customId: workOrder?.customId ?? '',
          title: workOrder?.title ?? '',
          status: workOrder?.status ?? '',
          estimatedDuration: dto.estimatedDuration
            ? dto.estimatedDuration
            : workOrder?.estimatedDuration ?? woInDays?.estimatedDuration ?? 0,
          estimatedStartDate: response.estimatedStartDate,
          dueDate: workOrder?.dueDate ?? ''
        },
        userId: dto.primaryUserId,
        date: dto.localDate.substring(0, 10)
      })
    );
  };

export const unscheduleWorkOrder =
  (workOrderId: number, workOrder: WorkloadWorkOrderDTO): AppThunk =>
  async (dispatch, getState) => {
    const response = await api.patch<ScheduleWorkOrderResponse>(
      `${basePath}/work-orders/${workOrderId}/schedule`,
      {
        localDate: null,
        primaryUserId: null
      }
    );
    const wo = getState().workOrders.workOrders.content.find(
      (w) => w.id === workOrderId
    );
    if (wo) {
      dispatch(
        updateWorkOrderInContent({
          workOrder: {
            ...wo,
            estimatedStartDate: response.estimatedStartDate,
            primaryUser:
              response.userId === null
                ? null
                : {
                    id: response.userId,
                    firstName: response.userFirstName,
                    lastName: response.userLastName,
                    image: null
                  }
          }
        })
      );
    }
    dispatch(slice.actions.addToUnscheduled({ workOrder }));
    dispatch(slice.actions.removeWoFromOverview({ workOrderId }));
  };

export const { removeFromUnscheduled, addToUnscheduled } = slice.actions;

export default slice;
