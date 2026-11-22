---
title: "MemoCare — Setup Guide for VS Code / Cursor"
---

# 1. What to download first (prerequisites)

Install these **before** you run the project. Required items are marked **Required**.

| # | Software | Needed? | Download | Why |
|---|----------|---------|----------|-----|
| 1 | **Node.js 20 LTS or newer** (22 LTS recommended, includes npm) | **Required** | <https://nodejs.org> | Runs the backend and installs packages |
| 2 | **VS Code** or **Cursor** | **Required** (your editor) | <https://code.visualstudio.com> or <https://cursor.com> | Where you open and run the project |
| 3 | **Microsoft Visual C++ Redistributable (x64)** | Windows only, if the database will not start | <https://aka.ms/vs/17/release/vc_redist.x64.exe> | The built-in PostgreSQL needs these runtime files |
| 4 | Git | Optional | <https://git-scm.com> | Version control |
| 5 | Python 3.10 – 3.11 and FFmpeg | Optional | <https://www.python.org> and <https://ffmpeg.org> | Only for the real speech-analysis service (Whisper). Not needed for normal use |
| 6 | Redis (Memurai on Windows, or Docker) | Optional | <https://www.memurai.com> | Only for reminders and queued background jobs |

You also need **internet on the first run only**, so npm can download packages (about 400 MB).

**Check the install** — open a new terminal and run:

```
node -v      (should show v20 or higher)
npm -v
```

# 2. VS Code / Cursor extensions

When you open the folder, the editor suggests the recommended extensions — click **Install All**.

- ESLint, Prettier (code quality and formatting)
- Prisma (database schema colouring)
- Python (only if you use the speech service)
- Markdown preview (to read this guide inside the editor)

# 3. Run the project (3 steps)

1. In VS Code or Cursor: **File → Open Folder…** and choose the **MemoCare** folder.
2. Open the terminal: **Terminal → New Terminal**.
3. Run:

```
cd memocare-backend
npm install            (first time only — a few minutes)
npm run start:local
```

Then open **<http://localhost:4000>** in your browser. Keep the terminal open while you use the app. Press **Ctrl + C** to stop.

**Shortcuts:** double-click `START-MEMOCARE.bat` (Windows) or run `./START-MEMOCARE.sh` (Mac/Linux). In VS Code you can also use **Terminal → Run Task…** and pick *MemoCare: 1. Install packages* and then *MemoCare: 2. Start app*.

On the first run the app creates its own database, applies all migrations and adds the demo accounts. You will see `[MemoCare] Starting server` when it is ready.

# 4. Login details

Password for all demo accounts: **Password123!**

| Role | Email |
|------|-------|
| Hospital staff (doctor) | doctor@memocare.dev |
| Family | family@memocare.dev |
| Caretaker | caretaker@memocare.dev |
| Admin | admin@memocare.dev |

**Hospital admin code** (login page → *Hospital admin code* tab): `CKT`

New users can sign up normally. Everything is saved in the database folder (next section).

# 5. Where is the data stored?

All logins, patients, medications and test results live in:

```
memocare-backend/data/pgdata
```

This is a real PostgreSQL database running inside the project — no Docker, no internet, no separate install.

- **Back up:** close the app and copy the `data` folder.
- **Reset everything:** close the app and delete the `data` folder. The next start recreates it with fresh demo accounts.

# 6. Editing the website (UI)

The ready-built site is already included, so you only need this if you change the frontend code.

**Option A — rebuild, then use port 4000**

```
cd memocare-frontend
npm install        (first time only)
npm run build
```

Restart the app and refresh http://localhost:4000.

**Option B — live reload while editing**

Terminal 1: `cd memocare-backend` then `npm run start:local`
Terminal 2: `cd memocare-frontend` then `npm install` then `npm run dev`

Open **<http://localhost:3000>**. Changes appear instantly. (The file `memocare-frontend/.env.development` already points the UI to the backend.)

**Change colours:** edit `memocare-frontend/src/styles/tokens.css`. The light and dark themes are both defined there.

# 7. Where is everything? (file map)

The project is a React app, so pages are built from JavaScript (JSX) files. HTML, CSS and JS are already kept in separate places:

| Type | Location |
|------|----------|
| **HTML** | `memocare-frontend/index.html` (the single page shell the React app loads into) and `memocare-backend/public/share/location.html` (the live-location share page) |
| **CSS** | `memocare-frontend/src/styles/tokens.css` (colours, fonts, themes) plus one stylesheet next to each area: `src/components/ui/ui.css`, `src/components/layout/layout.css`, `src/features/auth/auth.css`, `src/features/dashboard/dashboard.css`, `src/features/patients/patients.css` and more |
| **JavaScript / JSX (frontend)** | `memocare-frontend/src/` → `api/` (server calls), `auth/` (login state), `components/` (buttons, layout, cards), `features/` (each page: patients, screening, games, admin …), `hooks/`, `lib/`, `theme/` (dark/light toggle) |
| **JavaScript / TypeScript (backend)** | `memocare-backend/src/` → `routes/`, `controllers/`, `services/`, `middleware/`, `config/`, `jobs/` |
| **Database** | `memocare-backend/prisma/` → `schema.prisma` (tables), `migrations/`, `seed.ts` (demo accounts) |
| **Built website (generated)** | `memocare-frontend/dist/` — do not edit by hand; `npm run build` recreates it |
| **Python speech service (optional)** | `memocare-backend/speech-analysis-service/` |
| **Settings** | `memocare-backend/.env` (secrets and ports) |

*Why not split the files into top-level html/css/js folders?* React imports every file by its path, so moving them would break the app. The layout above keeps each type grouped and is the standard structure for this kind of project.

# 8. Optional: real speech analysis (Whisper)

Normal use does not need this (the app uses a built-in stub).

```
cd memocare-backend/speech-analysis-service
pip install -r requirements.txt
uvicorn main:app --port 5001
```

Then in `memocare-backend/.env` set `ML_SERVICE_MODE=http`, restart the app. FFmpeg must be installed.

# 9. Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm install` fails | Check internet; run `node -v` (must be 20+); delete the `node_modules` folder and try again |
| *Port 4000 is already in use* | Close the other program, or change `PORT=4000` in `memocare-backend/.env` |
| *Port 54329 is in use* | Set `LOCAL_DB_PORT` to another number before starting, or close the old MemoCare window |
| Database will not start on Windows / missing DLL | Install the Visual C++ Redistributable (link in section 1) |
| *Postgres cannot run as Administrator* | Open VS Code normally (not "Run as administrator") |
| Antivirus blocks `postgres.exe` | Allow the project folder in your antivirus |
| `Redis is not running` message | Safe to ignore. Only reminders and queued jobs need Redis |
| Blank page or old design after editing the UI | Run `npm run build` in `memocare-frontend`, restart, press Ctrl + F5 |
| Want a clean start | Close the app, delete `memocare-backend/data`, start again |

**Do not share** `memocare-backend/.env` publicly — it holds your secret keys.
