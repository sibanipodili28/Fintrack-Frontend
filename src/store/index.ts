import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authReducer, { sessionCleared, sessionRefreshed } from '../features/auth/authSlice';
import { configureApi } from '../services/api';

const rootReducer = combineReducers({ auth: authReducer });
export type RootState = ReturnType<typeof rootReducer>;

export const makeStore = (preloadedState?: Partial<RootState>) => configureStore({ reducer: rootReducer, preloadedState });
export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];

export const store = makeStore();

configureApi({
  getToken: () => store.getState().auth.accessToken,
  onRefreshed: (r) => store.dispatch(sessionRefreshed(r)),
  onAuthFailure: () => store.dispatch(sessionCleared()),
});
