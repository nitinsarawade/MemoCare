import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MemoCare sample data...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // --- Admin ---
  const admin = await prisma.user.upsert({
    where: { email: 'admin@memocare.dev' },
    update: {},
    create: {
      email: 'admin@memocare.dev',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      firstName: 'Ava',
      lastName: 'Admin',
      emailVerifiedAt: new Date(),
    },
  });

  // --- Hospital ---
  const hospital = await prisma.hospital.upsert({
    where: { inviteCode: 'DEMO-HOSPITAL-001' },
    update: {},
    create: {
      name: 'Riverside Memory Clinic',
      address: '123 Care Lane, Pune, Haveli',
      inviteCode: 'DEMO-HOSPITAL-001',
      isApproved: true,
    },
  });

  await prisma.user.update({ where: { id: admin.id }, data: { hospitalId: hospital.id } });

  // --- Hospital staff (pre-approved for demo convenience) ---
  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@memocare.dev' },
    update: { passwordHash, role: 'HOSPITAL_STAFF', status: 'ACTIVE', hospitalId: hospital.id, emailVerifiedAt: new Date() },
    create: {
      email: 'doctor@memocare.dev',
      passwordHash,
      role: 'HOSPITAL_STAFF',
      status: 'ACTIVE',
      staffTitle: 'DOCTOR',
      firstName: 'Priya',
      lastName: 'Rao',
      hospitalId: hospital.id,
      emailVerifiedAt: new Date(),
    },
  });

  // --- Family member ---
  const family = await prisma.user.upsert({
    where: { email: 'family@memocare.dev' },
    update: { passwordHash, role: 'FAMILY', status: 'ACTIVE', emailVerifiedAt: new Date() },
    create: {
      email: 'family@memocare.dev',
      passwordHash,
      role: 'FAMILY',
      status: 'ACTIVE',
      firstName: 'Sam',
      lastName: 'Chen',
      emailVerifiedAt: new Date(),
    },
  });

  // --- Caretaker ---
  const caretaker = await prisma.user.upsert({
    where: { email: 'caretaker@memocare.dev' },
    update: { passwordHash, role: 'CARETAKER', status: 'ACTIVE', emailVerifiedAt: new Date() },
    create: {
      email: 'caretaker@memocare.dev',
      passwordHash,
      role: 'CARETAKER',
      status: 'ACTIVE',
      firstName: 'Jordan',
      lastName: 'Lee',
      emailVerifiedAt: new Date(),
    },
  });

  // --- Patient, registered under the hospital ---
  const existingPatient = await prisma.patient.findFirst({ where: { firstName: 'Eleanor', lastName: 'Whitfield' } });
  const patient =
    existingPatient ??
    (await prisma.patient.create({
      data: {
        firstName: 'Eleanor',
        lastName: 'Whitfield',
        dateOfBirth: new Date('1948-04-12'),
        sex: 'female',
        emergencyContactName: 'Sam Chen',
        emergencyContactPhone: '555-0100',
        diagnosisStatus: 'undiagnosed',
        hospitalId: hospital.id,
        assignedDoctorId: doctor.id,
        createdById: doctor.id,
      },
    }));

  await prisma.patientLink.upsert({
    where: { patientId_userId: { patientId: patient.id, userId: family.id } },
    update: {},
    create: { patientId: patient.id, userId: family.id, linkRole: 'FAMILY_MEMBER' },
  });
  await prisma.patientLink.upsert({
    where: { patientId_userId: { patientId: patient.id, userId: caretaker.id } },
    update: {},
    create: { patientId: patient.id, userId: caretaker.id, linkRole: 'CARETAKER' },
  });

  // --- Sample cognitive screening test (MMSE-style orientation items) ---
  // 10 real questions. Date/time questions are scored dynamically at
  // submit time (see screeningService.dynamicCorrectAnswer), so "what day
  // is today" is correct EVERY day — not only on the day the DB was seeded.
  let orientationTest = await prisma.screeningTest.findFirst({ where: { title: 'Daily Orientation Check' } });
  if (!orientationTest) {
    orientationTest = await prisma.screeningTest.create({
      data: {
        title: 'Daily Orientation Check',
        description: 'A short MMSE-style orientation and recall screen.',
        testType: 'ORIENTATION',
        items: { create: [] },
      },
    });
  }
  const orientationItems = [
    { prompt: 'What day of the week is it today?', itemType: 'text_answer', correctAnswer: 'DYNAMIC_DATE_QUESTION', points: 1 },
    { prompt: "What is today's date — the day-number of this month?", itemType: 'text_answer', correctAnswer: 'DYNAMIC_DATE_QUESTION', points: 1 },
    { prompt: 'What month is it right now?', itemType: 'text_answer', correctAnswer: 'DYNAMIC_DATE_QUESTION', points: 1 },
    { prompt: 'What year is it?', itemType: 'text_answer', correctAnswer: 'DYNAMIC_DATE_QUESTION', points: 1 },
    { prompt: 'What season is it right now?', itemType: 'text_answer', correctAnswer: 'DYNAMIC_DATE_QUESTION', points: 1 },
    { prompt: 'Please recall these three words: Apple, Table, Penny.', itemType: 'word_recall', correctAnswer: ['apple', 'table', 'penny'], points: 3 },
    { prompt: 'Name the object shown.', itemType: 'image_naming', mediaKey: 'objects/watch.svg', correctAnswer: 'watch', points: 1 },
    { prompt: 'What day comes right after Monday?', itemType: 'text_answer', correctAnswer: ['tuesday'], points: 1 },
    { prompt: 'What day comes right before Friday?', itemType: 'text_answer', correctAnswer: ['thursday'], points: 1 },
    { prompt: 'What is 100 minus 7?', itemType: 'text_answer', correctAnswer: ['93'], points: 1 },
  ];
  const haveOrientationItems = await prisma.screeningItem.findMany({
    where: { testId: orientationTest.id },
    select: { prompt: true },
  });
  const havePrompts = new Set(haveOrientationItems.map((i) => i.prompt));
  const missingOrientation = orientationItems.filter((i) => !havePrompts.has(i.prompt));
  if (missingOrientation.length > 0) {
    await prisma.screeningItem.createMany({
      data: missingOrientation.map((i, idx) => ({
        testId: orientationTest!.id,
        order: haveOrientationItems.length + idx + 1,
        prompt: i.prompt,
        itemType: i.itemType,
        correctAnswer: i.correctAnswer,
        mediaKey: i.mediaKey,
        points: i.points,
      })),
    });
  }

  // Keep one colour game only. Older databases may already contain the
  // previously-added duplicate; deactivate it without deleting history.
  await prisma.screeningTest.updateMany({ where: { title: 'Colour Sequence Memory' }, data: { isActive: false } });

  // --- Sample tutorial articles ---
    await prisma.tutorialArticle.upsert({
    where: { slug: 'how-to-record-a-speech-sample' },
    update: { title: 'How to record a good speech sample', bodyMarkdown: `# How to record a good speech sample

A clear recording gives MemoCare's speech analysis the best chance of picking up real, meaningful signal — not background noise. A few minutes of setup makes a real difference.

## Before you start

- **Find a quiet room.** Turn off the TV, close windows near traffic, and mute notifications on nearby devices.
- **Hold the device steady**, about 30cm (roughly a forearm's length) from the mouth. Too close causes distortion; too far picks up more room echo than voice.
- **Sit somewhere comfortable.** A relaxed, natural posture leads to a more natural speaking pace, which is exactly what the analysis is designed to read.
- **Have the passage or question ready** before you press record, so there's no fumbling once it starts.

## While recording

- Speak at a normal, natural pace. There is no need to speak slowly or unnaturally clearly — normal speech is what the analysis expects.
- If the patient coughs, pauses to think, or needs a moment, that is completely fine. Real pauses are part of real speech.
- Aim for at least 30–60 seconds of speech. Very short clips do not give the analysis enough to work with.
- If using a phone camera for a video recording, keep the phone still — a tripod or propped-up position works better than holding it by hand.

## Precautions

- Do not coach or feed the exact wording during the recording — the goal is natural, unprompted speech.
- Avoid recording immediately after a stressful event, argument, or when the patient is unusually tired — results are meant to reflect a typical day, not an atypical one.
- Never share a recording file outside the app. Recordings contain sensitive personal health information.
- If a recording fails to upload or process, do not delete it until you've confirmed the retry worked — send a screenshot of any error rather than trying repeatedly.

## After recording

Once uploaded, analysis usually finishes within a minute or two (the background worker needs to be running — see the setup guide if it seems stuck). The result appears on the **Progress** and **Report** tabs, never as a standalone pass/fail — always in the context of the trend over multiple recordings.
` },
    create: {
      slug: 'how-to-record-a-speech-sample',
      title: 'How to record a good speech sample',
      bodyMarkdown: `# How to record a good speech sample

A clear recording gives MemoCare's speech analysis the best chance of picking up real, meaningful signal — not background noise. A few minutes of setup makes a real difference.

## Before you start

- **Find a quiet room.** Turn off the TV, close windows near traffic, and mute notifications on nearby devices.
- **Hold the device steady**, about 30cm (roughly a forearm's length) from the mouth. Too close causes distortion; too far picks up more room echo than voice.
- **Sit somewhere comfortable.** A relaxed, natural posture leads to a more natural speaking pace, which is exactly what the analysis is designed to read.
- **Have the passage or question ready** before you press record, so there's no fumbling once it starts.

## While recording

- Speak at a normal, natural pace. There is no need to speak slowly or unnaturally clearly — normal speech is what the analysis expects.
- If the patient coughs, pauses to think, or needs a moment, that is completely fine. Real pauses are part of real speech.
- Aim for at least 30–60 seconds of speech. Very short clips do not give the analysis enough to work with.
- If using a phone camera for a video recording, keep the phone still — a tripod or propped-up position works better than holding it by hand.

## Precautions

- Do not coach or feed the exact wording during the recording — the goal is natural, unprompted speech.
- Avoid recording immediately after a stressful event, argument, or when the patient is unusually tired — results are meant to reflect a typical day, not an atypical one.
- Never share a recording file outside the app. Recordings contain sensitive personal health information.
- If a recording fails to upload or process, do not delete it until you've confirmed the retry worked — send a screenshot of any error rather than trying repeatedly.

## After recording

Once uploaded, analysis usually finishes within a minute or two (the background worker needs to be running — see the setup guide if it seems stuck). The result appears on the **Progress** and **Report** tabs, never as a standalone pass/fail — always in the context of the trend over multiple recordings.
`,
      order: 1,
    },
  });
    await prisma.tutorialArticle.upsert({
    where: { slug: 'understanding-risk-scores' },
    update: { title: 'Understanding your risk scores', bodyMarkdown: `# Understanding your risk scores

MemoCare's risk indicators are a **screening aid**, not a diagnosis. This page explains exactly what goes into them, so the numbers are useful rather than alarming.

## Where the numbers come from

Risk levels are built from two real, transparent sources:

1. **Speech analysis** — acoustic and language features extracted from uploaded recordings (things like pause patterns, word-finding difficulty, and speech rate).
2. **Screening test scores** — the cognitive tests taken in the Screening and Mind Games sections (orientation, pattern recall, naming, and similar).

Nothing here is a machine-learning "black box" verdict. Every score can be traced back to a specific recording or test attempt.

## Reading the trend

The **Progress** tab shows whether things are:

- **Improving** — recent indicators are lower than earlier ones.
- **Stable** — no meaningful change either direction.
- **Declining** — recent indicators are higher than earlier ones.
- **Not enough data yet** — fewer than two data points exist, so no trend can be computed honestly. This is not a bad result; it just means more recordings or tests are needed before a trend is meaningful.

A single test or recording is a snapshot, not a trend. One "high" reading during an off day does not mean decline — the trend line, built from several readings over time, is what matters.

## Precautions

- **Never use this app as a substitute for a real clinical evaluation.** If you notice a genuine change in memory, mood, or daily functioning, talk to a doctor promptly regardless of what this app shows.
- **Do not make medication or care decisions based solely on a risk score.** Bring the Report tab's PDF export to a real appointment and discuss it with a clinician.
- Risk scores can be affected by things unrelated to cognition — poor sleep, illness, hearing difficulty, or an unfamiliar/stressful recording environment. Keep this context in mind before reacting to a single result.
- If a result seems clearly wrong (e.g. a corrupted recording), do not treat it as valid data — re-record instead of letting a bad sample skew the trend.

## Who can see what

- **Family and caretakers** see a simplified summary: the current trend and latest results.
- **Hospital staff** see the full clinical report: flagged risk periods, detailed screening scores, and clinical notes.

This split exists so families get clarity without clinical overload, while staff get the full picture needed for care decisions.
` },
    create: {
      slug: 'understanding-risk-scores',
      title: 'Understanding your risk scores',
      bodyMarkdown: `# Understanding your risk scores

MemoCare's risk indicators are a **screening aid**, not a diagnosis. This page explains exactly what goes into them, so the numbers are useful rather than alarming.

## Where the numbers come from

Risk levels are built from two real, transparent sources:

1. **Speech analysis** — acoustic and language features extracted from uploaded recordings (things like pause patterns, word-finding difficulty, and speech rate).
2. **Screening test scores** — the cognitive tests taken in the Screening and Mind Games sections (orientation, pattern recall, naming, and similar).

Nothing here is a machine-learning "black box" verdict. Every score can be traced back to a specific recording or test attempt.

## Reading the trend

The **Progress** tab shows whether things are:

- **Improving** — recent indicators are lower than earlier ones.
- **Stable** — no meaningful change either direction.
- **Declining** — recent indicators are higher than earlier ones.
- **Not enough data yet** — fewer than two data points exist, so no trend can be computed honestly. This is not a bad result; it just means more recordings or tests are needed before a trend is meaningful.

A single test or recording is a snapshot, not a trend. One "high" reading during an off day does not mean decline — the trend line, built from several readings over time, is what matters.

## Precautions

- **Never use this app as a substitute for a real clinical evaluation.** If you notice a genuine change in memory, mood, or daily functioning, talk to a doctor promptly regardless of what this app shows.
- **Do not make medication or care decisions based solely on a risk score.** Bring the Report tab's PDF export to a real appointment and discuss it with a clinician.
- Risk scores can be affected by things unrelated to cognition — poor sleep, illness, hearing difficulty, or an unfamiliar/stressful recording environment. Keep this context in mind before reacting to a single result.
- If a result seems clearly wrong (e.g. a corrupted recording), do not treat it as valid data — re-record instead of letting a bad sample skew the trend.

## Who can see what

- **Family and caretakers** see a simplified summary: the current trend and latest results.
- **Hospital staff** see the full clinical report: flagged risk periods, detailed screening scores, and clinical notes.

This split exists so families get clarity without clinical overload, while staff get the full picture needed for care decisions.
`,
      order: 2,
    },
  });

  await prisma.tutorialArticle.upsert({
    where: { slug: 'precautions-and-safety' },
    update: { title: 'Precautions and safety', bodyMarkdown: `# Precautions and safety

A short, practical list of things to keep in mind while using MemoCare.

## Data and privacy

- Recordings, screening results, and reports contain sensitive personal health information. Never export or share them outside people who are actually involved in this patient's care.
- Use the **Access** tab to control exactly who can see a patient's data — invite only people who genuinely need it, and remove access (via the invite/link management) once it's no longer needed.
- Report exports (PDF) are meant for a real clinical appointment or family record-keeping — not for general sharing.

## Using screening tests and mind games safely

- Screening tests and mind games are a **screening aid**, not a diagnosis and not a treatment. A single poor result is not cause for alarm; a consistent trend over time is what matters (see "Understanding your risk scores").
- Do not pressure a patient to keep retaking a test until they "pass." That defeats the point of an honest baseline and can cause real distress.
- If a test or game seems to be causing frustration or anxiety, stop and try again another day.

## Medications

- MemoCare's medication tracker is a reminder and record-keeping tool — it does not replace a pharmacist's or doctor's instructions.
- Always double-check dosage and timing against the original prescription, not just what is logged in the app.
- If a dose is missed, follow your doctor's or pharmacist's guidance on what to do — do not double up without checking first.

## Location & Safety features

- Location sharing and safe zones are meant to support independence and safety, not to replace human check-ins. Technology can fail (a dead phone battery, no signal) — keep a phone or in-person check-in routine as a backup.
- Make sure the patient (or their legal guardian, if applicable) has consented to location tracking. Respect their autonomy and dignity — this is a support tool, not surveillance.

## Recordings

- Record in a safe, comfortable setting. Never record without the patient's knowledge or consent.
- If a recording captures something concerning unrelated to cognitive health (e.g. signs of distress or an emergency), address that directly and immediately — do not wait for the app's analysis.

## In an emergency

**This app is not an emergency service.** If there is an immediate safety concern — a fall, a medical emergency, or a patient who cannot be located — contact local emergency services first. Use MemoCare's Location & Safety and Appointments tabs afterward, for follow-up and record-keeping.
` },
    create: {
      slug: 'precautions-and-safety',
      title: 'Precautions and safety',
      bodyMarkdown: `# Precautions and safety

A short, practical list of things to keep in mind while using MemoCare.

## Data and privacy

- Recordings, screening results, and reports contain sensitive personal health information. Never export or share them outside people who are actually involved in this patient's care.
- Use the **Access** tab to control exactly who can see a patient's data — invite only people who genuinely need it, and remove access (via the invite/link management) once it's no longer needed.
- Report exports (PDF) are meant for a real clinical appointment or family record-keeping — not for general sharing.

## Using screening tests and mind games safely

- Screening tests and mind games are a **screening aid**, not a diagnosis and not a treatment. A single poor result is not cause for alarm; a consistent trend over time is what matters (see "Understanding your risk scores").
- Do not pressure a patient to keep retaking a test until they "pass." That defeats the point of an honest baseline and can cause real distress.
- If a test or game seems to be causing frustration or anxiety, stop and try again another day.

## Medications

- MemoCare's medication tracker is a reminder and record-keeping tool — it does not replace a pharmacist's or doctor's instructions.
- Always double-check dosage and timing against the original prescription, not just what is logged in the app.
- If a dose is missed, follow your doctor's or pharmacist's guidance on what to do — do not double up without checking first.

## Location & Safety features

- Location sharing and safe zones are meant to support independence and safety, not to replace human check-ins. Technology can fail (a dead phone battery, no signal) — keep a phone or in-person check-in routine as a backup.
- Make sure the patient (or their legal guardian, if applicable) has consented to location tracking. Respect their autonomy and dignity — this is a support tool, not surveillance.

## Recordings

- Record in a safe, comfortable setting. Never record without the patient's knowledge or consent.
- If a recording captures something concerning unrelated to cognitive health (e.g. signs of distress or an emergency), address that directly and immediately — do not wait for the app's analysis.

## In an emergency

**This app is not an emergency service.** If there is an immediate safety concern — a fall, a medical emergency, or a patient who cannot be located — contact local emergency services first. Use MemoCare's Location & Safety and Appointments tabs afterward, for follow-up and record-keeping.
`,
      order: 3,
    },
  });
  await prisma.tutorialArticle.upsert({
    where: { slug: 'guide-to-every-feature' },
    update: { title: 'A guide to every MemoCare feature', bodyMarkdown: `# A guide to every MemoCare feature

A quick tour of what each part of the app is for for a patient's page, plus the wider app.

## Patient tabs

- **Overview** — the patient's core information: date of birth, gender, medical history, and assigned doctor. This is also where their current risk status is summarized at a glance.
- **Progress** — the trend (improving/stable/declining) built from speech analysis and screening scores over time, plus a summary sentence and a risk-score timeline.
- **Recordings** — record or upload a speech (or video) sample here. Analysis runs automatically once the background worker picks it up.
- **Screening** — take the formal, clinical-style cognitive screening tests here, and review past attempts and their scores.
- **Medications** — track what a patient takes, when, and whether doses were taken on schedule. Add, edit, and remove medications here.
- **Appointments** — upcoming and past medical appointments tied to this patient.
- **Location & Safety** — location check-ins, safe zones (geofenced areas), and location-sharing links for caretakers.
- **Report** — the full clinical report (for hospital staff) or a simplified summary (for family/caretakers), clinical notes, and attached reports (old lab results, scans, or other documents you want kept in one place).
- **Access** — who can see this patient's data. Invite family, caretakers, or attending staff by email here, and remove access when it's no longer needed.

## Sidebar sections

- **Dashboard** — your starting point after logging in. For a Medical Store account, this is instead your store's own management page.
- **Patients** — (hospital staff/admin) the full list of patients you have access to, with quick risk-level filtering and the option to register a new patient.
- **Screening Tests** — (hospital staff/admin) create and manage every screening test in the system, formal or game-style, including deactivating a test you no longer want in use.
- **Mind Games** — the friendlier, patient-facing view of the casual game-style tests (orientation, pattern memory, naming, word recall) — the same tests as Screening, just framed for everyday use rather than a formal exam.
- **Medical Stores** — search nearby pharmacies/medical stores and see what medicines they have in stock.
- **Tutorials** — this section: educational articles on cognitive health, caregiving, and using MemoCare.
- **Notifications** — reminders and alerts (test reminders, risk alerts, invites, appointment reminders, system messages), with per-type in-app/email preferences.
- **Profile & Settings** — your own account details (name, email, phone, date of birth) and password.

## Medical Store accounts

A Medical Store account is a separate kind of account for a pharmacy or medical store, not a patient's caregiver. It only ever sees its own store — its profile (name, address, opening hours) and its medicine list (name, price, and stock quantity) — never any patient's data.

## A note on precautions

See the separate "Precautions and safety" article for guidance on using these features responsibly — especially screening tests, medications, and location sharing.
` },
    create: {
      slug: 'guide-to-every-feature',
      title: 'A guide to every MemoCare feature',
      bodyMarkdown: `# A guide to every MemoCare feature

A quick tour of what each part of the app is for for a patient's page, plus the wider app.

## Patient tabs

- **Overview** — the patient's core information: date of birth, gender, medical history, and assigned doctor. This is also where their current risk status is summarized at a glance.
- **Progress** — the trend (improving/stable/declining) built from speech analysis and screening scores over time, plus a summary sentence and a risk-score timeline.
- **Recordings** — record or upload a speech (or video) sample here. Analysis runs automatically once the background worker picks it up.
- **Screening** — take the formal, clinical-style cognitive screening tests here, and review past attempts and their scores.
- **Medications** — track what a patient takes, when, and whether doses were taken on schedule. Add, edit, and remove medications here.
- **Appointments** — upcoming and past medical appointments tied to this patient.
- **Location & Safety** — location check-ins, safe zones (geofenced areas), and location-sharing links for caretakers.
- **Report** — the full clinical report (for hospital staff) or a simplified summary (for family/caretakers), clinical notes, and attached reports (old lab results, scans, or other documents you want kept in one place).
- **Access** — who can see this patient's data. Invite family, caretakers, or attending staff by email here, and remove access when it's no longer needed.

## Sidebar sections

- **Dashboard** — your starting point after logging in. For a Medical Store account, this is instead your store's own management page.
- **Patients** — (hospital staff/admin) the full list of patients you have access to, with quick risk-level filtering and the option to register a new patient.
- **Screening Tests** — (hospital staff/admin) create and manage every screening test in the system, formal or game-style, including deactivating a test you no longer want in use.
- **Mind Games** — the friendlier, patient-facing view of the casual game-style tests (orientation, pattern memory, naming, word recall) — the same tests as Screening, just framed for everyday use rather than a formal exam.
- **Medical Stores** — search nearby pharmacies/medical stores and see what medicines they have in stock.
- **Tutorials** — this section: educational articles on cognitive health, caregiving, and using MemoCare.
- **Notifications** — reminders and alerts (test reminders, risk alerts, invites, appointment reminders, system messages), with per-type in-app/email preferences.
- **Profile & Settings** — your own account details (name, email, phone, date of birth) and password.

## Medical Store accounts

A Medical Store account is a separate kind of account for a pharmacy or medical store, not a patient's caregiver. It only ever sees its own store — its profile (name, address, opening hours) and its medicine list (name, price, and stock quantity) — never any patient's data.

## A note on precautions

See the separate "Precautions and safety" article for guidance on using these features responsibly — especially screening tests, medications, and location sharing.
`,
      order: 4,
    },
  });

  // --- Sample medication + safe zone + pattern-memory game (new features) ---
  const existingMedication = await prisma.medication.findFirst({
    where: { patientId: patient.id, name: 'Donepezil' },
  });
  if (!existingMedication) {
    await prisma.medication.create({
      data: {
        patientId: patient.id,
        name: 'Donepezil',
        dosage: '5mg tablet',
        instructions: 'Take in the evening with food',
        scheduleType: 'RECURRING_DAILY',
        timesOfDay: ['08:00', '20:00'],
        startDate: new Date(),
        createdById: doctor.id,
      },
    });
  }

  const existingSafeZone = await prisma.safeZone.findFirst({ where: { patientId: patient.id, name: 'Home' } });
  if (!existingSafeZone) {
    await prisma.safeZone.create({
      data: {
        patientId: patient.id,
        name: 'Home',
        centerLat: 40.7128,
        centerLng: -74.006,
        radiusMeters: 300,
        createdById: caretaker.id,
      },
    });
  }

  // --- "Guess the Object" picture-naming test (uses the 50 pictures in public/assets/objects) ---
  // First repair any naming question seeded before real pictures existed.
  await prisma.screeningItem.updateMany({
    where: { mediaKey: { in: ['tutorials/sample-object-watch.png', 'sample-object-watch.svg'] } },
    data: { mediaKey: 'objects/watch.svg' },
  });

  {
    // "Guess the Object" draws a random 10 out of its full 50-picture pool
    // every time it's taken (itemsPerAttempt), so a different 10 show up
    // each attempt instead of the same ones in the same order.
    const catalog: { slug: string; label: string; accept: string[] }[] = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../public/assets/objects/catalog.json'), 'utf8')
    );

    let objectGame = await prisma.screeningTest.findFirst({ where: { title: 'Guess the Object' }, include: { items: true } });
    if (!objectGame) {
      objectGame = await prisma.screeningTest.create({
        data: {
          title: 'Guess the Object',
          description: 'Look at each picture and name the object. A different random set of 10 pictures each time.',
          testType: 'NAME_THE_OBJECTS',
          itemsPerAttempt: 10,
        },
        include: { items: true },
      });
    } else if (objectGame.itemsPerAttempt !== 10) {
      await prisma.screeningTest.update({ where: { id: objectGame.id }, data: { itemsPerAttempt: 10 } });
    }

    // Add any of the 50 catalog pictures this test doesn't already have as an item yet
    // (covers both a brand-new test and one seeded earlier with only a handful of items).
    const haveKeys = new Set(objectGame.items.map((i) => i.mediaKey));
    const missing = catalog.filter((obj) => !haveKeys.has(`objects/${obj.slug}.svg`));
    if (missing.length > 0) {
      let nextOrder = objectGame.items.length + 1;
      await prisma.screeningItem.createMany({
        data: missing.map((obj) => ({
          testId: objectGame!.id,
          order: nextOrder++,
          prompt: 'What is this object?',
          itemType: 'image_naming',
          mediaKey: `objects/${obj.slug}.svg`,
          correctAnswer: obj.accept,
          points: 1,
        })),
      });
    }
  }

  const existingPatternGame = await prisma.screeningTest.findFirst({ where: { title: 'Color Pattern Recall' } });
  if (!existingPatternGame) {
    // A pool of 12 coloured sequences (drawn from a 12-colour palette).
    // iOS-CAT style: each attempt sets itemsPerAttempt to 4, so a different
    // random 4-sequence set is drawn from the pool every play — never the
    // same fixed demo sequences again. Sequences are correct only in the
    // exact order they were shown (pattern_sequence scoring is ordered).
    const PALETTE = [
      'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange',
      'Pink', 'Brown', 'Black', 'White', 'Grey', 'Teal',
    ];
    const pick = () => PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const generated: string[][] = [];
    while (generated.length < 12) {
      const seq = [pick(), pick(), pick(), pick()];
      // avoid trivial all-same sequences for a meaningful game
      if (new Set(seq).size === 1) continue;
      generated.push(seq);
    }
    await prisma.screeningTest.create({
      data: {
        title: 'Color Pattern Recall',
        description: 'Watch 4 colours appear one by one, wait 5 seconds after they disappear, then type them back in the same order. A different random 4 sequences from 12 each time.',
        testType: 'PATTERN_MEMORY',
        itemsPerAttempt: 4,
        items: {
          create: generated.map((seq, i) => ({
            order: i + 1,
            prompt: `Watch the colours, then repeat them in the same order (sequence ${i + 1}).`,
            itemType: 'pattern_sequence',
            mediaKey: 'games/color-sequence.svg',
            correctAnswer: seq.map((c) => c.toLowerCase()),
            choices: PALETTE,
            points: 1,
          })),
        },
      },
    });
  } else {
    // Older DBs: replace the fixed 2-item demo with the random 4-of-12 pool.
    const item = await prisma.screeningItem.findFirst({ where: { testId: existingPatternGame.id, prompt: 'Repeat this sequence: Red, Blue, Green' } });
    if (item) {
      const PALETTE = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Brown', 'Black', 'White', 'Grey', 'Teal'];
      const pick = () => PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const generated: string[][] = [];
      while (generated.length < 12) {
        const seq = [pick(), pick(), pick(), pick()];
        if (new Set(seq).size === 1) continue;
        generated.push(seq);
      }
      await prisma.screeningItem.deleteMany({ where: { testId: existingPatternGame.id } });
      await prisma.screeningItem.createMany({
        data: generated.map((seq, i) => ({
          testId: existingPatternGame.id,
          order: i + 1,
          prompt: `Watch the colours, then repeat them in the same order (sequence ${i + 1}).`,
          itemType: 'pattern_sequence',
          mediaKey: 'games/color-sequence.svg',
          correctAnswer: seq.map((c) => c.toLowerCase()),
          choices: PALETTE,
          points: 1,
        })),
      });
    }
    if (existingPatternGame.itemsPerAttempt !== 4) {
      await prisma.screeningTest.update({ where: { id: existingPatternGame.id }, data: { itemsPerAttempt: 4 } });
    }
  }

  // --- Sample medical store account with a few medicines (new feature) ---
  const storeOwner = await prisma.user.upsert({
    where: { email: 'store@memocare.dev' },
    update: { passwordHash, role: 'MEDICAL_STORE', status: 'ACTIVE', emailVerifiedAt: new Date() },
    create: {
      email: 'store@memocare.dev',
      passwordHash,
      role: 'MEDICAL_STORE',
      status: 'ACTIVE',
      firstName: 'Riverside',
      lastName: 'Pharmacy',
      emailVerifiedAt: new Date(),
    },
  });

  const store = await prisma.medicalStore.upsert({
    where: { ownerId: storeOwner.id },
    update: { city: 'Pune', taluka: 'Haveli', openTime: '09:00', closeTime: '21:00' },
    create: {
      ownerId: storeOwner.id,
      storeName: 'Riverside Pharmacy',
      address: '12 Market Road, Near Bus Stand',
      city: 'Pune',
      taluka: 'Haveli',
      latitude: 18.5204,
      longitude: 73.8567,
      phone: '555-0199',
      openTime: '09:00',
      closeTime: '21:00',
    },
  });

  const sampleMedicines = [
    { name: 'Donepezil 5mg', price: 12.5, quantity: 120 },
    { name: 'Donepezil 10mg', price: 15.0, quantity: 80 },
    { name: 'Memantine 10mg', price: 18.75, quantity: 45 },
    { name: 'Rivastigmine 4.6mg patch', price: 22.0, quantity: 30 },
  ];
  for (const med of sampleMedicines) {
    const exists = await prisma.storeMedicine.findFirst({ where: { storeId: store.id, name: med.name } });
    if (!exists) {
      await prisma.storeMedicine.create({ data: { storeId: store.id, name: med.name, price: med.price, quantity: med.quantity } });
    } else if (exists.quantity === 0) {
      // Stores seeded before stock tracking existed: give the demo medicines some stock.
      await prisma.storeMedicine.update({ where: { id: exists.id }, data: { quantity: med.quantity } });
    }
  }

  console.log('Seed complete.');
  console.log('Demo logins (password Password123!): doctor@memocare.dev, family@memocare.dev, store@memocare.dev');
  console.log({ adminId: admin.id, hospitalId: hospital.id, patientId: patient.id, inviteCode: hospital.inviteCode });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
