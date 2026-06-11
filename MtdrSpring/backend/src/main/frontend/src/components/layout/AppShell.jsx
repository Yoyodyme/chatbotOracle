import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { useIsAuthenticated } from '../../utils/auth';
import Sidebar from './Sidebar';
import Toast from '../shared/Toast';
import TaskDetailModal from '../tasks/TaskDetailModal';
import ChatbotPanel from '../chatbot/ChatbotPanel';
import useAppStore from '../../store/index';
import useUsuarios from '../../hooks/useUsuarios';
import '../../styles/animations.css';
import '../../styles/globals.css';

const ANCHO_SIDEBAR_EXPANDIDO = 220;
const ANCHO_SIDEBAR_COLAPSADO = 52;

export default function AppShell({ tituloPagina }) {
  useAuth(); // keeps OIDC session alive; actual auth state read via useIsAuthenticated
  const { isAuthenticated, isLoading } = useIsAuthenticated();
  const navigate = useNavigate();
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  useUsuarios(); // Loads the user list globally for all assignment selectors

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) return null;

  const anchoSidebar = sidebarCollapsed
    ? ANCHO_SIDEBAR_COLAPSADO
    : ANCHO_SIDEBAR_EXPANDIDO;

  const estiloShell = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-base)',
  };

  const estiloMain = {
    marginLeft: anchoSidebar,
    flex: 1,
    minWidth: 0,
    overflow: 'auto',
    paddingTop: 0,
    marginTop: 0,
    height: '100vh',
    transition: 'margin-left 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div style={estiloShell}>
      {/* Fixed left sidebar */}
      <Sidebar />

      {/* Main content area — starts at top with no offset */}
      <main style={estiloMain}>
        <Outlet />
      </main>

      {/* Task detail modal (controlled by store.selectedTask) */}
      <TaskDetailModal />

      {/* Toast notification system */}
      <Toast />

      {/* Task assistant */}
      <ChatbotPanel />
    </div>
  );
}
