import PropTypes from 'prop-types';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import KanbanPage from './pages/KanbanPage';
import BacklogPage from './pages/BacklogPage';
import SprintPage from './pages/SprintPage';
import TeamPage from './pages/TeamPage';
import Login from './components/Login';
import { useIsAuthenticated } from './utils/auth';
import './styles/globals.css';
import './styles/animations.css';

// CHANGED 2026-06-11: use useIsAuthenticated (covers both OCI and local JWT) instead of useAuth
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useIsAuthenticated();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default function App() {
  return (
    <Routes>
      {/* Public route — rendered without AppShell (no sidebar / topbar) */}
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="board"   element={<KanbanPage />} />
        <Route path="backlog" element={<BacklogPage />} />
        <Route path="sprints" element={<SprintPage />} />
        <Route path="team"    element={<TeamPage />} />
      </Route>

      {/* Catch-all: unauthenticated → /login, authenticated → / */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Navigate to="/" replace />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}