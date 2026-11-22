# MemoCare Frontend

A React frontend for MemoCare — a cognitive-health screening platform — built against
the MemoCare Node/Express/PostgreSQL backend.

This guide assumes you're on **Windows** and haven't set this kind of project up before.

---

## 1. Install prerequisites (one-time)

1. **Node.js** — download the LTS version from https://nodejs.org and run the installer
   (accept all the defaults). This also installs `npm`.
2. Confirm it worked — open **Command Prompt** (search "cmd" in the Start menu) and run:
   ```
   node -v
   npm -v
   ```
   Both should print a version number.

You'll also need the **MemoCare backend** running first (see its own README). This
frontend expects it at `http://localhost:4000` by default.

## 2. Set up the frontend

1. Unzip this project somewhere, e.g. `C:\Users\<you>\Projects\memocare-frontend`.
2. Open Command Prompt, navigate into the folder:
   ```
   cd C:\Users\<you>\Projects\memocare-frontend
   ```
3. Install dependencies (this may take a minute or two):
   ```
   npm install
   ```
4. Copy `.env.example` to `.env` (already done for you — just check `.env` has):
   ```
   VITE_API_BASE_URL=http://localhost:4000/api/v1
   VITE_SHOW_DEMO_ACCOUNTS=true
   ```
   Change the URL only if your backend runs somewhere else.

## 3. Run it

With the backend already running (`http://localhost:4000/api/docs` should load in a
browser), start the frontend:

```
npm run dev
```

Then open **http://localhost:3000** in your browser. (The dev server is fixed to port
3000 because the backend only allows requests from that origin by default — see its
`CLIENT_URL` setting if you need to change this.)

Sign in with a seeded demo account (shown on the login page), or sign up as Family /
Caretaker / Hospital Staff. Hospital Staff signup needs a hospital invite code, which an
Admin creates from **Admin → Hospitals** once an admin account exists.

## 4. Building for submission / deployment

```
npm run build
```

This produces a `dist/` folder with the production build. `npm run preview` serves that
build locally so you can double check it before presenting.

---

## Project structure

```
src/
  api/            Centralized API layer (one file per backend resource area)
  auth/           Auth context, token storage, route guards
  components/
    ui/           Reusable primitives: Button, Card, RiskBadge, states, forms
    layout/       App shell (sidebar + topbar)
  features/
    auth/         Login, signup, forgot/reset password, email verification, invites
    dashboard/    Role-aware dashboard
    patients/     Patient list + the patient workspace (Overview, Progress,
                   Recordings, Screening, Medications, Appointments, Location,
                   Report, Access — one file per tab under patients/tabs/)
    screening/    Screening-test admin (create/list tests)
    games/        Mind Games hub (reuses the screening-test flow)
    stores/       Medical stores directory
    tutorials/    Tutorials list + detail
    notifications/
    admin/        Hospitals, staff approvals, user management
    profile/      Profile & password settings
```

## Notes for the demo

- The strongest end-to-end flow to show: **Login → Dashboard → open a patient → Record
  a new sample → watch it process → view the risk/speech-analysis result → Progress
  chart → take a Screening test → Medications/Appointments → Report → Export PDF**
  (PDF export is staff/admin only).
- Risk levels are always labeled as a screening/assessment result, never a diagnosis —
  this matches the backend's documented heuristic, which is explicitly not clinically
  validated.
- All scoring (screening tests) and risk analysis (speech) happen on the backend; the
  frontend only displays what the API returns.

## Known simplifications (given the time budget)

- Browser-recorded audio uses the `MediaRecorder` API in whatever format the browser
  gives (typically `.webm`); this is sent to the same upload endpoint as a file upload.
- The medical-store map is a simple nearby-list (uses your browser's geolocation) rather
  than a full interactive map — the spec calls this optional if it saves time.
- If your backend uses different field names than assumed anywhere (e.g. a slightly
  different medication/appointment shape), check the failing screen in the browser's
  dev console — the API layer in `src/api/` is the one place to adjust field names.
