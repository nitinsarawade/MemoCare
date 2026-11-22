import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './info-tip.css';

/**
 * Small downward arrow beside a sidebar option / feature. Click once → a small
 * panel opens describing that feature. Click again → it closes. Clicking the
 * arrow never triggers the surrounding link.
 * The panel is rendered with `position: fixed` anchored to the button's screen
 * position, so it is never clipped by the sidebar's edges, and it repositions
 * on scroll/resize and closes on scroll.
 */
export default function NavItemInfo({ info, dark = false }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // { left, top } in viewport px
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const measure = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = panelRef.current?.offsetWidth ?? 250;
    const maxLeft = window.innerWidth - width - 8;
    const left = Math.max(8, Math.min(rect.right - width, maxLeft));
    const below = rect.bottom + 8;
    const above = rect.top - 8 - (panelRef.current?.offsetHeight ?? 0);
    // If there isn't room below the toolbar/bitton, open upward instead.
    const top = below + (panelRef.current?.offsetHeight ?? 0) > window.innerHeight - 8 ? Math.max(8, above) : below;
    setPos({ left, top });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    measure();
    // Reposition while it stays open (sidebar scroll, window resize).
    const anchor = btnRef.current?.closest('.side-nav') || document;
    const onScroll = () => measure();
    const onResize = () => measure();
    anchor.addEventListener('scroll', onScroll, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      anchor.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (e) => {
      if (btnRef.current && e.target instanceof Node && btnRef.current.contains(e.target)) return;
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!info) return null;

  return (
    <span
      className={`nav-info ${dark ? 'nav-info-dark' : ''} ${open ? 'nav-info-open' : ''}`}
      onClick={(e) => {
        // Keep clicks on the arrow from triggering the surrounding link/button.
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        className="nav-info-arrow"
        ref={btnRef}
        aria-label={open ? 'Hide information' : 'About this feature'}
        aria-expanded={open}
        title={open ? 'Hide info' : 'What is this?'}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown size={13} strokeWidth={2.5} />
      </button>
      {open && pos && (
        <span
          className="nav-info-panel"
          role="tooltip"
          ref={panelRef}
          style={{ position: 'fixed', left: pos.left, top: pos.top }}
        >
          {info}
        </span>
      )}
    </span>
  );
}
