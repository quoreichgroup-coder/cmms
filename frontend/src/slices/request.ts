import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from 'src/store';
import Request from '../models/owns/request';
import api, { getErrorMessage } from '../utils/api';
import WorkOrder from '../models/owns/workOrder';
import { getInitialPage, Page, SearchCriteria } from 'src/models/owns/page';
import { revertAll } from 'src/utils/redux';
import { cancellableFetch } from 'src/utils/cancellableRequest';
import { AssetStatus } from '../models/owns/asset';

const basePath = 'requests';
let latestSingleRequestLoad = 0;

interface RequestState {
  requests: Page<Request>;
  singleRequest: Request;
  pendingCount: number;
  loadingGet: boolean;
  requestsError: string | null;
  singleRequestLoading: boolean;
  singleRequestError: string | null;
  sessionGeneration: number;
}

const initialState: RequestState = {
  requests: getInitialPage<Request>(),
  singleRequest: null,
  pendingCount: 0,
  loadingGet: false,
  requestsError: null,
  singleRequestLoading: false,
  singleRequestError: null,
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
      sessionGeneration: (state.sessionGeneration ?? 0) + 1
    })),
  reducers: {
    getRequests(
      state: RequestState,
      action: PayloadAction<{
        requests: Page<Request>;
        sessionGeneration?: number;
      }>
    ) {
      const { requests, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.requests = requests;
    },
    getSingleRequest(
      state: RequestState,
      action: PayloadAction<{ request: Request; sessionGeneration?: number }>
    ) {
      const { request, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.singleRequest = request;
      state.singleRequestError = null;
    },
    startSingleRequest(
      state: RequestState,
      action: PayloadAction<{ sessionGeneration?: number }>
    ) {
      if (!isCurrentGeneration(state, action.payload.sessionGeneration)) return;
      state.singleRequest = null;
      state.singleRequestLoading = true;
      state.singleRequestError = null;
    },
    finishSingleRequest(
      state: RequestState,
      action: PayloadAction<{ sessionGeneration?: number }>
    ) {
      if (!isCurrentGeneration(state, action.payload.sessionGeneration)) return;
      state.singleRequestLoading = false;
    },
    setSingleRequestError(
      state: RequestState,
      action: PayloadAction<{ error: string; sessionGeneration?: number }>
    ) {
      if (!isCurrentGeneration(state, action.payload.sessionGeneration)) return;
      state.singleRequestError = action.payload.error;
    },
    addRequest(
      state: RequestState,
      action: PayloadAction<{ request: Request; sessionGeneration?: number }>
    ) {
      const { request, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.requests.content = [request, ...state.requests.content];
    },
    editRequest(
      state: RequestState,
      action: PayloadAction<{ request: Request; sessionGeneration?: number }>
    ) {
      const { request, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      const inContent = state.requests.content.some(
        (request1) => request1.id === request.id
      );
      if (inContent) {
        state.requests.content = state.requests.content.map((request1) => {
          if (request1.id === request.id) {
            return request;
          }
          return request1;
        });
      } else {
        state.singleRequest = request;
      }
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
      if (state.singleRequest?.id === id) {
        state.singleRequest = { ...state.singleRequest, workOrder };
      }
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
      if (state.singleRequest?.id === id) {
        state.singleRequest = { ...state.singleRequest, cancelled: true };
      }
    },
    setLoadingGet(
      state: RequestState,
      action: PayloadAction<{ loading: boolean; sessionGeneration?: number }>
    ) {
      const { loading, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.loadingGet = loading;
    },
    setRequestsError(
      state: RequestState,
      action: PayloadAction<{
        error: string | null;
        sessionGeneration?: number;
      }>
    ) {
      if (!isCurrentGeneration(state, action.payload.sessionGeneration)) return;
      state.requestsError = action.payload.error;
    },
    clearSingleRequest(state: RequestState) {
      state.singleRequest = null;
      state.singleRequestError = null;
      state.singleRequestLoading = false;
    },
    getPendingCount(
      state: RequestState,
      action: PayloadAction<{ count: number; sessionGeneration?: number }>
    ) {
      const { count, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.pendingCount = count;
    },
    incrementPendingCount(
      state: RequestState,
      action: PayloadAction<{ sessionGeneration?: number }>
    ) {
      if (!isCurrentGeneration(state, action.payload.sessionGeneration)) return;
      state.pendingCount += 1;
    },
    decrementPendingCount(
      state: RequestState,
      action: PayloadAction<{ sessionGeneration?: number }>
    ) {
      if (!isCurrentGeneration(state, action.payload.sessionGeneration)) return;
      state.pendingCount = Math.max(0, state.pendingCount - 1);
    }
  }
});

export const reducer = slice.reducer;

export const getRequests =
  (criteria: SearchCriteria): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration ?? 0;
    dispatch(
      slice.actions.setRequestsError({ error: null, sessionGeneration })
    );
    try {
      await cancellableFetch(
        dispatch,
        'getRequests',
        (signal) =>
          api.post<Page<Request>>(`${basePath}/search`, criteria, { signal }),
        (requests) =>
          dispatch(slice.actions.getRequests({ requests, sessionGeneration })),
        (loading) =>
          dispatch(slice.actions.setLoadingGet({ loading, sessionGeneration }))
      );
    } catch (error) {
      dispatch(
        slice.actions.setRequestsError({
          error: getErrorMessage(error),
          sessionGeneration
        })
      );
    }
  };

export const getSingleRequest =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration ?? 0;
    const loadId = ++latestSingleRequestLoad;
    dispatch(slice.actions.startSingleRequest({ sessionGeneration }));
    dispatch(slice.actions.setLoadingGet({ loading: true, sessionGeneration }));
    try {
      const request = await api.get<Request>(`${basePath}/${id}`);
      if (
        loadId !== latestSingleRequestLoad ||
        getState().requests.sessionGeneration !== sessionGeneration
      )
        return;
      dispatch(slice.actions.getSingleRequest({ request, sessionGeneration }));
    } catch (error) {
      if (
        loadId === latestSingleRequestLoad &&
        getState().requests.sessionGeneration === sessionGeneration
      )
        dispatch(
          slice.actions.setSingleRequestError({
            error: getErrorMessage(error),
            sessionGeneration
          })
        );
    } finally {
      if (
        loadId === latestSingleRequestLoad &&
        getState().requests.sessionGeneration === sessionGeneration
      ) {
        dispatch(slice.actions.finishSingleRequest({ sessionGeneration }));
        dispatch(
          slice.actions.setLoadingGet({ loading: false, sessionGeneration })
        );
      }
    }
  };
export const addRequest =
  (request): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration ?? 0;
    const requestResponse = await api.post<Request>(basePath, request);
    dispatch(
      slice.actions.addRequest({ request: requestResponse, sessionGeneration })
    );
    dispatch(slice.actions.incrementPendingCount({ sessionGeneration }));
  };
export const editRequest =
  (id: number, request): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration ?? 0;
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
    const sessionGeneration = getState().requests.sessionGeneration ?? 0;
    const wasPending = getState().requests.requests.content.some(
      (request) => request.id === id && !request.cancelled && !request.workOrder
    );
    const requestResponse = await api.deletes<{ success: boolean }>(
      `${basePath}/${id}`
    );
    const { success } = requestResponse;
    if (success) {
      dispatch(slice.actions.deleteRequest({ id, sessionGeneration }));
      if (wasPending)
        dispatch(slice.actions.decrementPendingCount({ sessionGeneration }));
    }
    return success;
  };

export const approveRequest =
  (id: number, assetStatus: AssetStatus): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration ?? 0;
    const workOrder = await api.patch<WorkOrder>(`${basePath}/${id}/approve`, {
      assetStatus
    });
    dispatch(
      slice.actions.approveRequest({ id, workOrder, sessionGeneration })
    );
    dispatch(slice.actions.decrementPendingCount({ sessionGeneration }));
    return workOrder.id;
  };
export const cancelRequest =
  (id: number, reason: string): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration ?? 0;
    const request = await api.patch<Request>(
      `${basePath}/${id}/cancel?reason=${encodeURIComponent(reason)}`,
      {}
    );
    dispatch(slice.actions.cancelRequest({ id, sessionGeneration }));
    dispatch(slice.actions.decrementPendingCount({ sessionGeneration }));
  };
export const getPendingRequestsCount =
  (): AppThunk => async (dispatch, getState) => {
    const sessionGeneration = getState().requests.sessionGeneration ?? 0;
    const response = await api.get<{ success: boolean; message: string }>(
      `${basePath}/pending`
    );
    dispatch(
      slice.actions.getPendingCount({
        count: Number(response.message),
        sessionGeneration
      })
    );
  };
export const clearSingleRequest = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.clearSingleRequest());
};

export interface SubmitPublicRequestDTO {
  title: string;
  description?: string;
  contact?: string;
  location?: { id: number };
  asset?: { id: number };
  image?: { id: number };
  files: { id: number }[];
}

export const submitPublicRequest =
  (
    uuid: string,
    request: SubmitPublicRequestDTO,
    recaptchaToken?: string
  ): AppThunk =>
  async (dispatch) => {
    const requestResponse = await api.post<Request>(
      `${basePath}/portal/${uuid}?recaptchaToken=${recaptchaToken}`,
      request
    );
    return requestResponse as any;
  };

export default slice;
