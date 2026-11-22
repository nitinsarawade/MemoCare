/**
 * Short explainer text for every sidebar option (and the patient-workspace tabs).
 * The little downward arrow beside each item in the UI opens one of these.
 * Keys are route paths; patient-workspace tabs use the `tab:` prefix.
 */
export const NAV_INFO = {
  '/dashboard':
    'Your home screen. Shows patient counts, a risk-level breakdown (low / moderate / high) and your 8 most at-risk patients, so you can see instantly who needs attention today.',
  '/patients':
    'The full registry of active patients in your hospital. Register new patients, search by name, open any patient to work with their record, or dismiss a patient who no longer needs care.',
  '/patients/dismissed':
    'An archive of patients who were dismissed (e.g. treatment completed or transferred). Their full record, results and history are kept here and they can be readmitted at any time.',
  '/screening-tests':
    'Cognitive screening tests (memory, orientation, language). Every attempt is scored on the server — answers are never trusted from the browser, so results cannot be gamed.',
  '/mind-games':
    'Light, engaging brain exercises patients can play at home. Game results feed into progress tracking between formal screening sessions.',
  '/stores':
    'A directory of verified medical stores. Patients and caretakers can find pharmacies near them, and store owners manage their own store page.',
  '/guidance':
    'Step-by-step guides for families and caretakers: how to record a good voice sample, run a screening session, give medication on time, and more.',
  '/notifications':
    'Everything that needs your attention in one place — screening results ready, staff approvals, appointment reminders and care requests. The red badge is your unread count.',
  '/admin/hospitals':
    '(Hospital Management only) Register and manage hospitals on the platform, including their staff and locations.',
  '/admin/staff-approvals':
    '(Hospital Management only) Review and approve or decline requests from hospital staff who want to join your hospital.',
  '/admin/users':
    '(Hospital Management only) See every account at your hospital — staff, families, caretakers and stores — and manage their access.',

  'tab:overview':
    'Snapshot of this patient: personal details, diagnosis status, assigned doctor and the latest risk level from their most recent speech screening.',
  'tab:progress':
    'How this patient is changing over time — risk level and language markers plotted across screening sessions, so improvement or decline is visible at a glance.',
  'tab:recordings':
    'Voice samples recorded for this patient. Each recording is transcribed and analysed for speech patterns linked with cognitive decline.',
  'tab:screening':
    'The patient’s screening history — every test attempt, its score and the resulting risk level. Start a new attempt from here.',
  'tab:medications':
    'This patient’s medication plan: what to take, dosage and schedule. Caretakers and family can see what is due and mark doses as given.',
  'tab:appointments':
    'Upcoming and past appointments with doctors, with scheduling for caretakers and clinical staff.',
  'tab:location':
    'Location & safety check-in for this patient, so family can confirm they are safe and find them quickly if they wander.',
  'tab:report':
    'A printable summary you can share with a doctor: demographics, screening results, risk trend and recent activity in one document.',
  'tab:access':
    'Who can see this patient’s record — family members, caretakers and attending staff. Invite or remove linked people here.',
};
