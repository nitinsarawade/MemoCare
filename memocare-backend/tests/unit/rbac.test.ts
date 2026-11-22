import { patientVisibilityWhere } from '../../src/middleware/rbac';

describe('patientVisibilityWhere', () => {
  it('gives ADMIN unrestricted access', () => {
    expect(patientVisibilityWhere({ userId: 'u1', role: 'ADMIN' } as any)).toEqual({});
  });

  it('scopes HOSPITAL_STAFF to their own hospital', () => {
    const where = patientVisibilityWhere({ userId: 'u1', role: 'HOSPITAL_STAFF', hospitalId: 'h1' } as any);
    expect(where).toEqual({ hospitalId: 'h1' });
  });

  it('falls back to an unmatchable hospital id when staff has none assigned', () => {
    const where: any = patientVisibilityWhere({ userId: 'u1', role: 'HOSPITAL_STAFF', hospitalId: null } as any);
    expect(where.hospitalId).not.toBeNull();
  });

  it('scopes FAMILY to patients they are linked to', () => {
    const where = patientVisibilityWhere({ userId: 'u1', role: 'FAMILY' } as any);
    expect(where).toEqual({ links: { some: { userId: 'u1' } } });
  });

  it('scopes CARETAKER to patients they are linked to', () => {
    const where = patientVisibilityWhere({ userId: 'u2', role: 'CARETAKER' } as any);
    expect(where).toEqual({ links: { some: { userId: 'u2' } } });
  });
});
