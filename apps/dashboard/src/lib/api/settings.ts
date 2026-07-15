import { apiClient } from '@/lib/api/client';
import type { AttendanceSettings, UpdateAttendanceSettingsInput } from '@/types/settings';

export const settingsApi = {
  get: async () => (await apiClient.get<AttendanceSettings>('/schools/attendance-settings')).data,
  update: async (input: UpdateAttendanceSettingsInput) =>
    (await apiClient.patch<AttendanceSettings>('/schools/attendance-settings', input)).data,
};
