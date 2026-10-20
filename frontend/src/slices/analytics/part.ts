import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from 'src/store';
import api, { getErrorMessage } from '../../utils/api';
import {
  PartConsumptionByCategory,
  PartConsumptionByWOCategory,
  PartConsumptionsByAsset,
  PartConsumptionsByDate,
  PartConsumptionsByPart,
  PartStats
} from '../../models/owns/analytics/part';
import { revertAll } from 'src/utils/redux';

const basePath = 'analytics/parts';

const companyQuery = (companyId?: number) =>
  companyId ? `?companyId=${companyId}` : '';

interface PartStatstate {
  consumptionsOverview: PartStats;
  partConsumptionsByDate: PartConsumptionsByDate[];
  partConsumptionsByCategory: PartConsumptionByCategory[];
  partConsumptionsByAsset: PartConsumptionsByAsset[];
  partConsumptionsByPart: PartConsumptionsByPart[];
  partConsumptionByWOCategory: PartConsumptionByWOCategory[];
  errors: Partial<Record<string, string>>;
  loading: Omit<Record<keyof PartStatstate, boolean>, 'loading' | 'errors'>;
}

type Operation = keyof PartStatstate;

const initialState: PartStatstate = {
  consumptionsOverview: {
    totalConsumptionCost: 0,
    consumedCount: 0
  },
  partConsumptionsByDate: [],
  partConsumptionsByAsset: [],
  partConsumptionsByPart: [],
  partConsumptionsByCategory: [],
  partConsumptionByWOCategory: [],
  errors: {},
  loading: {
    consumptionsOverview: false,
    partConsumptionsByDate: false,
    partConsumptionsByAsset: false,
    partConsumptionsByPart: false,
    partConsumptionsByCategory: false,
    partConsumptionByWOCategory: false
  }
};

const slice = createSlice({
  name: 'overviewStats',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getOverview(
      state: PartStatstate,
      action: PayloadAction<{ stats: PartStats }>
    ) {
      const { stats } = action.payload;
      state.consumptionsOverview = stats;
    },
    getPartConsumptionsByDate(
      state: PartStatstate,
      action: PayloadAction<{ stats: PartConsumptionsByDate[] }>
    ) {
      const { stats } = action.payload;
      state.partConsumptionsByDate = stats;
    },
    getPartConsumptionsByAsset(
      state: PartStatstate,
      action: PayloadAction<{ stats: PartConsumptionsByAsset[] }>
    ) {
      const { stats } = action.payload;
      state.partConsumptionsByAsset = stats;
    },
    getPartConsumptionsByPart(
      state: PartStatstate,
      action: PayloadAction<{ stats: PartConsumptionsByPart[] }>
    ) {
      const { stats } = action.payload;
      state.partConsumptionsByPart = stats;
    },
    getPartConsumptionsByCategory(
      state: PartStatstate,
      action: PayloadAction<{ stats: PartConsumptionByCategory[] }>
    ) {
      const { stats } = action.payload;
      state.partConsumptionsByCategory = stats;
    },
    getPartConsumptionsByWOCategory(
      state: PartStatstate,
      action: PayloadAction<{ stats: PartConsumptionByWOCategory[] }>
    ) {
      const { stats } = action.payload;
      state.partConsumptionByWOCategory = stats;
    },
    setError(
      state,
      action: PayloadAction<{ operation: string; message: string }>
    ) {
      state.errors[action.payload.operation] = action.payload.message;
    },
    setLoading(
      state: PartStatstate,
      action: PayloadAction<{ loading: boolean; operation: Operation }>
    ) {
      const { loading, operation } = action.payload;
      state.loading[operation] = loading;
      if (loading) delete state.errors[operation];
    }
  }
});

export const reducer = slice.reducer;

export const getPartConsumptionOverview =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'consumptionsOverview',
        loading: true
      })
    );
    try {
      const stats = await api.post<PartStats>(
        `${basePath}/consumptions/overview${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getOverview({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'consumptionsOverview',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'consumptionsOverview',
          loading: false
        })
      );
    }
  };
export const getPartConsumptionsByDate =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'partConsumptionsByDate',
        loading: true
      })
    );
    try {
      const stats = await api.post<PartConsumptionsByDate[]>(
        `${basePath}/consumptions/date${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getPartConsumptionsByDate({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'partConsumptionsByDate',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'partConsumptionsByDate',
          loading: false
        })
      );
    }
  };

export const getPartConsumptionsByAsset =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'partConsumptionsByAsset',
        loading: true
      })
    );
    try {
      const stats = await api.post<PartConsumptionsByAsset[]>(
        `${basePath}/consumptions/assets${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getPartConsumptionsByAsset({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'partConsumptionsByAsset',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'partConsumptionsByAsset',
          loading: false
        })
      );
    }
  };

export const getPartConsumptionsByPart =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'partConsumptionsByPart',
        loading: true
      })
    );
    try {
      const stats = await api.post<PartConsumptionsByPart[]>(
        `${basePath}/consumptions/pareto${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getPartConsumptionsByPart({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'partConsumptionsByPart',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'partConsumptionsByPart',
          loading: false
        })
      );
    }
  };

export const getPartConsumptionsByPartCategory =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'partConsumptionsByCategory',
        loading: true
      })
    );
    try {
      const stats = await api.post<PartConsumptionByCategory[]>(
        `${basePath}/consumptions/parts-category${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getPartConsumptionsByCategory({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'partConsumptionsByCategory',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'partConsumptionsByCategory',
          loading: false
        })
      );
    }
  };
export const getPartConsumptionsByWOCategory =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'partConsumptionByWOCategory',
        loading: true
      })
    );
    try {
      const stats = await api.post<PartConsumptionByWOCategory[]>(
        `${basePath}/consumptions/work-order-category${companyQuery(
          companyId
        )}`,
        {
          start,
          end
        }
      );
      dispatch(slice.actions.getPartConsumptionsByWOCategory({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'partConsumptionByWOCategory',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'partConsumptionByWOCategory',
          loading: false
        })
      );
    }
  };

export default slice;
