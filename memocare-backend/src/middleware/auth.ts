import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { verifyAccessToken } from '../utils/tokens';
import jwt from 'jsonwebtoken';

/**
 * Verifies the Bearer access token and attaches `req.auth`.
 * This is the ONLY place authentication identity is established;
 * every downstream authorization check (see rbac.ts) trusts req.auth.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing or malformed Authorization header'));
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      role: payload.role,
      hospitalId: payload.hospitalId ?? null,
    };
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired'));
    }
    return next(new AppError(401, 'TOKEN_INVALID', 'Access token is invalid'));
  }
}

/**
 * Optional-auth variant: attaches req.auth if a valid token is present,
 * but never rejects the request. Useful for public/tutorial endpoints
 * that personalize output when logged in.
 */
export function authenticateOptional(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.auth = { userId: payload.sub, role: payload.role, hospitalId: payload.hospitalId ?? null };
  } catch {
    // ignore invalid token in optional mode
  }
  return next();
}
