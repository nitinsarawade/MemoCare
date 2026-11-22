-- Screening tests can now draw a random subset of items per attempt
-- (e.g. 10 random pictures out of a 50-picture pool each time).
ALTER TABLE "ScreeningTest" ADD COLUMN "itemsPerAttempt" INTEGER;

-- Family-member recognition quiz: named photos per patient, plus quiz
-- attempts/answers scored the same way screening tests are.

CREATE TABLE "PatientFamilyMember" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientFamilyMember_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PatientFamilyMember_patientId_idx" ON "PatientFamilyMember"("patientId");
ALTER TABLE "PatientFamilyMember" ADD CONSTRAINT "PatientFamilyMember_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientFamilyMember" ADD CONSTRAINT "PatientFamilyMember_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FamilyQuizAttempt" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "administeredById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalScore" INTEGER,
    "maxPossibleScore" INTEGER,
    "scorePercentage" DOUBLE PRECISION,

    CONSTRAINT "FamilyQuizAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FamilyQuizAttempt_patientId_idx" ON "FamilyQuizAttempt"("patientId");
ALTER TABLE "FamilyQuizAttempt" ADD CONSTRAINT "FamilyQuizAttempt_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyQuizAttempt" ADD CONSTRAINT "FamilyQuizAttempt_administeredById_fkey"
    FOREIGN KEY ("administeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FamilyQuizAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "givenAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "FamilyQuizAnswer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FamilyQuizAnswer_attemptId_idx" ON "FamilyQuizAnswer"("attemptId");
ALTER TABLE "FamilyQuizAnswer" ADD CONSTRAINT "FamilyQuizAnswer_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "FamilyQuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyQuizAnswer" ADD CONSTRAINT "FamilyQuizAnswer_familyMemberId_fkey"
    FOREIGN KEY ("familyMemberId") REFERENCES "PatientFamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
