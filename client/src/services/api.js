import axios from 'axios';

// Resolves API base URL:
// 1. In production on Render/Vercel: uses VITE_API_URL if configured (e.g. https://visteon-inventory-api.onrender.com)
// 2. In local development or unified deployment: defaults to '/api' (proxied by Vite to http://localhost:5000)
const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) return '/api';
  const clean = envUrl.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer token from localStorage to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('visteon_token');
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized (401) on a protected resource, clear session and redirect to /login
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      const isLoginRequest = error.config && error.config.url && error.config.url.includes('/auth/login');
      if (!currentPath.includes('/login') && !isLoginRequest) {
        localStorage.removeItem('visteon_token');
        localStorage.removeItem('visteon_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
