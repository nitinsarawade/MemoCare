// MemoCare — one-command local start.
// Runs a real PostgreSQL server embedded in this project. All data (logins, patients, tests…)
// is stored in  memocare-backend/data/pgdata  — no internet or external database needed.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'pgdata');
const PORT = Number(process.env.LOCAL_DB_PORT || 54329);
const DB = 'memocare', USER = 'memocare', PASS = 'memocare_local';
const url = `postgresql://${USER}:${PASS}@localhost:${PORT}/${DB}`;

process.env.DATABASE_URL = url;
process.env.DATABASE_URL_UNPOOLED = url;

const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: USER, password: PASS, port: PORT, persistent: true, autoRehydrateSymlinks: true, onLog: () => {}, onError: () => {} });
const fresh = !existsSync(path.join(dataDir, 'PG_VERSION'));
if (fresh) { console.log('[MemoCare] Creating local database (first run)…'); mkdirSync(path.dirname(dataDir), { recursive: true }); await pg.initialise(); }
await pg.start();
try { await pg.createDatabase(DB); } catch { /* already exists */ }

let stopping = false;
const shutdown = async () => { if (stopping) return; stopping = true; try { await pg.stop(); } catch { /* ignore */ } process.exit(0); };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);

const run = (script, args) => spawnSync(process.execPath, [path.join(root, 'node_modules', script), ...args], { cwd: root, env: process.env, stdio: 'inherit' });
console.log('[MemoCare] Applying database migrations…');
if (run('prisma/build/index.js', ['migrate', 'deploy']).status !== 0) { console.error('[MemoCare] Migration failed.'); await shutdown(); }

const client = pg.getPgClient(DB); await client.connect();
const { rows } = await client.query('SELECT count(*)::int AS n FROM "User"'); await client.end();
if (rows[0].n === 0) {
  console.log('[MemoCare] Adding demo accounts…');
  run('tsx/dist/cli.mjs', ['prisma/seed.ts']);
}

console.log('\n[MemoCare] Database folder: ' + dataDir);
console.log('[MemoCare] Starting server → open http://localhost:' + (process.env.PORT || 4000) + '\n');
await import(pathToFileURL(path.join(root, 'dist', 'src', 'server.js')).href);
