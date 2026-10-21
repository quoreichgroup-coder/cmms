import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from '../store';
import { AssetDTO, AssetMiniDTO, AssetRow } from '../models/asset';
import api from '../utils/api';
import {
  createCancellableRequest,
  isAbortError
} from '../utils/cancellableRequest';
import WorkOrder from '../models/workOrder';
import { getInitialPage, Page, SearchCriteria } from '../models/page';
import { revertAll } from '../utils/redux';

const basePath = 'assets';

interface AssetState {
  assets: Page<AssetDTO>;
  assetsHierarchy: AssetRow[];
  assetInfos: { [key: number]: { asset?: AssetDTO; workOrders: WorkOrder[] } };
  assetsByLocation: { [key: number]: AssetDTO[] };
  assetsByPart: { [key: number]: AssetDTO[] };
  assetsMini: AssetMiniDTO[];
  currentPageNum: number;
  lastPage: boolean;
  assetChildrenPageNum: { [key: number]: number };
  assetChildrenLastPage: { [key: number]: boolean };
  listLoading: boolean;
  latestListRequestId: number;
  loadingGet: boolean;
  loadingWorkOrders: boolean;
  sessionGeneration: number;
}

const initialState: AssetState = {
  assets: getInitialPage<AssetDTO>(),
  assetsHierarchy: [],
  assetInfos: {},
  assetsByLocation: {},
  assetsByPart: {},
  assetsMini: [],
  currentPageNum: 0,
  lastPage: true,
  assetChildrenPageNum: {},
  assetChildrenLastPage: {},
  listLoading: false,
  latestListRequestId: 0,
  loadingGet: false,
  loadingWorkOrders: false,
  sessionGeneration: 0
};

const isCurrentGeneration = (state: AssetState, generation?: number) =>
  generation === undefined || generation === state.sessionGeneration;

const slice = createSlice({
  name: 'assets',
  initialState,
  extraReducers: (builder) =>
    builder.addCase(revertAll, (state) => ({
      ...initialState,
      sessionGeneration: (state.sessionGeneration ?? 0) + 1
    })),
  reducers: {
    getAssets(
      state: AssetState,
      action: PayloadAction<{
        assets: Page<AssetDTO>;
        requestId: number;
        sessionGeneration?: number;
      }>
    ) {
      const { assets, requestId, sessionGeneration } = action.payload;
      if (
        requestId !== state.latestListRequestId ||
        !isCurrentGeneration(state, sessionGeneration)
      )
        return;
      state.assets = assets;
      state.currentPageNum = 0;
      state.lastPage = assets.last;
    },
    getMoreAssets(
      state: AssetState,
      action: PayloadAction<{
        assets: Page<AssetDTO>;
        requestId: number;
        sessionGeneration?: number;
      }>
    ) {
      const { assets, requestId, sessionGeneration } = action.payload;
      if (
        requestId !== state.latestListRequestId ||
        !isCurrentGeneration(state, sessionGeneration)
      )
        return;
      state.assets.content = state.assets.content.concat(assets.content);
      state.currentPageNum = state.currentPageNum + 1;
      state.lastPage = assets.last;
    },
    getAssetsMini(
      state: AssetState,
      action: PayloadAction<{
        assets: AssetMiniDTO[];
        sessionGeneration?: number;
      }>
    ) {
      const { assets, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.assetsMini = assets;
    },
    addAsset(
      state: AssetState,
      action: PayloadAction<{ asset: AssetDTO; sessionGeneration?: number }>
    ) {
      const { asset, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.assets.content = [...state.assets.content, asset];
      state.assetsMini = [
        ...state.assetsMini,
        {
          ...asset,
          parentId: asset.parentAsset?.id ?? null
        }
      ];
    },
    editAsset(
      state: AssetState,
      action: PayloadAction<{ asset: AssetDTO; sessionGeneration?: number }>
    ) {
      const { asset, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      if (state.assetInfos[asset.id]) {
        state.assetInfos[asset.id].asset = asset;
      } else state.assetInfos[asset.id] = { asset, workOrders: [] };
    },
    deleteAsset(
      state: AssetState,
      action: PayloadAction<{ id: number; sessionGeneration?: number }>
    ) {
      const { id, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      const assetIndex = state.assets.content.findIndex(
        (asset) => asset.id === id
      );
      if (assetIndex !== -1) state.assets.content.splice(assetIndex, 1);
      state.assetsMini = state.assetsMini.filter((asset) => asset.id !== id);
      state.assetsHierarchy = state.assetsHierarchy.filter(
        (asset) => asset.id !== id
      );
      delete state.assetInfos[id];
      Object.keys(state.assetsByLocation).forEach((locationId) => {
        state.assetsByLocation[Number(locationId)] = state.assetsByLocation[
          Number(locationId)
        ].filter((asset) => asset.id !== id);
      });
      Object.keys(state.assetsByPart).forEach((partId) => {
        state.assetsByPart[Number(partId)] = state.assetsByPart[
          Number(partId)
        ].filter((asset) => asset.id !== id);
      });
    },
    setLoadingGet(
      state: AssetState,
      action: PayloadAction<{ loading: boolean; sessionGeneration?: number }>
    ) {
      const { loading, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.loadingGet = loading;
    },
    beginListRequest(state: AssetState, action: PayloadAction<number>) {
      state.latestListRequestId = action.payload;
      state.listLoading = true;
    },
    finishListRequest(state: AssetState, action: PayloadAction<number>) {
      if (action.payload === state.latestListRequestId) {
        state.listLoading = false;
      }
    },
    setLoadingWorkOrders(
      state: AssetState,
      action: PayloadAction<{ loading: boolean; sessionGeneration?: number }>
    ) {
      const { loading, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.loadingWorkOrders = loading;
    },
    getAssetChildren(
      state: AssetState,
      action: PayloadAction<{
        assets: AssetRow[];
        id: number;
        pageNum: number;
        lastPage: boolean;
        sessionGeneration?: number;
      }>
    ) {
      const { assets, id, pageNum, lastPage, sessionGeneration } =
        action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      const parent = state.assetsHierarchy.findIndex(
        (asset) => asset.id === id
      );
      if (parent !== -1) state.assetsHierarchy[parent].childrenFetched = true;

      if (pageNum === 0) {
        state.assetsHierarchy = state.assetsHierarchy.filter((asset) => {
          if (id === 0) return asset.hierarchy.length !== 1;
          return asset.hierarchy[asset.hierarchy.length - 2] !== id;
        });
      }

      state.assetsHierarchy = assets.reduce((acc, asset) => {
        //check if asset already exists in state
        const assetInState = state.assetsHierarchy.findIndex(
          (asset1) => asset1.id === asset.id
        );
        //not found
        if (assetInState === -1) return [...acc, asset];
        //found
        acc[assetInState] = asset;
        return acc;
      }, state.assetsHierarchy);

      state.assetChildrenPageNum[id] = pageNum;
      state.assetChildrenLastPage[id] = lastPage;
    },
    getAssetDetails(
      state: AssetState,
      action: PayloadAction<{
        asset: AssetDTO;
        id: number;
        sessionGeneration?: number;
      }>
    ) {
      const { asset, id, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      if (state.assetInfos[id]) {
        state.assetInfos[id] = { ...state.assetInfos[id], asset };
      } else state.assetInfos[id] = { asset, workOrders: [] };
    },
    getAssetWorkOrders(
      state: AssetState,
      action: PayloadAction<{
        workOrders: WorkOrder[];
        id: number;
        sessionGeneration?: number;
      }>
    ) {
      const { workOrders, id, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      if (state.assetInfos[id]) {
        state.assetInfos[id] = { ...state.assetInfos[id], workOrders };
      } else state.assetInfos[id] = { workOrders };
    },
    getAssetsByLocation(
      state: AssetState,
      action: PayloadAction<{
        assets: AssetDTO[];
        id: number;
        sessionGeneration?: number;
      }>
    ) {
      const { assets, id, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.assetsByLocation[id] = assets;
    },
    getAssetsByPart(
      state: AssetState,
      action: PayloadAction<{
        assets: AssetDTO[];
        id: number;
        sessionGeneration?: number;
      }>
    ) {
      const { assets, id, sessionGeneration } = action.payload;
      if (!isCurrentGeneration(state, sessionGeneration)) return;
      state.assetsByPart[id] = assets;
    }
  }
});

export const reducer = slice.reducer;

let listRequestSequence = 0;

export const getAssets =
  (criteria: SearchCriteria): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    const requestId = ++listRequestSequence;
    const { signal } = createCancellableRequest('getAssets');
    try {
      dispatch(slice.actions.beginListRequest(requestId));
      const assets = await api.post<Page<AssetDTO>>(
        `${basePath}/search`,
        criteria,
        { signal }
      );
      dispatch(
        slice.actions.getAssets({ assets, requestId, sessionGeneration })
      );
    } catch (error) {
      if (isAbortError(error)) return;
      throw error;
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getMoreAssets =
  (criteria: SearchCriteria, pageNum: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    const requestId = ++listRequestSequence;
    const { signal } = createCancellableRequest('getMoreAssets');
    criteria = { ...criteria, pageNum };
    try {
      dispatch(slice.actions.beginListRequest(requestId));
      const assets = await api.post<Page<AssetDTO>>(
        `${basePath}/search`,
        criteria,
        { signal }
      );
      dispatch(
        slice.actions.getMoreAssets({ assets, requestId, sessionGeneration })
      );
    } catch (error) {
      if (isAbortError(error)) return;
      throw error;
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getAssetsMini =
  (locationId?: number | null): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    const { signal } = createCancellableRequest('getAssetsMini');
    try {
      dispatch(
        slice.actions.setLoadingGet({ loading: true, sessionGeneration })
      );
      const assets = await api.get<AssetMiniDTO[]>(
        `${basePath}/mini?locationId=${locationId ?? ''}`,
        { signal }
      );
      dispatch(slice.actions.getAssetsMini({ assets, sessionGeneration }));
    } catch (error) {
      if (isAbortError(error)) return;
      throw error;
    } finally {
      dispatch(
        slice.actions.setLoadingGet({ loading: false, sessionGeneration })
      );
    }
  };
export const addAsset =
  (asset): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    const assetResponse = await api.post<AssetDTO>(basePath, asset);
    dispatch(
      slice.actions.addAsset({ asset: assetResponse, sessionGeneration })
    );
    return assetResponse;
  };
export const editAsset =
  (id: number, asset: Partial<AssetDTO>): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    const assetResponse = await api.patch<AssetDTO>(`${basePath}/${id}`, asset);
    dispatch(
      slice.actions.editAsset({ asset: assetResponse, sessionGeneration })
    );
  };
export const getSingleAsset =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    const assetResponse = await api.get<AssetDTO>(`${basePath}/${id}`);
    dispatch(
      slice.actions.editAsset({ asset: assetResponse, sessionGeneration })
    );
  };
export const deleteAsset =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    const assetResponse = await api.deletes<{ success: boolean }>(
      `${basePath}/${id}`
    );
    const { success } = assetResponse;
    if (success) {
      dispatch(slice.actions.deleteAsset({ id, sessionGeneration }));
    }
  };

export const getAssetChildren =
  (id: number, parents: number[], pageNum = 0, pageSize = 20): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    dispatch(slice.actions.setLoadingGet({ loading: true, sessionGeneration }));
    try {
      const page = await api.get<Page<AssetDTO>>(
        `${basePath}/children/${id}/paginated?page=${pageNum}&size=${pageSize}`
      );
      dispatch(
        slice.actions.getAssetChildren({
          id,
          pageNum,
          lastPage: page.last,
          sessionGeneration,
          assets: page.content.map((asset) => {
            return { ...asset, hierarchy: [...parents, asset.id] };
          })
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoadingGet({ loading: false, sessionGeneration })
      );
    }
  };

export const getAssetDetails =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    dispatch(slice.actions.setLoadingGet({ loading: true, sessionGeneration }));
    try {
      const asset = await api.get<AssetDTO>(`${basePath}/${id}`);
      dispatch(
        slice.actions.getAssetDetails({
          id,
          asset,
          sessionGeneration
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoadingGet({ loading: false, sessionGeneration })
      );
    }
  };
export const getAssetByNfc =
  (nfcId: string): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    dispatch(slice.actions.setLoadingGet({ loading: true, sessionGeneration }));
    try {
      return await api.get<AssetMiniDTO>(
        `${basePath}/nfc?nfcId=${encodeURIComponent(nfcId)}`
      );
    } finally {
      dispatch(
        slice.actions.setLoadingGet({ loading: false, sessionGeneration })
      );
    }
  };
export const getAssetByBarcode =
  (barCode: string): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    dispatch(slice.actions.setLoadingGet({ loading: true, sessionGeneration }));
    try {
      return await api.get<AssetMiniDTO>(
        `${basePath}/barcode?data=${encodeURIComponent(barCode)}`
      );
    } finally {
      dispatch(
        slice.actions.setLoadingGet({ loading: false, sessionGeneration })
      );
    }
  };
export const getAssetWorkOrders =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    dispatch(
      slice.actions.setLoadingWorkOrders({ loading: true, sessionGeneration })
    );
    try {
      const workOrders = await api.get<WorkOrder[]>(`work-orders/asset/${id}`);
      dispatch(
        slice.actions.getAssetWorkOrders({
          id,
          workOrders,
          sessionGeneration
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoadingWorkOrders({
          loading: false,
          sessionGeneration
        })
      );
    }
  };

export const getAssetsByLocation =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    const assets = await api.get<AssetDTO[]>(`${basePath}/location/${id}`);
    dispatch(
      slice.actions.getAssetsByLocation({
        id,
        assets,
        sessionGeneration
      })
    );
  };

export const getAssetsByPart =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const sessionGeneration = getState().assets.sessionGeneration ?? 0;
    const assets = await api.get<AssetDTO[]>(`${basePath}/part/${id}`);
    dispatch(
      slice.actions.getAssetsByPart({
        id,
        assets,
        sessionGeneration
      })
    );
  };
export default slice;
