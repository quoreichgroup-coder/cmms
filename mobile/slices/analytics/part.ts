import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from '../../store';
import api, { getErrorMessage } from '../../utils/api';
import { revertAll } from '../../utils/redux';
import { getReportDateRange } from '../../utils/analytics';
import {
  PartConsumptionsByMonth,
  PartStats
} from '../../models/analytics/part';

const basePath = 'analytics/parts';
interface PartStatstate {
  consumptionsOverview: PartStats;
  partConsumptionsByMonth: PartConsumptionsByMonth[];
  errors: Partial<Record<Exclude<keyof PartStatstate, 'loading' | 'errors'>, string>>;
  loading: Omit<Record<keyof PartStatstate, boolean>, 'loading' | 'errors'>;
}
type Operation = Exclude<keyof PartStatstate, 'loading' | 'errors'>;

const initialState: PartStatstate = {
  consumptionsOverview: {
    totalConsumptionCost: 0,
    consumedCount: 0
  },
  partConsumptionsByMonth: [],
  errors: {},
  loading: {
    consumptionsOverview: false,
    partConsumptionsByMonth: false
  }
};

const slice = createSlice({
  name: 'overviewStats',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    setError(state: PartStatstate, action: PayloadAction<{ operation: Operation; error: string }>) {
      state.errors[action.payload.operation] = action.payload.error;
    },
    getOverview(
      state: PartStatstate,
      action: PayloadAction<{ stats: PartStats }>
    ) {
      const { stats } = action.payload;
      state.consumptionsOverview = stats;
    },
    getPartConsumptionsByMonth(
      state: PartStatstate,
      action: PayloadAction<{ stats: PartConsumptionsByMonth[] }>
    ) {
      const { stats } = action.payload;
      state.partConsumptionsByMonth = stats;
    },
    setLoading(
      state: PartStatstate,
      action: PayloadAction<{ loading: boolean; operation: Operation }>
    ) {
      const { loading, operation } = action.payload;
      state.loading[operation] = loading;
    }
  }
});

export const reducer = slice.reducer;

export const getPartConsumptionOverview = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'consumptionsOverview',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'consumptionsOverview', error: '' }));
    try {
  const stats = await api.post<PartStats>(`${basePath}/consumptions/overview`, getReportDateRange());
  dispatch(slice.actions.getOverview({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'consumptionsOverview', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'consumptionsOverview',
      loading: false
    })
  );
    }
};
export const getPartConsumptionsByMonth = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'partConsumptionsByMonth',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'partConsumptionsByMonth', error: '' }));
    try {
  const stats = await api.post<PartConsumptionsByMonth[]>(`${basePath}/consumptions/date`, getReportDateRange());
  dispatch(slice.actions.getPartConsumptionsByMonth({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'partConsumptionsByMonth', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'partConsumptionsByMonth',
      loading: false
    })
  );
    }
};

export default slice;
