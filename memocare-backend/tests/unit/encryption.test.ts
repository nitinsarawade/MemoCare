import { encryptField, decryptField } from '../../src/utils/encryption';

describe('field encryption', () => {
  it('round-trips a plaintext value', () => {
    const plain = 'Patient has mild short-term memory lapses noted by family.';
    const encrypted = encryptField(plain);
    expect(encrypted).not.toEqual(plain);
    expect(decryptField(encrypted)).toEqual(plain);
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const a = encryptField('hello world');
    const b = encryptField('hello world');
    expect(a).not.toEqual(b);
  });

  it('returns null for null/undefined input', () => {
    expect(decryptField(null)).toBeNull();
    expect(decryptField(undefined)).toBeNull();
  });
});
