import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import api from '../utils/api';
import { LicenseEntitlement, LicensingState } from '../models/license';
import { AppThunk } from '../store';
import { revertAll } from '../utils/redux';

const basePath = 'license';
interface LicenseState {
  state: LicensingState;
}

const initialState: LicenseState = {
  state: { valid: false, entitlements: [] }
};

const slice = createSlice({
  name: 'license',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getLicenseValidity(
      state: LicenseState,
      action: PayloadAction<LicenseState['state']>
    ) {
      state.state = action.payload;
    }
  }
});

export const reducer = slice.reducer;

export const getLicenseValidity = (): AppThunk => async (dispatch) => {
  const response = await api.get<LicenseState['state']>(`${basePath}/state`);
  dispatch(slice.actions.getLicenseValidity(response));
};

export const activateLicense = (licenseKey: string): AppThunk => async (dispatch) => {
  const response = await api.post<LicensingState>('license/activate', { licenseKey });
  dispatch(slice.actions.getLicenseValidity(response));
  return response;
};

export default slice;
