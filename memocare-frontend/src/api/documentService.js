import { http, unwrap, API_ORIGIN } from './client';

export const documentService = {
  list: (patientId) => unwrap(http.get(`/patients/${patientId}/documents`)),

  upload(patientId, { file, title, onProgress }) {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('title', title || file.name);
    return unwrap(
      http.post(`/patients/${patientId}/documents`, form, {
        timeout: 0,
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
    );
  },

  remove: (patientId, documentId) => http.delete(`/patients/${patientId}/documents/${documentId}`),

  /**
   * Documents served by this API's local storage driver require the Bearer token, which
   * a plain <a href> can't send. So a protected local URL is fetched as a Blob and handed
   * back as an object URL to open/download. A real signed S3 URL is returned as-is.
   */
  async fetchDownloadUrl(url) {
    if (!url.startsWith(API_ORIGIN)) return { url, revoke: () => {} };
    const path = url.slice(API_ORIGIN.length).replace(/^\/api\/v1/, '');
    const res = await http.get(path, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(res.data);
    return { url: objectUrl, revoke: () => URL.revokeObjectURL(objectUrl) };
  },
};
