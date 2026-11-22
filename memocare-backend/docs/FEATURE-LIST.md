# MemoCare (Avishkaar) — Full Feature Document

MemoCare is a cognitive-health screening platform that turns short recorded voice samples and server-scored screening tests into explainable risk indicators — supporting families, caretakers, hospital staff, hospital management, and medical stores. Every feature below was verified against the actual project source code (routes, pages, and role permissions).

---

## 1. Login, Signup & Account Pages

### Login page (`/login`) — two login modes (tabs)
- **Email login** — email + password, available to every role.
- **Hospital admin code** — sign-in method for the Hospital Management role using the shared management code (`HOSPITAL_MANAGEMENT_CODE`).

Extra links: **Forgot password?** and **Create one** (signup). A marketing panel on the left describes the product ("Cognitive-health screening, grounded in real speech."). If the backend is down the page shows: *"Can't reach the MemoCare server at http://localhost:4000. Check that the backend is running."*

*(The old SMS/phone OTP login with Twilio was removed by design — email + admin code are the only methods.)*

### Signup page (`/signup`) — 5 roles
1. **Family** — patient's family member
2. **Caretaker** — professional caretaker
3. **Hospital Staff** — requires a **hospital invite code** + manual approval by Hospital Management
4. **Hospital Management (admin)** — logs in via admin code (not signup)
5. **Medical Store** — gets its own store dashboard

### Account / auth flows
- **Email verification** (`/verify-email`) — token emailed at signup
- **Forgot password** (`/forgot-password`) → **Reset password** (`/reset-password`) via emailed link
- **Accept invite** (`/accept-invite?token=...`) — family/caretaker invited to a patient links their account through the emailed token
- JWT access + refresh tokens (HTTP-only cookies); **Profile & settings** page for the signed-in user

---

## 2. Role-Based Dashboards

The sidebar and available features change per role:

| Role | Sidebar sections shown |
|---|---|
| Family / Caretaker | Dashboard, Mind Games, Medical Stores, Tutorials, Notifications |
| Hospital Staff | Dashboard, Patients, Dismissed patients, Screening Tests, Mind Games, Medical Stores, Tutorials, Notifications |
| Hospital Management (admin) | Same as staff **plus Admin section**: Hospital management, Staff Approvals, Users |
| Medical Store | Its own **My Store** dashboard (§6) |

### A. Family / Caretaker Dashboard
- "Here's the latest on the people you're caring for" — a card per linked patient (name, latest speech-analysis risk level)
- Opens the **family (simplified) patient workspace**
- Recent-notifications strip with "View all"
- **Family quiz** activity for engagement

### B. Hospital Staff Dashboard
- "What needs your attention across your patients today"
- Shows **all patients of the staff member's hospital** (visibility bug fixed — previously empty unless the staff member was the assigned attending doctor)

### C. Hospital Management (admin) Dashboard
- Hospital-wide patient oversight, doctor assignment (below) and the Admin section (§9)

---

## 3. Patient Management (Staff / Management only)

### Patients list (`/patients`)
- **Register patients**: name, date of birth, sex, emergency contacts, phone, address, relatives, medical-history notes (**encrypted at rest**), diagnosis status
- **Assign attending doctor** to a patient
- Search + **latest risk level** badge per patient

### Patient workspace (`/patients/:id`) — 9 tabs
1. **Overview** — patient summary + family recognition section
2. **Progress** — cognitive-progress timeline of all screening + speech-analysis history
3. **Recordings** — upload or browser-record short voice samples → **speech analysis** (transcript, speech rate wpm, coherence, pauses, risk score/level). Scored server-side, never gameable; optional real Whisper-based Python service
4. **Screening** — run screening tests assigned to the patient
5. **Medications** — schedules + adherence logs
6. **Appointments** — schedule and track
7. **Location** — latest real GPS location + a **no-login shareable location page** (`/share/location.html`) so caretakers can track without an account
8. **Report** — **full clinical report** for staff/management; **simplified report** for family/caretaker
9. **Access** — link/unlink family, caretakers, attending staff; invite by email (instant link or emailed invite)

### Dismissed patients archive (`/patients/dismissed`) — *new feature*
- **Dismiss patient** (with reason) → moves to archive, audit-logged
- Archive shows full record, screening results, speech-analysis results, joined/dismissed dates, reason
- **Readmit** returns a patient to the active list
- Hospital-scoped: staff see their hospital only; management sees all

---

## 4. Screening Tests

- **Screening Tests admin** (`/screening-tests`, staff/management): create, activate, deactivate tests
- Types: `MMSE_STYLE`, `MOCA_STYLE`, `NAME_THE_OBJECTS`, `WORD_RECALL`, `ORIENTATION`, `CUSTOM` — with custom items
- **Scored server-side, never gameable**
- Attempts feed the **Progress** timeline and clinical **Report**

---

## 5. Mind Games (`/mind-games`)

Played on behalf of a linked patient; results recorded as screening attempts:
- **Orientation** • **Word Recall** • **Guess the Thing** • **Pattern Memory**

Available to Family, Caretaker, Staff, and Management.

---

## 6. Medical Stores

### Families (`/stores`)
- **Nearby store search** using device location with a chosen radius — nothing shared until the user opts in
- Filter by specific medicine and check availability

### Store owners (**My Store** dashboard, shown when role = Medical Store)
- Create store profile: name, address, open/close times
- List medicines that appear in nearby searches

---

## 7. Tutorials (`/tutorials`, detail `/tutorials/:slug`)

Published tutorial/care articles for family, caretaker, staff, and management.

---

## 8. Notifications (`/notifications`, all roles)

- Inbox with read/unread state + **unread badge** in the topbar
- Dashboard shows the 4 most recent with "View all"

---

## 9. Admin Section (Hospital Management only)

- **Hospital management** (`/admin/hospitals`): create hospitals (auto-generates invite codes), list hospitals
- **Staff Approvals** (`/admin/staff-approvals`): approve/reject pending hospital-staff signups
- **Users** (`/admin/users`): view all platform users and account statuses

---

## 10. Cross-Cutting Platform Features

- **RBAC everywhere** — enforced server-side (staff hitting admin endpoints get 403 — verified)
- **Patient-scoped access** — users only reach patients they're linked/assigned to
- **Audit logging** for dismiss and sensitive actions
- **Field-level encryption** (AES-256-GCM) for medical-history notes, with resilient decryption so one bad field can't break the patient list
- **Security**: helmet headers, rate limiting, CORS locked to the app origin
- **Swagger docs** at `/api/docs` (+ `/api/docs.json`), **health check** at `/health`
- **File storage**: local driver (dev) / S3-compatible (production); patient **documents tab** for external reports (PDF, lab results, scans)
- **Email (Brevo SMTP)** with real error surfacing and `npm run email:test` probe (`docs/email-brevo-setup.md`)

---

## 11. Backend Route Map (at a glance)

auth · hospitals · patients (list/register/dismiss/readmit/dismissed-archive/links/invites/assignment) · screening · games · family-quiz · progress · report · media (speech recordings) · location (+ share links) · medication · appointment · notification · tutorial · store · patient-documents · admin · local-media

## 12. Verified End-to-End (30/30 automated API tests)

Staff/family/admin-code logins (+wrong code → 401) · staff-visibility fix proven · register patient → instantly visible · dismiss → archive (reason/results) → readmit · removed SMS endpoints → 404 · appointments, medications, documents, links, location, notifications, screening, tutorials, stores, games, admin users · staff blocked from admin (403).
