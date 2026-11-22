-- CreateEnum
CREATE TYPE "MedicationLogStatus" AS ENUM ('PENDING', 'TAKEN', 'MISSED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MedicationScheduleType" AS ENUM ('RECURRING_DAILY', 'SPECIFIC_DATES');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'MEDICATION_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'LOCATION_ALERT';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MEDICAL_STORE';

-- AlterEnum
ALTER TYPE "ScreeningTestType" ADD VALUE 'PATTERN_MEMORY';

-- AlterTable
ALTER TABLE "SpeechAnalysisResult" ADD COLUMN     "transcriptText" TEXT;

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "instructions" TEXT,
    "scheduleType" "MedicationScheduleType" NOT NULL DEFAULT 'RECURRING_DAILY',
    "timesOfDay" TEXT[],
    "specificDateTimes" TIMESTAMP(3)[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationLog" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "MedicationLogStatus" NOT NULL DEFAULT 'PENDING',
    "takenAt" TIMESTAMP(3),
    "recordedById" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationCheckIn" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracyMeters" DOUBLE PRECISION,
    "source" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafeZone" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafeZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationShareToken" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "LocationShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalStore" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreMedicine" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreMedicine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medication_patientId_idx" ON "Medication"("patientId");

-- CreateIndex
CREATE INDEX "Medication_isActive_idx" ON "Medication"("isActive");

-- CreateIndex
CREATE INDEX "MedicationLog_patientId_scheduledFor_idx" ON "MedicationLog"("patientId", "scheduledFor");

-- CreateIndex
CREATE INDEX "MedicationLog_status_idx" ON "MedicationLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationLog_medicationId_scheduledFor_key" ON "MedicationLog"("medicationId", "scheduledFor");

-- CreateIndex
CREATE INDEX "LocationCheckIn_patientId_recordedAt_idx" ON "LocationCheckIn"("patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "SafeZone_patientId_idx" ON "SafeZone"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationShareToken_token_key" ON "LocationShareToken"("token");

-- CreateIndex
CREATE INDEX "LocationShareToken_patientId_idx" ON "LocationShareToken"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalStore_ownerId_key" ON "MedicalStore"("ownerId");

-- CreateIndex
CREATE INDEX "MedicalStore_latitude_longitude_idx" ON "MedicalStore"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "StoreMedicine_storeId_idx" ON "StoreMedicine"("storeId");

-- CreateIndex
CREATE INDEX "StoreMedicine_name_idx" ON "StoreMedicine"("name");

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationLog" ADD CONSTRAINT "MedicationLog_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationLog" ADD CONSTRAINT "MedicationLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationLog" ADD CONSTRAINT "MedicationLog_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationCheckIn" ADD CONSTRAINT "LocationCheckIn_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafeZone" ADD CONSTRAINT "SafeZone_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafeZone" ADD CONSTRAINT "SafeZone_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationShareToken" ADD CONSTRAINT "LocationShareToken_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationShareToken" ADD CONSTRAINT "LocationShareToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalStore" ADD CONSTRAINT "MedicalStore_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMedicine" ADD CONSTRAINT "StoreMedicine_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "MedicalStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
