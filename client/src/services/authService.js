import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    let payload = response.data;
    // Auto-parse stringified JSON if needed
    if (typeof payload === 'string' && payload.trim()) {
      try {
        payload = JSON.parse(payload);
      } catch {
        // Keep as string
      }
    }
    return payload;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    let payload = response.data;
    if (typeof payload === 'string' && payload.trim()) {
      try {
        payload = JSON.parse(payload);
      } catch {
        // Keep as string
      }
    }
    return payload;
  },

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async updateProfile(profileData) {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },
};
