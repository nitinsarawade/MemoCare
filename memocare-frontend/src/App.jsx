import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, ROLES } from './auth/AuthContext';
import { RequireAuth, BlockRoles } from './auth/guards';
import AppShell from './components/layout/AppShell';
import CookieConsent from './components/cookie/CookieConsent';
import { PrivacyPolicyPage, TermsPage, CookiePolicyPage } from './features/legal/LegalPages';

import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/ResetPasswordPage';
import VerifyEmailPage from './features/auth/VerifyEmailPage';
import AcceptInvitePage from './features/auth/AcceptInvitePage';

import DashboardPage from './features/dashboard/DashboardPage';
import PatientsListPage from './features/patients/PatientsListPage';
import DismissedPatientsPage from './features/patients/DismissedPatientsPage';
import PatientWorkspace from './features/patients/PatientWorkspace';

import ScreeningTestsAdminPage from './features/screening/ScreeningTestsAdminPage';
import MindGamesPage, { GameLaunch } from './features/games/MindGamesPage';

import StoresPage from './features/stores/StoresPage';
import MyStorePage from './features/store/MyStorePage';
import GuidancePage from './features/tutorials/GuidancePage';
import GuidanceDetailPage from './features/tutorials/GuidanceDetailPage';
import NotificationsPage from './features/notifications/NotificationsPage';

import HospitalsAdminPage from './features/admin/HospitalsAdminPage';
import StaffApprovalsPage from './features/admin/StaffApprovalsPage';
import UsersAdminPage from './features/admin/UsersAdminPage';

import ProfilePage from './features/profile/ProfilePage';
import NotFoundPage from './features/NotFoundPage';

export default function App() {
  const { isAuthenticated, isLoading, role } = useAuth();

  return (
    <>
      <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          {/* A Medical Store account's "dashboard" IS their store — no patient data, ever. */}
          <Route path="/dashboard" element={role === ROLES.MEDICAL_STORE ? <MyStorePage /> : <DashboardPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Everything below is off-limits to a Medical Store account; typing the URL redirects them back to their store. */}
          <Route element={<BlockRoles roles={[ROLES.MEDICAL_STORE]} redirectTo="/dashboard" />}>
            <Route path="/patients" element={<PatientsListPage />} />
            <Route path="/patients/dismissed" element={<DismissedPatientsPage />} />
            <Route path="/patients/:patientId/*" element={<PatientWorkspace />} />

            <Route path="/screening-tests" element={<ScreeningTestsAdminPage />} />
            <Route path="/mind-games" element={<MindGamesPage />} />
            <Route path="/mind-games/:gameId" element={<GameLaunch />} />

            <Route path="/stores" element={<StoresPage />} />
            <Route path="/guidance" element={<GuidancePage />} />
            <Route path="/guidance/:slug" element={<GuidanceDetailPage />} />

            <Route path="/admin/hospitals" element={<HospitalsAdminPage />} />
            <Route path="/admin/staff-approvals" element={<StaffApprovalsPage />} />
            <Route path="/admin/users" element={<UsersAdminPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {/* An unknown path falls through to the top-level 404 below — do not
              add a `path="*"` here or signed-out visitors get bounced to
              /login instead of seeing the 404 page. */}
        </Route>
      </Route>

      {/* Legal pages — reachable whether or not you are signed in. */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/cookies" element={<CookiePolicyPage />} />

      {/* Unknown URL: signed-out visitors see the custom 404 page (with a
          link back to login) instead of a silent redirect nobody asked for. */}
      <Route path="*" element={isLoading ? null : <NotFoundPage />} />
      </Routes>
      <CookieConsent />
    </>
  );
}
