import bannerUrl from '../../assets/memocare-splash-banner.jpg';
import './splash.css';

/**
 * Full-screen MemoCare splash: the rectangular brand banner on the dark
 * gradient, shown for 1.5 seconds.
 *  - when the site is first opened (fresh load)
 *  - right after signing in, while the dashboard loads in behind it
 *  - again after logging out, before the login page appears
 */
export default function SplashScreen() {
  return (
    <div className="splash-screen" role="status" aria-label="MemoCare is starting">
      <div className="splash-inner">
        <img src={bannerUrl} alt="MemoCare — Dementia Screening" className="splash-banner" />
        <p className="splash-tagline">Dementia screening, grounded in real speech</p>
      </div>
    </div>
  );
}
