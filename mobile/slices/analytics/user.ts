import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from '../../store';
import api, { getErrorMessage } from '../../utils/api';
import { revertAll } from '../../utils/redux';
import { UserWOStats, WOStatsByDay } from '../../models/analytics/user';

const basePath = 'analytics/users';
interface UserStatstate {
  workOrdersOverview: UserWOStats;
  twoWeeksWorkOrders: WOStatsByDay[];
  errors: Partial<Record<Exclude<keyof UserStatstate, 'loading' | 'errors'>, string>>;
  loading: Omit<Record<keyof UserStatstate, boolean>, 'loading' | 'errors'>;
}
type Operation = Exclude<keyof UserStatstate, 'loading' | 'errors'>;

const initialState: UserStatstate = {
  workOrdersOverview: {
    created: 0,
    completed: 0
  },
  twoWeeksWorkOrders: [],
  errors: {},
  loading: {
    workOrdersOverview: false,
    twoWeeksWorkOrders: false
  }
};

const slice = createSlice({
  name: 'userStats',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    setError(state: UserStatstate, action: PayloadAction<{ operation: Operation; error: string }>) {
      state.errors[action.payload.operation] = action.payload.error;
    },
    getWorkOrdersOverview(
      state: UserStatstate,
      action: PayloadAction<{ stats: UserWOStats }>
    ) {
      const { stats } = action.payload;
      state.workOrdersOverview = stats;
    },
    getTwoWeeksWorkOrders(
      state: UserStatstate,
      action: PayloadAction<{ stats: WOStatsByDay[] }>
    ) {
      const { stats } = action.payload;
      state.twoWeeksWorkOrders = stats;
    },
    setLoading(
      state: UserStatstate,
      action: PayloadAction<{ loading: boolean; operation: Operation }>
    ) {
      const { loading, operation } = action.payload;
      state.loading[operation] = loading;
    }
  }
});

export const reducer = slice.reducer;

export const getUserWorkOrdersOverview = (): AppThunk => async (dispatch) => {
  dispatch(
    slice.actions.setLoading({
      operation: 'workOrdersOverview',
      loading: true
    })
  );
    dispatch(slice.actions.setError({ operation: 'workOrdersOverview', error: '' }));
    try {
  const stats = await api.get<UserWOStats>(
    `${basePath}/me/work-orders/overview`
  );
  dispatch(slice.actions.getWorkOrdersOverview({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'workOrdersOverview', error: getErrorMessage(error) }));
    } finally {
      dispatch(
    slice.actions.setLoading({
      operation: 'workOrdersOverview',
      loading: false
    })
  );
    }
};

export const getTwoWeeksWorkOrders =
  (userId: number): AppThunk =>
  async (dispatch) => {
    dispatch(
      slice.actions.setLoading({
        operation: 'twoWeeksWorkOrders',
        loading: true
      })
    );
    dispatch(slice.actions.setError({ operation: 'twoWeeksWorkOrders', error: '' }));
    try {
    const stats = await api.get<WOStatsByDay[]>(
      `${basePath}/two-weeks/work-orders/${userId}`
    );
    dispatch(slice.actions.getTwoWeeksWorkOrders({ stats }));

    } catch (error) {
      dispatch(slice.actions.setError({ operation: 'twoWeeksWorkOrders', error: getErrorMessage(error) }));
    } finally {
      dispatch(
      slice.actions.setLoading({
        operation: 'twoWeeksWorkOrders',
        loading: false
      })
    );
    }
  };

export default slice;
