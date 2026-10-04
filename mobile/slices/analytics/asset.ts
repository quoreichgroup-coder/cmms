import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from '../../store';
import api, { getErrorMessage } from '../../utils/api';
import { revertAll } from '../../utils/redux';
import { getReportDateRange } from '../../utils/analytics';
import {
  AssetOverviewStats,
  AssetsCost,
  DowntimesAndCostsByAsset,
  DowntimesByAsset,
  DowntimesByMonth,
  DowntimesMeantimeByMonth,
  Meantimes,
  RepairTimeByAsset,
  TimeCostByAsset
} from '../../models/analytics/asset';

const basePath = 'analytics/assets';
interface AssetStatstate {
  overview: AssetOverviewStats;
  completeTimeCostByAsset: TimeCostByAsset[];
  downtimesByAsset: DowntimesByAsset[];
  assetsCosts: AssetsCost;
  downtimesAndCostsByAsset: DowntimesAndCostsByAsset[];
  downtimesByMonth: DowntimesByMonth[];
  downtimesMeantimeByMonth: DowntimesMeantimeByMonth[];
  meantimes: Meantimes;
  repairTimeByAsset: RepairTimeByAsset[];
  errors: Partial<Record<Exclude<keyof AssetStatstate, 'loading' | 'errors'>, string>>;
  loading: Omit<Record<keyof AssetStatstate, boolean>, 'loading' | 'errors'>;
}
type Operation = Exclude<keyof AssetStatstate, 'loading' | 'errors'>;

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
  downtimesByMonth: [],
  downtimesMeantimeByMonth: [],
  meantimes: { betweenDowntimes: 0, betweenMaintenances: 0 },
  repairTimeByAsset: [],
  errors: {},
  loading: {
    completeTimeCostByAsset: false,
    overview: false,
    downtimesByAsset: false,
    assetsCosts: false,
    downtimesAndCostsByAsset: false,
    downtimesByMonth: false,
    downtimesMeantimeByMonth: false,
    meantimes: false,
    repairTimeByAsset: false
  }
};

const slice = createSlice({
  name: 'overviewStats',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    setError(state: AssetStatstate, action: PayloadAction<{ operation: Operation; error: string }>) {
      state.errors[action.payload.operation] = action.payload.error;
    },
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
    getDowntimesAndCostsByAsset(
      state: AssetStatstate,
      action: PayloadAction<{ stats: DowntimesAndCostsByAsset[] }>
    ) {
      const { stats } = action.payload;
      state.downtimesAndCostsByAsset = stats;
    },
    getDowntimesByMonth(
      state: AssetStatstate,
      action: PayloadAction<{ stats: DowntimesByMonth[] }>
    ) {
      const { stats } = action.payload;
      state.downtimesByMonth = stats;
    },
    getDowntimesMeantimeByMonth(
      state: AssetStatstate,
      action: PayloadAction<{ stats: DowntimesMeantimeByMonth[] }>
    ) {
      const { stats } = action.payload;
      state.downtimesMeantimeByMonth = stats;
    },
    getRepairTimeByAsset(
      state: AssetStatstate,
      action: PayloadAction<{ stats: RepairTimeByAsset[] }>
    ) {
      const { stats } = action.payload;
      state.repairTimeByAsset = stats;
    },
    setLoading(
      state: AssetStatstate,
      action: PayloadAction<{ loading: boolean; operation: Operation }>
    ) {
      const { loading, operation } = action.payload;
      state.loading[operation] = loading;
    }
  }
});

export const reducer = slice.reducer;

export const getWOTimeCostByAsset = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'completeTimeCostByAsset',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'completeTimeCostByAsset', error: '' }));
    try {
  const stats = await api.post<TimeCostByAsset[]>(`${basePath}/time-cost`, getReportDateRange());
  dispatch(slice.actions.getWOTimeCostByAsset({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'completeTimeCostByAsset', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'completeTimeCostByAsset',
      loading: false
    })
  );
    }
};
export const getAssetOverview = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'overview',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'overview', error: '' }));
    try {
  const stats = await api.post<AssetOverviewStats>(`${basePath}/overview`, getReportDateRange());
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
export const getAssetsCosts = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'assetsCosts',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'assetsCosts', error: '' }));
    try {
  const stats = await api.post<AssetsCost>(`${basePath}/costs/overview`, getReportDateRange());
  dispatch(slice.actions.getAssetsCosts({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'assetsCosts', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'assetsCosts',
      loading: false
    })
  );
    }
};
export const getMeantimes = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'meantimes',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'meantimes', error: '' }));
    try {
  const stats = await api.post<Meantimes>(`${basePath}/meantimes`, getReportDateRange());
  dispatch(slice.actions.getMeantimes({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'meantimes', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'meantimes',
      loading: false
    })
  );
    }
};
export const getDowntimesByAsset = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'downtimesByAsset',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'downtimesByAsset', error: '' }));
    try {
  const stats = await api.post<DowntimesByAsset[]>(`${basePath}/downtimes`, getReportDateRange());
  dispatch(slice.actions.getDowntimesByAsset({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'downtimesByAsset', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'downtimesByAsset',
      loading: false
    })
  );
    }
};
export const getDowntimesAndCostsByAsset = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'downtimesAndCostsByAsset',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'downtimesAndCostsByAsset', error: '' }));
    try {
  const stats = await api.post<DowntimesAndCostsByAsset[]>(`${basePath}/downtimes/costs`, getReportDateRange());
  dispatch(slice.actions.getDowntimesAndCostsByAsset({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'downtimesAndCostsByAsset', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'downtimesAndCostsByAsset',
      loading: false
    })
  );
    }
};
export const getDowntimesByMonth = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'downtimesByMonth',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'downtimesByMonth', error: '' }));
    try {
  const stats = await api.post<DowntimesByMonth[]>(`${basePath}/downtimes/costs/date`, getReportDateRange());
  dispatch(slice.actions.getDowntimesByMonth({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'downtimesByMonth', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'downtimesByMonth',
      loading: false
    })
  );
    }
};
export const getDowntimesMeantimeByMonth = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'downtimesMeantimeByMonth',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'downtimesMeantimeByMonth', error: '' }));
    try {
  const stats = await api.post<DowntimesMeantimeByMonth[]>(`${basePath}/downtimes/meantime/date`, getReportDateRange());
  dispatch(slice.actions.getDowntimesMeantimeByMonth({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'downtimesMeantimeByMonth', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'downtimesMeantimeByMonth',
      loading: false
    })
  );
    }
};
export const getRepairTimeByAsset = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'repairTimeByAsset',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'repairTimeByAsset', error: '' }));
    try {
  const stats = await api.post<RepairTimeByAsset[]>(`${basePath}/repair-times`, getReportDateRange());
  dispatch(slice.actions.getRepairTimeByAsset({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'repairTimeByAsset', error: getErrorMessage(error) }));
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
