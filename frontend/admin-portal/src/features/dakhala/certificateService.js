import { apiClient } from '@/services/api-client';

export const certificateService = {
  /**
   * Record and issue a certificate directly, for an officer working at the counter. Multipart
   * because it carries the supporting documents through the same upload path — and therefore
   * the same magic-byte check — as a citizen application.
   */
  async officerCreate(values, files = [], certificate = null) {
    const form = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v);
    });
    files.filter(Boolean).forEach((f) => form.append('documents', f));
    // Counter issuance records the application and issues it in one movement, so the
    // prepared certificate travels with it. The API refuses the call without one.
    if (certificate) form.append('certificate', certificate);
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
  /**
   * Issue a certificate the officer has prepared.
   *
   * Multipart, because the officer's signed certificate travels with the decision. The API
   * refuses an approve without one — the system no longer authors the document.
   */
  async approve(id, { file, ...edits } = {}) {
    const form = new FormData();
    if (file) form.append('certificate', file);
    if (edits.applicationData)
      form.append('applicationData', JSON.stringify(edits.applicationData));
    if (edits.officerRemarks) form.append('officerRemarks', edits.officerRemarks);
    const { data } = await apiClient.patch(`/admin/dakhala/${id}/approve`, form);
    return data.data;
  },
  async reject(id, reason) {
    const { data } = await apiClient.patch(`/admin/dakhala/${id}/reject`, { reason });
    return data.data;
  },
};
