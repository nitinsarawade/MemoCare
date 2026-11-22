import request from 'supertest';

// Mock the Prisma singleton before importing anything that uses it, so
// these tests exercise real routing/validation/controller/service logic
// without requiring a live Postgres instance.
jest.mock('../../src/config/prisma', () => {
  const users = new Map<string, any>();
  const verificationTokens = new Map<string, any>();

  return {
    prisma: {
      user: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.email) return users.get(where.email) ?? null;
          if (where.id) return [...users.values()].find((u) => u.id === where.id) ?? null;
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const user = { id: `user-${users.size + 1}`, status: 'PENDING_VERIFICATION', ...data };
          users.set(user.email, user);
          return user;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const user = [...users.values()].find((u) => u.id === where.id);
          Object.assign(user, data);
          return user;
        }),
      },
      emailVerificationToken: {
        create: jest.fn(async ({ data }: any) => {
          verificationTokens.set(data.token, data);
          return data;
        }),
      },
      hospital: { findUnique: jest.fn(async () => null) },
      refreshToken: {
        create: jest.fn(async () => ({})),
        findUnique: jest.fn(async () => null),
        updateMany: jest.fn(async () => ({ count: 0 })),
        update: jest.fn(async () => ({})),
      },
      analyticsEvent: { create: jest.fn(async () => ({})) },
    },
  };
});

jest.mock('../../src/services/emailService', () => ({
  sendEmail: jest.fn(async () => undefined),
  emailTemplates: {
    verifyEmail: () => ({ subject: 'Verify', html: '<p>verify</p>' }),
    passwordReset: () => ({ subject: 'Reset', html: '<p>reset</p>' }),
    patientLinkInvite: () => ({ subject: 'Invite', html: '<p>invite</p>' }),
    riskAlert: () => ({ subject: 'Risk', html: '<p>risk</p>' }),
    testReminder: () => ({ subject: 'Reminder', html: '<p>reminder</p>' }),
  },
}));

import { createApp } from '../../src/app';

const app = createApp();

describe('POST /api/v1/auth/signup', () => {
  it('rejects a password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      email: 'short@example.com',
      password: '123',
      firstName: 'A',
      lastName: 'B',
      role: 'FAMILY',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an attempt to self-register as ADMIN', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      email: 'wannabe-admin@example.com',
      password: 'password123',
      firstName: 'A',
      lastName: 'B',
      role: 'ADMIN',
    });
    expect(res.status).toBe(400);
  });

  it('creates a FAMILY account with 201 and PENDING_VERIFICATION status', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      email: 'family-signup@example.com',
      password: 'password123',
      firstName: 'Sam',
      lastName: 'Chen',
      role: 'FAMILY',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING_VERIFICATION');
    expect(res.body.data.role).toBe('FAMILY');
  });

  it('rejects a duplicate signup with 409', async () => {
    await request(app).post('/api/v1/auth/signup').send({
      email: 'dupe@example.com',
      password: 'password123',
      firstName: 'A',
      lastName: 'B',
      role: 'FAMILY',
    });
    const res = await request(app).post('/api/v1/auth/signup').send({
      email: 'dupe@example.com',
      password: 'password123',
      firstName: 'A',
      lastName: 'B',
      role: 'FAMILY',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('requires a hospitalInviteCode for HOSPITAL_STAFF signup', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      email: 'staff@example.com',
      password: 'password123',
      firstName: 'Priya',
      lastName: 'Rao',
      role: 'HOSPITAL_STAFF',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Authenticated routes without a token', () => {
  it('rejects GET /api/v1/patients with 401', async () => {
    const res = await request(app).get('/api/v1/patients');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
