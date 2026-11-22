import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from '../components/ui/primitives';

export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <Spinner label="Loading MemoCare…" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Wrap a route element with this to require one of a set of roles; renders children only, no nested Outlet needed. */
export function RequireRole({ roles, children, fallback = null }) {
  const { role } = useAuth();
  if (!roles.includes(role)) return fallback;
  return children;
}

/** Nested-route guard: redirects a set of roles away from everything inside it. Used to keep MEDICAL_STORE accounts confined to their own dashboard. */
export function BlockRoles({ roles, redirectTo }) {
  const { role } = useAuth();
  if (roles.includes(role)) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}
