process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FIELD_ENCRYPTION_KEY = '1'.repeat(64);
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://memocare:memocare@localhost:5432/memocare_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
