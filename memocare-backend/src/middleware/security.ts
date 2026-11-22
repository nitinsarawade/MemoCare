import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

/**
 * Force HTTPS in production. Behind a reverse proxy / load balancer
 * (trust proxy is enabled in app.ts) the original protocol arrives in
 * x-forwarded-proto. Plain-HTTP requests are permanently redirected to
 * HTTPS with the same path+query.
 */
export function forceHttps(req: Request, res: Response, next: NextFunction) {
  if (!env.isProduction) return next();
  const proto = req.protocol;
  if (proto !== 'https') {
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    return res.redirect(308, `https://${host}${req.originalUrl}`);
  }
  return next();
}

/**
 * Lightweight WAF layer (no external service): blocks the request patterns
 * seen in real attack traffic before the request touches any route.
 *
 *  - Probe/scanner paths: /wp-admin, /phpmyadmin, /.env, /.git, /config.php…
 *  - Typical SQL-injection and XSS signatures in the URL.
 *  - MySQL/xp_cmd style strings everywhere.
 */
const BLOCKED_PATH_PATTERNS: RegExp[] = [
  /\/wp-(admin|login|content)/i,
  /\/(phpmyadmin|pma|mysql|admin\.php|config\.php|xmlrpc\.php)/i,
  /\.(env|git|bak|sql|ini|conf|sh)$/i,
  /\/\.well-known\/security\.txt$/i,
  /\/\.env/i,
  /\/\.git/i,
  /\/actuator/i,
  /\/console\/(login|root)/i,
];

const BLOCKED_QUERY_PATTERNS: RegExp[] = [
  /(\bunion\b.+\bselect\b)|(\bselect\b.+\bfrom\b.+\bwhere\b)|(\bdrop\b\s+\btable\b)|(\binsert\b\s+\binto\b|.+\bsleep\s*\(.+\)|\bbenchmark\s*\()/i,
  /<\s*(script|iframe|object|embed|form)\b/i,
  /(on\w+\s*=)|(javascript\s*:)|(vbscript\s*:)|(data\s*:\s*text\/html)/i,
  /\.\.(\/|\\)/,
  /%0d|%0a(round|\w*base64)/i,
  /(base64_decode|eval\s*\(|system\s*\(|passthru\s*\(|exec\s*\()/i,
];

export function wafFilter(req: Request, _res: Response, next: NextFunction) {
  const url = req.originalUrl || req.url || '';

  for (const re of BLOCKED_PATH_PATTERNS) {
    if (re.test(url)) {
      return next(AppError.forbidden('Request blocked'));
    }
  }
  // Test both the raw and the fully decoded URL. Attack traffic is usually
  // percent-encoded ("1%20UNION%20SELECT"), and matching against the raw
  // form misses exactly those — the whole point of the filter.
  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch { /* keep raw on malformed % */ }

  for (const re of BLOCKED_QUERY_PATTERNS) {
    if (re.test(url) || re.test(decoded)) {
      return next(AppError.forbidden('Request blocked'));
    }
  }
  return next();
}

/**
 * XSS hardening for JSON bodies: strips HTML tags and dangerous characters
 * from every string field received in req.body. Storage stays safe even if a
 * future endpoint forgets to validate — this is the belt to zod's braces.
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
  const isJson = req.is('application/json');
  if (isJson && req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  return next();
}

function deepSanitize(value: unknown, depth = 0): unknown {
  // Guard against absurdly deep payloads (stack safety).
  if (depth > 20 || value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value
      // strip HTML/script tags entirely
      .replace(/<[^>]*>/g, '')
      // neutralize event handlers and script URIs that survived
      .replace(/javascript\s*:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      // strip control characters (except tab/newline/carriage-return)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  }
  if (Array.isArray(value)) return value.map((v) => deepSanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepSanitize(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Blocks very large suspicious content lengths early, before reading bodies. */
export function rejectOversized(req: Request, res: Response, next: NextFunction) {
  const len = parseInt(req.headers['content-length'] ?? '0', 10);
  // The JSON body cap is 2 MB (app.ts); uploads are multipart and allowed
  // up to 200 MB by multer. Anything above 220 MB is hostile.
  if (len > 220 * 1024 * 1024) {
    return res.status(413).json({
      error: { code: 'FILE_TOO_LARGE', message: 'Request entity too large' },
    });
  }
  return next();
}
