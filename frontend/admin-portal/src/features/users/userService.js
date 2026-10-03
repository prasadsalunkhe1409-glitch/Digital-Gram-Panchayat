import { apiClient } from '@/services/api-client';

export const userService = {
  /** Assign or correct a citizen's ward. The only way an account created before wards
   *  existed gets one — nothing is backfilled. */
  async setWard(id, ward) {
    const { data } = await apiClient.patch(`/admin/users/${id}/ward`, { ward });
    return data.data;
  },

  async list(params = {}) {
    const { data } = await apiClient.get('/admin/users', { params });
    return data.data;
  },
  async getOne(id) {
    const { data } = await apiClient.get(`/admin/users/${id}`);
    return data.data;
  },
  async setStatus(id, status) {
    const { data } = await apiClient.patch(`/admin/users/${id}/status`, { status });
    return data.data;
  },
};

/**
 * Root-admin management of officer accounts. Separate from the citizen-facing user service
 * above because the authorization is different: these routes admit a root admin only.
 */
export const adminAccountService = {
  async list() {
    const { data } = await apiClient.get('/admin/admins');
    return data.data;
  },
  async create(values) {
    const { data } = await apiClient.post('/admin/admins', values);
    return data.data;
  },
  async setStatus(id, status) {
    const { data } = await apiClient.patch(`/admin/admins/${id}/status`, { status });
    return data.data;
  },
  async remove(id) {
    const { data } = await apiClient.delete(`/admin/admins/${id}`);
    return data.data;
  },
};
