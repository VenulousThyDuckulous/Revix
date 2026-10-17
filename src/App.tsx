import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './lib/auth';
import { StoreProvider, useStore } from './lib/store';
import { OnlineSync } from './lib/sync';
import Achievements from './pages/Achievements';
import Curriculum from './pages/Curriculum';
import Dashboard from './pages/Dashboard';
import ExamPractice from './pages/ExamPractice';
import Flashcards from './pages/Flashcards';
import GamesHub from './pages/GamesHub';
import ExamRush from './pages/games/ExamRush';
import MatchUp from './pages/games/MatchUp';
import MemoryMatch from './pages/games/MemoryMatch';
import Quickfire from './pages/games/Quickfire';
import TopicBoss from './pages/games/TopicBoss';
import WordScramble from './pages/games/WordScramble';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import Quizzes from './pages/Quizzes';
import Ranks from './pages/Ranks';
import Settings from './pages/Settings';
import SubjectDetail from './pages/SubjectDetail';
import Subjects from './pages/Subjects';

/** The main page: signed-in users (or offline guests) see the dashboard, everyone else gets Landing. */
function RootGate() {
  const { user, loading } = useAuth();
  const { store } = useStore();
  if (loading) return <p style={{ padding: 40, color: 'var(--muted)' }}>Loading Revix…</p>;
  if (user || store.profile.guestMode) return <Dashboard />;
  return <Landing />;
}

/** Anything behind the main page requires a sign-in or guest mode. */
function RequireAccess() {
  const { user, loading } = useAuth();
  const { store } = useStore();
  if (loading) return <p style={{ padding: 40, color: 'var(--muted)' }}>Loading Revix…</p>;
  if (!user && !store.profile.guestMode) return <Navigate to="/" replace />;
  return <Outlet />;
}

// HashRouter: every route works on direct load / refresh on GitHub Pages (no server rewrites).
export default function App() {
  return (
    <StoreProvider>
      <AuthProvider>
        <OnlineSync />
        <HashRouter>
          <Routes>
            <Route index element={<RootGate />} />
            <Route element={<RequireAccess />}>
              <Route element={<Layout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="onboarding" element={<Onboarding />} />
                <Route path="curriculum" element={<Curriculum />} />
                <Route path="subjects" element={<Subjects />} />
                <Route path="subjects/:id" element={<SubjectDetail />} />
                <Route path="quizzes" element={<Quizzes />} />
                <Route path="flashcards" element={<Flashcards />} />
                <Route path="games" element={<GamesHub />} />
                <Route path="games/quickfire" element={<Quickfire />} />
                <Route path="games/match-up" element={<MatchUp />} />
                <Route path="games/memory-match" element={<MemoryMatch />} />
                <Route path="games/topic-boss" element={<TopicBoss />} />
                <Route path="games/word-scramble" element={<WordScramble />} />
                <Route path="games/exam-rush" element={<ExamRush />} />
                <Route path="exam" element={<ExamPractice />} />
                <Route path="ranks" element={<Ranks />} />
                <Route path="achievements" element={<Achievements />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </StoreProvider>
  );
}
