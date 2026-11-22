import { http, unwrap } from './client';

export const progressService = {
  timeline: (patientId, params) => unwrap(http.get(`/patients/${patientId}/progress/timeline`, { params })),
  summary: (patientId, params) => unwrap(http.get(`/patients/${patientId}/progress/summary`, { params })),
};
