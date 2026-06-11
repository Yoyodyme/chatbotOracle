import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import useAppStore from '../../store/index';
import { useCurrentUser, useSignOut } from '../../utils/auth';

// ── Inline SVG icons ─────────────────────────────────────────────────────────
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
IconCollapse.propTypes = { collapsed: PropTypes.bool.isRequired };

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// ── Navigation data ───────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/',        label: 'Dashboard', icon: <IconDashboard />, exact: true },
  { to: '/board',   label: 'Board',     icon: <IconBoard /> },
  { to: '/backlog', label: 'Backlog',   icon: <IconBacklog /> },
  { to: '/sprints', label: 'Sprints',   icon: <IconSprints /> },
  { to: '/team',    label: 'Team',      icon: <IconTeam /> },
];

const SIDEBAR_W_EXPANDED  = 220;
const SIDEBAR_W_COLLAPSED = 52;

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar    = useAppStore((s) => s.toggleSidebar);
  const user             = useCurrentUser();
  const signOut          = useSignOut();

  const [profileOpen, setProfileOpen] = useState(false);
  const avatarRef = useRef(null);
  const cardRef   = useRef(null);
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });

  const initials = getInitials(user.name);
  const width    = sidebarCollapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED;

  // Close profile card when clicking outside both the avatar button and the card
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => {
      if (avatarRef.current?.contains(e.target)) return;
      if (cardRef.current?.contains(e.target)) return;
      setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const handleAvatarClick = () => {
    if (!profileOpen && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setCardPos({ top: rect.top, left: rect.right + 8 });
    }
    setProfileOpen((p) => !p);
  };

  return (
    <aside style={{
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      width,
      backgroundColor: 'var(--sidebar-bg)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      overflow: 'hidden',
      transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    }}>

      {/* ── Logo row + collapse toggle ─────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: 48,
        borderBottom: '1px solid var(--sidebar-border)',
        flexShrink: 0,
        overflow: 'hidden',
        paddingLeft: sidebarCollapsed ? 0 : 18,
        transition: 'padding 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {!sidebarCollapsed && (
          <img
            src="/logo.png"
            alt="Yoyodyne"
            style={{
              height: 28,
              width: 'auto',
              flex: 1,
              minWidth: 0,
              objectFit: 'contain',
              objectPosition: 'left center',
              display: 'block',
            }}
          />
        )}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: sidebarCollapsed ? SIDEBAR_W_COLLAPSED : 36,
            height: 48,
            flexShrink: 0,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--sidebar-text)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--sidebar-text)'; }}
        >
          <IconCollapse collapsed={sidebarCollapsed} />
        </button>
      </div>

      {/* ── User avatar ───────────────────────────────────────────────────── */}
      <button
        ref={avatarRef}
        onClick={handleAvatarClick}
        title={sidebarCollapsed ? (user.name || 'Profile') : undefined}
        aria-label="View profile"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: sidebarCollapsed ? '12px 0' : '12px 14px',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          flexShrink: 0,
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid var(--sidebar-border)',
          width: '100%',
          color: 'var(--sidebar-text)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transition: 'background-color 100ms, padding 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: 'var(--accent)',
          color: '#ffffff',
          fontSize: '0.6875rem',
          fontWeight: 700,
          flexShrink: 0,
          letterSpacing: '0.03em',
        }}>
          {initials}
        </span>
        {!sidebarCollapsed && (
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: '#ffffff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {user.name || user.email || 'User'}
          </span>
        )}
      </button>

      {/* ── Profile card (position:fixed escapes overflow:hidden on the aside) */}
      {profileOpen && (
        <div
          ref={cardRef}
          style={{
            position: 'fixed',
            top: cardPos.top,
            left: cardPos.left,
            zIndex: 300,
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '14px 16px',
            minWidth: 210,
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {user.name || '—'}
          </span>
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
          }}>
            {user.email || '—'}
          </span>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav style={{
        flex: 1,
        padding: '10px 0',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}>
        {NAV_ITEMS.map((item) => (
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

      {/* ── Sign out ──────────────────────────────────────────────────────── */}
      <button
        onClick={signOut}
        title={sidebarCollapsed ? 'Sign out' : undefined}
        aria-label="Sign out"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: sidebarCollapsed ? '14px 0' : '14px 18px',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          cursor: 'pointer',
          color: 'var(--sidebar-text)',
          background: 'none',
          border: 'none',
          borderTop: '1px solid var(--sidebar-border)',
          width: '100%',
          flexShrink: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transition: 'color 100ms, padding 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--sidebar-text)'; }}
      >
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <IconLogout />
        </span>
        {!sidebarCollapsed && (
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}>
            Sign out
          </span>
        )}
      </button>
    </aside>
  );
}

// ── SidebarNavLink ────────────────────────────────────────────────────────────
function SidebarNavLink({ to, label, icon, collapsed, exact }) {
  const [hovered, setHovered] = useState(false);

  return (
    <NavLink
      to={to}
      end={exact}
      style={({ isActive }) => {
        const linkColor = (isActive || hovered) ? '#ffffff' : 'var(--sidebar-text)';
        let bgColor = 'transparent';
        if (hovered) bgColor = 'var(--sidebar-hover)';
        if (isActive) bgColor = 'var(--sidebar-active)';
        return ({
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 18px',
          paddingLeft: collapsed ? 0 : '18px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          textDecoration: 'none',
          color: linkColor,
          backgroundColor: bgColor,
          borderRadius: '0',
          margin: '1px 0',
          transition: 'background-color 100ms, color 100ms, padding 250ms',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
          borderRight: 'none',
          position: 'relative',
      });
      }}
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
SidebarNavLink.propTypes = {
  to:        PropTypes.string.isRequired,
  label:     PropTypes.string.isRequired,
  icon:      PropTypes.node.isRequired,
  collapsed: PropTypes.bool.isRequired,
  exact:     PropTypes.bool,
};
