import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from '../store';
import Request from '../models/request';
import type { AssetStatus } from '../models/asset';
import api from '../utils/api';
import WorkOrder from '../models/workOrder';
import { getInitialPage, Page, SearchCriteria } from '../models/page';
import { revertAll } from '../utils/redux';

const basePath = 'requests';

interface RequestState {
  requests: Page<Request>;
  requestInfos: { [key: number]: { request?: Request } };
  currentPageNum: number;
  lastPage: boolean;
  loadingGet: boolean;
  latestListRequestId: number;
  sessionGeneration: number;
}

const initialState: RequestState = {
  requests: getInitialPage<Request>(),
  requestInfos: {},
  currentPageNum: 0,
  lastPage: true,
  loadingGet: false,
  latestListRequestId: 0,
  sessionGeneration: 0
};

const isCurrentGeneration = (state: RequestState, generation?: number) =>
  generation === undefined || generation === (state.sessionGeneration ?? 0);

const slice = createSlice({
  name: 'requests',
  initialState,
  extraReducers: (builder) =>
    builder.addCase(revertAll, (state) => ({
      ...initialState,
      sessionGeneration: state.sessionGeneration + 1
    })),
  reducers: {
    getRequests(
      state: RequestState,
      action: PayloadAction<{
        requests: Page<Request>;
        requestId: number;
        sessionGeneration?: number;
      }>
    ) {
      const { requests, requestId, sessionGeneration } = action.payload;
      if (
        requestId !== state.latestListRequestId ||
        !isCurrentGeneration(state, sessionGeneration)
      )
        return;
      state.requests = requests;
      state.currentPageNum = 0;
      state.lastPage = requests.last;
    },
    getMoreRequests(
      state: RequestState,
      action: PayloadAction<{
        requests: Page<Request>;
        requestId: number;
        sessionGeneration?: number;
      }>
    ) {
      const { requests, requestId, sessionGeneration } = action.payload;
      if (
        requestId !== state.latestListRequestId ||
        !isCurrentGeneration(state, sessionGeneration)
      )
        return;
      state.requests.content = state.requests.content.concat(requests.content);
      state.currentPageNum = state.currentPageNum + 1;
      state.lastPage = requests.last;
    },

    getRequestDetails(
      state: RequestState,
      action: PayloadAction<{
        request;
        id: number;
        sessionGeneration?: number;
      }>
    ) {
      const { request, id, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      if (state.requestInfos[id]) {
        state.requestInfos[id] = { ...state.requestInfos[id], request };
      } else state.requestInfos[id] = { request };
    },
    addRequest(
      state: RequestState,
      action: PayloadAction<{ request: Request; sessionGeneration?: number }>
    ) {
      const { request, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.requests.content = [...state.requests.content, request];
    },
    editRequest(
      state: RequestState,
      action: PayloadAction<{ request: Request; sessionGeneration?: number }>
    ) {
      const { request, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      if (state.requestInfos[request.id]) {
        state.requestInfos[request.id].request = request;
      } else state.requestInfos[request.id] = { request };
    },
    deleteRequest(
      state: RequestState,
      action: PayloadAction<{ id: number; sessionGeneration?: number }>
    ) {
      const { id, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      const requestIndex = state.requests.content.findIndex(
        (request) => request.id === id
      );
      if (requestIndex !== -1) state.requests.content.splice(requestIndex, 1);
    },
    approveRequest(
      state: RequestState,
      action: PayloadAction<{
        id: number;
        workOrder: WorkOrder;
        sessionGeneration?: number;
      }>
    ) {
      const { id, workOrder, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.requests.content = state.requests.content.map((request) => {
        if (request.id === id) {
          return { ...request, workOrder };
        }
        return request;
      });
    },
    cancelRequest(
      state: RequestState,
      action: PayloadAction<{ id: number; sessionGeneration?: number }>
    ) {
      const { id, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.requests.content = state.requests.content.map((request) => {
        if (request.id === id) {
          return { ...request, cancelled: true };
        }
        return request;
      });
    },
    setLoadingGet(
      state: RequestState,
      action: PayloadAction<{ loading: boolean }>
    ) {
      const { loading } = action.payload;
      state.loadingGet = loading;
    },
    beginListRequest(state: RequestState, action: PayloadAction<number>) {
      state.latestListRequestId = action.payload;
      state.loadingGet = true;
    },
    finishListRequest(state: RequestState, action: PayloadAction<number>) {
      if (action.payload === state.latestListRequestId) {
        state.loadingGet = false;
      }
    }
  }
});

export const reducer = slice.reducer;

let listRequestSequence = 0;

export const getRequests =
  (criteria: SearchCriteria): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration;
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const requests = await api.post<Page<Request>>(
        `${basePath}/search`,
        criteria
      );
      dispatch(
        slice.actions.getRequests({ requests, requestId, sessionGeneration })
      );
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getMoreRequests =
  (criteria: SearchCriteria, pageNum: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration;
    criteria = { ...criteria, pageNum };
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const requests = await api.post<Page<Request>>(
        `${basePath}/search`,
        criteria
      );
      dispatch(
        slice.actions.getMoreRequests({
          requests,
          requestId,
          sessionGeneration
        })
      );
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getRequestDetails =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration;
    const request = await api.get<Request>(`${basePath}/${id}`);
    if (getState().requests.sessionGeneration !== sessionGeneration) return;
    dispatch(
      slice.actions.getRequestDetails({
        id,
        request,
        sessionGeneration
      })
    );
  };
export const addRequest =
  (request): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration;
    const requestResponse = await api.post<Request>(basePath, request);
    dispatch(
      slice.actions.addRequest({ request: requestResponse, sessionGeneration })
    );
  };
export const editRequest =
  (id: number, request): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration;
    const requestResponse = await api.patch<Request>(
      `${basePath}/${id}`,
      request
    );
    dispatch(
      slice.actions.editRequest({ request: requestResponse, sessionGeneration })
    );
  };
export const deleteRequest =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration;
    const requestResponse = await api.deletes<{ success: boolean }>(
      `${basePath}/${id}`
    );
    const { success } = requestResponse;
    if (success) {
      dispatch(slice.actions.deleteRequest({ id, sessionGeneration }));
    }
  };

export const approveRequest =
  (id: number, assetStatus?: AssetStatus): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration;
    const workOrder = await api.patch<WorkOrder>(
      `${basePath}/${id}/approve`,
      assetStatus === undefined ? {} : { assetStatus }
    );
    dispatch(
      slice.actions.approveRequest({ id, workOrder, sessionGeneration })
    );
    return workOrder.id;
  };
export const cancelRequest =
  (id: number, reason: string): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration;
    await api.patch<WorkOrder>(
      `${basePath}/${id}/cancel?reason=${encodeURIComponent(reason)}`,
      {}
    );
    dispatch(slice.actions.cancelRequest({ id, sessionGeneration }));
  };

export default slice;
