import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import Sidebar from './Sidebar';
import Toast from '../shared/Toast';
import TaskDetailModal from '../tasks/TaskDetailModal';
import ChatbotPanel from '../chatbot/ChatbotPanel';
import useAppStore from '../../store/index';
import useUsuarios from '../../hooks/useUsuarios';
import '../../styles/animations.css';
import '../../styles/globals.css';

const IS_MOCK = import.meta.env.VITE_MOCK === 'true';

const ANCHO_SIDEBAR_EXPANDIDO = 220;
const ANCHO_SIDEBAR_COLAPSADO = 52;

function ShellContent() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  useUsuarios();

  const anchoSidebar = sidebarCollapsed ? ANCHO_SIDEBAR_COLAPSADO : ANCHO_SIDEBAR_EXPANDIDO;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>
      <Sidebar />
      <main style={{
        marginLeft: anchoSidebar,
        flex: 1,
        minWidth: 0,
        overflow: 'auto',
        height: '100vh',
        transition: 'margin-left 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <Outlet />
      </main>
      <TaskDetailModal />
      <Toast />
      <ChatbotPanel />
    </div>
  );
}

function AuthGate() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      auth.signinRedirect();
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  if (auth.isLoading || !auth.isAuthenticated) return null;
  return <ShellContent />;
}

export default function AppShell() {
  return IS_MOCK ? <ShellContent /> : <AuthGate />;
}
