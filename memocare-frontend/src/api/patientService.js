import { http, unwrap } from './client';

export const patientService = {
  list: (includeDismissed = false) => unwrap(http.get('/patients', { params: includeDismissed ? { includeDismissed: 'true' } : undefined })),
  listDismissed: () => unwrap(http.get('/patients/dismissed')),
  dismiss: (id, reason) => unwrap(http.post(`/patients/${id}/dismiss`, { reason: reason || undefined })),
  readmit: (id) => unwrap(http.post(`/patients/${id}/readmit`, {})),
  listStaffOptions: () => unwrap(http.get('/patients/staff-options')),
  get: (id) => unwrap(http.get(`/patients/${id}`)),
  create: (body) => unwrap(http.post('/patients', body)),
  update: (id, body) => unwrap(http.patch(`/patients/${id}`, body)),
  assignDoctor: (id, doctorId) => unwrap(http.patch(`/patients/${id}/assignment`, { doctorId })),
  listLinks: (id) => unwrap(http.get(`/patients/${id}/links`)),
  invite: (id, body) => unwrap(http.post(`/patients/${id}/links/invite`, body)),
  unlink: (id, userId) => http.delete(`/patients/${id}/links/${userId}`),
  acceptInvite: (token) => unwrap(http.post('/patients/accept-invite', { token })),
};
