import crypto from 'crypto';

console.log('--- Generated MemoCare Production Secrets ---');
console.log(`JWT_ACCESS_SECRET="${crypto.randomBytes(32).toString('hex')}"`);
console.log(`JWT_REFRESH_SECRET="${crypto.randomBytes(32).toString('hex')}"`);
console.log(`FIELD_ENCRYPTION_KEY="${crypto.randomBytes(32).toString('hex')}"`);
console.log(`HOSPITAL_MANAGEMENT_CODE="MC-${crypto.randomBytes(4).toString('hex').toUpperCase()}"`);
console.log('---------------------------------------------');
