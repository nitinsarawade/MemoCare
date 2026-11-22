import fs from 'fs';
import path from 'path';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { openapiSpec } from './config/swagger';
import apiRouter from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimit';
import { forceHttps, wafFilter, sanitizeBody, rejectOversized } from './middleware/security';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Set TRUST_PROXY to the number of trusted reverse-proxy hops in production.
  // A fixed value of 1 is safe for the common single-load-balancer topology;
  // local development does not trust forwarded headers.
  app.set('trust proxy', env.isProduction ? env.trustProxy : false);

  app.use(forceHttps);
  app.use(rejectOversized);

  // Security headers. The API also serves /share and /assets static pages,
  // so the CSP has to allow the Google Fonts the frontend uses and inline
  // styles in those standalone pages.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
          fontSrc: ["'self'", 'fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          mediaSrc: ["'self'", 'blob:', 'data:', 'https:'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", ...(env.clientUrl ? env.clientUrl.split(',').map((s) => s.trim()) : []), 'https:', 'http:', 'wss:'],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      hsts: env.isProduction && { maxAge: 31536000, includeSubDomains: true, preload: true },
    })
  );

  const allowedOrigins = env.clientUrl
    ? env.clientUrl.split(',').map((u) => u.trim())
    : ['http://localhost:3000'];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    })
  );

  // WAF-style request screening + payload hardening before any route runs.
  app.use(wafFilter);
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitizeBody);

  if (!env.isTest) {
    app.use(env.isProduction ? pinoHttp({ logger }) : morgan('dev'));
  }

  app.use(globalRateLimiter);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', env: env.nodeEnv, timestamp: new Date().toISOString() });
  });

  // Interactive API docs are a development convenience only. In production
  // the schema is not exposed — hiding the API surface is part of the
  // security posture, same principle as hiding keys.
  if (!env.isProduction) {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
    app.get('/api/docs.json', (_req, res) => res.json(openapiSpec));
  }

  // Standalone, no-login location-sharing page (see /public/share/location.html).
  // Served same-origin so its fetch() calls to /api/v1/location/ping never
  // hit CORS, and so it works with zero extra setup on the same server.
  app.use('/share', express.static(path.resolve(process.cwd(), 'public/share')));

  // Built-in app media (screening test images, tutorial illustrations, etc.)
  // that ships with the app itself, as opposed to user-uploaded content
  // (which goes through storageService/S3 instead).
  // helmet() defaults to Cross-Origin-Resource-Policy: same-origin, which would stop the
  // frontend (a different port) from displaying these pictures, so relax it for this folder only.
  app.use(
    '/assets',
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(path.resolve(process.cwd(), 'public/assets'))
  );

  app.use('/api/v1', apiRouter);

  // Serve compiled React frontend if present (Single-service deployment mode)
  const frontendCandidates = [
    path.resolve(process.cwd(), 'memocare-frontend/dist'),
    path.resolve(process.cwd(), '../memocare-frontend/dist'),
    path.resolve(process.cwd(), 'client-dist'),
    path.resolve(process.cwd(), 'dist/client'),
    path.resolve(process.cwd(), 'public/dist'),
  ];
  const frontendDist = frontendCandidates.find((dir) => fs.existsSync(dir));

  if (frontendDist) {
    app.use(
      express.static(frontendDist, {
        setHeaders: (res, filePath) => {
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
          }
        },
      })
    );
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/assets') ||
        req.path.startsWith('/share') ||
        req.path.startsWith('/health')
      ) {
        return next();
      }
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
