import axios from 'axios';
import { tokenStore } from '../auth/tokenStore';

// ---------------------------------------------------------------------------
// Configuration (from Vite env)
// ---------------------------------------------------------------------------
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = (
  rawBaseUrl && rawBaseUrl.trim() !== ''
    ? rawBaseUrl
    : import.meta.env.PROD
      ? '/api/v1'
      : 'http://localhost:4000/api/v1'
).replace(/\/+$/, '');

function resolveOrigin(url) {
  try {
    if (typeof window !== 'undefined' && window.location) {
      return new URL(url, window.location.origin).origin;
    }
    return '';
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
}
/** Origin of the API server, e.g. http://localhost:4000 (used for /health and /share links). */
export const API_ORIGIN = resolveOrigin(API_BASE_URL);

// ---------------------------------------------------------------------------
// Error type — every failed request rejects with one of these.
// Backend shape: { error: { code, message, details? }, requestId? }
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message = 'Something went wrong.', details, requestId } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

function toApiError(error) {
  if (error instanceof ApiError) return error;
  if (error?.response) {
    const { status, data } = error.response;
    const body = data?.error;
    return new ApiError({
      status,
      code: body?.code ?? `HTTP_${status}`,
      message: body?.message ?? (status >= 500 ? 'The server ran into a problem. Please try again.' : 'The request could not be completed.'),
      details: body?.details,
      requestId: data?.requestId,
    });
  }
  if (error?.code === 'ECONNABORTED') {
    return new ApiError({ status: 0, code: 'TIMEOUT', message: 'The request took too long. Please try again.' });
  }
  return new ApiError({
    status: 0,
    code: 'NETWORK_ERROR',
    message: `Can't reach the MemoCare server at ${API_ORIGIN}. Check that the backend is running.`,
  });
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
export const http = axios.create({ baseURL: API_BASE_URL, timeout: 30_000 });

http.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh: concurrent 401s (and React StrictMode's double effects)
// share one /auth/refresh call. This matters because the backend ROTATES the
// refresh token — a second parallel call with the old token would be rejected.
let refreshPromise = null;

export function refreshSession() {
  if (refreshPromise) return refreshPromise;
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) {
    return Promise.reject(new ApiError({ status: 401, code: 'NO_SESSION', message: 'Please sign in again.' }));
  }
  // Plain axios (not `http`) so this call can never re-enter the interceptor below.
  refreshPromise = axios
    .post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 30_000 })
    .then((res) => {
      const tokens = res.data.data;
      tokenStore.setTokens(tokens);
      return tokens.accessToken;
    })
    .catch((err) => {
      const apiError = toApiError(err);
      // Only drop the session when the server actually rejected the token,
      // not when the network hiccuped.
      if (apiError.status === 401 || apiError.status === 403) {
        tokenStore.clear();
        window.dispatchEvent(new CustomEvent('memocare:session-expired'));
      }
      throw apiError;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

const REFRESHABLE_CODES = ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'UNAUTHORIZED'];

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Error bodies of blob requests (PDF export, media) arrive as Blobs — decode them.
    const data = error?.response?.data;
    if (typeof Blob !== 'undefined' && data instanceof Blob && data.type?.includes('json')) {
      try {
        error.response.data = JSON.parse(await data.text());
      } catch {
        /* keep blob */
      }
    }

    const apiError = toApiError(error);
    const original = error?.config;

    const shouldRefresh =
      apiError.status === 401 &&
      original &&
      !original._retried &&
      !original.skipAuth &&
      REFRESHABLE_CODES.includes(apiError.code) &&
      tokenStore.getRefreshToken();

    if (shouldRefresh) {
      original._retried = true;
      const newToken = await refreshSession(); // throws ApiError if the session is really gone
      original.headers.Authorization = `Bearer ${newToken}`;
      return http(original);
    }
    throw apiError;
  }
);

/** Unwraps the backend's `{ data }` envelope. */
export const unwrap = (promise) => promise.then((res) => res.data?.data);
