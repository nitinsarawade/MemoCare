import { http, unwrap } from './client';

export const adminService = {
  getMyHospital: () => unwrap(http.get('/hospitals/me')),
  updateMyHospital: (body) => unwrap(http.patch('/hospitals/me', body)),
  listHospitals: () => unwrap(http.get('/admin/hospitals')),
  createHospital: (body) => unwrap(http.post('/admin/hospitals', body)),
  rotateInviteCode: (hospitalId) => unwrap(http.post(`/admin/hospitals/${hospitalId}/rotate-invite-code`)),
  listPendingStaff: () => unwrap(http.get('/admin/staff/pending')),
  approveStaff: (userId, staffTitle) => unwrap(http.post(`/admin/staff/${userId}/approve`, { staffTitle })),
  rejectStaff: (userId) => unwrap(http.post(`/admin/staff/${userId}/reject`)),
  listUsers: (params) => unwrap(http.get('/admin/users', { params })),
  suspendUser: (userId) => unwrap(http.post(`/admin/users/${userId}/suspend`)),
  reactivateUser: (userId) => unwrap(http.post(`/admin/users/${userId}/reactivate`)),
};
