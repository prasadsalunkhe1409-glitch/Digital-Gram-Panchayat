import { apiClient } from '@/services/api-client';

/** The published village service schedule. A public read — no token needed. */
export const timetableService = {
  async timetable() {
    const { data } = await apiClient.get('/timetable');
    return data.data;
  },
};
