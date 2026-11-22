CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'DISMISSED');

ALTER TABLE "Patient" ADD COLUMN "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Patient" ADD COLUMN "dismissedAt" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN "dismissReason" TEXT;

CREATE INDEX "Patient_status_idx" ON "Patient"("status");

-- Remove the Hospital Management SMS login infrastructure (Twilio)
DROP TABLE IF EXISTS "PhoneLoginCode";

-- New audit actions for the dismiss lifecycle
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DISMISS_PATIENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'READMIT_PATIENT';
