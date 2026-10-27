import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from 'src/store';
import { Checklist } from '../models/owns/checklists';
import api from '../utils/api';
import { revertAll } from 'src/utils/redux';

interface ChecklistState {
  checklists: Checklist[];
  loadingGet: boolean;
  loadError: boolean;
  revision: number;
  sessionGeneration: number;
}

const initialState: ChecklistState = {
  checklists: [],
  loadingGet: false,
  loadError: false,
  revision: 0,
  sessionGeneration: 0
};

const slice = createSlice({
  name: 'checklists',
  initialState,
  extraReducers: (builder) =>
    builder.addCase(revertAll, (state) => ({
      ...initialState,
      revision: state.revision + 1,
      sessionGeneration: state.sessionGeneration + 1
    })),
  reducers: {
    getChecklists(
      state: ChecklistState,
      action: PayloadAction<{
        checklists: Checklist[];
        revision: number;
        sessionGeneration: number;
      }>
    ) {
      // The thunk retries if a local mutation happened during the request, so
      // this response is a complete, current snapshot and can replace the list.
      if (
        state.revision === action.payload.revision &&
        state.sessionGeneration === action.payload.sessionGeneration
      ) {
        state.checklists = action.payload.checklists;
      }
    },
    addChecklist(
      state: ChecklistState,
      action: PayloadAction<{ checklist: Checklist }>
    ) {
      const { checklist } = action.payload;
      state.checklists = [
        ...state.checklists.filter((item) => item.id !== checklist.id),
        checklist
      ];
      state.revision += 1;
    },
    editChecklist(
      state: ChecklistState,
      action: PayloadAction<{ checklist: Checklist }>
    ) {
      const { checklist } = action.payload;
      state.checklists = state.checklists.map((checklist1) => {
        if (checklist1.id === checklist.id) {
          return checklist;
        }
        return checklist1;
      });
      state.revision += 1;
    },
    deleteChecklist(
      state: ChecklistState,
      action: PayloadAction<{ id: number }>
    ) {
      const { id } = action.payload;
      const checklistIndex = state.checklists.findIndex(
        (checklist) => checklist.id === id
      );
      if (checklistIndex >= 0) state.checklists.splice(checklistIndex, 1);
      state.revision += 1;
    },
    setLoadingGet(
      state: ChecklistState,
      action: PayloadAction<{ loading: boolean; sessionGeneration: number }>
    ) {
      if (state.sessionGeneration === action.payload.sessionGeneration) {
        state.loadingGet = action.payload.loading;
      }
    },
    setLoadError(
      state: ChecklistState,
      action: PayloadAction<{ error: boolean; sessionGeneration: number }>
    ) {
      if (state.sessionGeneration === action.payload.sessionGeneration) {
        state.loadError = action.payload.error;
      }
    }
  }
});

export const reducer = slice.reducer;

export const getChecklists = (): AppThunk => async (dispatch, getState) => {
  const sessionGeneration = getState().checklists.sessionGeneration;
  try {
    dispatch(slice.actions.setLoadError({ error: false, sessionGeneration }));
    dispatch(slice.actions.setLoadingGet({ loading: true, sessionGeneration }));
    let requestedRevision: number;
    let checklists: Checklist[];
    do {
      if (getState().checklists.sessionGeneration !== sessionGeneration) return;
      requestedRevision = getState().checklists.revision;
      checklists = await api.get<Checklist[]>('checklists');
      if (getState().checklists.sessionGeneration !== sessionGeneration) return;
    } while (getState().checklists.revision !== requestedRevision);
    dispatch(
      slice.actions.getChecklists({
        checklists,
        revision: requestedRevision,
        sessionGeneration
      })
    );
  } catch (error) {
    if (getState().checklists.sessionGeneration !== sessionGeneration) return;
    dispatch(slice.actions.setLoadError({ error: true, sessionGeneration }));
    throw error;
  } finally {
    if (getState().checklists.sessionGeneration === sessionGeneration) {
      dispatch(
        slice.actions.setLoadingGet({ loading: false, sessionGeneration })
      );
    }
  }
};

export const addChecklist =
  (checklist, companySettingsId): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().checklists.sessionGeneration;
    const checklistResponse = await api.post<Checklist>('checklists', {
      ...checklist,
      companySettings: { id: companySettingsId }
    });
    if (getState().checklists.sessionGeneration === sessionGeneration) {
      dispatch(slice.actions.addChecklist({ checklist: checklistResponse }));
    }
  };
export const editChecklist =
  (id: number, checklist): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().checklists.sessionGeneration;
    const checklistResponse = await api.patch<Checklist>(
      `checklists/${id}`,
      checklist
    );
    if (getState().checklists.sessionGeneration === sessionGeneration) {
      dispatch(slice.actions.editChecklist({ checklist: checklistResponse }));
    }
  };
export const deleteChecklist =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().checklists.sessionGeneration;
    const checklistResponse = await api.deletes<{ success: boolean }>(
      `checklists/${id}`
    );
    const { success } = checklistResponse;
    if (
      success &&
      getState().checklists.sessionGeneration === sessionGeneration
    ) {
      dispatch(slice.actions.deleteChecklist({ id }));
    }
    return success;
  };

export default slice;
