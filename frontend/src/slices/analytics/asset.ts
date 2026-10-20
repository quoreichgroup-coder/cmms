import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from 'src/store';
import api, { getErrorMessage } from '../../utils/api';
import {
  AssetOverview,
  AssetOverviewStats,
  AssetsCost,
  DowntimesAndCostsByAsset,
  DowntimesByAsset,
  DowntimesByDate,
  DowntimesMeantimeByDate,
  Meantimes,
  MTBFByAsset,
  RepairTimeByAsset,
  TimeCostByAsset
} from '../../models/owns/analytics/asset';
import { revertAll } from 'src/utils/redux';

const basePath = 'analytics/assets';

const companyQuery = (companyId?: number) =>
  companyId ? `?companyId=${companyId}` : '';

interface AssetStatstate {
  overview: AssetOverviewStats;
  completeTimeCostByAsset: TimeCostByAsset[];
  downtimesByAsset: DowntimesByAsset[];
  assetsCosts: AssetsCost;
  downtimesAndCostsByAsset: DowntimesAndCostsByAsset[];
  downtimesByDate: DowntimesByDate[];
  downtimesMeantimeByDate: DowntimesMeantimeByDate[];
  meantimes: Meantimes;
  repairTimeByAsset: RepairTimeByAsset[];
  assetDetailsOverview: AssetOverview;
  mtbfByAsset: MTBFByAsset[];
  errors: Partial<Record<string, string>>;
  loading: Omit<Record<keyof AssetStatstate, boolean>, 'loading' | 'errors'>;
}

type Operation = keyof AssetStatstate;

const initialState: AssetStatstate = {
  completeTimeCostByAsset: [],
  overview: {
    downtime: 0,
    availability: 100,
    downtimeEvents: 0
  },
  downtimesByAsset: [],
  assetsCosts: {
    rav: 0,
    totalWOCosts: 0,
    totalAcquisitionCost: 0
  },
  downtimesAndCostsByAsset: [],
  downtimesByDate: [],
  downtimesMeantimeByDate: [],
  meantimes: { betweenDowntimes: 0, betweenMaintenances: 0 },
  repairTimeByAsset: [],
  assetDetailsOverview: {
    mtbf: 0,
    mttr: 0,
    downtime: 0,
    uptime: 0,
    totalCost: 0
  },
  mtbfByAsset: [],
  errors: {},
  loading: {
    completeTimeCostByAsset: false,
    overview: false,
    downtimesByAsset: false,
    assetsCosts: false,
    downtimesAndCostsByAsset: false,
    downtimesByDate: false,
    downtimesMeantimeByDate: false,
    meantimes: false,
    repairTimeByAsset: false,
    assetDetailsOverview: false,
    mtbfByAsset: false
  }
};

const slice = createSlice({
  name: 'overviewStats',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getWOTimeCostByAsset(
      state: AssetStatstate,
      action: PayloadAction<{ stats: TimeCostByAsset[] }>
    ) {
      const { stats } = action.payload;
      state.completeTimeCostByAsset = stats;
    },
    getOverview(
      state: AssetStatstate,
      action: PayloadAction<{ stats: AssetOverviewStats }>
    ) {
      const { stats } = action.payload;
      state.overview = stats;
    },
    getAssetsCosts(
      state: AssetStatstate,
      action: PayloadAction<{ stats: AssetsCost }>
    ) {
      const { stats } = action.payload;
      state.assetsCosts = stats;
    },
    getMeantimes(
      state: AssetStatstate,
      action: PayloadAction<{ stats: Meantimes }>
    ) {
      const { stats } = action.payload;
      state.meantimes = stats;
    },
    getDowntimesByAsset(
      state: AssetStatstate,
      action: PayloadAction<{ stats: DowntimesByAsset[] }>
    ) {
      const { stats } = action.payload;
      state.downtimesByAsset = stats;
    },
    getMTBFByAsset(
      state: AssetStatstate,
      action: PayloadAction<{ stats: MTBFByAsset[] }>
    ) {
      const { stats } = action.payload;
      state.mtbfByAsset = stats;
    },
    getDowntimesAndCostsByAsset(
      state: AssetStatstate,
      action: PayloadAction<{ stats: DowntimesAndCostsByAsset[] }>
    ) {
      const { stats } = action.payload;
      state.downtimesAndCostsByAsset = stats;
    },
    getDowntimesByDate(
      state: AssetStatstate,
      action: PayloadAction<{ stats: DowntimesByDate[] }>
    ) {
      const { stats } = action.payload;
      state.downtimesByDate = stats;
    },
    getDowntimesMeantimeByDate(
      state: AssetStatstate,
      action: PayloadAction<{ stats: DowntimesMeantimeByDate[] }>
    ) {
      const { stats } = action.payload;
      state.downtimesMeantimeByDate = stats;
    },
    getRepairTimeByAsset(
      state: AssetStatstate,
      action: PayloadAction<{ stats: RepairTimeByAsset[] }>
    ) {
      const { stats } = action.payload;
      state.repairTimeByAsset = stats;
    },
    getAssetDetailsOverview(
      state: AssetStatstate,
      action: PayloadAction<{ stats: AssetOverview }>
    ) {
      const { stats } = action.payload;
      state.assetDetailsOverview = stats;
    },
    setError(
      state,
      action: PayloadAction<{ operation: string; message: string }>
    ) {
      state.errors[action.payload.operation] = action.payload.message;
    },
    setLoading(
      state: AssetStatstate,
      action: PayloadAction<{ loading: boolean; operation: Operation }>
    ) {
      const { loading, operation } = action.payload;
      state.loading[operation] = loading;
      if (loading) delete state.errors[operation];
    }
  }
});

export const reducer = slice.reducer;

export const getWOTimeCostByAsset =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'completeTimeCostByAsset',
        loading: true
      })
    );
    try {
      const stats = await api.post<TimeCostByAsset[]>(
        `${basePath}/time-cost${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getWOTimeCostByAsset({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'completeTimeCostByAsset',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'completeTimeCostByAsset',
          loading: false
        })
      );
    }
  };
export const getAssetOverview =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'overview',
        loading: true
      })
    );
    try {
      const stats = await api.post<AssetOverviewStats>(
        `${basePath}/overview${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getOverview({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'overview',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'overview',
          loading: false
        })
      );
    }
  };
export const getAssetDetailsOverview =
  (id: number, start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'assetDetailsOverview',
        loading: true
      })
    );
    try {
      const stats = await api.post<AssetOverview>(
        `${basePath}/${id}/overview${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getAssetDetailsOverview({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'assetDetailsOverview',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'assetDetailsOverview',
          loading: false
        })
      );
    }
  };
export const getAssetsCosts =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'assetsCosts',
        loading: true
      })
    );
    try {
      const stats = await api.post<AssetsCost>(
        `${basePath}/costs/overview${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getAssetsCosts({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'assetsCosts',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'assetsCosts',
          loading: false
        })
      );
    }
  };
export const getMeantimes =
  (companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'meantimes',
        loading: true
      })
    );
    try {
      const stats = await api.get<Meantimes>(
        `${basePath}/meantimes${companyQuery(companyId)}`
      );
      dispatch(slice.actions.getMeantimes({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'meantimes',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'meantimes',
          loading: false
        })
      );
    }
  };
export const getDowntimesByAsset =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'downtimesByAsset',
        loading: true
      })
    );
    try {
      const stats = await api.post<DowntimesByAsset[]>(
        `${basePath}/downtimes${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getDowntimesByAsset({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'downtimesByAsset',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'downtimesByAsset',
          loading: false
        })
      );
    }
  };
export const getMTBFByAsset =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'mtbfByAsset',
        loading: true
      })
    );
    try {
      const stats = await api.post<MTBFByAsset[]>(
        `${basePath}/mtbf${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getMTBFByAsset({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'mtbfByAsset',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'mtbfByAsset',
          loading: false
        })
      );
    }
  };
export const getDowntimesAndCostsByAsset =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'downtimesAndCostsByAsset',
        loading: true
      })
    );
    try {
      const stats = await api.post<DowntimesAndCostsByAsset[]>(
        `${basePath}/downtimes/costs${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getDowntimesAndCostsByAsset({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'downtimesAndCostsByAsset',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'downtimesAndCostsByAsset',
          loading: false
        })
      );
    }
  };
export const getDowntimesByDate =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'downtimesByDate',
        loading: true
      })
    );
    try {
      const stats = await api.post<DowntimesByDate[]>(
        `${basePath}/downtimes/costs/date${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getDowntimesByDate({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'downtimesByDate',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'downtimesByDate',
          loading: false
        })
      );
    }
  };
export const getDowntimesMeantimeByDate =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'downtimesMeantimeByDate',
        loading: true
      })
    );
    try {
      const stats = await api.post<DowntimesMeantimeByDate[]>(
        `${basePath}/downtimes/meantime/date${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getDowntimesMeantimeByDate({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'downtimesMeantimeByDate',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'downtimesMeantimeByDate',
          loading: false
        })
      );
    }
  };
export const getRepairTimeByAsset =
  (start: Date, end: Date, companyId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'repairTimeByAsset',
        loading: true
      })
    );
    try {
      const stats = await api.post<RepairTimeByAsset[]>(
        `${basePath}/repair-times${companyQuery(companyId)}`,
        { start, end }
      );
      dispatch(slice.actions.getRepairTimeByAsset({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'repairTimeByAsset',
          message: getErrorMessage(error)
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoading({
          operation: 'repairTimeByAsset',
          loading: false
        })
      );
    }
  };
export default slice;
