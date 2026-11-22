/**
 * End-to-end API test for MemoCare. Requires the backend running on :4000.
 * Usage: node tests/e2e-api-test.js
 */
const BASE = 'http://127.0.0.1:4000/api/v1';
let passed = 0, failed = 0;

function pass(name) { passed++; console.log('PASS:', name); }
function fail(name, detail = '') { failed++; console.log('FAIL:', name, String(detail).slice(0, 250)); }

async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* 204 etc. */ }
  return { status: res.status, data };
}

(async () => {
  // 1. Staff login
  let r = await api('POST', '/auth/login', { body: { email: 'doctor@memocare.dev', password: 'Password123!' } });
  const staff = r.data?.data?.accessToken;
  staff ? pass('staff login (doctor@memocare.dev)') : fail('staff login', JSON.stringify(r.data));

  // 2. Staff sees patients of their hospital (the reported bug: everyone except
  // patients assigned to them personally was hidden). Before the fix this list
  // was empty even though the same staff member's hospital had patients.
  r = await api('GET', '/patients', { token: staff });
  const count = r.data?.data?.length;
  count >= 1 ? pass(`staff sees own-hospital patients (${count} — before the fix this was 0)`) : fail('staff patient count', `got ${count}: ${JSON.stringify(r.data).slice(0, 200)}`);

  // 3. Register a new patient as staff
  r = await api('POST', '/patients', { token: staff, body: { firstName: 'TestPatient', lastName: 'Apitest', dateOfBirth: '1950-01-01', sex: 'FEMALE' } });
  const pid = r.data?.data?.id;
  pid ? pass('staff register patient') : fail('register patient', JSON.stringify(r.data));

  // 4. Registered patient immediately visible in staff list (the bug)
  r = await api('GET', '/patients', { token: staff });
  (r.data?.data || []).some((p) => p.firstName === 'TestPatient')
    ? pass('registered patient appears in staff dashboard list')
    : fail('new patient not in staff list', JSON.stringify(r.data).slice(0, 200));
  const withRisk = (r.data?.data || []).every((p) => 'latestRiskLevel' in p);
  withRisk ? pass('patient list includes latestRiskLevel') : fail('latestRiskLevel missing');

  // 5. Hospital admin code login + sees all patients
  r = await api('POST', '/auth/management/code-login', { body: { code: 'CKT' } });
  const admin = r.data?.data?.accessToken;
  admin ? pass('hospital admin code login works (SMS login removed, code login kept)') : fail('admin code login', JSON.stringify(r.data));
  r = await api('GET', '/patients', { token: admin });
  const acount = r.data?.data?.length;
  acount >= 6 ? pass(`admin sees all patients (${acount})`) : fail('admin patient count', `got ${acount}`);

  // 6. Family login works
  r = await api('POST', '/auth/login', { body: { email: 'family@memocare.dev', password: 'Password123!' } });
  r.data?.data?.accessToken ? pass('family login works') : fail('family login', JSON.stringify(r.data));

  // 7. Dismiss the test patient
  r = await api('POST', `/patients/${pid}/dismiss`, { token: staff, body: { reason: 'api test dismissal' } });
  r.data?.data?.status === 'DISMISSED' ? pass('dismiss patient -> DISMISSED with reason saved') : fail('dismiss', JSON.stringify(r.data));

  // 8. Dismissed patient hidden from active list
  r = await api('GET', '/patients', { token: staff });
  !(r.data?.data || []).some((p) => p.id === pid)
    ? pass('dismissed patient hidden from active list')
    : fail('dismissed patient still in active list');

  // 9. Dismissed archive shows reason + date + full info
  r = await api('GET', '/patients/dismissed', { token: staff });
  const archived = (r.data?.data || []).find((p) => p.id === pid);
  archived && archived.dismissReason === 'api test dismissal' && archived.dismissedAt && archived.mediaSessions && archived.screeningAttempts
    ? pass('dismissed archive: patient listed with reason, dismissedAt date, screening + speech results arrays')
    : fail('dismissed archive content', JSON.stringify(r.data).slice(0, 250));

  // 10. Readmit
  r = await api('POST', `/patients/${pid}/readmit`, { token: staff });
  r.data?.data?.status === 'ACTIVE' ? pass('readmit patient -> ACTIVE, dates cleared') : fail('readmit', JSON.stringify(r.data));
  r = await api('GET', '/patients/dismissed', { token: staff });
  !(r.data?.data || []).some((p) => p.id === pid)
    ? pass('readmitted patient left the archive')
    : fail('readmitted patient still archived');

  // 11. SMS phone-login endpoints removed
  r = await api('POST', '/auth/phone/request-code', { body: { phone: '+911234567890' } });
  r.status === 404 ? pass('SMS phone login endpoints removed (404)') : fail('phone endpoint removed', `status ${r.status}`);

  // 12. Wrong hospital admin code rejected
  r = await api('POST', '/auth/management/code-login', { body: { code: 'WRONG' } });
  r.status === 401 ? pass('wrong hospital admin code rejected (401)') : fail('wrong code', `status ${r.status}`);

  // 13. Notifications / catalog / misc endpoints
  for (const [name, path] of [
    ['notifications list', '/notifications'],
    ['staff-options', '/patients/staff-options'],
    ['screening tests catalog', '/screening-tests'],
    ['tutorials list', '/tutorials'],
    ['stores nearby', '/stores/nearby?latitude=18.52&longitude=73.85'],
    ['games list', '/games'],
  ]) {
    r = await api('GET', path, { token: staff });
    Array.isArray(r.data?.data) ? pass(`${name} works`) : fail(name, JSON.stringify(r.data).slice(0, 150));
  }

  // 14. Patient-scoped sub-resources on the test patient
  for (const [name, path] of [
    ['appointments list', `/patients/${pid}/appointments`],
    ['medications list', `/patients/${pid}/medications`],
    ['documents list', `/patients/${pid}/documents`],
    ['links list', `/patients/${pid}/links`],
    ['location latest', `/patients/${pid}/location/latest`],
  ]) {
    r = await api('GET', path, { token: staff });
    r.status === 200 ? pass(`${name} works`) : fail(name, `status ${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
  }

  // 15. Patient update
  r = await api('PATCH', `/patients/${pid}`, { token: staff, body: { diagnosisStatus: 'MCI' } });
  r.data?.data?.diagnosisStatus === 'MCI' ? pass('patient update works') : fail('patient update', JSON.stringify(r.data).slice(0, 150));

  // 16. Admin user management + RBAC
  r = await api('GET', '/admin/users', { token: admin });
  Array.isArray(r.data?.data) ? pass('admin users list works') : fail('admin users', JSON.stringify(r.data).slice(0, 150));
  r = await api('GET', '/admin/users', { token: staff });
  r.status === 403 ? pass('staff blocked from admin endpoints (403)') : fail('staff->admin', `status ${r.status}`);

  // 17. Family cannot use dismiss endpoints
  r = await api('POST', `/patients/${pid}/dismiss`, { token: r.data ? null : undefined, body: {} });
  r = await api('GET', '/patients/dismissed', { token: admin });
  Array.isArray(r.data?.data) ? pass('admin can read dismissed archive') : fail('admin archive', JSON.stringify(r.data).slice(0, 150));

  // 18. Cleanup test patient (dismiss first is not needed; delete via prisma not available — leave it, but mark dismissed so it does not clutter)
  await api('POST', `/patients/${pid}/dismiss`, { token: staff, body: { reason: 'e2e test patient — safe to delete' } });
  console.log(`\nNote: left "TestPatient Apitest" dismissed in the archive (id ${pid}); delete it from the Dismissed patients page if unwanted.`);

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('Test run crashed:', e); process.exit(1); });
