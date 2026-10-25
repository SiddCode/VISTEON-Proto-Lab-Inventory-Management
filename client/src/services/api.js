import axios from 'axios';

/**
 * Normalizes an API base URL so that it has /api appended exactly once,
 * regardless of trailing slashes or whether /api was already supplied.
 * Examples:
 *   https://visteon-backend.onrender.com      -> https://visteon-backend.onrender.com/api
 *   https://visteon-backend.onrender.com/     -> https://visteon-backend.onrender.com/api
 *   https://visteon-backend.onrender.com/api  -> https://visteon-backend.onrender.com/api
 *   https://visteon-backend.onrender.com/api/ -> https://visteon-backend.onrender.com/api
 */
export const normalizeApiUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  // Strip trailing slashes
  const clean = trimmed.replace(/\/+$/, '');
  if (!clean) return '';
  // Case-insensitive check for /api suffix
  if (clean.toLowerCase().endsWith('/api')) {
    return clean.slice(0, -4) + '/api';
  }
  return `${clean}/api`;
};

export const getRuntimeBackendUrl = () => {
  if (typeof window === 'undefined') return '';
  return window.__VISTEON_API_URL__ || localStorage.getItem('visteon_api_url') || '';
};

export const setRuntimeBackendUrl = (url) => {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem('visteon_api_url');
    delete window.__VISTEON_API_URL__;
  } else {
    const normalized = normalizeApiUrl(url);
    localStorage.setItem('visteon_api_url', normalized);
    window.__VISTEON_API_URL__ = normalized;
  }
};

/**
 * Resolves the API Base URL:
 * 1. Checks build-time environment variable VITE_API_URL / VITE_API_BASE_URL
 * 2. Checks runtime overrides (localStorage 'visteon_api_url' or window.__VISTEON_API_URL__)
 * 3. In production: REJECTS silent fallback to '/api' to prevent hitting static CDNs with empty 200 responses.
 * 4. In development: Defaults to relative '/api' (proxied by Vite to http://localhost:5000)
 */
export const resolveBaseUrl = () => {
  // 1. Build-time Vite env variable
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return normalizeApiUrl(envUrl);
  }

  // 2. Runtime override from localStorage or window (for production verification & hot configuration)
  const runtimeUrl = getRuntimeBackendUrl();
  if (runtimeUrl && typeof runtimeUrl === 'string' && runtimeUrl.trim()) {
    return normalizeApiUrl(runtimeUrl);
  }

  // 3. In production: DO NOT silently fall back to relative /api!
  // On a static host (Render Static Site), relative /api requests hit the CDN and return empty HTML rewrites.
  if (import.meta.env.PROD) {
    console.error(
      '[VISTEON Config] Missing VITE_API_URL in production build. ' +
      'In production, VITE_API_URL must point to your deployed Render backend web service.'
    );
    return '__MISSING_PRODUCTION_BACKEND_URL__';
  }

  // 4. In local development: use relative /api (proxied by Vite dev server to localhost:5000)
  return '/api';
};

// Diagnostic info for environment verification
export const getApiConfigInfo = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
  const runtimeUrl = getRuntimeBackendUrl();
  const activeBaseUrl = resolveBaseUrl();
  const isProd = import.meta.env.PROD;
  const isConfigured = activeBaseUrl !== '__MISSING_PRODUCTION_BACKEND_URL__';

  return {
    isProd,
    envUrl,
    runtimeUrl,
    activeBaseUrl,
    isConfigured,
  };
};

// Create the single shared Axios instance for the entire application
const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout
});

// Expose runtime config helpers on window for live production diagnostics
if (typeof window !== 'undefined') {
  window.__VISTEON_CONFIG__ = {
    getConfig: getApiConfigInfo,
    setBackendUrl: (url) => {
      setRuntimeBackendUrl(url);
      window.location.reload();
    },
    clearBackendUrl: () => {
      setRuntimeBackendUrl('');
      window.location.reload();
    },
  };
}

// Request Interceptor: Auth token attachment + Safe Diagnostic Logging
api.interceptors.request.use(
  (config) => {
    // 1. Guard against unconfigured backend URL in production
    if (config.baseURL === '__MISSING_PRODUCTION_BACKEND_URL__') {
      const errorMsg =
        'Production Configuration Error: Missing VITE_API_URL. ' +
        'Your frontend was built without a backend URL. Please set VITE_API_URL in your Render Static Site Environment settings ' +
        'pointing to your Render backend web service URL (e.g. https://<backend-name>.onrender.com) and redeploy.';
      console.error(`[API Config Error] ${errorMsg}`);
      return Promise.reject(new Error(errorMsg));
    }

    // 2. Attach Bearer token from localStorage
    const token = localStorage.getItem('visteon_token');
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // 3. Safe diagnostic logging (Never log passwords, tokens, or request payloads)
    const sanitizedUrl = `${config.baseURL || ''}${config.url || ''}`;
    console.log(`[API Request] ${config.method?.toUpperCase()} ${sanitizedUrl}`);

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error.message);
    return Promise.reject(error);
  }
);

// Response Interceptor: Safe Diagnostic Logging + Empty Body Detection + 401 Handling
api.interceptors.response.use(
  (response) => {
    const contentType = response.headers?.['content-type'] || 'unspecified';
    const contentLength = response.headers?.['content-length'] ?? (typeof response.data === 'string' ? response.data.length : 'chunked');
    const fullUrl = `${response.config?.baseURL || ''}${response.config?.url || ''}`;

    // Safe diagnostic logging: Method, Route, Status, and Response Content-Type
    console.log(
      `[API Response] ${response.config?.method?.toUpperCase()} ${fullUrl} -> ` +
      `Status: ${response.status} | Content-Type: ${contentType} | Content-Length: ${contentLength}`
    );

    // Defensive check: If HTTP 200 is received with empty body (0 bytes or blank string)
    // from a misconfigured static host proxy
    if (response.status === 200 && (!response.data || (typeof response.data === 'string' && !response.data.trim()))) {
      console.warn(
        `[API Warning] Received HTTP 200 with empty body from ${fullUrl}. ` +
        `This typically occurs when API requests hit a static CDN rewrite rather than the Express backend.`
      );
    }

    return response;
  },
  (error) => {
    const fullUrl = `${error.config?.baseURL || ''}${error.config?.url || ''}`;
    const status = error.response?.status || 'Network/CORS Error';
    const contentType = error.response?.headers?.['content-type'] || 'none';

    // Safe diagnostic logging: Never logs passwords or secrets
    console.error(
      `[API Response Error] ${error.config?.method?.toUpperCase() || 'UNKNOWN'} ${fullUrl} -> ` +
      `Status: ${status} | Content-Type: ${contentType} | Message: ${error.message}`
    );

    // If unauthorized (401) on a protected resource, clear session and redirect to /login
    if (error.response && error.response.status === 401) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isLoginRequest = error.config && error.config.url && error.config.url.includes('/auth/login');
      if (!currentPath.includes('/login') && !isLoginRequest) {
        localStorage.removeItem('visteon_token');
        localStorage.removeItem('visteon_user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
