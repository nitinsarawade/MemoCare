jest.mock('../../src/config/prisma', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id === 'patient-in-hospital-1') return { id: where.id, hospitalId: 'hospital-1' };
        if (where.id === 'patient-no-hospital') return { id: where.id, hospitalId: null };
        return null;
      }),
    },
    patientLink: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.patientId_userId.userId === 'linked-user') {
          return { id: 'link-1', patientId: where.patientId_userId.patientId, userId: 'linked-user' };
        }
        return null;
      }),
    },
  },
}));

import express from 'express';
import request from 'supertest';
import { requirePatientAccess } from '../../src/middleware/rbac';
import { errorHandler } from '../../src/middleware/errorHandler';

function buildTestApp(auth: any) {
  const app = express();
  app.use((req, _res, next) => {
    (req as any).auth = auth;
    next();
  });
  app.get('/patients/:patientId', requirePatientAccess(), (_req, res) => res.status(200).json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('requirePatientAccess', () => {
  it('allows ADMIN regardless of hospital/link', async () => {
    const app = buildTestApp({ userId: 'admin-1', role: 'ADMIN' });
    const res = await request(app).get('/patients/patient-in-hospital-1');
    expect(res.status).toBe(200);
  });

  it('allows HOSPITAL_STAFF when the patient belongs to their hospital', async () => {
    const app = buildTestApp({ userId: 'staff-1', role: 'HOSPITAL_STAFF', hospitalId: 'hospital-1' });
    const res = await request(app).get('/patients/patient-in-hospital-1');
    expect(res.status).toBe(200);
  });

  it('forbids HOSPITAL_STAFF from a different hospital', async () => {
    const app = buildTestApp({ userId: 'staff-2', role: 'HOSPITAL_STAFF', hospitalId: 'hospital-2' });
    const res = await request(app).get('/patients/patient-in-hospital-1');
    expect(res.status).toBe(403);
  });

  it('allows FAMILY/CARETAKER only when a PatientLink exists', async () => {
    const linkedApp = buildTestApp({ userId: 'linked-user', role: 'FAMILY' });
    const linkedRes = await request(linkedApp).get('/patients/patient-no-hospital');
    expect(linkedRes.status).toBe(200);

    const unlinkedApp = buildTestApp({ userId: 'unlinked-user', role: 'FAMILY' });
    const unlinkedRes = await request(unlinkedApp).get('/patients/patient-no-hospital');
    expect(unlinkedRes.status).toBe(403);
  });

  it('returns 404 for a nonexistent patient', async () => {
    const app = buildTestApp({ userId: 'admin-1', role: 'ADMIN' });
    const res = await request(app).get('/patients/does-not-exist');
    expect(res.status).toBe(404);
  });
});
