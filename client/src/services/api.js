import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('visteon_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and not already on login page, clear token
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('visteon_token');
        localStorage.removeItem('visteon_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
