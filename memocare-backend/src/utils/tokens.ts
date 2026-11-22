import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
  hospitalId?: string | null;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  // env gives a plain string like "15m"; newer @types/jsonwebtoken want a narrower
  // duration type, so assert it here.
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

/**
 * Refresh tokens are opaque random strings, hashed before storage
 * (never store raw refresh tokens in the DB). The JWT-signed variant
 * below is used only to detect tampering when the raw string is
 * presented back by the client; the source of truth for validity
 * (expiry/revocation) is the hashed DB row.
 */
export function generateRawRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function refreshTokenExpiryDate(): Date {
  const ms = parseDurationToMs(env.jwt.refreshExpiresIn);
  return new Date(Date.now() + ms);
}

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30d
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const unitMs: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * unitMs[unit];
}

export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
