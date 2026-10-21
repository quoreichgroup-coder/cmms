import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { getInitialPage, Page, SearchCriteria } from '../models/page';
import type { AppThunk } from '../store';
import Part, { PartMiniDTO } from '../models/part';
import api from '../utils/api';
import { revertAll } from '../utils/redux';

const basePath = 'parts';

interface PartState {
  parts: Page<Part>;
  partInfos: { [key: number]: { part?: Part } };
  partsMini: PartMiniDTO[];
  currentPageNum: number;
  lastPage: boolean;
  listLoading: boolean;
  latestListRequestId: number;
  partsMiniLoading: boolean;
  loadingGet: boolean;
  sessionGeneration: number;
}

const initialState: PartState = {
  parts: getInitialPage<Part>(),
  partInfos: {},
  partsMini: [],
  currentPageNum: 0,
  lastPage: true,
  listLoading: false,
  latestListRequestId: 0,
  partsMiniLoading: false,
  loadingGet: false,
  sessionGeneration: 0
};

const isCurrentGeneration = (state: PartState, generation?: number) =>
  generation === undefined || generation === (state.sessionGeneration ?? 0);

const slice = createSlice({
  name: 'parts',
  initialState,
  extraReducers: (builder) =>
    builder.addCase(revertAll, (state) => ({
      ...initialState,
      sessionGeneration: (state.sessionGeneration ?? 0) + 1
    })),
  reducers: {
    getParts(
      state: PartState,
      action: PayloadAction<{
        parts: Page<Part>;
        requestId: number;
        sessionGeneration?: number;
      }>
    ) {
      const { parts, requestId, sessionGeneration } = action.payload;
      if (
        requestId !== state.latestListRequestId ||
        !isCurrentGeneration(state, sessionGeneration)
      )
        return;
      state.parts = parts;
      state.currentPageNum = 0;
      state.lastPage = parts.last;
    },
    getMoreParts(
      state: PartState,
      action: PayloadAction<{
        parts: Page<Part>;
        requestId: number;
        sessionGeneration?: number;
      }>
    ) {
      const { parts, requestId, sessionGeneration } = action.payload;
      if (
        requestId !== state.latestListRequestId ||
        !isCurrentGeneration(state, sessionGeneration)
      )
        return;
      state.parts.content = state.parts.content.concat(parts.content);
      state.currentPageNum = state.currentPageNum + 1;
      state.lastPage = parts.last;
    },
    getPartDetails(
      state: PartState,
      action: PayloadAction<{ part; id: number; sessionGeneration?: number }>
    ) {
      const { part, id, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      if (state.partInfos[id]) {
        state.partInfos[id] = { ...state.partInfos[id], part };
      } else state.partInfos[id] = { part };
    },
    editPart(
      state: PartState,
      action: PayloadAction<{ part: Part; sessionGeneration?: number }>
    ) {
      const { part, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      if (state.partInfos[part.id]) {
        state.partInfos[part.id].part = part;
      } else state.partInfos[part.id] = { part };
    },
    getPartsMini(
      state: PartState,
      action: PayloadAction<{
        parts: PartMiniDTO[];
        sessionGeneration?: number;
      }>
    ) {
      const { parts, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.partsMini = parts;
    },
    setPartsMiniLoading(
      state: PartState,
      action: PayloadAction<{ loading: boolean; sessionGeneration?: number }>
    ) {
      if (!isCurrentGeneration(state, action.payload.sessionGeneration)) return;
      state.partsMiniLoading = action.payload.loading;
    },
    addPart(
      state: PartState,
      action: PayloadAction<{ part: Part; sessionGeneration?: number }>
    ) {
      const { part, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.parts.content = [...state.parts.content, part];
      state.partsMini = [...state.partsMini, part];
    },
    deletePart(
      state: PartState,
      action: PayloadAction<{ id: number; sessionGeneration?: number }>
    ) {
      const { id, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      const partIndex = state.parts.content.findIndex((part) => part.id === id);
      if (partIndex !== -1) state.parts.content.splice(partIndex, 1);
      state.partsMini = state.partsMini.filter((part) => part.id !== id);
      delete state.partInfos[id];
    },
    setLoadingGet(
      state: PartState,
      action: PayloadAction<{ loading: boolean; sessionGeneration?: number }>
    ) {
      if (!isCurrentGeneration(state, action.payload.sessionGeneration)) return;
      const { loading } = action.payload;
      state.loadingGet = loading;
    },
    beginListRequest(state: PartState, action: PayloadAction<number>) {
      state.latestListRequestId = action.payload;
      state.listLoading = true;
    },
    finishListRequest(state: PartState, action: PayloadAction<number>) {
      if (action.payload === state.latestListRequestId) {
        state.listLoading = false;
      }
    }
  }
});

export const reducer = slice.reducer;

let listRequestSequence = 0;

export const getParts =
  (criteria: SearchCriteria): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().parts.sessionGeneration;
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const parts = await api.post<Page<Part>>(`${basePath}/search`, criteria);
      dispatch(slice.actions.getParts({ parts, requestId, sessionGeneration }));
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getMoreParts =
  (criteria: SearchCriteria, pageNum: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().parts.sessionGeneration;
    criteria = { ...criteria, pageNum };
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const parts = await api.post<Page<Part>>(`${basePath}/search`, criteria);
      dispatch(
        slice.actions.getMoreParts({ parts, requestId, sessionGeneration })
      );
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getPartDetails =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().parts.sessionGeneration;
    dispatch(slice.actions.setLoadingGet({ loading: true, sessionGeneration }));
    try {
      const part = await api.get<Part>(`${basePath}/${id}`);
      dispatch(
        slice.actions.getPartDetails({
          id,
          part,
          sessionGeneration
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoadingGet({ loading: false, sessionGeneration })
      );
    }
  };

export const editPart =
  (id: number, part): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().parts.sessionGeneration;
    const partResponse = await api.patch<Part>(`${basePath}/${id}`, part);
    dispatch(slice.actions.editPart({ part: partResponse, sessionGeneration }));
  };
export const getPartsMini = (): AppThunk => async (dispatch, getState) => {
  const sessionGeneration = getState().parts.sessionGeneration;
  dispatch(
    slice.actions.setPartsMiniLoading({ loading: true, sessionGeneration })
  );
  try {
    const parts = await api.get<PartMiniDTO[]>(`${basePath}/mini`);
    dispatch(slice.actions.getPartsMini({ parts, sessionGeneration }));
  } finally {
    dispatch(
      slice.actions.setPartsMiniLoading({ loading: false, sessionGeneration })
    );
  }
};
export const addPart =
  (part): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().parts.sessionGeneration;
    const partResponse = await api.post<Part>(basePath, part);
    dispatch(slice.actions.addPart({ part: partResponse, sessionGeneration }));
    return partResponse;
  };
export const deletePart =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().parts.sessionGeneration;
    const partResponse = await api.deletes<{ success: boolean }>(
      `${basePath}/${id}`
    );
    const { success } = partResponse;
    if (success) {
      dispatch(slice.actions.deletePart({ id, sessionGeneration }));
    }
  };
export default slice;
