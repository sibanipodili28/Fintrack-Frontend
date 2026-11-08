import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import api, { errorMessage } from '../../services/api';
import type { AuthResponse, User } from '../../types';

interface AuthState { user: User | null; accessToken: string | null; initializing: boolean; loading: boolean; error: string | null }

const initialState: AuthState = { user: null, accessToken: null, initializing: true, loading: false, error: null };

type Creds = { email: string; password: string };
type RegisterBody = Creds & { fullName: string };

export const login = createAsyncThunk<AuthResponse, Creds, { rejectValue: string }>('auth/login', async (body, { rejectWithValue }) => {
  try { return (await api.post<AuthResponse>('/auth/login', body)).data; } catch (e) { return rejectWithValue(errorMessage(e)); }
});

export const register = createAsyncThunk<AuthResponse, RegisterBody, { rejectValue: string }>('auth/register', async (body, { rejectWithValue }) => {
  try { return (await api.post<AuthResponse>('/auth/register', body)).data; } catch (e) { return rejectWithValue(errorMessage(e)); }
});

// Restores the session on page load from the HttpOnly refresh cookie. Shared promise so React StrictMode's
// double effect cannot send two refreshes (the second would hit a rotated token).
let bootstrapPromise: Promise<AuthResponse> | null = null;
export const bootstrap = createAsyncThunk<AuthResponse>('auth/bootstrap', async () => {
  bootstrapPromise ??= api.post<AuthResponse>('/auth/refresh').then((r) => r.data).finally(() => { setTimeout(() => { bootstrapPromise = null; }, 1000); });
  return bootstrapPromise;
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try { await api.post('/auth/logout'); } catch { /* clearing local state matters more */ }
});

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionRefreshed(state, a: PayloadAction<AuthResponse>) { state.user = a.payload.user; state.accessToken = a.payload.accessToken; },
    sessionCleared(state) { state.user = null; state.accessToken = null; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (b) => {
    const ok = (s: AuthState, a: PayloadAction<AuthResponse>) => { s.loading = false; s.error = null; s.user = a.payload.user; s.accessToken = a.payload.accessToken; };
    b.addCase(login.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(login.fulfilled, ok);
    b.addCase(login.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? 'Login failed'; });
    b.addCase(register.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(register.fulfilled, ok);
    b.addCase(register.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? 'Registration failed'; });
    b.addCase(bootstrap.fulfilled, (s, a) => { s.initializing = false; s.user = a.payload.user; s.accessToken = a.payload.accessToken; });
    b.addCase(bootstrap.rejected, (s) => { s.initializing = false; });
    b.addCase(logout.fulfilled, (s) => { s.user = null; s.accessToken = null; });
  },
});

export const { sessionRefreshed, sessionCleared, clearError } = slice.actions;
export default slice.reducer;
