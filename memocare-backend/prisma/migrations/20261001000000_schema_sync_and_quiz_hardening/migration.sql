-- Brings the migration history back in line with schema.prisma.
-- These columns were added to the schema (and are used by the app) but never
-- got a migration. IF NOT EXISTS keeps this safe for databases that were
-- previously synced with `prisma db push`.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);

ALTER TABLE "MedicalStore" ADD COLUMN IF NOT EXISTS "openTime" TEXT;
ALTER TABLE "MedicalStore" ADD COLUMN IF NOT EXISTS "closeTime" TEXT;

ALTER TABLE "StoreMedicine" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 0;

-- The exact set of family members issued to a quiz attempt, so submit can
-- verify answers against what was actually shown.
ALTER TABLE "FamilyQuizAttempt" ADD COLUMN IF NOT EXISTS "issuedMemberIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Patient.assignedDoctor relation (the column already existed; the foreign key did not).
-- Clear any dangling ids first so the constraint can be added.
UPDATE "Patient" SET "assignedDoctorId" = NULL
  WHERE "assignedDoctorId" IS NOT NULL
    AND "assignedDoctorId" NOT IN (SELECT "id" FROM "User");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Patient_assignedDoctorId_fkey') THEN
    ALTER TABLE "Patient" ADD CONSTRAINT "Patient_assignedDoctorId_fkey"
      FOREIGN KEY ("assignedDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
