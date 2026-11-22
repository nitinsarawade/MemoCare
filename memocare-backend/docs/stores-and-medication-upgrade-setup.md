# New Features: Nearby Medical Stores + Upgraded Medicine Reminders

This zip adds a medical store directory and upgrades the Medicine
Reminder feature. Everything here is real and enforced — the caps
are genuine limits, the distance search uses real math (the same
haversine formula from the location tracker's safe zones).

## What's new

### 1. Medical Store Directory
- A new account type: **MEDICAL_STORE**. A store owner signs up like
  any other account (`POST /auth/signup` with `role: "MEDICAL_STORE"`)
  — no hospital approval needed, active right after email
  verification, same as Family/Caretaker.
- Each store account manages exactly one store profile (name,
  address, real latitude/longitude, phone).
- Each store can list **up to 50 medicines** (name + price) — a real,
  enforced cap. Adding a 51st is rejected with a clear error.
- Anyone logged in (family, caretaker, staff) can search
  `GET /stores/nearby?latitude=..&longitude=..&radiusKm=..&medicine=..`
  — returns real nearby stores sorted by actual distance, optionally
  filtered to only stores stocking a given medicine.

### 2. Medicine Reminder — now with a 10-slot cap and date-specific alarms
- **10-slot cap:** a patient can have at most **10 active
  medications** at once — a real, enforced limit. Adding an 11th is
  rejected until one is deactivated or deleted.
- **Two schedule types**, chosen per medication:
  - `RECURRING_DAILY` (the original behavior) — repeats every day at
    each `HH:mm` time you list.
  - `SPECIFIC_DATES` (new) — fires only on the exact date, month, and
    year date-times you list (up to 50 per medication) — for a
    one-off dose, a non-daily prescription, or anything tied to a
    specific calendar date rather than a daily repeat.
- Both schedule types use the exact same reminder pipeline as
  before — the background job checks every 5 minutes and sends a
  real notification (in-app + email) when a dose becomes due.

## Installation

1. **Stop your servers** (Ctrl+C in `npm run dev` and `npm run worker`)

2. **Extract this zip** and copy every file into the matching path in
   your project, overwriting where prompted:
   - `prisma/schema.prisma` (replace)
   - `prisma/seed.ts` (replace — adds a sample "Riverside Pharmacy"
     store with 4 sample medicines)
   - `src/services/medicationService.ts` (replace)
   - `src/services/storeService.ts` (new)
   - `src/controllers/storeController.ts` (new)
   - `src/routes/storeRoutes.ts` (new)
   - `src/routes/medicationRoutes.ts` (replace)
   - `src/routes/index.ts` (replace)
   - `src/routes/authRoutes.ts` (replace)
   - `src/validators/medicationValidators.ts` (replace)
   - `src/validators/storeValidators.ts` (new)
   - `src/config/swagger.ts` (replace)

3. **Apply the database changes**:
   ```powershell
   npm run prisma:migrate
   ```
   Name the migration something like `add_stores_and_medication_dates`.

4. **Re-seed** (adds the sample pharmacy account and medicines):
   ```powershell
   npm run seed
   ```

5. **Restart both servers**:
   ```powershell
   npm run dev
   npm run worker
   ```

6. **Reload Swagger** — you'll see a new **Medical Stores** section,
   and the **Medications** section now documents both schedule types.

## Trying it out

### Medical Store Directory
- The seed created a demo store account: `store@memocare.dev` /
  `Password123!` — log in as this user and call
  `GET /stores/me` to see "Riverside Pharmacy" with its 4 medicines
- Try `POST /stores/me/medicines` to add a 5th medicine, or as any
  other logged-in user try:
  `GET /stores/nearby?latitude=40.7128&longitude=-74.0060&radiusKm=20`
  — the seeded store is ~0.5km from that point, so it should appear
  with a real `distanceKm` value
- Try adding `&medicine=Memantine` to that same search — only stores
  actually stocking a matching medicine will show up

### Medicine Reminder upgrades
- Try creating an 11th medication for the same patient (the seed
  already added 1) — after 10, you should get a real `400` error
  naming the limit
- Try `POST /patients/{patientId}/medications` with:
  ```json
  {
    "name": "Flu vaccine booster",
    "scheduleType": "SPECIFIC_DATES",
    "specificDateTimes": ["2026-09-25T09:00:00Z"],
    "startDate": "2026-09-17"
  }
  ```
  Then check `GET /patients/{patientId}/medications/today` on that
  exact date — it'll show up in the schedule only on that day, not
  every day.

## Honest notes
- The 50-medicines-per-store and 10-medications-per-patient caps are
  real, server-enforced limits — not just documentation.
- The nearby-store search uses real distance math, but store
  locations themselves are only as accurate as what each store owner
  enters (there's no address-to-coordinates lookup built in yet — a
  store owner needs to supply real latitude/longitude directly, e.g.
  from Google Maps). Adding an address-autocomplete/geocoding step
  would be a natural next enhancement once there's a real frontend.
