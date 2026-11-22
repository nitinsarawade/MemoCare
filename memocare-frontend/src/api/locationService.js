import { http, unwrap } from './client';

export const locationService = {
  latest: (patientId) => unwrap(http.get(`/patients/${patientId}/location/latest`)),
  history: (patientId) => unwrap(http.get(`/patients/${patientId}/location/history`)),
  checkIn: (patientId, body) => unwrap(http.post(`/patients/${patientId}/location/check-in`, body)),
  listShareLinks: (patientId) => unwrap(http.get(`/patients/${patientId}/location/share-links`)),
  createShareLink: (patientId) => unwrap(http.post(`/patients/${patientId}/location/share-links`)),
  revokeShareLink: (patientId, tokenId) => http.delete(`/patients/${patientId}/location/share-links/${tokenId}`),
};

export const safeZoneService = {
  list: (patientId) => unwrap(http.get(`/patients/${patientId}/safe-zones`)),
  create: (patientId, body) => unwrap(http.post(`/patients/${patientId}/safe-zones`, body)),
  update: (patientId, zoneId, body) => unwrap(http.patch(`/patients/${patientId}/safe-zones/${zoneId}`, body)),
  remove: (patientId, zoneId) => http.delete(`/patients/${patientId}/safe-zones/${zoneId}`),
};
