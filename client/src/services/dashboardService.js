import api from './api';

export const dashboardService = {
  async getDashboardSummary() {
    const response = await api.get('/dashboard/summary');
    return response.data;
  },

  async getRecentTransactions() {
    const response = await api.get('/dashboard/recent-transactions');
    return response.data;
  },
};
