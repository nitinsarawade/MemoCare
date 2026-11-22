import { http, unwrap } from './client';

export const familyQuizService = {
  listMembers: (patientId) => unwrap(http.get(`/patients/${patientId}/family-members`)),
  addMember: (patientId, { file, fullName }) => {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('fullName', fullName);
    return unwrap(http.post(`/patients/${patientId}/family-members`, form));
  },
  removeMember: (patientId, memberId) => http.delete(`/patients/${patientId}/family-members/${memberId}`),

  startQuiz: (patientId) => unwrap(http.post(`/patients/${patientId}/family-quiz/new`)),
  submitQuiz: (patientId, attemptId, answers) =>
    unwrap(http.post(`/patients/${patientId}/family-quiz/${attemptId}/submit`, { answers })),
  listAttempts: (patientId) => unwrap(http.get(`/patients/${patientId}/family-quiz/attempts`)),
  getAttempt: (patientId, attemptId) => unwrap(http.get(`/patients/${patientId}/family-quiz/attempts/${attemptId}`)),
};
