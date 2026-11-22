/**
 * One-off cleanup: delete test patients created by automated test runs
 * (TestPatient Apitest / DismissCheck Probe) and every dependent row
 * (screening attempts, media sessions + analysis results, links, invites,
 * notifications, audit logs, progresses, appointments, etc.). Idempotent —
 * prints what it found and deleted. Run with a valid DATABASE_URL.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cascadeDeletePatient(id) {
  // Every child model keyed by patientId (names verified against the generated
  // Prisma client + schema). screeningAnswer FKs to attemptId (deleted with the
  // attempt); notification/tutorialProgress are user-scoped, not patient-scoped.
  await prisma.screeningAttempt.deleteMany({ where: { patientId: id } }); // cascades screeningAnswer
  await prisma.familyQuizAttempt.deleteMany({ where: { patientId: id } });
  await prisma.medicationLog.deleteMany({ where: { patientId: id } });
  await prisma.medication.deleteMany({ where: { patientId: id } });
  await prisma.appointment.deleteMany({ where: { patientId: id } });
  await prisma.patientDocument.deleteMany({ where: { patientId: id } });
  await prisma.patientNote.deleteMany({ where: { patientId: id } });
  await prisma.patientFamilyMember.deleteMany({ where: { patientId: id } });
  await prisma.patientLink.deleteMany({ where: { patientId: id } });
  await prisma.patientLinkInvite.deleteMany({ where: { patientId: id } });
  await prisma.progressSnapshot.deleteMany({ where: { patientId: id } });
  await prisma.locationCheckIn.deleteMany({ where: { patientId: id } });
  await prisma.safeZone.deleteMany({ where: { patientId: id } });
  await prisma.locationShareToken.deleteMany({ where: { patientId: id } });
  await prisma.auditLog.deleteMany({ where: { patientId: id } });

  // Media sessions + their analysis results (analysis FKs to session).
  const sessions = await prisma.mediaSession.findMany({ where: { patientId: id }, select: { id: true } });
  for (const s of sessions) {
    await prisma.speechAnalysisResult.deleteMany({ where: { mediaSessionId: s.id } });
  }
  await prisma.mediaSession.deleteMany({ where: { patientId: id } });

  await prisma.patient.delete({ where: { id } });
}

async function main() {
  const candidates = await prisma.patient.findMany({
    where: {
      OR: [
        { firstName: 'TestPatient' },
        { firstName: 'DismissCheck' },
        { lastName: { in: ['Apitest', 'Probe', 'Apitest2', 'Testcase'] } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, status: true },
  });

  if (!candidates.length) {
    console.log('No test patients found — database is already clean.');
    return;
  }

  console.log(`Deleting ${candidates.length} test patient(s):`);
  for (const p of candidates) {
    console.log(` - ${p.firstName} ${p.lastName} (${p.status}) ${p.id}`);
    await cascadeDeletePatient(p.id);
  }
  console.log('Done. Database clean.');
}

main()
  .catch((e) => {
    console.error('Cleanup failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
