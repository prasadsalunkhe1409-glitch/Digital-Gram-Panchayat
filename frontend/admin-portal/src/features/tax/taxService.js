import { apiClient } from '@/services/api-client';

export const taxService = {
  async list(params = {}) {
    const { data } = await apiClient.get('/admin/tax', { params });
    return data.data;
  },
  async getOne(id) {
    const { data } = await apiClient.get(`/admin/tax/${id}`);
    return data.data;
  },
  async history(id) {
    const { data } = await apiClient.get(`/admin/tax/${id}/history`);
    return data.data;
  },
  /** Partial citizen search: name, mobile or property/tax number. Matching is server-side. */
  async searchCitizens(q, ward) {
    const { data } = await apiClient.get('/admin/tax/lookup', {
      params: { q, ...(ward ? { ward } : {}) },
    });
    return data.data;
  },
  async create(values, files = []) {
    // Multipart only when bills are attached — plain JSON otherwise (backward compatible).
    if (files.length) {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') fd.append(k, v);
      });
      files.forEach((f) => fd.append('bills', f));
      const { data } = await apiClient.post('/admin/tax', fd);
      return data.data;
    }
    const { data } = await apiClient.post('/admin/tax', values);
    return data.data;
  },
  async update(id, payload) {
    const { data } = await apiClient.patch(`/admin/tax/${id}`, payload);
    return data.data;
  },
  async addPayment(id, payload) {
    const { data } = await apiClient.post(`/admin/tax/${id}/payment`, payload);
    return data.data;
  },
};
