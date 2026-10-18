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
  loadingGet: false
};

const slice = createSlice({
  name: 'parts',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getParts(
      state: PartState,
      action: PayloadAction<{ parts: Page<Part>; requestId: number }>
    ) {
      const { parts, requestId } = action.payload;
      if (requestId !== state.latestListRequestId) return;
      state.parts = parts;
      state.currentPageNum = 0;
      state.lastPage = parts.last;
    },
    getMoreParts(
      state: PartState,
      action: PayloadAction<{ parts: Page<Part>; requestId: number }>
    ) {
      const { parts, requestId } = action.payload;
      if (requestId !== state.latestListRequestId) return;
      state.parts.content = state.parts.content.concat(parts.content);
      state.currentPageNum = state.currentPageNum + 1;
      state.lastPage = parts.last;
    },
    getPartDetails(
      state: PartState,
      action: PayloadAction<{ part; id: number }>
    ) {
      const { part, id } = action.payload;
      if (state.partInfos[id]) {
        state.partInfos[id] = { ...state.partInfos[id], part };
      } else state.partInfos[id] = { part };
    },
    editPart(state: PartState, action: PayloadAction<{ part: Part }>) {
      const { part } = action.payload;
      if (state.partInfos[part.id]) {
        state.partInfos[part.id].part = part;
      } else state.partInfos[part.id] = { part };
    },
    getPartsMini(
      state: PartState,
      action: PayloadAction<{ parts: PartMiniDTO[] }>
    ) {
      const { parts } = action.payload;
      state.partsMini = parts;
    },
    setPartsMiniLoading(
      state: PartState,
      action: PayloadAction<{ loading: boolean }>
    ) {
      state.partsMiniLoading = action.payload.loading;
    },
    addPart(state: PartState, action: PayloadAction<{ part: Part }>) {
      const { part } = action.payload;
      state.parts.content = [...state.parts.content, part];
      state.partsMini = [...state.partsMini, part];
    },
    deletePart(state: PartState, action: PayloadAction<{ id: number }>) {
      const { id } = action.payload;
      const partIndex = state.parts.content.findIndex((part) => part.id === id);
      if (partIndex !== -1) state.parts.content.splice(partIndex, 1);
      state.partsMini = state.partsMini.filter((part) => part.id !== id);
      delete state.partInfos[id];
    },
    setLoadingGet(
      state: PartState,
      action: PayloadAction<{ loading: boolean }>
    ) {
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
  async (dispatch) => {
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const parts = await api.post<Page<Part>>(`${basePath}/search`, criteria);
      dispatch(slice.actions.getParts({ parts, requestId }));
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getMoreParts =
  (criteria: SearchCriteria, pageNum: number): AppThunk =>
  async (dispatch) => {
    criteria = { ...criteria, pageNum };
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const parts = await api.post<Page<Part>>(`${basePath}/search`, criteria);
      dispatch(slice.actions.getMoreParts({ parts, requestId }));
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getPartDetails =
  (id: number): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setLoadingGet({ loading: true }));
    try {
      const part = await api.get<Part>(`${basePath}/${id}`);
      dispatch(
        slice.actions.getPartDetails({
          id,
          part
        })
      );
    } finally {
      dispatch(slice.actions.setLoadingGet({ loading: false }));
    }
  };

export const editPart =
  (id: number, part): AppThunk =>
  async (dispatch) => {
    const partResponse = await api.patch<Part>(`${basePath}/${id}`, part);
    dispatch(slice.actions.editPart({ part: partResponse }));
  };
export const getPartsMini = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.setPartsMiniLoading({ loading: true }));
  try {
    const parts = await api.get<PartMiniDTO[]>(`${basePath}/mini`);
    dispatch(slice.actions.getPartsMini({ parts }));
  } finally {
    dispatch(slice.actions.setPartsMiniLoading({ loading: false }));
  }
};
export const addPart =
  (part): AppThunk =>
  async (dispatch) => {
    const partResponse = await api.post<Part>(basePath, part);
    dispatch(slice.actions.addPart({ part: partResponse }));
    return partResponse;
  };
export const deletePart =
  (id: number): AppThunk =>
  async (dispatch) => {
    const partResponse = await api.deletes<{ success: boolean }>(
      `${basePath}/${id}`
    );
    const { success } = partResponse;
    if (success) {
      dispatch(slice.actions.deletePart({ id }));
    }
  };
export default slice;
