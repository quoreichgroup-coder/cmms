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
}

const initialState: RequestState = {
  requests: getInitialPage<Request>(),
  requestInfos: {},
  currentPageNum: 0,
  lastPage: true,
  loadingGet: false,
  latestListRequestId: 0
};

const slice = createSlice({
  name: 'requests',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getRequests(
      state: RequestState,
      action: PayloadAction<{ requests: Page<Request>; requestId: number }>
    ) {
      const { requests, requestId } = action.payload;
      if (requestId !== state.latestListRequestId) return;
      state.requests = requests;
      state.currentPageNum = 0;
      state.lastPage = requests.last;
    },
    getMoreRequests(
      state: RequestState,
      action: PayloadAction<{ requests: Page<Request>; requestId: number }>
    ) {
      const { requests, requestId } = action.payload;
      if (requestId !== state.latestListRequestId) return;
      state.requests.content = state.requests.content.concat(requests.content);
      state.currentPageNum = state.currentPageNum + 1;
      state.lastPage = requests.last;
    },

    getRequestDetails(
      state: RequestState,
      action: PayloadAction<{ request; id: number }>
    ) {
      const { request, id } = action.payload;
      if (state.requestInfos[id]) {
        state.requestInfos[id] = { ...state.requestInfos[id], request };
      } else state.requestInfos[id] = { request };
    },
    addRequest(
      state: RequestState,
      action: PayloadAction<{ request: Request }>
    ) {
      const { request } = action.payload;
      state.requests.content = [...state.requests.content, request];
    },
    editRequest(
      state: RequestState,
      action: PayloadAction<{ request: Request }>
    ) {
      const { request } = action.payload;
      if (state.requestInfos[request.id]) {
        state.requestInfos[request.id].request = request;
      } else state.requestInfos[request.id] = { request };
    },
    deleteRequest(state: RequestState, action: PayloadAction<{ id: number }>) {
      const { id } = action.payload;
      const requestIndex = state.requests.content.findIndex(
        (request) => request.id === id
      );
      if (requestIndex !== -1) state.requests.content.splice(requestIndex, 1);
    },
    approveRequest(
      state: RequestState,
      action: PayloadAction<{ id: number; workOrder: WorkOrder }>
    ) {
      const { id, workOrder } = action.payload;
      state.requests.content = state.requests.content.map((request) => {
        if (request.id === id) {
          return { ...request, workOrder };
        }
        return request;
      });
    },
    cancelRequest(state: RequestState, action: PayloadAction<{ id: number }>) {
      const { id } = action.payload;
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
  async (dispatch) => {
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const requests = await api.post<Page<Request>>(
        `${basePath}/search`,
        criteria
      );
      dispatch(slice.actions.getRequests({ requests, requestId }));
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getMoreRequests =
  (criteria: SearchCriteria, pageNum: number): AppThunk =>
  async (dispatch) => {
    criteria = { ...criteria, pageNum };
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const requests = await api.post<Page<Request>>(
        `${basePath}/search`,
        criteria
      );
      dispatch(slice.actions.getMoreRequests({ requests, requestId }));
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getRequestDetails =
  (id: number): AppThunk =>
  async (dispatch) => {
    const request = await api.get<Request>(`${basePath}/${id}`);
    dispatch(
      slice.actions.getRequestDetails({
        id,
        request
      })
    );
  };
export const addRequest =
  (request): AppThunk =>
  async (dispatch) => {
    const requestResponse = await api.post<Request>(basePath, request);
    dispatch(slice.actions.addRequest({ request: requestResponse }));
  };
export const editRequest =
  (id: number, request): AppThunk =>
  async (dispatch) => {
    const requestResponse = await api.patch<Request>(
      `${basePath}/${id}`,
      request
    );
    dispatch(slice.actions.editRequest({ request: requestResponse }));
  };
export const deleteRequest =
  (id: number): AppThunk =>
  async (dispatch) => {
    const requestResponse = await api.deletes<{ success: boolean }>(
      `${basePath}/${id}`
    );
    const { success } = requestResponse;
    if (success) {
      dispatch(slice.actions.deleteRequest({ id }));
    }
  };

export const approveRequest =
  (id: number, assetStatus?: AssetStatus): AppThunk =>
  async (dispatch) => {
    const workOrder = await api.patch<WorkOrder>(
      `${basePath}/${id}/approve`,
      assetStatus === undefined ? {} : { assetStatus }
    );
    dispatch(slice.actions.approveRequest({ id, workOrder }));
    return workOrder.id;
  };
export const cancelRequest =
  (id: number, reason: string): AppThunk =>
  async (dispatch) => {
    await api.patch<WorkOrder>(
      `${basePath}/${id}/cancel?reason=${encodeURIComponent(reason)}`,
      {}
    );
    dispatch(slice.actions.cancelRequest({ id }));
  };

export default slice;
