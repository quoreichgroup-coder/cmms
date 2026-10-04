import type { TypedUseSelectorHook } from 'react-redux';
import {
  useDispatch as useReduxDispatch,
  useSelector as useReduxSelector
} from 'react-redux';
import type { ThunkAction } from 'redux-thunk';
import type { Action } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import { ImportResponse } from '../models/imports';
import { createTransform, persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearTransientState = (state: any) => {
  if (!state || typeof state !== 'object') return state;
  return Object.fromEntries(Object.entries(state).map(([key, value]) => [
    key, key.toLowerCase().startsWith('loading')
      ? (typeof value === 'object' && value ? Object.fromEntries(Object.keys(value).map((operation) => [operation, false])) : false)
      : key === 'errors' ? {} : value
  ]));
};

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  blacklist: ['license'],
  version: 1,
  migrate: async (state: any): Promise<any> => state ? Object.fromEntries(
    Object.entries(state).filter(([key]) => key !== 'license').map(([key, value]) => [key, clearTransientState(value)])
  ) : state,
  transforms: [createTransform(clearTransientState, clearTransientState)]
};
const persistedReducer = persistReducer<ReturnType<typeof rootReducer>>(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  devTools: true,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export type StoreReturnType = any;
export type AppThunk = ThunkAction<
  Promise<StoreReturnType>,
  RootState,
  null,
  Action<string>
>;

export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

export const useDispatch = () => useReduxDispatch<AppDispatch>();

export const persistor = persistStore(store);

export default store;
