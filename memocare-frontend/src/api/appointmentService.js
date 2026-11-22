import { http, unwrap } from './client';

export const appointmentService = {
  list: (patientId) => unwrap(http.get(`/patients/${patientId}/appointments`)),
  create: (patientId, body) => unwrap(http.post(`/patients/${patientId}/appointments`, body)),
  update: (patientId, appointmentId, body) => unwrap(http.patch(`/patients/${patientId}/appointments/${appointmentId}`, body)),
  remove: (patientId, appointmentId) => http.delete(`/patients/${patientId}/appointments/${appointmentId}`),
};
