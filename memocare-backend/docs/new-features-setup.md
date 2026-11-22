# New Features: Medicine Reminders, Mind Games, Location Tracker

This zip adds four features to your existing MemoCare backend. All
of it is real and functional — no fake/demo stubs — with one honest
caveat noted below for Location Tracker.

## What's new

1. **Medicine Reminder** — schedule medications, get real reminder
   notifications (in-app + email) sent automatically by a background
   job every 5 minutes, log doses as taken/missed/skipped.
2. **Appointment reminders — now actually wired up.** While building
   this, I found your existing appointment-reminder code was written
   but never actually called by anything. Fixed as part of this same
   update — appointment reminders now really fire too.
3. **Mind Games** — Orientation, Word Recall, and "Guess the Thing"
   already existed as screening tests; there's now a `GET /games`
   endpoint that surfaces them as a friendly catalog. Also added a
   brand-new **Pattern Memory** game type with correct order-sensitive
   scoring.
4. **Location Tracker** — real GPS check-ins, geofence ("safe zone")
   alerts using real distance math, and a standalone no-login browser
   page that uses a phone's actual GPS.

## Installation

1. **Stop your servers** (Ctrl+C in `npm run dev` and `npm run worker`)

2. **Extract this zip** and copy every file into the matching path in
   your project, overwriting where prompted:
   - `prisma/schema.prisma` (replace)
   - `prisma/seed.ts` (replace — adds sample medication/safe-zone/game data)
   - `src/services/medicationService.ts` (new)
   - `src/services/locationService.ts` (new)
   - `src/services/notificationService.ts` (replace)
   - `src/services/screeningService.ts` (replace)
   - `src/controllers/medicationController.ts` (new)
   - `src/controllers/locationController.ts` (new)
   - `src/controllers/screeningController.ts` (replace)
   - `src/routes/medicationRoutes.ts` (new)
   - `src/routes/locationRoutes.ts` (new)
   - `src/routes/gameRoutes.ts` (new)
   - `src/routes/index.ts` (replace)
   - `src/jobs/queues.ts` (replace)
   - `src/jobs/reminders.worker.ts` (new)
   - `src/jobs/worker.ts` (replace)
   - `src/validators/medicationValidators.ts` (new)
   - `src/validators/locationValidators.ts` (new)
   - `src/validators/screeningValidators.ts` (replace)
   - `src/app.ts` (replace)
   - `src/config/swagger.ts` (replace)
   - **`public/share/location.html`** — this is a whole new folder,
     `public/share/`, with one file in it. Copy the entire `public`
     folder into your project root (next to `src`).

3. **Apply the database changes**:
   ```powershell
   npm run prisma:migrate
   ```
   Name the migration something like `add_medications_location_games`.

4. **Re-seed the sample data** (adds a demo medication, safe zone, and
   pattern-memory game to Eleanor Whitfield):
   ```powershell
   npm run seed
   ```

5. **Restart both servers**:
   ```powershell
   npm run dev
   npm run worker
   ```
   Watch the `npm run worker` window — it now also runs the reminder
   checker (every 5 minutes) alongside the speech-analysis worker.

6. **Reload Swagger** (`http://localhost:4000/api/docs`) — you'll see
   three new sections: **Medications**, **Location**, **Mind Games**.

## Trying each feature

### Medicine Reminder
- `GET /patients/{patientId}/medications/today` — see today's schedule
- `POST /patients/{patientId}/medications/{medicationId}/log` — mark a
  dose taken/missed/skipped
- Wait up to 5 minutes near a scheduled time and check
  `GET /notifications` — a real reminder should appear (and a real
  email, if you've set up SMTP per `docs/real-email-setup.md`)

### Mind Games
- `GET /games` — lists Orientation, Word Recall, Guess-the-Thing, and
  the new "Color Pattern Recall" sample game
- Take one exactly like any screening test: `GET /screening-tests/{id}`
  for questions, then `POST /patients/{patientId}/screening-attempts`
  with your answers

### Location Tracker
1. As staff/caretaker, generate a share link:
   `POST /patients/{patientId}/location/share-links` — copy the
   `shareUrl` from the response
2. Open that URL on a phone's browser (it'll look like
   `http://<your-computer's-IP>:4000/share/location.html?token=...`
   — use your computer's real local IP, not `localhost`, if opening
   from a different phone on the same WiFi)
3. Tap **"Start Sharing My Location"** and allow the location
   permission prompt — this sends your phone's real GPS coordinates
4. Check `GET /patients/{patientId}/location/latest` — you should see
   the real coordinates come back
5. Create a safe zone far from your actual location
   (`POST /patients/{patientId}/safe-zones`) and check
   `GET /notifications` — you should get a real "left safe zone" alert

**Honest caveat:** everything above is genuinely functional — the
alert logic, the distance math, the notification, the GPS capture in
the browser page, all real. The one limitation is that it only works
while that browser tab stays open on the patient's phone (a real
native mobile app could run this in the background even with the
screen off, but that's a separate, much bigger project — a proper
mobile app, not just a backend feature). For a demo or early
prototype, this is a completely honest and real way to show working
location tracking end-to-end.
