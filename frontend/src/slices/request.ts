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
}

const initialState: RequestState = {
  requests: getInitialPage<Request>(),
  singleRequest: null,
  pendingCount: 0,
  loadingGet: false,
  requestsError: null,
  singleRequestLoading: false,
  singleRequestError: null
};

const slice = createSlice({
  name: 'requests',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getRequests(
      state: RequestState,
      action: PayloadAction<{ requests: Page<Request> }>
    ) {
      const { requests } = action.payload;
      state.requests = requests;
    },
    getSingleRequest(
      state: RequestState,
      action: PayloadAction<{ request: Request }>
    ) {
      const { request } = action.payload;
      state.singleRequest = request;
      state.singleRequestError = null;
    },
    startSingleRequest(state: RequestState) {
      state.singleRequest = null;
      state.singleRequestLoading = true;
      state.singleRequestError = null;
    },
    finishSingleRequest(state: RequestState) {
      state.singleRequestLoading = false;
    },
    setSingleRequestError(state: RequestState, action: PayloadAction<string>) {
      state.singleRequestError = action.payload;
    },
    addRequest(
      state: RequestState,
      action: PayloadAction<{ request: Request }>
    ) {
      const { request } = action.payload;
      state.requests.content = [request, ...state.requests.content];
    },
    editRequest(
      state: RequestState,
      action: PayloadAction<{ request: Request }>
    ) {
      const { request } = action.payload;
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
      if (state.singleRequest?.id === id) {
        state.singleRequest = { ...state.singleRequest, workOrder };
      }
    },
    cancelRequest(state: RequestState, action: PayloadAction<{ id: number }>) {
      const { id } = action.payload;
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
      action: PayloadAction<{ loading: boolean }>
    ) {
      const { loading } = action.payload;
      state.loadingGet = loading;
    },
    setRequestsError(
      state: RequestState,
      action: PayloadAction<string | null>
    ) {
      state.requestsError = action.payload;
    },
    clearSingleRequest(state: RequestState) {
      state.singleRequest = null;
      state.singleRequestError = null;
      state.singleRequestLoading = false;
    },
    getPendingCount(
      state: RequestState,
      action: PayloadAction<{ count: number }>
    ) {
      const { count } = action.payload;
      state.pendingCount = count;
    },
    incrementPendingCount(state: RequestState) {
      state.pendingCount += 1;
    },
    decrementPendingCount(state: RequestState) {
      state.pendingCount = Math.max(0, state.pendingCount - 1);
    }
  }
});

export const reducer = slice.reducer;

export const getRequests =
  (criteria: SearchCriteria): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setRequestsError(null));
    try {
      await cancellableFetch(
        dispatch,
        'getRequests',
        (signal) =>
          api.post<Page<Request>>(`${basePath}/search`, criteria, { signal }),
        (requests) => dispatch(slice.actions.getRequests({ requests })),
        (loading) => dispatch(slice.actions.setLoadingGet({ loading }))
      );
    } catch (error) {
      dispatch(slice.actions.setRequestsError(getErrorMessage(error)));
    }
  };

export const getSingleRequest =
  (id: number): AppThunk =>
  async (dispatch) => {
    const loadId = ++latestSingleRequestLoad;
    dispatch(slice.actions.startSingleRequest());
    dispatch(slice.actions.setLoadingGet({ loading: true }));
    try {
      const request = await api.get<Request>(`${basePath}/${id}`);
      if (loadId !== latestSingleRequestLoad) return;
      dispatch(slice.actions.getSingleRequest({ request }));
    } catch (error) {
      if (loadId === latestSingleRequestLoad)
        dispatch(slice.actions.setSingleRequestError(getErrorMessage(error)));
    } finally {
      if (loadId === latestSingleRequestLoad) {
        dispatch(slice.actions.finishSingleRequest());
        dispatch(slice.actions.setLoadingGet({ loading: false }));
      }
    }
  };
export const addRequest =
  (request): AppThunk =>
  async (dispatch) => {
    const requestResponse = await api.post<Request>(basePath, request);
    dispatch(slice.actions.addRequest({ request: requestResponse }));
    dispatch(slice.actions.incrementPendingCount());
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
  async (dispatch, getState) => {
    const wasPending = getState().requests.requests.content.some(
      (request) => request.id === id && !request.cancelled && !request.workOrder
    );
    const requestResponse = await api.deletes<{ success: boolean }>(
      `${basePath}/${id}`
    );
    const { success } = requestResponse;
    if (success) {
      dispatch(slice.actions.deleteRequest({ id }));
      if (wasPending) dispatch(slice.actions.decrementPendingCount());
    }
    return success;
  };

export const approveRequest =
  (id: number, assetStatus: AssetStatus): AppThunk =>
  async (dispatch) => {
    const workOrder = await api.patch<WorkOrder>(`${basePath}/${id}/approve`, {
      assetStatus
    });
    dispatch(slice.actions.approveRequest({ id, workOrder }));
    dispatch(slice.actions.decrementPendingCount());
    return workOrder.id;
  };
export const cancelRequest =
  (id: number, reason: string): AppThunk =>
  async (dispatch) => {
    const request = await api.patch<Request>(
      `${basePath}/${id}/cancel?reason=${encodeURIComponent(reason)}`,
      {}
    );
    dispatch(slice.actions.cancelRequest({ id }));
    dispatch(slice.actions.decrementPendingCount());
  };
export const getPendingRequestsCount = (): AppThunk => async (dispatch) => {
  const response = await api.get<{ success: boolean; message: string }>(
    `${basePath}/pending`
  );
  dispatch(
    slice.actions.getPendingCount({
      count: Number(response.message)
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
