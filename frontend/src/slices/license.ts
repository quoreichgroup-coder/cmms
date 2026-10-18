import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from 'src/store';
import api from '../utils/api';
import { revertAll } from 'src/utils/redux';
import { LicenseEntitlement, LicensingState } from '../models/owns/license';

const basePath = 'license';
interface LicenseState {
  state: LicensingState;
  requestStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: LicenseState = {
  requestStatus: 'idle',
  state: {
    valid: false,
    previewMode: false,
    entitlements: [],
    expirationDate: null,
    planName: null
  }
};

const slice = createSlice({
  name: 'license',
  initialState,
  reducers: {
    getLicenseValidity(
      state: LicenseState,
      action: PayloadAction<LicenseState['state']>
    ) {
      state.state = action.payload;
      state.requestStatus = 'succeeded';
    },
    setRequestStatus(
      state: LicenseState,
      action: PayloadAction<LicenseState['requestStatus']>
    ) {
      state.requestStatus = action.payload;
    }
  }
});

export const reducer = slice.reducer;

export const getLicenseValidity = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.setRequestStatus('loading'));
  try {
    const response = await api.get<LicenseState['state']>(`${basePath}/state`);
    dispatch(slice.actions.getLicenseValidity(response));
  } catch (error) {
    dispatch(slice.actions.setRequestStatus('failed'));
    throw error;
  }
};

export const activateLicense =
  (licenseKey: string): AppThunk =>
  async (dispatch) => {
    const response = await api.post<LicensingState>(`${basePath}/activate`, {
      licenseKey
    });
    dispatch(slice.actions.getLicenseValidity(response));
    return response;
  };

export default slice;
