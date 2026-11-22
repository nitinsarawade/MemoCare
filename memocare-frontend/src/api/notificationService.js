import { http, unwrap } from './client';

export const notificationService = {
  list: (unreadOnly = false) => unwrap(http.get('/notifications', { params: unreadOnly ? { unreadOnly: 'true' } : undefined })),
  markRead: (id) => http.post(`/notifications/${id}/read`),
  listPreferences: () => unwrap(http.get('/notifications/preferences')),
  setPreference: (body) => unwrap(http.put('/notifications/preferences', body)),
};
