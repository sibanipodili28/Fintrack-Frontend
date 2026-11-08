import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse } from '../types';

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1';

const api = axios.create({ baseURL, withCredentials: true });

interface AuthHooks {
  getToken: () => string | null;
  onRefreshed: (r: AuthResponse) => void;
  onAuthFailure: () => void;
}
let hooks: AuthHooks | null = null;
export const configureApi = (h: AuthHooks) => { hooks = h; };

api.interceptors.request.use((config) => {
  const token = hooks?.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// One refresh at a time: parallel 401s share the same refresh request (refresh tokens rotate).
let refreshing: Promise<AuthResponse> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        refreshing ??= axios
          .post<AuthResponse>(`${baseURL}/auth/refresh`, null, { withCredentials: true })
          .then((r) => r.data)
          .finally(() => { refreshing = null; });
        const data = await refreshing;
        hooks?.onRefreshed(data);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        hooks?.onAuthFailure();
      }
    }
    return Promise.reject(error);
  },
);

export const errorMessage = (e: unknown): string => {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { message?: string; fieldErrors?: Record<string, string> } | undefined;
    if (data?.fieldErrors) return Object.values(data.fieldErrors).join(', ');
    return data?.message ?? (e.response ? 'Request failed' : 'Cannot reach the server');
  }
  return 'Unexpected error';
};

export default api;
