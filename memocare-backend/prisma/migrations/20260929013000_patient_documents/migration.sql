-- New AuditAction values for document upload/delete tracking.
ALTER TYPE "AuditAction" ADD VALUE 'UPLOAD_DOCUMENT';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_DOCUMENT';

-- Attaches external/legacy reports (PDFs, lab results, etc.) to a patient,
-- separate from the app's own generated media sessions and clinical report.

CREATE TABLE "PatientDocument" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientDocument_patientId_idx" ON "PatientDocument"("patientId");

ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
