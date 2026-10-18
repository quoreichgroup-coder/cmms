import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from '../store';
import { Vendor, VendorMiniDTO } from '../models/vendor';
import api from '../utils/api';
import { getInitialPage, Page, SearchCriteria } from '../models/page';
import { revertAll } from '../utils/redux';

const basePath = 'vendors';

interface VendorState {
  vendors: Page<Vendor>;
  vendorInfos: { [key: number]: { vendor?: Vendor } };
  vendorsMini: VendorMiniDTO[];
  currentPageNum: number;
  lastPage: boolean;
  loadingGet: boolean;
  listLoading: boolean;
  latestListRequestId: number;
}

const initialState: VendorState = {
  vendors: getInitialPage<Vendor>(),
  vendorInfos: {},
  vendorsMini: [],
  currentPageNum: 0,
  lastPage: true,
  loadingGet: false,
  listLoading: false,
  latestListRequestId: 0
};

const slice = createSlice({
  name: 'vendors',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getVendors(
      state: VendorState,
      action: PayloadAction<{ vendors: Page<Vendor>; requestId: number }>
    ) {
      const { vendors, requestId } = action.payload;
      if (requestId !== state.latestListRequestId) return;
      state.vendors = vendors;
      state.currentPageNum = 0;
      state.lastPage = vendors.last;
    },
    getMoreVendors(
      state: VendorState,
      action: PayloadAction<{ vendors: Page<Vendor>; requestId: number }>
    ) {
      const { vendors, requestId } = action.payload;
      if (requestId !== state.latestListRequestId) return;
      state.vendors.content = state.vendors.content.concat(vendors.content);
      state.currentPageNum = state.currentPageNum + 1;
      state.lastPage = vendors.last;
    },
    getVendorDetails(
      state: VendorState,
      action: PayloadAction<{ vendor; id: number }>
    ) {
      const { vendor, id } = action.payload;
      if (state.vendorInfos[id]) {
        state.vendorInfos[id] = { ...state.vendorInfos[id], vendor };
      } else state.vendorInfos[id] = { vendor };
    },
    editVendor(state: VendorState, action: PayloadAction<{ vendor: Vendor }>) {
      const { vendor } = action.payload;
      if (state.vendorInfos[vendor.id]) {
        state.vendorInfos[vendor.id].vendor = vendor;
      } else state.vendorInfos[vendor.id] = { vendor };
    },
    getVendorsMini(
      state: VendorState,
      action: PayloadAction<{ vendors: VendorMiniDTO[] }>
    ) {
      const { vendors } = action.payload;
      state.vendorsMini = vendors;
    },
    addVendor(state: VendorState, action: PayloadAction<{ vendor: Vendor }>) {
      const { vendor } = action.payload;
      state.vendors.content = [...state.vendors.content, vendor];
    },
    deleteVendor(state: VendorState, action: PayloadAction<{ id: number }>) {
      const { id } = action.payload;
      const vendorIndex = state.vendors.content.findIndex(
        (vendor) => vendor.id === id
      );
      if (vendorIndex !== -1) state.vendors.content.splice(vendorIndex, 1);
      state.vendorsMini = state.vendorsMini.filter(
        (vendor) => vendor.id !== id
      );
      delete state.vendorInfos[id];
    },
    setLoadingGet(
      state: VendorState,
      action: PayloadAction<{ loading: boolean }>
    ) {
      const { loading } = action.payload;
      state.loadingGet = loading;
    },
    beginListRequest(state: VendorState, action: PayloadAction<number>) {
      state.latestListRequestId = action.payload;
      state.listLoading = true;
    },
    finishListRequest(state: VendorState, action: PayloadAction<number>) {
      if (action.payload === state.latestListRequestId) {
        state.listLoading = false;
      }
    }
  }
});

export const reducer = slice.reducer;

let listRequestSequence = 0;

export const getVendors =
  (criteria: SearchCriteria): AppThunk =>
  async (dispatch) => {
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    try {
      const vendors = await api.post<Page<Vendor>>(
        `${basePath}/search`,
        criteria
      );
      dispatch(slice.actions.getVendors({ vendors, requestId }));
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getMoreVendors =
  (criteria: SearchCriteria, pageNum: number): AppThunk =>
  async (dispatch) => {
    const requestId = ++listRequestSequence;
    dispatch(slice.actions.beginListRequest(requestId));
    criteria = { ...criteria, pageNum };
    try {
      const vendors = await api.post<Page<Vendor>>(
        `${basePath}/search`,
        criteria
      );
      dispatch(slice.actions.getMoreVendors({ vendors, requestId }));
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getVendorDetails =
  (id: number): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setLoadingGet({ loading: true }));
    const vendor = await api.get<Vendor>(`${basePath}/${id}`);
    dispatch(
      slice.actions.getVendorDetails({
        id,
        vendor
      })
    );
    dispatch(slice.actions.setLoadingGet({ loading: false }));
  };

export const editVendor =
  (id: number, vendor): AppThunk =>
  async (dispatch) => {
    const vendorResponse = await api.patch<Vendor>(`${basePath}/${id}`, vendor);
    dispatch(slice.actions.editVendor({ vendor: vendorResponse }));
  };
export const getVendorsMini = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.setLoadingGet({ loading: true }));
  try {
    const vendors = await api.get<Vendor[]>('vendors/mini');
    dispatch(slice.actions.getVendorsMini({ vendors }));
  } finally {
    dispatch(slice.actions.setLoadingGet({ loading: false }));
  }
};
export const addVendor =
  (vendor): AppThunk =>
  async (dispatch) => {
    const vendorResponse = await api.post<Vendor>('vendors', vendor);
    dispatch(slice.actions.addVendor({ vendor: vendorResponse }));
  };
export const deleteVendor =
  (id: number): AppThunk =>
  async (dispatch) => {
    const vendorResponse = await api.deletes<{ success: boolean }>(
      `vendors/${id}`
    );
    const { success } = vendorResponse;
    if (success) {
      dispatch(slice.actions.deleteVendor({ id }));
    }
  };

export default slice;
