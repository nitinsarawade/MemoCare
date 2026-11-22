import { http, unwrap } from './client';

export const screeningService = {
  listTests: () => unwrap(http.get('/screening-tests')),
  listAllTestsForAdmin: () => unwrap(http.get('/screening-tests/all')),
  getTest: (testId) => unwrap(http.get(`/screening-tests/${testId}`)),
  createTest: (body) => unwrap(http.post('/screening-tests', body)),
  listAttempts: (patientId) => unwrap(http.get(`/patients/${patientId}/screening-attempts`)),
  getAttempt: (patientId, attemptId) => unwrap(http.get(`/patients/${patientId}/screening-attempts/${attemptId}`)),
  // Scoring happens on the server. We only ever send { itemId, givenAnswer } pairs.
  submit: (patientId, testId, answers) => unwrap(http.post(`/patients/${patientId}/screening-attempts`, { testId, answers })),
  listGames: () => unwrap(http.get('/games')),
  setTestActive: (testId, isActive) => unwrap(http.patch(`/screening-tests/${testId}/active`, { isActive })),
};
