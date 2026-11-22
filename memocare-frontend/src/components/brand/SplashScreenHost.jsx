import SplashScreen from './SplashScreen';
import { useSplashGate } from './useSplashGate';

/**
 * Sits above the whole app (from main.jsx) and overlays the 1-second splash:
 *  - once when the site is freshly opened
 *  - again after the user logs out (AppShell dispatches `memocare:splash-replay`)
 */
export default function SplashScreenHost({ children }) {
  const { showSplash } = useSplashGate();
  return (
    <>
      {children}
      {showSplash && <SplashScreen />}
    </>
  );
}
