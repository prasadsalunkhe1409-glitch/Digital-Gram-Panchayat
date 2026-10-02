import { apiClient } from '@/services/api-client';

export const certificateService = {
  /**
   * Record and issue a certificate directly, for an officer working at the counter. Multipart
   * because it carries the supporting documents through the same upload path — and therefore
   * the same magic-byte check — as a citizen application.
   */
  async officerCreate(values, files = []) {
    const form = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v);
    });
    files.filter(Boolean).forEach((f) => form.append('documents', f));
    const { data } = await apiClient.post('/admin/dakhala', form);
    return data.data;
  },

  async list(params = {}) {
    const { data } = await apiClient.get('/admin/dakhala', { params });
    return data.data;
  },
  async getOne(id) {
    const { data } = await apiClient.get(`/admin/dakhala/${id}`);
    return data.data;
  },
  async review(id) {
    const { data } = await apiClient.patch(`/admin/dakhala/${id}/review`);
    return data.data;
  },
  async approve(id, edits = {}) {
    // edits: optional { applicationData, officerRemarks } applied before the certificate is
    // generated. Omitting it keeps the original behaviour (approve with no changes).
    const { data } = await apiClient.patch(`/admin/dakhala/${id}/approve`, edits);
    return data.data;
  },
  async reject(id, reason) {
    const { data } = await apiClient.patch(`/admin/dakhala/${id}/reject`, { reason });
    return data.data;
  },
};
