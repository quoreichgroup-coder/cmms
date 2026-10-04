import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from '../../store';
import api, { getErrorMessage } from '../../utils/api';
import { revertAll } from '../../utils/redux';
import { getReportDateRange } from '../../utils/analytics';
import {
  IncompleteWOByAsset,
  IncompleteWOByUser,
  IncompleteWoStats,
  MobileWOStats,
  MobileWOStatsExtended,
  WOCostByDate,
  WOCostsAndTime,
  WOCountsByCategory,
  WOCountsByUser,
  WOCountsByWeek,
  WOHours,
  WoOverviewStats,
  WOStatsByPriority,
  WOStatsByStatus,
  WOTimeByWeek
} from '../../models/analytics/workOrder';

const basePath = 'analytics/work-orders';

interface WOStatstate {
  overview: WoOverviewStats;
  incompleteOverview: IncompleteWoStats;
  incompleteByPriority: WOStatsByPriority;
  incompleteByStatus: WOStatsByStatus;
  incompleteByAsset: IncompleteWOByAsset[];
  incompleteByUser: IncompleteWOByUser[];
  completeByPrimaryUser: WOCountsByUser[];
  completeByCompletedBy: WOCountsByUser[];
  completeByCategory: WOCountsByCategory[];
  completeByPriority: { [key: string]: number };
  completeByWeek: WOCountsByWeek[];
  completeTimesByWeek: WOTimeByWeek[];
  completeCosts: WOCostsAndTime;
  completeCostsByMonth: WOCostByDate[];
  hours: WOHours;
  mobileOverview: MobileWOStats;
  mobileExtended: MobileWOStatsExtended;
  errors: Partial<Record<Exclude<keyof WOStatstate, 'loading' | 'errors'>, string>>;
  loading: Omit<Record<keyof WOStatstate, boolean>, 'loading' | 'errors'>;
}

type Operation = Exclude<keyof WOStatstate, 'loading' | 'errors'>;

const initialState: WOStatstate = {
  overview: {
    total: 0,
    complete: 0,
    compliant: 0,
    avgCycleTime: 0
  },
  completeCosts: {
    total: 0,
    average: 0,
    additionalCost: 0,
    laborCost: 0,
    partCost: 0,
    laborTime: 0
  },
  incompleteByPriority: {
    none: {
      count: 0,
      estimatedHours: 0
    },
    high: {
      count: 0,
      estimatedHours: 0
    },
    medium: {
      count: 0,
      estimatedHours: 0
    },
    low: {
      count: 0,
      estimatedHours: 0
    }
  },
  incompleteByStatus: {
    complete: 0,
    inProgress: 0,
    onHold: 0,
    open: 0
  },
  hours: {
    estimated: 0,
    actual: 0
  },
  incompleteOverview: {
    total: 0,
    averageAge: 0
  },
  completeByPrimaryUser: [],
  completeByCompletedBy: [],
  completeByCategory: [],
  completeByPriority: {},
  completeByWeek: [],
  completeTimesByWeek: [],
  incompleteByAsset: [],
  incompleteByUser: [],
  completeCostsByMonth: [],
  mobileOverview: {
    open: 0,
    onHold: 0,
    inProgress: 0,
    complete: 0,
    today: 0,
    high: 0
  },
  mobileExtended: {
    complete: 0,
    completeWeek: 0,
    compliantRateWeek: 1,
    compliantRate: 1
  },
  errors: {},
  loading: {
    overview: false,
    incompleteByPriority: false,
    incompleteByStatus: false,
    completeByPrimaryUser: false,
    completeByCompletedBy: false,
    completeByCategory: false,
    completeByPriority: false,
    completeCosts: false,
    completeByWeek: false,
    hours: false,
    completeTimesByWeek: false,
    incompleteOverview: false,
    incompleteByAsset: false,
    incompleteByUser: false,
    completeCostsByMonth: false,
    mobileOverview: false,
    mobileExtended: false
  }
};

const slice = createSlice({
  name: 'overviewStats',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    setError(state: WOStatstate, action: PayloadAction<{ operation: Operation; error: string }>) {
      state.errors[action.payload.operation] = action.payload.error;
    },
    getStats(
      state: WOStatstate,
      action: PayloadAction<{ overviewStats: WoOverviewStats }>
    ) {
      const { overviewStats } = action.payload;
      state.overview = overviewStats;
    },
    getIncompleteStats(
      state: WOStatstate,
      action: PayloadAction<{ overviewStats: IncompleteWoStats }>
    ) {
      const { overviewStats } = action.payload;
      state.incompleteOverview = overviewStats;
    },
    getIncompleteByPriority(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOStatsByPriority }>
    ) {
      const { stats } = action.payload;
      state.incompleteByPriority = stats;
    },
    getIncompleteByStatus(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOStatsByStatus }>
    ) {
      const { stats } = action.payload;
      state.incompleteByStatus = stats;
    },
    getIncompleteByAsset(
      state: WOStatstate,
      action: PayloadAction<{ stats: IncompleteWOByAsset[] }>
    ) {
      const { stats } = action.payload;
      state.incompleteByAsset = stats;
    },
    getIncompleteByUser(
      state: WOStatstate,
      action: PayloadAction<{ stats: IncompleteWOByUser[] }>
    ) {
      const { stats } = action.payload;
      state.incompleteByUser = stats;
    },
    getWOHours(state: WOStatstate, action: PayloadAction<{ stats: WOHours }>) {
      const { stats } = action.payload;
      state.hours = stats;
    },
    getCompleteCosts(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOCostsAndTime }>
    ) {
      const { stats } = action.payload;
      state.completeCosts = stats;
    },
    getCountsByUser(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOCountsByUser[] }>
    ) {
      const { stats } = action.payload;
      state.completeByPrimaryUser = stats;
    },
    getCountsByCompletedBy(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOCountsByUser[] }>
    ) {
      const { stats } = action.payload;
      state.completeByCompletedBy = stats;
    },
    getCompleteByPriority(
      state: WOStatstate,
      action: PayloadAction<{ stats: { [key: string]: number } }>
    ) {
      const { stats } = action.payload;
      state.completeByPriority = stats;
    },
    getCompleteByWeek(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOCountsByWeek[] }>
    ) {
      const { stats } = action.payload;
      state.completeByWeek = stats;
    },
    getCompleteCostsByMonth(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOCostByDate[] }>
    ) {
      const { stats } = action.payload;
      state.completeCostsByMonth = stats;
    },
    getCompleteTimesByWeek(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOTimeByWeek[] }>
    ) {
      const { stats } = action.payload;
      state.completeTimesByWeek = stats;
    },
    getCountsByCategory(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOCountsByCategory[] }>
    ) {
      const { stats } = action.payload;
      state.completeByCategory = stats;
    },
    getMobileOverview(
      state: WOStatstate,
      action: PayloadAction<{ stats: MobileWOStats }>
    ) {
      const { stats } = action.payload;
      state.mobileOverview = stats;
    },
    getMobileExtendedOverview(
      state: WOStatstate,
      action: PayloadAction<{ stats: MobileWOStatsExtended }>
    ) {
      const { stats } = action.payload;
      state.mobileExtended = stats;
    },
    setLoading(
      state: WOStatstate,
      action: PayloadAction<{ loading: boolean; operation: Operation }>
    ) {
      const { loading, operation } = action.payload;
      state.loading[operation] = loading;
    }
  }
});

export const reducer = slice.reducer;

export const getOverviewStats = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.setLoading({ operation: 'overview', loading: true }));
    dispatch(slice.actions.setError({ operation: 'overview', error: '' }));
    try {
  const overviewStats = await api.post<WoOverviewStats>(`${basePath}/complete/overview`, getReportDateRange());
  dispatch(slice.actions.getStats({ overviewStats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'overview', error: getErrorMessage(error) }));
    } finally {
      dispatch(slice.actions.setLoading({ operation: 'overview', loading: false }));
    }
};
export const getMobileOverviewStats =
  (assignedToMe: boolean): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({ operation: 'mobileOverview', loading: true })
    );
    dispatch(slice.actions.setError({ operation: 'mobileOverview', error: '' }));
    try {
    const overviewStats = await api.get<MobileWOStats>(
      `${basePath}/mobile/overview?assignedToMe=${assignedToMe}`
    );
    dispatch(slice.actions.getMobileOverview({ stats: overviewStats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'mobileOverview', error: getErrorMessage(error) }));
    } finally {
      dispatch(
      slice.actions.setLoading({ operation: 'mobileOverview', loading: false })
    );
    }
  };
export const getMobileExtendedStats = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({ operation: 'mobileExtended', loading: true })
  );
    dispatch(slice.actions.setError({ operation: 'mobileExtended', error: '' }));
    try {
  const stats = await api.get<MobileWOStatsExtended>(
    `${basePath}/mobile/complete-compliant`
  );
  dispatch(slice.actions.getMobileExtendedOverview({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'mobileExtended', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({ operation: 'mobileExtended', loading: false })
  );
    }
};
export const getIncompleteStats = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.setLoading({ operation: 'incompleteOverview', loading: true }));
    dispatch(slice.actions.setError({ operation: 'incompleteOverview', error: '' }));
    try {
  const overviewStats = await api.post<IncompleteWoStats>(`${basePath}/incomplete/overview`, getReportDateRange());
  dispatch(slice.actions.getIncompleteStats({ overviewStats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'incompleteOverview', error: getErrorMessage(error) }));
    } finally {
      dispatch(slice.actions.setLoading({ operation: 'incompleteOverview', loading: false }));
    }
};
export const getIncompleteByPriority = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'incompleteByPriority',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'incompleteByPriority', error: '' }));
    try {
  const stats = await api.post<WOStatsByPriority>(`${basePath}/incomplete/priority`, getReportDateRange());
  dispatch(slice.actions.getIncompleteByPriority({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'incompleteByPriority', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'incompleteByPriority',
      loading: false
    })
  );
    }
};
export const getIncompleteByStatus = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'incompleteByStatus',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'incompleteByStatus', error: '' }));
    try {
  const stats = await api.post<WOStatsByStatus>(`${basePath}/incomplete/statuses`, getReportDateRange());
  dispatch(slice.actions.getIncompleteByStatus({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'incompleteByStatus', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'incompleteByStatus',
      loading: false
    })
  );
    }
};
export const getWOHours = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'hours',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'hours', error: '' }));
    try {
  const stats = await api.post<WOHours>(`${basePath}/hours`, getReportDateRange());
  dispatch(slice.actions.getWOHours({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'hours', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'hours',
      loading: false
    })
  );
    }
};
export const getCountsByUser = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'completeByPrimaryUser',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'completeByPrimaryUser', error: '' }));
    try {
  const stats = await api.post<WOCountsByUser[]>(`${basePath}/complete/counts/primaryUser`, getReportDateRange());
  dispatch(slice.actions.getCountsByUser({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'completeByPrimaryUser', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'completeByPrimaryUser',
      loading: false
    })
  );
    }
};

export const getCompleteByCompletedBy = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'completeByCompletedBy',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'completeByCompletedBy', error: '' }));
    try {
  const stats = await api.post<WOCountsByUser[]>(`${basePath}/complete/counts/completedBy`, getReportDateRange());
  dispatch(slice.actions.getCountsByCompletedBy({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'completeByCompletedBy', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'completeByCompletedBy',
      loading: false
    })
  );
    }
};
export const getCompleteByPriority = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'completeByPriority',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'completeByPriority', error: '' }));
    try {
  const stats = await api.post<{ [key: string]: number }>(`${basePath}/complete/counts/priority`, getReportDateRange());
  dispatch(slice.actions.getCompleteByPriority({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'completeByPriority', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'completeByPriority',
      loading: false
    })
  );
    }
};
export const getCompleteByCategory = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'completeByCategory',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'completeByCategory', error: '' }));
    try {
  const stats = await api.post<WOCountsByCategory[]>(`${basePath}/complete/counts/category`, getReportDateRange());
  dispatch(slice.actions.getCountsByCategory({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'completeByCategory', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'completeByCategory',
      loading: false
    })
  );
    }
};
export const getCompleteCosts = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'completeCosts',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'completeCosts', error: '' }));
    try {
  const stats = await api.post<WOCostsAndTime>(`${basePath}/complete/costs-time`, getReportDateRange());
  dispatch(slice.actions.getCompleteCosts({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'completeCosts', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'completeCosts',
      loading: false
    })
  );
    }
};
export const getCompleteByWeek = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'completeByWeek',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'completeByWeek', error: '' }));
    try {
  const stats = await api.get<WOCountsByWeek[]>(
    `${basePath}/complete/counts/week`
  );
  dispatch(slice.actions.getCompleteByWeek({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'completeByWeek', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'completeByWeek',
      loading: false
    })
  );
    }
};
export const getCompleteTimesByWeek = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'completeTimesByWeek',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'completeTimesByWeek', error: '' }));
    try {
  const stats = await api.get<WOTimeByWeek[]>(`${basePath}/complete/time/week`);
  dispatch(slice.actions.getCompleteTimesByWeek({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'completeTimesByWeek', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'completeTimesByWeek',
      loading: false
    })
  );
    }
};
export const getIncompleteByAsset = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'incompleteByAsset',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'incompleteByAsset', error: '' }));
    try {
  const stats = await api.post<IncompleteWOByAsset[]>(`${basePath}/incomplete/age/assets`, getReportDateRange());
  dispatch(slice.actions.getIncompleteByAsset({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'incompleteByAsset', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'incompleteByAsset',
      loading: false
    })
  );
    }
};
export const getIncompleteByUser = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'incompleteByUser',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'incompleteByUser', error: '' }));
    try {
  const stats = await api.post<IncompleteWOByUser[]>(`${basePath}/incomplete/age/users`, getReportDateRange());
  dispatch(slice.actions.getIncompleteByUser({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'incompleteByUser', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'incompleteByUser',
      loading: false
    })
  );
    }
};
export const getCompleteCostsByMonth = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'completeCostsByMonth',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'completeCostsByMonth', error: '' }));
    try {
  const stats = await api.post<WOCostByDate[]>(`${basePath}/complete/costs/date`, getReportDateRange());
  dispatch(slice.actions.getCompleteCostsByMonth({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'completeCostsByMonth', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'completeCostsByMonth',
      loading: false
    })
  );
    }
};
export default slice;
