import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './lib/auth';
import { StoreProvider } from './lib/store';
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
import Leaderboard from './pages/Leaderboard';
import NotFound from './pages/NotFound';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import Quizzes from './pages/Quizzes';
import Settings from './pages/Settings';
import SubjectDetail from './pages/SubjectDetail';
import Subjects from './pages/Subjects';

// HashRouter: every route works on direct load / refresh on GitHub Pages (no server rewrites).
export default function App() {
  return (
    <StoreProvider>
      <AuthProvider>
        <OnlineSync />
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
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
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </StoreProvider>
  );
}
