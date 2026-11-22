import dotenv from 'dotenv';
import path from 'path';

// Prioritize .env.local if present, then fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Reads an env var. `fallback` is a convenience for local development only:
 * in production a missing value is a hard error, so the app can never boot
 * with a guessable default secret or database URL.
 */
function required(name: string, fallback?: string): string {
  const raw = process.env[name];
  if (raw !== undefined && raw !== '') return raw;
  if (!IS_PRODUCTION && fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: IS_PRODUCTION,
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(process.env.PORT ?? '4000', 10),
  appUrl: process.env.APP_URL ?? 'http://localhost:4000',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  trustProxy: parseInt(process.env.TRUST_PROXY ?? '1', 10),

  databaseUrl: required('DATABASE_URL', 'postgresql://memocare:memocare@localhost:5432/memocare_dev'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),

  fieldEncryptionKey: required('FIELD_ENCRYPTION_KEY', '0'.repeat(64)),

  smtp: {
    url: process.env.SMTP_URL ?? '',
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.EMAIL_FROM ?? 'MemoCare <no-reply@memocare.app>',
    configured: false,
  },

  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    from: process.env.TWILIO_FROM ?? '',
  },

  // Development/initial setup access code for the Hospital Management role.
  // Override this in a private environment file before production deployment.
  hospitalManagementCode: process.env.HOSPITAL_MANAGEMENT_CODE ?? 'CKT',

  storage: {
    driver: (process.env.STORAGE_DRIVER as 's3' | 'local') ?? 'local',
    s3Endpoint: process.env.S3_ENDPOINT ?? '',
    s3Region: process.env.S3_REGION ?? 'us-east-1',
    s3Bucket: process.env.S3_BUCKET ?? 'memocare-media',
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    localPath: process.env.LOCAL_STORAGE_PATH ?? './uploads',
  },

  hospitalStaffInviteRequired: (process.env.HOSPITAL_STAFF_INVITE_REQUIRED ?? 'true') === 'true',

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '300', 10),
  },

  mlService: {
    mode: (process.env.ML_SERVICE_MODE as 'stub' | 'http') ?? 'stub',
    url: process.env.ML_SERVICE_URL ?? '',
    apiKey: process.env.ML_SERVICE_API_KEY ?? '',
  },

  // Real speech-to-text + acoustic feature extraction, provided by the
  // local Python microservice in /speech-analysis-service (Whisper-based).
  // mode 'stub' keeps the old fake-numbers behavior; 'http' calls the
  // Python service running locally on FEATURE_EXTRACTION_URL.
  featureExtraction: {
    mode: (process.env.FEATURE_EXTRACTION_MODE as 'stub' | 'http') ?? 'stub',
    url: process.env.FEATURE_EXTRACTION_URL ?? 'http://localhost:5001/analyze',
  },
};

// Treat the checked-in development placeholders as disabled. This prevents a
// local signup from being left in an unverified state while pretending that a
// real email service was configured.
env.smtp.configured = Boolean(
  env.smtp.url
    ? !/changeme|change-me/i.test(env.smtp.url)
    : env.smtp.host &&
      !['changeme', 'change-me'].includes(env.smtp.user) &&
      !['changeme', 'change-me'].includes(env.smtp.pass)
);

// Refuse to boot in production with the placeholder secrets from .env.example.
if (IS_PRODUCTION) {
  const weak: string[] = [];
  if (/^(change-me|dev-)/.test(env.jwt.accessSecret)) weak.push('JWT_ACCESS_SECRET');
  if (/^(change-me|dev-)/.test(env.jwt.refreshSecret)) weak.push('JWT_REFRESH_SECRET');
  if (/^0+$/.test(env.fieldEncryptionKey)) weak.push('FIELD_ENCRYPTION_KEY');
  if (!process.env.HOSPITAL_MANAGEMENT_CODE || process.env.HOSPITAL_MANAGEMENT_CODE === 'CKT') {
    weak.push('HOSPITAL_MANAGEMENT_CODE');
  }
  if (env.storage.driver === 'local' && process.env.ALLOW_LOCAL_STORAGE !== 'true') {
    weak.push('STORAGE_DRIVER (use s3 in production, or set ALLOW_LOCAL_STORAGE=true)');
  }
  if (weak.length) {
    throw new Error(`Refusing to start in production with placeholder values for: ${weak.join(', ')}`);
  }
}
