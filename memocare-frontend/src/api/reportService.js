import { http, unwrap } from './client';

export const reportService = {
  get: (patientId) => unwrap(http.get(`/patients/${patientId}/report`)),
  listNotes: (patientId) => unwrap(http.get(`/patients/${patientId}/report/notes`)),
  createNote: (patientId, body) => unwrap(http.post(`/patients/${patientId}/report/notes`, body)),
  /** Returns a PDF Blob (staff/admin only). */
  exportPdf: async (patientId) => {
    const res = await http.get(`/patients/${patientId}/report/export`, { responseType: 'blob', timeout: 60_000 });
    return res.data;
  },
};
