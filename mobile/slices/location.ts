import { logSafeError } from '../utils/safeErrorLog';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from '../store';
import Location, { LocationMiniDTO, LocationRow } from '../models/location';
import api from '../utils/api';
import {
  createCancellableRequest,
  isAbortError
} from '../utils/cancellableRequest';
import { getInitialPage, Page, SearchCriteria } from '../models/page';
import { revertAll } from '../utils/redux';

interface LocationState {
  locations: Page<Location>;
  locationInfos: { [key: number]: { location?: Location } };
  locationsHierarchy: LocationRow[];
  locationsMini: LocationMiniDTO[];
  currentPageNum: number;
  lastPage: boolean;
  listLoading: boolean;
  latestListRequestId: number;
  latestMiniRequestId: number;
  deletedLocationIds: { [key: number]: boolean };
  cacheGeneration: number;
  locationChildrenPageNum: { [key: number]: number };
  locationChildrenLastPage: { [key: number]: boolean };
  loadingGet: boolean;
}

const initialState: LocationState = {
  locations: getInitialPage<Location>(),
  locationInfos: {},
  locationsHierarchy: [],
  locationsMini: [],
  currentPageNum: 0,
  lastPage: true,
  listLoading: false,
  latestListRequestId: 0,
  latestMiniRequestId: 0,
  deletedLocationIds: {},
  cacheGeneration: 0,
  locationChildrenPageNum: {},
  locationChildrenLastPage: {},
  loadingGet: false
};

const slice = createSlice({
  name: 'locations',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getLocations(
      state: LocationState,
      action: PayloadAction<{ locations: Page<Location>; requestId: number }>
    ) {
      const { locations, requestId } = action.payload;
      if (requestId !== state.latestListRequestId) return;
      state.locations = locations;
      state.currentPageNum = 0;
      state.lastPage = locations.last;
    },
    getMoreLocations(
      state: LocationState,
      action: PayloadAction<{ locations: Page<Location>; requestId: number }>
    ) {
      const { locations, requestId } = action.payload;
      if (requestId !== state.latestListRequestId) return;
      state.locations.content = state.locations.content.concat(
        locations.content
      );
      state.currentPageNum = state.currentPageNum + 1;
      state.lastPage = locations.last;
    },
    getLocationDetails(
      state: LocationState,
      action: PayloadAction<{ location; id: number; cacheGeneration: number }>
    ) {
      const { location, id, cacheGeneration } = action.payload;
      if (
        cacheGeneration !== state.cacheGeneration ||
        state.deletedLocationIds[id]
      )
        return;
      if (state.locationInfos[id]) {
        state.locationInfos[id] = { ...state.locationInfos[id], location };
      } else state.locationInfos[id] = { location };
    },
    getLocationsMini(
      state: LocationState,
      action: PayloadAction<{ locations: LocationMiniDTO[]; requestId: number }>
    ) {
      const { locations, requestId } = action.payload;
      if (requestId !== state.latestMiniRequestId) return;
      state.locationsMini = locations;
    },
    addLocation(
      state: LocationState,
      action: PayloadAction<{ location: Location }>
    ) {
      const { location } = action.payload;
      delete state.deletedLocationIds[location.id];
      state.locations.content = [...state.locations.content, location];
      state.locationsMini = [
        ...state.locationsMini,
        {
          id: location.id,
          name: location.name,
          address: location.address,
          customId: location.customId
        }
      ];
    },
    editLocation(
      state: LocationState,
      action: PayloadAction<{ location: Location }>
    ) {
      const { location } = action.payload;
      delete state.deletedLocationIds[location.id];
      if (state.locationInfos[location.id]) {
        state.locationInfos[location.id].location = location;
      } else state.locationInfos[location.id] = { location };
    },
    deleteLocation(
      state: LocationState,
      action: PayloadAction<{
        id: number;
        listRequestId: number;
        miniRequestId: number;
        cacheGeneration: number;
      }>
    ) {
      const { id } = action.payload;
      // Deleting a parent location may cascade to descendants on the server.
      // Derive the known subtree before removing its hierarchy rows.
      const deletedIds = new Set<number>([id]);
      state.locationsHierarchy.forEach((location) => {
        if (location.hierarchy.includes(id)) deletedIds.add(location.id);
      });

      const cachedLocations = [
        ...state.locations.content,
        ...state.locationsHierarchy,
        ...Object.values(state.locationInfos).flatMap(({ location }) =>
          location ? [location] : []
        )
      ];
      let foundDescendant = true;
      while (foundDescendant) {
        foundDescendant = false;
        cachedLocations.forEach((location) => {
          if (
            location.parentLocation &&
            deletedIds.has(location.parentLocation.id) &&
            !deletedIds.has(location.id)
          ) {
            deletedIds.add(location.id);
            foundDescendant = true;
          }
        });
      }

      state.locations.content = state.locations.content.filter(
        (location) => !deletedIds.has(location.id)
      );
      state.locationsHierarchy = state.locationsHierarchy.filter(
        (location) => !location.hierarchy.includes(id)
      );

      deletedIds.forEach((locationId) => {
        state.deletedLocationIds[locationId] = true;
        delete state.locationInfos[locationId];
        delete state.locationChildrenPageNum[locationId];
        delete state.locationChildrenLastPage[locationId];
      });

      // Mini DTOs omit parent IDs, so invalidate the whole cache: it may
      // contain descendants that were not loaded into the visible hierarchy.
      state.locationsMini = [];
      // Responses started before a successful delete must not repopulate caches.
      state.latestListRequestId = action.payload.listRequestId;
      state.latestMiniRequestId = action.payload.miniRequestId;
      state.listLoading = false;
      state.cacheGeneration = action.payload.cacheGeneration;
    },
    getLocationChildren(
      state: LocationState,
      action: PayloadAction<{
        locations: LocationRow[];
        id: number;
        pageNum: number;
        lastPage: boolean;
        cacheGeneration: number;
      }>
    ) {
      const { locations, id, pageNum, lastPage, cacheGeneration } =
        action.payload;
      if (
        cacheGeneration !== state.cacheGeneration ||
        state.deletedLocationIds[id]
      )
        return;
      const parent = state.locationsHierarchy.findIndex(
        (location) => location.id === id
      );
      if (parent !== -1)
        state.locationsHierarchy[parent].childrenFetched = true;

      if (pageNum === 0) {
        state.locationsHierarchy = state.locationsHierarchy.filter(
          (location) => {
            if (id === 0) return location.hierarchy.length !== 1;
            return location.hierarchy[location.hierarchy.length - 2] !== id;
          }
        );
      }

      const currentLocations = locations.filter(
        (location) =>
          !state.deletedLocationIds[location.id] &&
          !location.hierarchy.some(
            (ancestorId) => state.deletedLocationIds[ancestorId]
          )
      );
      state.locationsHierarchy = currentLocations.reduce((acc, location) => {
        //check if location already exists in state
        const locationInState = state.locationsHierarchy.findIndex(
          (location1) => location1.id === location.id
        );
        //not found
        if (locationInState === -1) return [...acc, location];
        //found
        acc[locationInState] = location;
        return acc;
      }, state.locationsHierarchy);

      state.locationChildrenPageNum[id] = pageNum;
      state.locationChildrenLastPage[id] = lastPage;
    },
    setLoadingGet(
      state: LocationState,
      action: PayloadAction<{ loading: boolean }>
    ) {
      const { loading } = action.payload;
      state.loadingGet = loading;
    },
    beginListRequest(state: LocationState, action: PayloadAction<number>) {
      state.latestListRequestId = action.payload;
      state.listLoading = true;
    },
    finishListRequest(state: LocationState, action: PayloadAction<number>) {
      if (action.payload === state.latestListRequestId) {
        state.listLoading = false;
      }
    },
    setLatestMiniRequest(state: LocationState, action: PayloadAction<number>) {
      state.latestMiniRequestId = action.payload;
    },
    beginCacheRequest(state: LocationState, action: PayloadAction<number>) {
      state.cacheGeneration = action.payload;
    }
  }
});

export const reducer = slice.reducer;

let listRequestSequence = 0;
let miniRequestSequence = 0;
let locationCacheGeneration = 0;

export const getLocations =
  (criteria: SearchCriteria): AppThunk =>
  async (dispatch) => {
    const requestId = ++listRequestSequence;
    const { signal } = createCancellableRequest('getLocations');
    try {
      dispatch(slice.actions.beginListRequest(requestId));
      const locations = await api.post<Page<Location>>(
        `locations/search`,
        criteria,
        { signal }
      );
      dispatch(slice.actions.getLocations({ locations, requestId }));
    } catch (error) {
      if (isAbortError(error)) return;
      throw error;
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getMoreLocations =
  (criteria: SearchCriteria, pageNum: number): AppThunk =>
  async (dispatch) => {
    const requestId = ++listRequestSequence;
    const { signal } = createCancellableRequest('getMoreLocations');
    criteria = { ...criteria, pageNum };
    try {
      dispatch(slice.actions.beginListRequest(requestId));
      const locations = await api.post<Page<Location>>(
        `locations/search`,
        criteria,
        { signal }
      );
      dispatch(slice.actions.getMoreLocations({ locations, requestId }));
    } catch (error) {
      if (isAbortError(error)) return;
      throw error;
    } finally {
      dispatch(slice.actions.finishListRequest(requestId));
    }
  };
export const getLocationDetails =
  (id: number): AppThunk =>
  async (dispatch) => {
    const cacheGeneration = locationCacheGeneration;
    dispatch(slice.actions.beginCacheRequest(cacheGeneration));
    dispatch(slice.actions.setLoadingGet({ loading: true }));
    try {
      const location = await api.get<Location>(`locations/${id}`);
      dispatch(
        slice.actions.getLocationDetails({
          id,
          location,
          cacheGeneration
        })
      );
    } finally {
      dispatch(slice.actions.setLoadingGet({ loading: false }));
    }
  };
export const getLocationsMini = (): AppThunk => async (dispatch) => {
  const requestId = ++miniRequestSequence;
  const { signal } = createCancellableRequest('getLocationsMini');
  try {
    dispatch(slice.actions.setLatestMiniRequest(requestId));
    dispatch(slice.actions.setLoadingGet({ loading: true }));
    const locations = await api.get<LocationMiniDTO[]>('locations/mini', {
      signal
    });
    dispatch(slice.actions.getLocationsMini({ locations, requestId }));
  } catch (error) {
    if (isAbortError(error)) return;
    throw error;
  } finally {
    dispatch(slice.actions.setLoadingGet({ loading: false }));
  }
};
export const addLocation =
  (location): AppThunk =>
  async (dispatch) => {
    const locationResponse = await api.post<Location>('locations', location);
    dispatch(slice.actions.addLocation({ location: locationResponse }));
    return locationResponse;
  };
export const editLocation =
  (id: number, location): AppThunk =>
  async (dispatch) => {
    const locationResponse = await api.patch<Location>(
      `locations/${id}`,
      location
    );
    dispatch(slice.actions.editLocation({ location: locationResponse }));
  };
export const deleteLocation =
  (id: number): AppThunk =>
  async (dispatch) => {
    const locationResponse = await api.deletes<{ success: boolean }>(
      `locations/${id}`
    );
    const { success } = locationResponse;
    if (success) {
      const cacheGeneration = ++locationCacheGeneration;
      dispatch(
        slice.actions.deleteLocation({
          id,
          listRequestId: ++listRequestSequence,
          miniRequestId: ++miniRequestSequence,
          cacheGeneration
        })
      );
    }
  };

export const getLocationChildren =
  (id: number, parents: number[], pageNum = 0, pageSize = 20): AppThunk =>
  async (dispatch) => {
    const cacheGeneration = locationCacheGeneration;
    try {
      dispatch(slice.actions.beginCacheRequest(cacheGeneration));
      dispatch(slice.actions.setLoadingGet({ loading: true }));
      const page = await api.get<Page<Location>>(
        `locations/children/${id}/paginated?page=${pageNum}&size=${pageSize}`
      );
      dispatch(
        slice.actions.getLocationChildren({
          id,
          pageNum,
          lastPage: page.last,
          cacheGeneration,
          locations: page.content.map((location) => {
            return { ...location, hierarchy: [...parents, location.id] };
          })
        })
      );
    } catch (e) {
      logSafeError('Mobile operation failed', e);
    } finally {
      dispatch(slice.actions.setLoadingGet({ loading: false }));
    }
  };
export default slice;
