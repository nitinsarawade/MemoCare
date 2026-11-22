# MemoCare — Backend

Backend-only, production-grade API for **MemoCare**, a dementia/Alzheimer's early-detection
and monitoring platform combining speech analysis, cognitive screening, video sessions,
progress tracking, and caregiver/clinician collaboration.

No UI is included by design — this is built so a separate frontend team can develop against
a stable, documented, versioned REST API.

---

## 1. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language / framework | Node.js + Express, TypeScript | Simple, well-understood, fast to iterate; NestJS was considered but Express + a clear folder convention gives the same separation of concerns with less ceremony for a project this size. |
| Database | PostgreSQL via Prisma ORM | Relational integrity for users/patients/links/scores; Prisma gives type-safe queries + migrations out of the box. |
| Binary storage | S3-compatible bucket, abstracted behind `StorageService` (local-disk driver for dev) | Keeps raw audio/video out of Postgres; swappable to real S3/MinIO/R2 without touching calling code. |
| Auth | JWT access tokens (short-lived) + opaque, hashed, rotating refresh tokens | Refresh tokens are never stored raw — only their SHA-256 hash — and are rotated on every use. |
| Password hashing | bcryptjs | Industry-standard bcrypt hashes with a portable pure-JavaScript implementation, tunable via `BCRYPT_SALT_ROUNDS`. |
| Background jobs | BullMQ + Redis | Speech/video analysis runs asynchronously so uploads return immediately; retries + backoff built in. |
| Validation | Zod | Schema validation with typed, parsed output on every route. |
| API docs | swagger-jsdoc + swagger-ui-express, served at `/api/docs` | Auto-generated from JSDoc comments on routes; a hand-maintained mirror lives at `docs/openapi.yaml`. |
| Testing | Jest + Supertest + ts-jest | Unit tests for pure utilities, integration tests for routes/middleware against a mocked Prisma client. |

---

## 2. Project structure

```
memocare-backend/
├── prisma/
│   ├── schema.prisma        # full data model (see section 4)
│   └── seed.ts               # sample hospital, users, patient, screening test, tutorials
├── src/
│   ├── config/                # env, logger, prisma client, redis, swagger
│   ├── middleware/             # auth, RBAC, validation, rate limiting, error handling, uploads
│   ├── routes/                 # one file per resource; routes/index.ts wires them together
│   ├── controllers/            # thin HTTP-layer glue — parse req, call service, shape response
│   ├── services/                # business logic (the bulk of the app lives here)
│   ├── validators/              # Zod schemas, one file per resource
│   ├── jobs/                    # BullMQ queue + worker (speech analysis pipeline)
│   ├── utils/                   # errors, async handler, password/token/encryption helpers
│   └── types/                   # Express Request augmentation
├── tests/
│   ├── unit/                    # pure-function tests (encryption, tokens, RBAC helpers)
│   └── integration/              # Supertest against the real Express app, Prisma mocked
├── docs/openapi.yaml            # standalone OpenAPI spec (also auto-served at /api/docs.json)
├── .env.example
└── README.md
```

---

## 3. Getting started

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis 6+ (for the background job queue)

### Setup

```bash
cp .env.example .env          # then edit values — see section 5
npm install
npm run prisma:migrate        # creates the database schema
npm run seed                  # optional: sample hospital/users/patient/screening test
npm run dev                   # starts the API on http://localhost:4000
```

In a second terminal, start the background worker that processes uploaded audio/video:

```bash
npm run worker
```

Swagger UI: `http://localhost:4000/api/docs`
Raw OpenAPI JSON: `http://localhost:4000/api/docs.json`
Health check: `http://localhost:4000/health`

### Running tests

```bash
npm test
```

Tests run against a mocked Prisma client (no live database required) so they're safe to run
in CI without provisioning Postgres/Redis. For true end-to-end integration tests against a
real database, point `DATABASE_URL` at a disposable test database and remove the
`jest.mock('../../src/config/prisma', ...)` calls in `tests/integration/`.

### Seeded demo accounts (password for all: `Password123!`)

| Role | Email | Notes |
|---|---|---|
| Admin | `admin@memocare.dev` | Full system oversight |
| Hospital staff (doctor) | `doctor@memocare.dev` | Pre-approved, at "Riverside Memory Clinic" |
| Family member | `family@memocare.dev` | Linked to seeded patient Eleanor Whitfield |
| Caretaker | `caretaker@memocare.dev` | Linked to the same patient |

Hospital staff invite code for signup testing: `DEMO-HOSPITAL-001`

---

## 4. Data model (high level)

Full definitions in `prisma/schema.prisma`. Key relationships:

- **User** has a `role` (`FAMILY | CARETAKER | HOSPITAL_STAFF | ADMIN`) and `status`
  (`PENDING_VERIFICATION | PENDING_APPROVAL | ACTIVE | SUSPENDED | REJECTED`).
- **Hospital** — staff belong to one hospital (`User.hospitalId`); patients registered by
  staff are also tagged with that hospital (`Patient.hospitalId`).
- **PatientLink** — the many-to-many join table between `User` and `Patient` for family
  members and caretakers (`linkRole: FAMILY_MEMBER | CARETAKER | ATTENDING_STAFF`). A
  `PatientLinkInvite` table supports inviting someone by email before they have an account.
- **MediaSession** — one row per uploaded audio/video file (S3-style `storageKey`, never the
  binary itself). Feeds `SpeechAnalysisResult` (1:1) via an async job.
- **ScreeningTest / ScreeningItem / ScreeningAttempt / ScreeningAnswer** — the cognitive
  screening ("guess the things") module; correct answers are never sent to the client before
  scoring.
- **ProgressSnapshot** — optional materialized rollup for fast trend queries (the live
  timeline endpoint also computes trends on the fly from raw rows).
- **PatientNote** — clinician notes, with a `visibleToFamily` flag controlling whether
  family/caretaker roles can see them.
- **AuditLog** — one row per sensitive read (`VIEW_PATIENT`, `VIEW_REPORT`,
  `VIEW_SPEECH_RESULT`, `VIEW_VIDEO_SESSION`, `VIEW_SCREENING_RESULT`, `EXPORT_REPORT`, etc.),
  capturing actor, patient, action, and timestamp.
- **TutorialArticle / TutorialProgress** — CMS-lite onboarding content + per-user completion.
- **Notification / NotificationPreference** — in-app + email delivery, opt-in/out per type.
- **Appointment** — scheduling/reminders tied to a patient.
- **AnalyticsEvent** — lightweight, schema-flexible event log for future admin dashboards.

---

## 5. Environment variables

See `.env.example` for the full list with defaults. The ones you must change before a real
deployment:

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — long random strings.
- `FIELD_ENCRYPTION_KEY` — a 32-byte key, hex-encoded (64 hex characters), used to encrypt
  `Patient.medicalHistoryNotes` at rest with AES-256-GCM. Generate one with:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `DATABASE_URL`, `REDIS_URL` — point at your Postgres/Redis instances.
- `SMTP_*` / `EMAIL_FROM` — real SMTP credentials (emails are silently suppressed and logged
  instead of sent when `SMTP_HOST` is empty, which is the default for local dev).
- `STORAGE_DRIVER` — `local` (default, writes under `LOCAL_STORAGE_PATH`) or `s3` (requires
  wiring `@aws-sdk/client-s3` into `src/services/storageService.ts` — the contract/interface
  is already in place, only the S3 branch's implementation is a stub).
- `ML_SERVICE_MODE` — `stub` (default; a deterministic heuristic scorer, good for local dev
  and demos) or `http` (calls `ML_SERVICE_URL` with the extracted feature vector — point this
  at a real model service when one exists; see `src/services/mlRiskService.ts`).

---

## 6. Role-based access control

Enforcement happens in two layers, both server-side (never just hidden in a UI):

1. **`requireRole(...)`** — coarse-grained: is this role allowed to hit this route at all
   (e.g. only `ADMIN` can approve hospital staff).
2. **`requirePatientAccess()` / `requireResourcePatientAccess()`** — fine-grained, per-request:
   - `ADMIN` — always allowed.
   - `HOSPITAL_STAFF` — allowed only if `patient.hospitalId === req.auth.hospitalId`.
   - `FAMILY` / `CARETAKER` — allowed only if a `PatientLink` row exists for
     `(patientId, userId)`.

List endpoints (`GET /patients`) use `patientVisibilityWhere()` to build the *query* filter
itself, so restricted rows are never fetched in the first place, not merely hidden after the
fact.

Every read of sensitive patient data (patient record, report, speech/video result, screening
result, report export) writes an `AuditLog` row via `recordAuditLog()` — see
`src/services/auditService.ts`.

---

## 7. Speech/video analysis pipeline

1. `POST /patients/:patientId/media/audio` (or `/video`) accepts a multipart file, stores it
   via `StorageService` (local disk in dev, S3 in production), creates a `MediaSession` row,
   and enqueues a `speech-analysis` BullMQ job. The HTTP response returns immediately with
   `status: "QUEUED"`.
2. The worker (`npm run worker`) picks up the job:
   - `FeatureExtractor.extract()` — stubbed acoustic/linguistic feature extraction (pauses,
     speech rate, filler words, word-finding difficulty, coherence). Replace
     `StubFeatureExtractor` with a real pipeline (e.g. a Python microservice) without changing
     any other code — it's a plain interface.
   - `MlRiskService.score()` — turns features into a 0–100 risk score + level. The stub is a
     transparent weighted heuristic; set `ML_SERVICE_MODE=http` to call a real model service
     over HTTP instead.
   - Persists a `SpeechAnalysisResult`, marks the session `COMPLETED` (or `FAILED` with a
     reason), and fires a risk-alert notification if the score crosses the "HIGH" threshold.
3. `GET /media/:mediaSessionId` returns the session + result once ready.

Video sessions can optionally feed the same pipeline (`runAnalysis: true` in the upload body)
using their extracted audio track — the contract is identical to the audio path.

---

## 8. Notable design decisions / trade-offs

- **Encryption at rest** is applied selectively (`Patient.medicalHistoryNotes`) rather than to
  the whole table, per the "clear separation of PII from clinical data where feasible"
  requirement — demographic/contact PII stays queryable/indexable, free-text clinical notes
  are encrypted.
- **Refresh tokens are opaque + hashed**, not JWTs, so a stolen database dump alone can't be
  replayed as a session; the raw token only ever exists in the client and in-flight over TLS.
- **Hospital staff have a two-step gate**: email verification *then* manual admin approval
  (`PENDING_APPROVAL` status) before they can log in — this satisfies "verification/approval
  flow" without silently trusting an invite code alone.
- **The ML risk-scoring stage is intentionally pluggable** (`MlRiskService` interface) since
  the spec explicitly asks for a stub that a real model can later replace.
- **Local storage driver** is a dev convenience; the S3 branch of `StorageService` is a
  clearly marked stub (interface + TODO) rather than a fake implementation, since wiring real
  AWS SDK credentials isn't meaningful without a target bucket.

## 9. What's intentionally left as a follow-up

- Real S3 client wiring (`@aws-sdk/client-s3`) — swap-in point is isolated in
  `storageService.ts`.
- A real feature-extraction pipeline (currently a stub) and/or a real ML risk model behind
  `ML_SERVICE_URL`.
- A scheduled/cron trigger for `findUpcomingAppointmentsNeedingReminder()` and
  `notifyTestReminder()` (both are implemented as callable functions; wiring a BullMQ
  repeatable job or system cron is a one-line addition).
- PDF rendering of the structured report/summary JSON (`buildProgressSummary`,
  `buildClinicalReport`) — the JSON shape is designed to be handed directly to a renderer.

## Changelog — review fixes (Oct 2026)

- New migration `20261001000000_schema_sync_and_quiz_hardening`: adds `User.dateOfBirth`, `MedicalStore.openTime/closeTime`, `StoreMedicine.quantity` (previously in schema.prisma but in no migration) and `FamilyQuizAttempt.issuedMemberIds`. Run `npm run prisma:migrate` (dev) or `npm run prisma:migrate:deploy`.
- `POST /screening-tests` now accepts `itemsPerAttempt`.
- Screening submit rejects duplicate items and wrong answer counts.
- Family quiz: the issued members are stored per attempt; submit is zod-validated, rejects foreign/duplicate ids, and scores against everything issued (skipped = wrong).
- `env.ts`: in production, missing/placeholder JWT secrets and encryption key are a hard startup error.
- `/media/local/*` now checks access to the owning patient and fixes the path-prefix check.
# MemoCare production setup notes

## Real email delivery

Set either `SMTP_URL` or the `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and
`SMTP_PASS` variables in the backend environment. The checked-in `changeme`
values are treated as unconfigured; replace them with credentials from your
SMTP provider before deployment. Verification, password-reset, invitation,
and alert messages then use the configured transport.

If a reset request shows success but no message arrives, replace the
placeholder SMTP credentials, restart the backend, and verify the sender/domain
with your provider. The app cannot deliver email without a real SMTP account.

The existing `ADMIN` role is the Hospital Management role. It can approve staff,
assign doctors, manage hospital patients, and edit patient contact details.
Management can use phone + SMS OTP after setting `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN`, and `TWILIO_FROM`. Staff enter the hospital invite code at
signup, then management approves them from **Hospital management → Staff approvals**.

## Real GPS location

The browser must be served from HTTPS (or localhost) and the user must grant
location permission. The application records browser GPS check-ins, evaluates
them against persisted safe zones using haversine distance, and sends location
alerts when a patient leaves every active zone. Caretakers and clinical staff
can also create a revocable device share link.

## Initial data

After applying Prisma migrations, run `npm run seed` to create the initial
clinical test data, including the colour-sequence memory game and its colour
image. Do not use the seeded accounts in production; create real accounts and
replace all development secrets.
