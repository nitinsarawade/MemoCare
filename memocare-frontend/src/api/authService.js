import { http, unwrap } from './client';

export const authService = {
  signup: (body) => unwrap(http.post('/auth/signup', body, { skipAuth: true })),
  verifyEmail: (token) => unwrap(http.post('/auth/verify-email', { token }, { skipAuth: true })),
  login: (email, password) => unwrap(http.post('/auth/login', { email, password }, { skipAuth: true })),
  loginByManagementCode: (code) => unwrap(http.post('/auth/management/code-login', { code }, { skipAuth: true })),
  logout: (refreshToken) => http.post('/auth/logout', { refreshToken }, { skipAuth: true }),
  forgotPassword: (email) => unwrap(http.post('/auth/password/forgot', { email }, { skipAuth: true })),
  resetPassword: (token, newPassword) => unwrap(http.post('/auth/password/reset', { token, newPassword }, { skipAuth: true })),
  changePassword: (currentPassword, newPassword) => unwrap(http.post('/auth/password/change', { currentPassword, newPassword })),
  me: () => unwrap(http.get('/auth/me')),
  updateMe: (body) => unwrap(http.patch('/auth/me', body)),
};
