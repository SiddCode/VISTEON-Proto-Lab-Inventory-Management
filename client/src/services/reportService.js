import api from './api';

export const reportService = {
  async getOutwardReport(params = {}) {
    const response = await api.get('/reports/outward', { params });
    return response.data;
  },

  async exportOutwardCsv(params = {}) {
    const response = await api.get('/reports/outward/export', {
      params,
      responseType: 'blob',
    });
    
    // Create download trigger
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Visteon_Outward_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  },
};
