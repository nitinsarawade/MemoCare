-- AlterTable
ALTER TABLE "MedicalStore" ADD COLUMN     "closeTime" TEXT,
ADD COLUMN     "openTime" TEXT;

-- AlterTable
ALTER TABLE "StoreMedicine" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateOfBirth" TIMESTAMP(3);
