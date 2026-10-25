import api from './api';

export const stockService = {
  async receiveStock(data) {
    const response = await api.post('/stock/inward', data);
    return response.data;
  },

  async issueStock(data) {
    const response = await api.post('/stock/outward', data);
    return response.data;
  },

  async getTransactions(params = {}) {
    const response = await api.get('/stock/transactions', { params });
    return response.data;
  },

  async getTransactionById(id) {
    const response = await api.get(`/stock/transactions/${id}`);
    return response.data;
  },
};
