import api from './api';

export const inventoryService = {
  async getInventory(params = {}) {
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  async getInventoryById(id) {
    const response = await api.get(`/inventory/${id}`);
    return response.data;
  },

  async createPart(partData) {
    const response = await api.post('/inventory', partData);
    return response.data;
  },

  async updatePart(id, metadata) {
    const response = await api.patch(`/inventory/${id}`, metadata);
    return response.data;
  },

  async deletePart(id) {
    const response = await api.delete(`/inventory/${id}`);
    return response.data;
  },

  async previewImport(formData) {
    const response = await api.post('/inventory/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async confirmImport(rows, mode = 'SKIP_DUPLICATES') {
    const response = await api.post('/inventory/import/confirm', { rows, mode });
    return response.data;
  },

  async exportPrimaryExcel(params = {}) {
    const response = await api.get('/inventory/export/excel', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Visteon_E-COMP_MASTER_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async exportEnhancedExcel(params = {}) {
    const response = await api.get('/inventory/export/enhanced', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Visteon_Enhanced_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
