import { signAccessToken, verifyAccessToken, hashToken } from '../../src/utils/tokens';

describe('access tokens', () => {
  it('signs and verifies a payload round-trip', () => {
    const token = signAccessToken({ sub: 'user-123', role: 'FAMILY', hospitalId: null });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user-123');
    expect(decoded.role).toBe('FAMILY');
  });

  it('throws on a tampered token', () => {
    const token = signAccessToken({ sub: 'user-123', role: 'FAMILY' });
    const tampered = token.slice(0, -2) + 'xx';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe('hashToken', () => {
  it('is deterministic for the same input', () => {
    expect(hashToken('raw-refresh-token')).toEqual(hashToken('raw-refresh-token'));
  });

  it('differs for different inputs', () => {
    expect(hashToken('a')).not.toEqual(hashToken('b'));
  });
});
