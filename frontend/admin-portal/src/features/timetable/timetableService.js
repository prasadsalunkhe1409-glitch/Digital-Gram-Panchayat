import { apiClient } from '@/services/api-client';

/**
 * Timetable entries are plain JSON — no uploads — so this posts objects rather than the
 * FormData the governance services need.
 */
export const timetableService = {
  async list(params) {
    const { data } = await apiClient.get('/admin/timetable', { params });
    return data.data;
  },
  async create(values) {
    const { data } = await apiClient.post('/admin/timetable', values);
    return data.data;
  },
  async update(id, values) {
    const { data } = await apiClient.put(`/admin/timetable/${id}`, values);
    return data.data;
  },
  async remove(id) {
    const { data } = await apiClient.delete(`/admin/timetable/${id}`);
    return data.data;
  },
};
