export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

let accessTokenGetter = () => null;
let apiKeyGetter = () => null;
let refreshSession = async () => false;
let onAuthFailure = () => {};
let adminHeaderBuilder = null;

export function configureApiAuth({ getAccessToken, getApiKey, refreshAuth, onUnauthorized, getAdminHeaders }) {
  accessTokenGetter = getAccessToken || (() => null);
  apiKeyGetter = getApiKey || (() => null);
  refreshSession = refreshAuth || (async () => false);
  onAuthFailure = onUnauthorized || (() => {});
  adminHeaderBuilder = getAdminHeaders || null;
}

function shouldSignAdminRequest(path) {
  return path.startsWith('/api/all') || path.startsWith('/api/users') || path.startsWith('/api/admin');
}

async function buildHeaders(path, options) {
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const token = accessTokenGetter();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const apiKey = apiKeyGetter();
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  if (adminHeaderBuilder && shouldSignAdminRequest(path)) {
    const adminHeaders = await adminHeaderBuilder(path);
    Object.assign(headers, adminHeaders);
  }

  return headers;
}

export async function api(path, options = {}, retry = true) {
  const headers = await buildHeaders(path, options);

  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && retry && path !== '/api/refresh') {
    const refreshed = await refreshSession();
    if (refreshed) {
      return api(path, options, false);
    }
    onAuthFailure();
  }

  if (!response.ok) {
    throw new ApiError(data.message || 'Request failed', response.status, data);
  }

  return data;
}

export function shortUrl(code) {
  return `${API_URL}/${code}`;
}
