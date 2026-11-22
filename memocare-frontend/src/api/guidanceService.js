import { http, unwrap } from './client';

export const guidanceService = {
  list: () => unwrap(http.get('/tutorials')),
  getBySlug: (slug) => unwrap(http.get(`/tutorials/${slug}`)),
  complete: (articleId) => unwrap(http.post(`/tutorials/${articleId}/complete`)),
  myProgress: () => unwrap(http.get('/tutorials/progress/me')),
  // admin
  create: (body) => unwrap(http.post('/tutorials', body)),
  update: (id, body) => unwrap(http.patch(`/tutorials/${id}`, body)),
  remove: (id) => http.delete(`/tutorials/${id}`),
};
