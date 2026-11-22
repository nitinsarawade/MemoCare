import ThemeToggle from '../../theme/ThemeToggle';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, Mic, ClipboardList, Gamepad2, Pill, CalendarDays, FileText,
  MapPin, ShieldCheck, BookOpen, Bell, Building2, UserCheck, UsersRound, Settings,
  LogOut, Menu, X, Store, ChevronDown, Archive, Compass, Brain, Grid3x3,
} from 'lucide-react';
import { useAuth, ROLES } from '../../auth/AuthContext';
import { notificationService, screeningService } from '../../api';
import Logo from '../brand/Logo';
import NavItemInfo from '../ui/NavItemInfo';
import { NAV_INFO } from '../ui/navInfoCatalog';
import './layout.css';

const ALL_ROLES = [ROLES.FAMILY, ROLES.CARETAKER, ROLES.HOSPITAL_STAFF, ROLES.ADMIN];
const GAME_ICONS = { ORIENTATION: Compass, WORD_RECALL: BookOpen, NAME_THE_OBJECTS: Brain, PATTERN_MEMORY: Grid3x3 };

// Sidebar order: Main → Mind Games (every game) → Care → Resources → Admin.
function buildNavSections(games) {
  return [
    {
      label: 'Main',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: 'all' },
        { to: '/patients', label: 'Patients', icon: Users, roles: [ROLES.HOSPITAL_STAFF, ROLES.ADMIN] },
        { to: '/patients/dismissed', label: 'Dismissed Patients', icon: Archive, roles: [ROLES.HOSPITAL_STAFF, ROLES.ADMIN] },
        { to: '/screening-tests', label: 'Screening Tests', icon: ClipboardList, roles: [ROLES.HOSPITAL_STAFF, ROLES.ADMIN] },
      ],
    },
    {
      label: 'Mind Games',
      labelTo: '/mind-games',
      items: games.map((g) => ({
        to: `/mind-games/${g.id}`,
        label: g.title,
        icon: GAME_ICONS[g.testType] || Gamepad2,
        info: g.description,
        roles: ALL_ROLES,
      })),
    },
    {
      label: 'Care',
      items: [
        { to: '/stores', label: 'Medical Stores', icon: Store, roles: ALL_ROLES },
      ],
    },
    {
      label: 'Resources',
      items: [
        { to: '/guidance', label: 'Guidance', icon: BookOpen, roles: ALL_ROLES },
        { to: '/notifications', label: 'Notifications', icon: Bell, roles: 'all' },
      ],
    },
    {
      label: 'Admin',
      items: [
        { to: '/admin/hospitals', label: 'Hospital Management', icon: Building2, roles: [ROLES.ADMIN] },
        { to: '/admin/staff-approvals', label: 'Staff Approvals', icon: UserCheck, roles: [ROLES.ADMIN] },
        { to: '/admin/users', label: 'Users', icon: UsersRound, roles: [ROLES.ADMIN] },
      ],
    },
  ];
}

function canSee(item, role) {
  return item.roles === 'all' || item.roles.includes(role);
}

/** Derives per-page document titles from the current route. */
function usePageTitle() {
  const location = useLocation();
  useEffect(() => {
    const base = location.pathname.split('/')[1];
    const sections = buildNavSections([]).flatMap((s) => s.items);
    const match = sections.find((it) => `/${base}` === it.to) || sections.find((it) => base && it.to.startsWith(`/${base}`));
    let label = base === 'mind-games' ? 'Mind Games' : match?.label;
    if (!label) {
      if (location.pathname === '/' || location.pathname === '/dashboard') label = 'Dashboard';
      else if (location.pathname.startsWith('/profile')) label = 'Profile & Settings';
      else label = 'MemoCare';
    }
    document.title = `${label} — MemoCare`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = `MemoCare — ${label}. Cognitive-health monitoring from a short voice sample.`;
  }, [location.pathname]);
}

export default function AppShell() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  usePageTitle();
  const gamesQuery = useQuery({ queryKey: ['games'], queryFn: screeningService.listGames });
  // Same de-duplication as the Mind Games page: show the colour-pattern game once.
  const games = (gamesQuery.data || []).filter(
    (g, i, all) => g.testType !== 'PATTERN_MEMORY' || i === all.findIndex((c) => c.testType === 'PATTERN_MEMORY'),
  );
  const NAV_SECTIONS = buildNavSections(games);

  useEffect(() => {
    let cancelled = false;
    notificationService
      .list(true)
      .then((items) => {
        if (!cancelled) setUnread(items?.length ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    // Replay the 1-second MemoCare splash before the login page reappears.
    window.dispatchEvent(new Event('memocare:splash-replay'));
    navigate('/login', { replace: true });
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'M';

  return (
    <div className="shell">
      <a href="#mc-main" className="skip-link">Skip to main content</a>
      <button className="mobile-nav-toggle" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle navigation" aria-expanded={mobileOpen}>
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand brand-with-logo">
          <Logo variant="dark-bg" height={34} />
          <span className="brand-name">MemoCare</span>
        </div>

        <nav className="side-nav" onClick={() => setMobileOpen(false)}>
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((it) => canSee(it, role));
            if (!items.length) return null;
            return (
              <div className="side-nav-section" key={section.label}>
                {section.labelTo ? (
                  <NavLink to={section.labelTo} end className="side-nav-label side-nav-label-link">{section.label}</NavLink>
                ) : (
                  <div className="side-nav-label">{section.label}</div>
                )}
                {items.map(({ to, label, icon: Icon, info }) => (
                  <NavLink key={to} to={to} className={({ isActive }) => `side-nav-item side-nav-item-info ${isActive ? 'active' : ''}`}>
                    <Icon size={17} strokeWidth={2} />
                    <span>{label}</span>
                    {to === '/notifications' && unread > 0 && <span className="nav-dot">{unread}</span>}
                    <NavItemInfo dark info={info || NAV_INFO[to]} />
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-spacer" />
          <ThemeToggle />
          <UserMenu role={role} initials={initials} user={user} onLogout={handleLogout} />
        </header>
        <main className="page-body" id="mc-main" tabIndex={-1}>
          <div className="container">
            <Outlet />
          </div>
        </main>
      </div>

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
    </div>
  );
}

function UserMenu({ role, initials, user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEscape = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div className="topbar-user-menu" ref={ref}>
      <button
        type="button"
        className="topbar-user"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span className="topbar-role-badge">{roleLabel(role)}</span>
        <span className="avatar">{initials}</span>
        <span className="topbar-name">{user?.firstName} {user?.lastName}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="topbar-user-dropdown" role="menu">
          <NavLink to="/profile" className="topbar-dropdown-item" onClick={() => setOpen(false)}>
            <Settings size={16} />
            <span>Profile & Settings</span>
          </NavLink>
          <button type="button" className="topbar-dropdown-item topbar-dropdown-logout" onClick={onLogout}>
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      )}
      {/* Keyboard support for the menu (arrow keys / enter / escape) */}
      {open && <DropdownKeyNav menuRef={ref} onEscape={() => setOpen(false)} />}
    </div>
  );
}

function DropdownKeyNav({ menuRef, onEscape }) {
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const items = [...el.querySelectorAll('.topbar-dropdown-item')];
    if (!items.length) return;
    items[0].focus();
    const onKey = (e) => {
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(Math.max(i, 0) + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(Math.max(i, 0) - 1 + items.length) % items.length].focus();
      } else if (e.key === 'Escape') {
        onEscape();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [menuRef, onEscape]);
  return null;
}

function roleLabel(role) {
  switch (role) {
    case ROLES.FAMILY: return 'Family';
    case ROLES.CARETAKER: return 'Caretaker';
    case ROLES.HOSPITAL_STAFF: return 'Hospital Staff';
    case ROLES.MEDICAL_STORE: return 'Medical Store';
    case ROLES.ADMIN: return 'Hospital Management';
    default: return role || '';
  }
}
