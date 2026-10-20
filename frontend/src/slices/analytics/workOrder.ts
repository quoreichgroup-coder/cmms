import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from 'src/store';
import api, { getErrorMessage } from '../../utils/api';
import {
  IncompleteWOByAsset,
  IncompleteWOByUser,
  IncompleteWoStats,
  WOCostByDate,
  WOCostsAndTime,
  WOCountsByCategory,
  WOCountsByUser,
  WOCountsByWeek,
  WOHours,
  WoOverviewStats,
  WOStatsByPriority,
  WOStatsByStatus,
  WOStatusesByDate,
  WOTimeByWeek
} from '../../models/owns/analytics/workOrder';
import { revertAll } from 'src/utils/redux';

const basePath = 'analytics/work-orders';
let analyticsRequestId = 0;

const companyQuery = (companyId?: number) =>
  companyId ? `?companyId=${companyId}` : '';

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
  completeCostsByDate: WOCostByDate[];
  statusesByDate: WOStatusesByDate[];
  hours: WOHours;
  errors: Partial<Record<string, string>>;
  requestIds: Record<string, number>;
  loading: Omit<
    Record<keyof WOStatstate, boolean>,
    'loading' | 'errors' | 'requestIds'
  >;
}

type Operation = keyof WOStatstate;

const initialState: WOStatstate = {
  overview: {
    total: 0,
    complete: 0,
    compliant: 0,
    avgCycleTime: 0,
    mtta: 0
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
  completeCostsByDate: [],
  statusesByDate: [],
  errors: {},
  requestIds: {},
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
    completeCostsByDate: false,
    statusesByDate: false
  }
};

const slice = createSlice({
  name: 'overviewStats',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getStats(
      state: WOStatstate,
      action: PayloadAction<{
        overviewStats: WoOverviewStats;
        requestId?: number;
      }>
    ) {
      if (
        action.payload.requestId !== undefined &&
        state.requestIds.overview !== action.payload.requestId
      )
        return;
      const { overviewStats } = action.payload;
      state.overview = overviewStats;
    },
    getIncompleteStats(
      state: WOStatstate,
      action: PayloadAction<{
        overviewStats: IncompleteWoStats;
        requestId?: number;
      }>
    ) {
      if (
        action.payload.requestId !== undefined &&
        state.requestIds.incompleteOverview !== action.payload.requestId
      )
        return;
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
    getWOHours(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOHours; requestId?: number }>
    ) {
      if (
        action.payload.requestId !== undefined &&
        state.requestIds.hours !== action.payload.requestId
      )
        return;
      const { stats } = action.payload;
      state.hours = stats;
    },
    getCompleteCosts(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOCostsAndTime; requestId?: number }>
    ) {
      if (
        action.payload.requestId !== undefined &&
        state.requestIds.completeCosts !== action.payload.requestId
      )
        return;
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
    getCompleteCostsByDate(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOCostByDate[]; requestId?: number }>
    ) {
      if (
        action.payload.requestId !== undefined &&
        state.requestIds.completeCostsByDate !== action.payload.requestId
      )
        return;
      const { stats } = action.payload;
      state.completeCostsByDate = stats;
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
    getStatusesByDate(
      state: WOStatstate,
      action: PayloadAction<{ stats: WOStatusesByDate[]; requestId?: number }>
    ) {
      if (
        action.payload.requestId !== undefined &&
        state.requestIds.statusesByDate !== action.payload.requestId
      )
        return;
      const { stats } = action.payload;
      state.statusesByDate = stats;
    },
    setError(
      state,
      action: PayloadAction<{
        operation: string;
        message: string;
        requestId?: number;
      }>
    ) {
      if (
        action.payload.requestId !== undefined &&
        state.requestIds[action.payload.operation] !== action.payload.requestId
      )
        return;
      state.errors[action.payload.operation] = action.payload.message;
    },
    setLoading(
      state: WOStatstate,
      action: PayloadAction<{
        loading: boolean;
        operation: Operation;
        requestId?: number;
      }>
    ) {
      const { loading, operation, requestId } = action.payload;
      if (requestId !== undefined) {
        if (loading) {
          state.requestIds[operation] = requestId;
        } else if (state.requestIds[operation] !== requestId) return;
      }
      state.loading[operation] = loading;
      if (loading) delete state.errors[operation];
    }
  }
});

export const reducer = slice.reducer;

export const getOverviewStats =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    const requestId = ++analyticsRequestId;
    dispatch(
      slice.actions.setLoading({
        operation: 'overview',
        loading: true,
        requestId
      })
    );
    try {
      const overviewStats = await api.post<WoOverviewStats>(
        `${basePath}/complete/overview${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getStats({ overviewStats, requestId }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'overview',
          requestId,
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'overview',
          loading: false,
          requestId
        })
      );
    }
  };
export const getIncompleteStats =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    const requestId = ++analyticsRequestId;
    dispatch(
      slice.actions.setLoading({
        operation: 'incompleteOverview',
        loading: true,
        requestId
      })
    );
    try {
      const overviewStats = await api.post<IncompleteWoStats>(
        `${basePath}/incomplete/overview${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getIncompleteStats({ overviewStats, requestId }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'incompleteOverview',
          requestId,
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'incompleteOverview',
          loading: false,
          requestId
        })
      );
    }
  };
export const getIncompleteByPriority =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'incompleteByPriority',
        loading: true
      })
    );
    try {
      const stats = await api.post<WOStatsByPriority>(
        `${basePath}/incomplete/priority${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getIncompleteByPriority({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'incompleteByPriority',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'incompleteByPriority',
          loading: false
        })
      );
    }
  };
export const getIncompleteByStatus =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'incompleteByStatus',
        loading: true
      })
    );
    try {
      const stats = await api.post<WOStatsByStatus>(
        `${basePath}/incomplete/statuses${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getIncompleteByStatus({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'incompleteByStatus',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'incompleteByStatus',
          loading: false
        })
      );
    }
  };
export const getWOHours =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    const requestId = ++analyticsRequestId;
    dispatch(
      slice.actions.setLoading({
        operation: 'hours',
        loading: true,
        requestId
      })
    );
    try {
      const stats = await api.post<WOHours>(
        `${basePath}/hours${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getWOHours({ stats, requestId }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'hours',
          requestId,
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'hours',
          loading: false,
          requestId
        })
      );
    }
  };
export const getCountsByUser =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'completeByPrimaryUser',
        loading: true
      })
    );
    try {
      const stats = await api.post<WOCountsByUser[]>(
        `${basePath}/complete/counts/primaryUser${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getCountsByUser({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'completeByPrimaryUser',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'completeByPrimaryUser',
          loading: false
        })
      );
    }
  };

export const getCompleteByCompletedBy =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'completeByCompletedBy',
        loading: true
      })
    );
    try {
      const stats = await api.post<WOCountsByUser[]>(
        `${basePath}/complete/counts/completedBy${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getCountsByCompletedBy({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'completeByCompletedBy',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'completeByCompletedBy',
          loading: false
        })
      );
    }
  };
export const getCompleteByPriority =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'completeByPriority',
        loading: true
      })
    );
    try {
      const stats = await api.post<{ [key: string]: number }>(
        `${basePath}/complete/counts/priority${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getCompleteByPriority({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'completeByPriority',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'completeByPriority',
          loading: false
        })
      );
    }
  };
export const getCompleteByCategory =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'completeByCategory',
        loading: true
      })
    );
    try {
      const stats = await api.post<WOCountsByCategory[]>(
        `${basePath}/complete/counts/category${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getCountsByCategory({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'completeByCategory',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'completeByCategory',
          loading: false
        })
      );
    }
  };
export const getCompleteCosts =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    const requestId = ++analyticsRequestId;
    dispatch(
      slice.actions.setLoading({
        operation: 'completeCosts',
        loading: true,
        requestId
      })
    );
    try {
      const stats = await api.post<WOCostsAndTime>(
        `${basePath}/complete/costs-time${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getCompleteCosts({ stats, requestId }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'completeCosts',
          requestId,
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'completeCosts',
          loading: false,
          requestId
        })
      );
    }
  };
export const getCompleteByWeek =
  (companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'completeByWeek',
        loading: true
      })
    );
    try {
      const stats = await api.get<WOCountsByWeek[]>(
        `${basePath}/complete/counts/week${companyQuery(companyId)}`
      );
      dispatch(slice.actions.getCompleteByWeek({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'completeByWeek',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'completeByWeek',
          loading: false
        })
      );
    }
  };
export const getCompleteTimesByWeek =
  (companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'completeTimesByWeek',
        loading: true
      })
    );
    try {
      const stats = await api.get<WOTimeByWeek[]>(
        `${basePath}/complete/time/week${companyQuery(companyId)}`
      );
      dispatch(slice.actions.getCompleteTimesByWeek({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'completeTimesByWeek',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'completeTimesByWeek',
          loading: false
        })
      );
    }
  };
export const getIncompleteByAsset =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'incompleteByAsset',
        loading: true
      })
    );
    try {
      const stats = await api.post<IncompleteWOByAsset[]>(
        `${basePath}/incomplete/age/assets${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getIncompleteByAsset({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'incompleteByAsset',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'incompleteByAsset',
          loading: false
        })
      );
    }
  };
export const getIncompleteByUser =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'incompleteByUser',
        loading: true
      })
    );
    try {
      const stats = await api.post<IncompleteWOByUser[]>(
        `${basePath}/incomplete/age/users${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getIncompleteByUser({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'incompleteByUser',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'incompleteByUser',
          loading: false
        })
      );
    }
  };
export const getCompleteCostsByDate =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    const requestId = ++analyticsRequestId;
    dispatch(
      slice.actions.setLoading({
        operation: 'completeCostsByDate',
        loading: true,
        requestId
      })
    );
    try {
      const stats = await api.post<WOCostByDate[]>(
        `${basePath}/complete/costs/date${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getCompleteCostsByDate({ stats, requestId }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'completeCostsByDate',
          requestId,
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'completeCostsByDate',
          loading: false,
          requestId
        })
      );
    }
  };
export const getStatusesByDate =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    const requestId = ++analyticsRequestId;
    dispatch(
      slice.actions.setLoading({
        operation: 'statusesByDate',
        loading: true,
        requestId
      })
    );
    try {
      const stats = await api.post<WOStatusesByDate[]>(
        `${basePath}/statuses${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getStatusesByDate({ stats, requestId }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'statusesByDate',
          requestId,
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'statusesByDate',
          loading: false,
          requestId
        })
      );
    }
  };
export default slice;
