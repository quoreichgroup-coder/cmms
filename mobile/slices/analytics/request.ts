import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from '../../store';
import api, { getErrorMessage } from '../../utils/api';
import { revertAll } from '../../utils/redux';
import { getReportDateRange } from '../../utils/analytics';
import {
  RequestsByMonth,
  RequestStats,
  RequestStatsByPriority
} from '../../models/analytics/request';

const basePath = 'analytics/requests';
interface RequestStatstate {
  overview: RequestStats;
  requestsByMonth: RequestsByMonth[];
  requestStatsByPriority: RequestStatsByPriority;
  errors: Partial<Record<Exclude<keyof RequestStatstate, 'loading' | 'errors'>, string>>;
  loading: Omit<Record<keyof RequestStatstate, boolean>, 'loading' | 'errors'>;
}
type Operation = Exclude<keyof RequestStatstate, 'loading' | 'errors'>;

const initialState: RequestStatstate = {
  overview: {
    approved: 0,
    pending: 0,
    cancelled: 0,
    cycleTime: 0
  },
  requestStatsByPriority: {
    none: { count: 0 },
    low: { count: 0 },
    medium: { count: 0 },
    high: { count: 0 }
  },
  requestsByMonth: [],
  errors: {},
  loading: {
    overview: false,
    requestsByMonth: false,
    requestStatsByPriority: false
  }
};

const slice = createSlice({
  name: 'overviewStats',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    setError(state: RequestStatstate, action: PayloadAction<{ operation: Operation; error: string }>) {
      state.errors[action.payload.operation] = action.payload.error;
    },
    getOverview(
      state: RequestStatstate,
      action: PayloadAction<{ stats: RequestStats }>
    ) {
      const { stats } = action.payload;
      state.overview = stats;
    },
    getRequestStatsByPriority(
      state: RequestStatstate,
      action: PayloadAction<{ stats: RequestStatsByPriority }>
    ) {
      const { stats } = action.payload;
      state.requestStatsByPriority = stats;
    },
    getRequestsByMonth(
      state: RequestStatstate,
      action: PayloadAction<{ stats: RequestsByMonth[] }>
    ) {
      const { stats } = action.payload;
      state.requestsByMonth = stats;
    },
    setLoading(
      state: RequestStatstate,
      action: PayloadAction<{ loading: boolean; operation: Operation }>
    ) {
      const { loading, operation } = action.payload;
      state.loading[operation] = loading;
    }
  }
});

export const reducer = slice.reducer;

export const getRequestOverview = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'overview',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'overview', error: '' }));
    try {
  const stats = await api.post<RequestStats>(`${basePath}/overview`, getReportDateRange());
  dispatch(slice.actions.getOverview({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'overview', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'overview',
      loading: false
    })
  );
    }
};
export const getRequestStatsByPriority = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'requestStatsByPriority',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'requestStatsByPriority', error: '' }));
    try {
  const stats = await api.post<RequestStatsByPriority>(`${basePath}/priority`, getReportDateRange());
  dispatch(slice.actions.getRequestStatsByPriority({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'requestStatsByPriority', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'requestStatsByPriority',
      loading: false
    })
  );
    }
};

export const getRequestsByMonth = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'requestsByMonth',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'requestsByMonth', error: '' }));
    try {
  const stats = await api.post<RequestsByMonth[]>(`${basePath}/cycle-time/date`, getReportDateRange());
  dispatch(slice.actions.getRequestsByMonth({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'requestsByMonth', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'requestsByMonth',
      loading: false
    })
  );
    }
};
export default slice;
