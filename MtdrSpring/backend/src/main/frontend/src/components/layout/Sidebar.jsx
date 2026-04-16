import React from 'react';
import { NavLink } from 'react-router-dom';
import useAppStore from '../../store/index';

// ── Iconos SVG inline ────────────────────────────────────────────────────────
function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconBoard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="18" />
      <rect x="10" y="3" width="5" height="11" />
      <rect x="17" y="3" width="5" height="15" />
    </svg>
  );
}

function IconBacklog() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function IconSprints() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconTeam() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCollapse({ collapsed }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 250ms' }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

// ── Icono de nube estilo Oracle ──────────────────────────────────────────────
function IconCloud() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

// ── Datos de navegación ──────────────────────────────────────────────────────
const ITEMS_NAV = [
  { to: '/',        label: 'Dashboard', icon: <IconDashboard />, exact: true },
  { to: '/board',   label: 'Board',     icon: <IconBoard /> },
  { to: '/backlog', label: 'Backlog',   icon: <IconBacklog /> },
  { to: '/sprints', label: 'Sprints',   icon: <IconSprints /> },
  { to: '/team',    label: 'Equipo',    icon: <IconTeam /> },
];

const ANCHO_EXPANDIDO = 220;
const ANCHO_COLAPSADO = 52;
const ALTO_TOPBAR = 48;

export default function Sidebar() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  const ancho = sidebarCollapsed ? ANCHO_COLAPSADO : ANCHO_EXPANDIDO;

  const estiloSidebar = {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: ancho,
    backgroundColor: 'var(--sidebar-bg)',
    borderRight: 'none',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    overflow: 'hidden',
    transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const estiloLogo = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: sidebarCollapsed ? '0 15px' : '0 18px',
    height: ALTO_TOPBAR,
    borderBottom: '1px solid var(--sidebar-border)',
    flexShrink: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    transition: 'padding 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const estiloTextoLogo = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '1.0625rem',
    color: '#ffffff',
    letterSpacing: '-0.01em',
    opacity: sidebarCollapsed ? 0 : 1,
    transform: sidebarCollapsed ? 'translateX(-8px)' : 'translateX(0)',
    transition: 'opacity 200ms, transform 250ms',
    pointerEvents: 'none',
  };

  const estiloNav = {
    flex: 1,
    padding: '10px 0',
    overflowX: 'hidden',
    overflowY: 'auto',
  };

  const estiloBotonColapsar = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: sidebarCollapsed ? 'center' : 'flex-end',
    padding: sidebarCollapsed ? '12px 14px' : '12px 16px',
    borderTop: '1px solid var(--sidebar-border)',
    cursor: 'pointer',
    color: 'var(--sidebar-text)',
    background: 'none',
    border: 'none',
    width: '100%',
    transition: 'color 100ms, padding 250ms',
    flexShrink: 0,
  };

  return (
    <aside style={estiloSidebar}>
      {/* Logo */}
      <div style={estiloLogo}>
        <IconCloud />
        <span style={estiloTextoLogo}>EQ51</span>
      </div>

      {/* Navegación */}
      <nav style={estiloNav}>
        {ITEMS_NAV.map((item) => (
          <SidebarNavLink
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            collapsed={sidebarCollapsed}
            exact={item.exact}
          />
        ))}
      </nav>

      {/* Botón colapsar */}
      <button
        style={estiloBotonColapsar}
        onClick={toggleSidebar}
        title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--sidebar-text)'; }}
      >
        <IconCollapse collapsed={sidebarCollapsed} />
      </button>
    </aside>
  );
}

function SidebarNavLink({ to, label, icon, collapsed, exact }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <NavLink
      to={to}
      end={exact}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 18px',
        paddingLeft: collapsed ? 0 : '18px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        textDecoration: 'none',
        color: isActive
          ? '#ffffff'
          : hovered
          ? '#ffffff'
          : 'var(--sidebar-text)',
        backgroundColor: isActive
          ? 'var(--sidebar-active)'
          : hovered
          ? 'var(--sidebar-hover)'
          : 'transparent',
        borderRadius: '0',
        margin: '1px 0',
        transition: 'background-color 100ms, color 100ms, padding 250ms',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
        borderRight: 'none',
        position: 'relative',
      })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? label : undefined}
    >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
      {!collapsed && (
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          fontWeight: 500,
          overflow: 'hidden',
          transition: 'opacity 200ms',
        }}>
          {label}
        </span>
      )}
    </NavLink>
  );
}
