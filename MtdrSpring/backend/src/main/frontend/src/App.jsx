import PropTypes from 'prop-types';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import KanbanPage from './pages/KanbanPage';
import BacklogPage from './pages/BacklogPage';
import SprintPage from './pages/SprintPage';
import TeamPage from './pages/TeamPage';
import Login from './components/Login';
import './styles/globals.css';
import './styles/animations.css';

function ProtectedRoute({ children }) {
  const auth = useAuth();
  if (auth.isLoading) return null;
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;
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