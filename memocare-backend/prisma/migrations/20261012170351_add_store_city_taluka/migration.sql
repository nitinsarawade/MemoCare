-- AlterTable
ALTER TABLE "MedicalStore" ADD COLUMN     "city" TEXT,
ADD COLUMN     "taluka" TEXT;

-- CreateIndex
CREATE INDEX "MedicalStore_city_taluka_idx" ON "MedicalStore"("city", "taluka");
