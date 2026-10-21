import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from '../store';
import WorkOrder from '../models/workOrder';
import api from '../utils/api';
import { Task } from '../models/tasks';
import { getInitialPage, Page, SearchCriteria } from '../models/page';
import { revertAll } from '../utils/redux';
import { createWorkOrderWithTasks } from '../utils/workOrderCreation';
import { WorkOrderLifecycleEvent } from '../models/workOrderHistories';
import type { GeneratedDocument } from '../models/generatedDocument';

const basePath = 'work-orders';

interface WorkOrderState {
  workOrders: Page<WorkOrder>;
  workOrdersByLocation: { [key: number]: WorkOrder[] };
  workOrdersByPart: { [key: number]: WorkOrder[] };
  workOrderInfos: { [key: number]: { workOrder?: WorkOrder } };
  loadingGet: boolean;
  latestListRequestId: number;
  currentPageNum: number;
  lastPage: boolean;
  sessionGeneration: number;
  calendar: {
    events: WorkOrder[];
  };
}

const initialState: WorkOrderState = {
  workOrders: getInitialPage<WorkOrder>(),
  workOrdersByLocation: {},
  workOrdersByPart: {},
  workOrderInfos: {},
  loadingGet: false,
  latestListRequestId: 0,
  currentPageNum: 0,
  lastPage: true,
  sessionGeneration: 0,
  calendar: {
    events: []
  }
};

const slice = createSlice({
  name: 'workOrders',
  initialState,
  extraReducers: (builder) =>
    builder.addCase(revertAll, (state) => ({
      ...initialState,
      sessionGeneration: (state.sessionGeneration ?? 0) + 1
    })),
  reducers: {
    getWorkOrders(
      state: WorkOrderState,
      action: PayloadAction<{ workOrders: Page<WorkOrder>; requestId: number }>
    ) {
      const { workOrders, requestId } = action.payload;
      if (requestId !== state.latestListRequestId) return;
      state.workOrders = workOrders;
      state.currentPageNum = 0;
      state.lastPage = workOrders.last;
    },
    getMoreWorkOrders(
      state: WorkOrderState,
      action: PayloadAction<{ workOrders: Page<WorkOrder>; requestId: number }>
    ) {
      const { workOrders, requestId } = action.payload;
      if (requestId !== state.latestListRequestId) return;
      state.workOrders.content = state.workOrders.content.concat(
        workOrders.content
      );
      state.currentPageNum = state.currentPageNum + 1;
      state.lastPage = workOrders.last;
    },
    getWorkOrderDetails(
      state: WorkOrderState,
      action: PayloadAction<{
        workOrder;
        id: number;
        sessionGeneration?: number;
      }>
    ) {
      const { workOrder, id, sessionGeneration } = action.payload;
      if (
        sessionGeneration !== undefined &&
        sessionGeneration !== state.sessionGeneration
      )
        return;
      if (state.workOrderInfos[id]) {
        state.workOrderInfos[id] = { ...state.workOrderInfos[id], workOrder };
      } else state.workOrderInfos[id] = { workOrder };
      const workOrderIndex = state.workOrders.content.findIndex(
        (item) => item.id === id
      );
      if (workOrderIndex !== -1)
        state.workOrders.content[workOrderIndex] = workOrder;
    },
    addWorkOrder(
      state: WorkOrderState,
      action: PayloadAction<{
        workOrder: WorkOrder;
        sessionGeneration?: number;
      }>
    ) {
      const { workOrder, sessionGeneration } = action.payload;
      if (
        sessionGeneration !== undefined &&
        sessionGeneration !== state.sessionGeneration
      )
        return;
      state.workOrders.content = [workOrder, ...state.workOrders.content];
    },
    editWorkOrder(
      state: WorkOrderState,
      action: PayloadAction<{
        workOrder: WorkOrder;
        sessionGeneration?: number;
      }>
    ) {
      const { workOrder, sessionGeneration } = action.payload;
      if (
        sessionGeneration !== undefined &&
        sessionGeneration !== state.sessionGeneration
      )
        return;
      if (state.workOrderInfos[workOrder.id]) {
        state.workOrderInfos[workOrder.id].workOrder = workOrder;
      } else state.workOrderInfos[workOrder.id] = { workOrder };
      const workOrderIndex = state.workOrders.content.findIndex(
        (wo) => wo.id === workOrder.id
      );
      if (workOrderIndex !== -1) {
        state.workOrders.content[workOrderIndex] = workOrder;
      }
    },
    deleteWorkOrder(
      state: WorkOrderState,
      action: PayloadAction<{ id: number; sessionGeneration?: number }>
    ) {
      const { id, sessionGeneration } = action.payload;
      if (
        sessionGeneration !== undefined &&
        sessionGeneration !== state.sessionGeneration
      )
        return;
      const workOrderIndex = state.workOrders.content.findIndex(
        (workOrder) => workOrder.id === id
      );
      if (workOrderIndex !== -1)
        state.workOrders.content.splice(workOrderIndex, 1);
    },
    getWorkOrdersByLocation(
      state: WorkOrderState,
      action: PayloadAction<{
        workOrders: WorkOrder[];
        id: number;
        sessionGeneration?: number;
      }>
    ) {
      const { workOrders, id, sessionGeneration } = action.payload;
      if (
        sessionGeneration !== undefined &&
        sessionGeneration !== state.sessionGeneration
      )
        return;
      state.workOrdersByLocation[id] = workOrders;
    },
    getWorkOrdersByPart(
      state: WorkOrderState,
      action: PayloadAction<{
        workOrders: WorkOrder[];
        id: number;
        sessionGeneration?: number;
      }>
    ) {
      const { workOrders, id, sessionGeneration } = action.payload;
      if (
        sessionGeneration !== undefined &&
        sessionGeneration !== state.sessionGeneration
      )
        return;
      state.workOrdersByPart[id] = workOrders;
    },
    getEvents(
      state: WorkOrderState,
      action: PayloadAction<{ events: WorkOrder[]; sessionGeneration?: number }>
    ) {
      const { events, sessionGeneration } = action.payload;
      if (
        sessionGeneration !== undefined &&
        sessionGeneration !== state.sessionGeneration
      )
        return;
      state.calendar.events = events;
    },
    setLoadingGet(
      state: WorkOrderState,
      action: PayloadAction<{ loading: boolean }>
    ) {
      const { loading } = action.payload;
      state.loadingGet = loading;
    },
    beginListRequest(state: WorkOrderState, action: PayloadAction<number>) {
      state.latestListRequestId = action.payload;
      state.loadingGet = true;
    },
    finishListRequest(state: WorkOrderState, action: PayloadAction<number>) {
      if (action.payload === state.latestListRequestId) {
        state.loadingGet = false;
      }
    }
  }
});

export const reducer = slice.reducer;

let listRequestSequence = 0;

export const getWorkOrders =
  (criteria: SearchCriteria): AppThunk =>
  async (dispatch) => {
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const workOrders = await api.post<Page<WorkOrder>>(
        `${basePath}/search`,
        criteria
      );
      dispatch(slice.actions.getWorkOrders({ workOrders, requestId }));
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getMoreWorkOrders =
  (criteria: SearchCriteria, pageNum: number): AppThunk =>
  async (dispatch) => {
    criteria = { ...criteria, pageNum };
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const workOrders = await api.post<Page<WorkOrder>>(
        `${basePath}/search`,
        criteria
      );
      dispatch(slice.actions.getMoreWorkOrders({ workOrders, requestId }));
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getWorkOrderDetails =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().workOrders.sessionGeneration ?? 0;
    const workOrder = await api.get<WorkOrder>(`${basePath}/${id}`);
    dispatch(
      slice.actions.getWorkOrderDetails({
        id,
        workOrder,
        sessionGeneration
      })
    );
  };
export const addWorkOrder =
  (workOrder): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().workOrders.sessionGeneration ?? 0;
    const workOrderResponse = await createWorkOrderWithTasks(
      workOrder,
      (payload) => api.post<WorkOrder>(basePath, payload),
      (workOrderId, taskBases) =>
        api.patch<Task[]>(
          `tasks/work-order/${workOrderId}`,
          taskBases,
          null,
          true
        )
    );
    dispatch(
      slice.actions.addWorkOrder({
        workOrder: workOrderResponse,
        sessionGeneration
      })
    );
  };
export const editWorkOrder =
  (id: number, workOrder): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().workOrders.sessionGeneration ?? 0;
    const workOrderResponse = await api.patch<WorkOrder>(
      `${basePath}/${id}`,
      workOrder
    );
    dispatch(
      slice.actions.editWorkOrder({
        workOrder: workOrderResponse,
        sessionGeneration
      })
    );
    if (workOrder.archived)
      dispatch(slice.actions.deleteWorkOrder({ id, sessionGeneration }));
  };
export const deleteWorkOrder =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().workOrders.sessionGeneration ?? 0;
    const workOrderResponse = await api.deletes<{ success: boolean }>(
      `${basePath}/${id}`
    );
    const { success } = workOrderResponse;
    if (success) {
      dispatch(slice.actions.deleteWorkOrder({ id, sessionGeneration }));
    }
  };

export const getWorkOrdersByLocation =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().workOrders.sessionGeneration ?? 0;
    const workOrders = await api.get<WorkOrder[]>(`${basePath}/location/${id}`);
    dispatch(
      slice.actions.getWorkOrdersByLocation({
        id,
        workOrders,
        sessionGeneration
      })
    );
  };

export const getWorkOrdersByPart =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().workOrders.sessionGeneration ?? 0;
    const workOrders = await api.get<WorkOrder[]>(`${basePath}/part/${id}`);
    dispatch(
      slice.actions.getWorkOrdersByPart({
        id,
        workOrders,
        sessionGeneration
      })
    );
  };
export const getPDFReport =
  (id: number): AppThunk =>
  async (): Promise<Response> =>
    api.post<Response>(`${basePath}/report/${id}/stream`, {}, { raw: true });

export const getIssuedWorkOrderReports =
  (id: number): AppThunk =>
  async () =>
    api.get<GeneratedDocument[]>(`${basePath}/${id}/documents`);

export const issueWorkOrderReport =
  (id: number): AppThunk =>
  async () =>
    api.post<GeneratedDocument>(`${basePath}/${id}/report/issue`, {});

export const downloadIssuedWorkOrderReport =
  (documentId: number): AppThunk =>
  async () =>
    api.get<Response>(`documents/${documentId}/download`, { raw: true });

export const getWorkOrderEvents =
  (start: Date, end: Date): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().workOrders.sessionGeneration ?? 0;
    const response = await api.post<WorkOrder[]>(`${basePath}/events`, {
      start,
      end
    });
    dispatch(
      slice.actions.getEvents({
        events: response,
        sessionGeneration
      })
    );
  };
export const changeWorkOrderStatus =
  (
    id: number,
    body: { status: string; feedback?: string; signature?: string }
  ): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().workOrders.sessionGeneration ?? 0;
    const workOrderResponse = await api.patch<WorkOrder>(
      `${basePath}/${id}/change-status`,
      body
    );
    dispatch(
      slice.actions.editWorkOrder({
        workOrder: workOrderResponse,
        sessionGeneration
      })
    );
  };

export const reopenWorkOrder =
  (id: number, reason: string): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().workOrders.sessionGeneration ?? 0;
    const workOrderResponse = await api.post<WorkOrder>(
      `${basePath}/${id}/reopen`,
      { reason }
    );
    dispatch(
      slice.actions.editWorkOrder({
        workOrder: workOrderResponse,
        sessionGeneration
      })
    );
    return workOrderResponse;
  };

export const getWorkOrderLifecycleEvents =
  (id: number): AppThunk =>
  async (): Promise<WorkOrderLifecycleEvent[]> =>
    api.get<WorkOrderLifecycleEvent[]>(`${basePath}/${id}/lifecycle-events`);

export default slice;
