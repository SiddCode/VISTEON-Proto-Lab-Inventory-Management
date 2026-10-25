import api from './api';

export const settingsService = {
  async getSettings() {
    const response = await api.get('/settings');
    return response.data;
  },

  async updateSettings(data) {
    const response = await api.patch('/settings', data);
    return response.data;
  },

  async triggerSeed() {
    const response = await api.post('/seed');
    return response.data;
  },
};
