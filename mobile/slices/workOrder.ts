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
  calendar: {
    events: []
  }
};

const slice = createSlice({
  name: 'workOrders',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
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
      action: PayloadAction<{ workOrder; id: number }>
    ) {
      const { workOrder, id } = action.payload;
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
      action: PayloadAction<{ workOrder: WorkOrder }>
    ) {
      const { workOrder } = action.payload;
      state.workOrders.content = [workOrder, ...state.workOrders.content];
    },
    editWorkOrder(
      state: WorkOrderState,
      action: PayloadAction<{ workOrder: WorkOrder }>
    ) {
      const { workOrder } = action.payload;
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
      action: PayloadAction<{ id: number }>
    ) {
      const { id } = action.payload;
      const workOrderIndex = state.workOrders.content.findIndex(
        (workOrder) => workOrder.id === id
      );
      if (workOrderIndex !== -1)
        state.workOrders.content.splice(workOrderIndex, 1);
    },
    getWorkOrdersByLocation(
      state: WorkOrderState,
      action: PayloadAction<{ workOrders: WorkOrder[]; id: number }>
    ) {
      const { workOrders, id } = action.payload;
      state.workOrdersByLocation[id] = workOrders;
    },
    getWorkOrdersByPart(
      state: WorkOrderState,
      action: PayloadAction<{ workOrders: WorkOrder[]; id: number }>
    ) {
      const { workOrders, id } = action.payload;
      state.workOrdersByPart[id] = workOrders;
    },
    getEvents(
      state: WorkOrderState,
      action: PayloadAction<{ events: WorkOrder[] }>
    ) {
      const { events } = action.payload;
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
  async (dispatch) => {
    const workOrder = await api.get<WorkOrder>(`${basePath}/${id}`);
    dispatch(
      slice.actions.getWorkOrderDetails({
        id,
        workOrder
      })
    );
  };
export const addWorkOrder =
  (workOrder): AppThunk =>
  async (dispatch) => {
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
    dispatch(slice.actions.addWorkOrder({ workOrder: workOrderResponse }));
  };
export const editWorkOrder =
  (id: number, workOrder): AppThunk =>
  async (dispatch) => {
    const workOrderResponse = await api.patch<WorkOrder>(
      `${basePath}/${id}`,
      workOrder
    );
    dispatch(slice.actions.editWorkOrder({ workOrder: workOrderResponse }));
    if (workOrder.archived) dispatch(slice.actions.deleteWorkOrder({ id }));
  };
export const deleteWorkOrder =
  (id: number): AppThunk =>
  async (dispatch) => {
    const workOrderResponse = await api.deletes<{ success: boolean }>(
      `${basePath}/${id}`
    );
    const { success } = workOrderResponse;
    if (success) {
      dispatch(slice.actions.deleteWorkOrder({ id }));
    }
  };

export const getWorkOrdersByLocation =
  (id: number): AppThunk =>
  async (dispatch) => {
    const workOrders = await api.get<WorkOrder[]>(`${basePath}/location/${id}`);
    dispatch(
      slice.actions.getWorkOrdersByLocation({
        id,
        workOrders
      })
    );
  };

export const getWorkOrdersByPart =
  (id: number): AppThunk =>
  async (dispatch) => {
    const workOrders = await api.get<WorkOrder[]>(`${basePath}/part/${id}`);
    dispatch(
      slice.actions.getWorkOrdersByPart({
        id,
        workOrders
      })
    );
  };
export const getPDFReport =
  (id: number): AppThunk =>
  async (dispatch): Promise<string> => {
    const response = await api.get<{ success: boolean; message: string }>(
      `${basePath}/report/${id}`
    );
    const { message } = response;
    return message;
  };

export const getWorkOrderEvents =
  (start: Date, end: Date): AppThunk =>
  async (dispatch) => {
    const response = await api.post<WorkOrder[]>(`${basePath}/events`, {
      start,
      end
    });
    dispatch(
      slice.actions.getEvents({
        events: response
      })
    );
  };
export const changeWorkOrderStatus =
  (
    id: number,
    body: { status: string; feedback?: string; signature?: string }
  ): AppThunk =>
  async (dispatch) => {
    const workOrderResponse = await api.patch<WorkOrder>(
      `${basePath}/${id}/change-status`,
      body
    );
    dispatch(slice.actions.editWorkOrder({ workOrder: workOrderResponse }));
  };

export const reopenWorkOrder =
  (id: number, reason: string): AppThunk =>
  async (dispatch) => {
    const workOrderResponse = await api.post<WorkOrder>(
      `${basePath}/${id}/reopen`,
      { reason }
    );
    dispatch(slice.actions.editWorkOrder({ workOrder: workOrderResponse }));
    return workOrderResponse;
  };

export const getWorkOrderLifecycleEvents =
  (id: number): AppThunk =>
  async (): Promise<WorkOrderLifecycleEvent[]> =>
    api.get<WorkOrderLifecycleEvent[]>(`${basePath}/${id}/lifecycle-events`);

export default slice;
