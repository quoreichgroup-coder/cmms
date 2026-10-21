import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from 'src/store';
import {
  RequestPortal,
  RequestPortalPostDTO
} from '../models/owns/requestPortal';
import api, { authHeader } from '../utils/api';
import { getInitialPage, Page, SearchCriteria } from '../models/owns/page';
import { revertAll } from 'src/utils/redux';

const basePath = 'request-portals';

interface RequestPortalState {
  requestPortals: Page<RequestPortal>;
  singleRequestPortal: RequestPortal;
  loadingGet: boolean;
  loadingPublicGet: boolean;
  publicGetError: boolean;
  activePublicUuid: string | null;
}

const initialState: RequestPortalState = {
  requestPortals: getInitialPage<RequestPortal>(),
  singleRequestPortal: null,
  loadingGet: false,
  loadingPublicGet: false,
  publicGetError: false,
  activePublicUuid: null
};

const slice = createSlice({
  name: 'requestPortals',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getRequestPortals(
      state: RequestPortalState,
      action: PayloadAction<{ requestPortals: Page<RequestPortal> }>
    ) {
      const { requestPortals } = action.payload;
      state.requestPortals = requestPortals;
    },
    getSingleRequestPortal(
      state: RequestPortalState,
      action: PayloadAction<{ requestPortal: RequestPortal }>
    ) {
      const { requestPortal } = action.payload;
      state.singleRequestPortal = requestPortal;
    },
    editRequestPortal(
      state: RequestPortalState,
      action: PayloadAction<{ requestPortal: RequestPortal }>
    ) {
      const { requestPortal } = action.payload;
      const inContent = state.requestPortals.content.some(
        (requestPortal1) => requestPortal1.id === requestPortal.id
      );
      if (inContent) {
        state.requestPortals.content = state.requestPortals.content.map(
          (requestPortal1) => {
            if (requestPortal1.id === requestPortal.id) {
              return requestPortal;
            }
            return requestPortal1;
          }
        );
      } else {
        state.singleRequestPortal = requestPortal;
      }
    },
    addRequestPortal(
      state: RequestPortalState,
      action: PayloadAction<{ requestPortal: RequestPortal }>
    ) {
      const { requestPortal } = action.payload;
      state.requestPortals.content = [
        requestPortal,
        ...state.requestPortals.content
      ];
    },
    deleteRequestPortal(
      state: RequestPortalState,
      action: PayloadAction<{ id: number }>
    ) {
      const { id } = action.payload;
      const requestPortalIndex = state.requestPortals.content.findIndex(
        (requestPortal) => requestPortal.id === id
      );
      state.requestPortals.content.splice(requestPortalIndex, 1);
    },
    setLoadingGet(
      state: RequestPortalState,
      action: PayloadAction<{ loading: boolean }>
    ) {
      const { loading } = action.payload;
      state.loadingGet = loading;
    },
    startPublicRequestPortalLoad(
      state: RequestPortalState,
      action: PayloadAction<{ uuid: string }>
    ) {
      state.activePublicUuid = action.payload.uuid;
      state.singleRequestPortal = null;
      state.loadingPublicGet = true;
      state.publicGetError = false;
    },
    failPublicRequestPortalLoad(
      state: RequestPortalState,
      action: PayloadAction<{ uuid: string }>
    ) {
      if (state.activePublicUuid !== action.payload.uuid) return;
      state.loadingPublicGet = false;
      state.publicGetError = true;
    },
    finishPublicRequestPortalLoad(
      state: RequestPortalState,
      action: PayloadAction<{ uuid: string }>
    ) {
      if (state.activePublicUuid === action.payload.uuid) {
        state.loadingPublicGet = false;
      }
    },
    clearPublicRequestPortal(
      state: RequestPortalState,
      action: PayloadAction<{ uuid: string }>
    ) {
      if (state.activePublicUuid !== action.payload.uuid) return;
      state.singleRequestPortal = null;
      state.activePublicUuid = null;
      state.loadingPublicGet = false;
      state.publicGetError = false;
    },
    getPublicRequestPortal(
      state: RequestPortalState,
      action: PayloadAction<{ uuid: string; requestPortal: RequestPortal }>
    ) {
      if (state.activePublicUuid !== action.payload.uuid) return;
      state.singleRequestPortal = action.payload.requestPortal;
      state.publicGetError = false;
    },
    clearSingleRequestPortal(
      state: RequestPortalState,
      action: PayloadAction<{}>
    ) {
      state.singleRequestPortal = null;
    }
  }
});

export const reducer = slice.reducer;

export const getRequestPortals =
  (criteria: SearchCriteria): AppThunk =>
  async (dispatch) => {
    try {
      dispatch(slice.actions.setLoadingGet({ loading: true }));
      const requestPortals = await api.post<Page<RequestPortal>>(
        `${basePath}/search`,
        criteria
      );
      dispatch(slice.actions.getRequestPortals({ requestPortals }));
    } finally {
      dispatch(slice.actions.setLoadingGet({ loading: false }));
    }
  };

export const getSingleRequestPortal =
  (id: number): AppThunk =>
  async (dispatch) => {
    try {
      dispatch(slice.actions.setLoadingGet({ loading: true }));
      const requestPortal = await api.get<RequestPortal>(`${basePath}/${id}`);
      dispatch(slice.actions.getSingleRequestPortal({ requestPortal }));
      return requestPortal as any;
    } finally {
      dispatch(slice.actions.setLoadingGet({ loading: false }));
    }
  };

export const editRequestPortal =
  (id: number, requestPortal: RequestPortalPostDTO): AppThunk =>
  async (dispatch) => {
    const requestPortalResponse = await api.patch<RequestPortal>(
      `${basePath}/${id}`,
      requestPortal
    );
    dispatch(
      slice.actions.editRequestPortal({ requestPortal: requestPortalResponse })
    );
  };

export const addRequestPortal =
  (requestPortal: RequestPortalPostDTO): AppThunk =>
  async (dispatch) => {
    const requestPortalResponse = await api.post<RequestPortal>(
      basePath,
      requestPortal
    );
    dispatch(
      slice.actions.addRequestPortal({ requestPortal: requestPortalResponse })
    );
  };
export const deleteRequestPortal =
  (id: number): AppThunk =>
  async (dispatch) => {
    const requestPortalResponse = await api.deletes<{ success: boolean }>(
      `${basePath}/${id}`
    );
    const { success } = requestPortalResponse;
    if (success) {
      dispatch(slice.actions.deleteRequestPortal({ id }));
    }
    return success;
  };
export const clearSingleRequestPortal = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.clearSingleRequestPortal({}));
};

export const getRequestPortalPublic =
  (uuid: string): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.startPublicRequestPortalLoad({ uuid }));
    try {
      const requestPortal = await api.get<RequestPortal>(
        `${basePath}/public/${uuid}`,
        { headers: authHeader(true) }
      );
      dispatch(slice.actions.getPublicRequestPortal({ uuid, requestPortal }));
    } catch (error) {
      dispatch(slice.actions.failPublicRequestPortalLoad({ uuid }));
      throw error;
    } finally {
      dispatch(slice.actions.finishPublicRequestPortalLoad({ uuid }));
    }
  };

export const clearPublicRequestPortal =
  (uuid: string): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.clearPublicRequestPortal({ uuid }));
  };

export default slice;
