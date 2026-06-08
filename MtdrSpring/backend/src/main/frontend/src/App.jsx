import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import KanbanPage from './pages/KanbanPage';
import BacklogPage from './pages/BacklogPage';
import SprintPage from './pages/SprintPage';
import TeamPage from './pages/TeamPage';
import Login from './components/Login';
import './styles/globals.css';
import './styles/animations.css';

export default function App() {
  return (
    <Routes>
      {/* Public route — rendered without AppShell (no sidebar / topbar) */}
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="board"   element={<KanbanPage />} />
        <Route path="backlog" element={<BacklogPage />} />
        <Route path="sprints" element={<SprintPage />} />
        <Route path="team"    element={<TeamPage />} />
      </Route>
    </Routes>
  );
}