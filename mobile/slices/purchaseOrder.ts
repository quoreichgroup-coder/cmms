import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { getInitialPage, Page, SearchCriteria } from '../models/page';
import type { AppThunk } from '../store';
import PurchaseOrder from '../models/purchaseOrder';
import api from '../utils/api';
import { revertAll } from '../utils/redux';

const basePath = 'purchase-orders';
interface PurchaseOrderState {
  purchaseOrders: Page<PurchaseOrder>;
  singlePurchaseOrder: PurchaseOrder;
  loadingGet: boolean;
  requestGeneration: number;
  listRequestId: number;
}

const initialState: PurchaseOrderState = {
  purchaseOrders: getInitialPage<PurchaseOrder>(),
  singlePurchaseOrder: null,
  loadingGet: false,
  requestGeneration: 0,
  listRequestId: 0
};

const isCurrentGeneration = (state: PurchaseOrderState, generation?: number) =>
  generation === undefined || generation === state.requestGeneration;

const slice = createSlice({
  name: 'purchaseOrders',
  initialState,
  extraReducers: (builder) =>
    builder.addCase(revertAll, (state) => ({
      ...initialState,
      requestGeneration: (state.requestGeneration ?? 0) + 1,
      listRequestId: (state.listRequestId ?? 0) + 1
    })),
  reducers: {
    getPurchaseOrders(
      state: PurchaseOrderState,
      action: PayloadAction<{
        purchaseOrders: Page<PurchaseOrder>;
        requestGeneration?: number;
        listRequestId?: number;
      }>
    ) {
      const { purchaseOrders, requestGeneration, listRequestId } =
        action.payload;
      if (
        !isCurrentGeneration(state, requestGeneration) ||
        (listRequestId !== undefined && listRequestId !== state.listRequestId)
      )
        return;
      state.purchaseOrders = purchaseOrders;
    },
    getMorePurchaseOrders(
      state: PurchaseOrderState,
      action: PayloadAction<{
        purchaseOrders: Page<PurchaseOrder>;
        requestGeneration?: number;
        listRequestId?: number;
      }>
    ) {
      const { purchaseOrders, requestGeneration, listRequestId } =
        action.payload;
      if (
        !isCurrentGeneration(state, requestGeneration) ||
        (listRequestId !== undefined && listRequestId !== state.listRequestId)
      )
        return;
      state.purchaseOrders.content = [
        ...state.purchaseOrders.content,
        ...purchaseOrders.content
      ];
      state.purchaseOrders = {
        ...purchaseOrders,
        content: state.purchaseOrders.content
      };
    },
    getSinglePurchaseOrder(
      state: PurchaseOrderState,
      action: PayloadAction<{
        purchaseOrder: PurchaseOrder;
        requestGeneration?: number;
      }>
    ) {
      const { purchaseOrder, requestGeneration } = action.payload;
      if (!isCurrentGeneration(state, requestGeneration)) return;
      state.singlePurchaseOrder = purchaseOrder;
    },
    addPurchaseOrder(
      state: PurchaseOrderState,
      action: PayloadAction<{
        purchaseOrder: PurchaseOrder;
        requestGeneration?: number;
      }>
    ) {
      const { purchaseOrder, requestGeneration } = action.payload;
      if (!isCurrentGeneration(state, requestGeneration)) return;
      state.purchaseOrders.content = [
        ...state.purchaseOrders.content,
        purchaseOrder
      ];
    },
    editPurchaseOrder(
      state: PurchaseOrderState,
      action: PayloadAction<{
        purchaseOrder: PurchaseOrder;
        requestGeneration?: number;
      }>
    ) {
      const { purchaseOrder, requestGeneration } = action.payload;
      if (!isCurrentGeneration(state, requestGeneration)) return;
      const inContent = state.purchaseOrders.content.some(
        (po) => po.id === purchaseOrder.id
      );
      if (inContent) {
        state.purchaseOrders.content = state.purchaseOrders.content.map(
          (purchaseOrder1) => {
            if (purchaseOrder1.id === purchaseOrder.id) {
              return purchaseOrder;
            }
            return purchaseOrder1;
          }
        );
      } else {
        state.singlePurchaseOrder = purchaseOrder;
      }
    },
    deletePurchaseOrder(
      state: PurchaseOrderState,
      action: PayloadAction<{ id: number; requestGeneration?: number }>
    ) {
      const { id, requestGeneration } = action.payload;
      if (!isCurrentGeneration(state, requestGeneration)) return;
      const purchaseOrderIndex = state.purchaseOrders.content.findIndex(
        (purchaseOrder) => purchaseOrder.id === id
      );
      if (purchaseOrderIndex !== -1)
        state.purchaseOrders.content.splice(purchaseOrderIndex, 1);
    },
    setLoadingGet(
      state: PurchaseOrderState,
      action: PayloadAction<{
        loading: boolean;
        requestGeneration?: number;
        listRequestId?: number;
      }>
    ) {
      const { loading, requestGeneration, listRequestId } = action.payload;
      if (
        !isCurrentGeneration(state, requestGeneration) ||
        (listRequestId !== undefined && listRequestId !== state.listRequestId)
      )
        return;
      state.loadingGet = loading;
    },
    startPurchaseOrdersRequest(state: PurchaseOrderState) {
      state.listRequestId += 1;
      state.loadingGet = true;
    },
    clearSinglePurchaseOrder(
      state: PurchaseOrderState,
      action: PayloadAction<{}>
    ) {
      state.singlePurchaseOrder = null;
    }
  }
});

export const reducer = slice.reducer;

export const getPurchaseOrders =
  (criteria: SearchCriteria): AppThunk =>
  async (dispatch, getState) => {
    const requestGeneration = getState().purchaseOrders.requestGeneration ?? 0;
    dispatch(slice.actions.startPurchaseOrdersRequest());
    const listRequestId = getState().purchaseOrders.listRequestId;
    try {
      const purchaseOrders = await api.post<Page<PurchaseOrder>>(
        `${basePath}/search`,
        criteria
      );
      dispatch(
        slice.actions.getPurchaseOrders({
          purchaseOrders,
          requestGeneration,
          listRequestId
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoadingGet({
          loading: false,
          requestGeneration,
          listRequestId
        })
      );
    }
  };

export const getPurchaseOrdersToReceive =
  (pageNum: number, pageSize: number, query = ''): AppThunk =>
  async (dispatch, getState) => {
    const requestGeneration = getState().purchaseOrders.requestGeneration ?? 0;
    dispatch(slice.actions.startPurchaseOrdersRequest());
    const listRequestId = getState().purchaseOrders.listRequestId;
    try {
      const purchaseOrders = await api.get<Page<PurchaseOrder>>(
        `${basePath}/receiving-queue?page=${pageNum}&size=${pageSize}${
          query.trim() ? `&query=${encodeURIComponent(query.trim())}` : ''
        }`
      );
      dispatch(
        slice.actions.getPurchaseOrders({
          purchaseOrders,
          requestGeneration,
          listRequestId
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoadingGet({
          loading: false,
          requestGeneration,
          listRequestId
        })
      );
    }
  };

export const getMorePurchaseOrders =
  (criteria: SearchCriteria, pageNum: number): AppThunk =>
  async (dispatch, getState) => {
    const requestGeneration = getState().purchaseOrders.requestGeneration ?? 0;
    const listRequestId = getState().purchaseOrders.listRequestId ?? 0;
    dispatch(
      slice.actions.setLoadingGet({
        loading: true,
        requestGeneration,
        listRequestId
      })
    );
    try {
      const purchaseOrders = await api.post<Page<PurchaseOrder>>(
        `${basePath}/search`,
        { ...criteria, pageNum }
      );
      dispatch(
        slice.actions.getMorePurchaseOrders({
          purchaseOrders,
          requestGeneration,
          listRequestId
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoadingGet({
          loading: false,
          requestGeneration,
          listRequestId
        })
      );
    }
  };

export const getMorePurchaseOrdersToReceive =
  (pageNum: number, pageSize: number, query = ''): AppThunk =>
  async (dispatch, getState) => {
    const requestGeneration = getState().purchaseOrders.requestGeneration ?? 0;
    const listRequestId = getState().purchaseOrders.listRequestId ?? 0;
    dispatch(
      slice.actions.setLoadingGet({
        loading: true,
        requestGeneration,
        listRequestId
      })
    );
    try {
      const purchaseOrders = await api.get<Page<PurchaseOrder>>(
        `${basePath}/receiving-queue?page=${pageNum}&size=${pageSize}${
          query.trim() ? `&query=${encodeURIComponent(query.trim())}` : ''
        }`
      );
      dispatch(
        slice.actions.getMorePurchaseOrders({
          purchaseOrders,
          requestGeneration,
          listRequestId
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoadingGet({
          loading: false,
          requestGeneration,
          listRequestId
        })
      );
    }
  };

export const getSinglePurchaseOrder =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const requestGeneration = getState().purchaseOrders.requestGeneration ?? 0;
    dispatch(slice.actions.setLoadingGet({ loading: true, requestGeneration }));
    try {
      const purchaseOrder = await api.get<PurchaseOrder>(`${basePath}/${id}`);
      dispatch(
        slice.actions.getSinglePurchaseOrder({
          purchaseOrder,
          requestGeneration
        })
      );
    } finally {
      dispatch(
        slice.actions.setLoadingGet({ loading: false, requestGeneration })
      );
    }
  };

export const editPurchaseOrder =
  (id: number, purchaseOrder): AppThunk =>
  async (dispatch, getState) => {
    const requestGeneration = getState().purchaseOrders.requestGeneration ?? 0;
    const purchaseOrderResponse = await api.patch<PurchaseOrder>(
      `${basePath}/${id}`,
      purchaseOrder
    );
    dispatch(
      slice.actions.editPurchaseOrder({
        purchaseOrder: purchaseOrderResponse,
        requestGeneration
      })
    );
  };
export const addPurchaseOrder =
  (purchaseOrder): AppThunk =>
  async (dispatch, getState) => {
    const requestGeneration = getState().purchaseOrders.requestGeneration ?? 0;
    const purchaseOrderResponse = await api.post<PurchaseOrder>(
      basePath,
      purchaseOrder
    );
    dispatch(
      slice.actions.addPurchaseOrder({
        purchaseOrder: purchaseOrderResponse,
        requestGeneration
      })
    );
    return purchaseOrderResponse.id;
  };

export const respondPurchaseOrder =
  (id: number, approved: boolean): AppThunk =>
  async (dispatch, getState) => {
    const requestGeneration = getState().purchaseOrders.requestGeneration ?? 0;
    const purchaseOrderResponse = await api.patch<PurchaseOrder>(
      `${basePath}/${id}/respond?approved=${approved}`,
      {}
    );
    dispatch(
      slice.actions.editPurchaseOrder({
        purchaseOrder: purchaseOrderResponse,
        requestGeneration
      })
    );
  };

export const deletePurchaseOrder =
  (id: number): AppThunk =>
  async (dispatch, getState) => {
    const requestGeneration = getState().purchaseOrders.requestGeneration ?? 0;
    const purchaseOrderResponse = await api.deletes<{ success: boolean }>(
      `${basePath}/${id}`
    );
    const { success } = purchaseOrderResponse;
    if (success) {
      dispatch(slice.actions.deletePurchaseOrder({ id, requestGeneration }));
    }
  };

export const clearSinglePurchaseOrder = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.clearSinglePurchaseOrder({}));
};

export default slice;
