import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './lib/auth';
import { StoreProvider, useStore } from './lib/store';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Lesson from './pages/Lesson';
import Curriculum from './pages/Curriculum';
import Play from './pages/Play';
import Room from './pages/Room';
import Ranks from './pages/Ranks';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

const GUEST_KEY = 'revix:guest';

/**
 * Logged-out visitors see the landing page; the app itself opens after
 * sign-in or an explicit "continue as guest".
 */
function RequireAccess({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth();
  const { store } = useStore();
  const guest = localStorage.getItem(GUEST_KEY) === '1';

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-duo-muted">Loading…</div>
    );
  }
  if (!user && !guest) return <Navigate to="/" replace />;
  // A signed-in account that hasn't finished onboarding goes there first.
  if (user && !store.profile.onboarded) return <Navigate to="/onboarding" replace />;
  return children ? <>{children}</> : <Outlet />;
}

function RootGate() {
  const { user, loading } = useAuth();
  const { store } = useStore();
  const guest = localStorage.getItem(GUEST_KEY) === '1';

  if (loading) return <div className="grid min-h-screen place-items-center text-duo-muted">Loading…</div>;
  // Signed-in users who haven't finished onboarding always land there.
  if (user && !store.profile.onboarded) return <Navigate to="/onboarding" replace />;
  if (user || guest) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

export function enterGuestMode(): void {
  localStorage.setItem(GUEST_KEY, '1');
}

export function leaveGuestMode(): void {
  localStorage.removeItem(GUEST_KEY);
}

function Children({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <StoreProvider>
          <Children>
            <Routes>
              <Route path="/" element={<RootGate />} />
              <Route path="/onboarding" element={<RequireAccessOutlet />} />
              <Route element={<RequireAccess><Layout /></RequireAccess>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/lesson/:topicId" element={<Lesson />} />
                <Route path="/curriculum" element={<Curriculum />} />
                <Route path="/play" element={<Play />} />
                <Route path="/room/:code" element={<Room />} />
                <Route path="/ranks" element={<Ranks />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Children>
        </StoreProvider>
      </AuthProvider>
    </HashRouter>
  );
}

/** Onboarding sits outside the main layout but still needs access checks. */
function RequireAccessOutlet() {
  const { user, loading } = useAuth();
  const { store } = useStore();
  const guest = localStorage.getItem(GUEST_KEY) === '1';

  if (loading) return <div className="grid min-h-screen place-items-center text-duo-muted">Loading…</div>;
  if (!user && !guest) return <Navigate to="/" replace />;
  if (user && store.profile.onboarded) return <Navigate to="/dashboard" replace />;
  return <Onboarding />;
}
