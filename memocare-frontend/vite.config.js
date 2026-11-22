import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The backend only allows CORS from CLIENT_URL (default http://localhost:3000),
// so the dev server is pinned to port 3000. strictPort makes Vite fail loudly
// instead of silently picking another port that the API would then reject.
export default defineConfig({
  plugins: [react()],
  server: { port: 3000, strictPort: true, host: true },
  preview: { port: 3000, strictPort: true },
});
