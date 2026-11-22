import { useCallback, useEffect, useState } from 'react';

const SPLASH_MS = 1500;

/**
 * Controls when the 1.5-second MemoCare splash is shown.
 *  - On page load (fresh open of the site): exactly once per browser-tab session,
 *    sessionStorage guards repeats from hot reloads etc.
 *  - Right after signing in: App LoginPage / SignupPage dispatch `memocare:splash-replay`,
 *    so the splash plays once more while the dashboard loads in behind it.
 *  - After logout: every time — AppShell dispatches `memocare:splash-replay`.
 */
export function useSplashGate() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('memocare:splash-seen'));

  useEffect(() => {
    if (!showSplash) return undefined;
    sessionStorage.setItem('memocare:splash-seen', '1');
    const t = setTimeout(() => setShowSplash(false), SPLASH_MS);
    return () => clearTimeout(t);
  }, [showSplash]);

  useEffect(() => {
    const replay = () => {
      sessionStorage.removeItem('memocare:splash-seen');
      setShowSplash(true);
    };
    window.addEventListener('memocare:splash-replay', replay);
    return () => window.removeEventListener('memocare:splash-replay', replay);
  }, []);

  return { showSplash };
}
