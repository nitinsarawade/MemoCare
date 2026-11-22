import { http, unwrap } from './client';

export const medicationService = {
  list: (patientId, activeOnly) =>
    unwrap(http.get(`/patients/${patientId}/medications`, { params: activeOnly ? { activeOnly: 'true' } : undefined })),
  today: (patientId) => unwrap(http.get(`/patients/${patientId}/medications/today`)),
  history: (patientId) => unwrap(http.get(`/patients/${patientId}/medications/history`)),
  create: (patientId, body) => unwrap(http.post(`/patients/${patientId}/medications`, body)),
  update: (patientId, medicationId, body) => unwrap(http.patch(`/patients/${patientId}/medications/${medicationId}`, body)),
  remove: (patientId, medicationId) => http.delete(`/patients/${patientId}/medications/${medicationId}`),
  // scheduledFor must be the exact ISO timestamp returned by /today
  logDose: (patientId, medicationId, body) => unwrap(http.post(`/patients/${patientId}/medications/${medicationId}/log`, body)),
};
