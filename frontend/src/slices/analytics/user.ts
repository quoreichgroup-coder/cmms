import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from 'src/store';
import api, { getErrorMessage } from '../../utils/api';
import { UserWOStats, WOStatsByDay } from '../../models/owns/analytics/user';
import { revertAll } from 'src/utils/redux';

const basePath = 'analytics/users';
interface UserStatstate {
  workOrdersOverview: UserWOStats;
  twoWeeksWorkOrders: WOStatsByDay[];
  errors: Partial<Record<string, string>>;
  loading: Omit<Record<keyof UserStatstate, boolean>, 'loading' | 'errors'>;
}
type Operation = keyof UserStatstate;

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
    setError(
      state,
      action: PayloadAction<{ operation: string; message: string }>
    ) {
      state.errors[action.payload.operation] = action.payload.message;
    },
    setLoading(
      state: UserStatstate,
      action: PayloadAction<{ loading: boolean; operation: Operation }>
    ) {
      const { loading, operation } = action.payload;
      state.loading[operation] = loading;
      if (loading) delete state.errors[operation];
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
  try {
    const stats = await api.get<UserWOStats>(
      `${basePath}/me/work-orders/overview`
    );
    dispatch(slice.actions.getWorkOrdersOverview({ stats }));
  } catch (error) {
    dispatch(
      slice.actions.setError({
        operation: 'workOrdersOverview',
        message:
          error?.status === 403
            ? 'Accès refusé à ce rapport.'
            : getErrorMessage(error)
      })
    );
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
    try {
      const stats = await api.get<WOStatsByDay[]>(
        `${basePath}/two-weeks/work-orders/${userId}`
      );
      dispatch(slice.actions.getTwoWeeksWorkOrders({ stats }));
    } catch (error) {
      dispatch(
        slice.actions.setError({
          operation: 'twoWeeksWorkOrders',
          message:
            error?.status === 403
              ? 'Accès refusé à ce rapport.'
              : getErrorMessage(error)
        })
      );
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
