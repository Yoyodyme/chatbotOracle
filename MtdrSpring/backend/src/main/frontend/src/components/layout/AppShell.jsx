import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Toast from '../shared/Toast';
import TaskDetailModal from '../tasks/TaskDetailModal';
import useAppStore from '../../store/index';
import '../../styles/animations.css';
import '../../styles/globals.css';

const ANCHO_SIDEBAR_EXPANDIDO = 220;
const ANCHO_SIDEBAR_COLAPSADO = 52;
const ALTO_TOPBAR = 48;

export default function AppShell({ tituloPagina }) {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

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
    paddingTop: ALTO_TOPBAR,
    flex: 1,
    minWidth: 0,
    transition: 'margin-left 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const estiloContenido = {
    padding: '24px',
    minHeight: `calc(100vh - ${ALTO_TOPBAR}px)`,
  };

  return (
    <div style={estiloShell}>
      {/* Sidebar fijo izquierdo */}
      <Sidebar />

      {/* Topbar fijo superior (ocupa el ancho restante) */}
      <TopBar titulo={tituloPagina} />

      {/* Área de contenido principal */}
      <main style={estiloMain}>
        <div style={estiloContenido}>
          <Outlet />
        </div>
      </main>

      {/* Modal de detalle de tarea (controlado por store.selectedTask) */}
      <TaskDetailModal />

      {/* Sistema de notificaciones toast */}
      <Toast />
    </div>
  );
}
