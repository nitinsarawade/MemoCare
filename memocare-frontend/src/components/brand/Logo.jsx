import logoUrl from '../../assets/memocare-logo.jpg';

/**
 * The official MemoCare circular mark (brain-in-hand), used beside the
 * "MemoCare" name in the sidebar, login page and browser tab icon.
 * On dark backgrounds (variant="dark-bg") it is trimmed into a soft circle
 * chip so the light mark stays visible on the indigo sidebar.
 */
export default function Logo({ variant = 'light', height = 34 }) {
  if (variant === 'dark-bg') {
    return (
      <img
        src={logoUrl}
        alt="MemoCare mark"
        className="brand-logo-img"
        style={{ height, width: height, borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 }}
      />
    );
  }
  return (
    <img
      src={logoUrl}
      alt="MemoCare mark"
      className="brand-logo-img"
      style={{ height, width: height, borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 }}
    />
  );
}
