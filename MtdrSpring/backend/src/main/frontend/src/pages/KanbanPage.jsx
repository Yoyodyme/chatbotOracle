import React, { useState, useEffect } from 'react';
import useTareas from '../hooks/useTareas';
import useAppStore from '../store/index';
import KanbanBoard from '../components/kanban/KanbanBoard';
import { getSprints } from '../api/sprints';
import { DEVELOPERS } from '../utils/developers';

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";


export default function KanbanPage() {
  const { loading } = useTareas();
  const estatuses = useAppStore((s) => s.estatuses);

  const [sprints, setSprints] = useState([]);
  const [sprintSeleccionado, setSprintSeleccionado] = useState('');
  const [developerActivo, setDeveloperActivo] = useState(null);
  const [sprintMenuOpen, setSprintMenuOpen] = useState(false);

  useEffect(() => {
    getSprints()
      .then((data) => setSprints(data ?? []))
      .catch(() => {});
  }, []);

  const sprintActual = sprints.find(
    (s) => String(s.idSprint) === String(sprintSeleccionado)
  );

  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <div>
          <h1 style={styles.title}>Board</h1>
          <p style={styles.subtitle}>Manage tasks by sprint and developer</p>
        </div>

        <div style={styles.dropdownWrapper}>
          <button
            style={styles.sprintButton}
            onClick={() => setSprintMenuOpen((prev) => !prev)}
          >
            {sprintActual ? sprintActual.nombre : 'All sprints'}
            <span style={styles.chevron}>⌄</span>
          </button>

          {sprintMenuOpen && (
            <div style={styles.dropdownMenu}>
              <button
                style={styles.dropdownItem}
                onClick={() => {
                  setSprintSeleccionado('');
                  setSprintMenuOpen(false);
                }}
              >
                All sprints
              </button>

              {sprints.map((sprint) => (
                <button
                  key={sprint.idSprint}
                  style={{
                    ...styles.dropdownItem,
                    ...(String(sprintSeleccionado) === String(sprint.idSprint)
                      ? styles.dropdownItemActive
                      : {}),
                  }}
                  onClick={() => {
                    setSprintSeleccionado(String(sprint.idSprint));
                    setSprintMenuOpen(false);
                  }}
                >
                  {sprint.nombre}
                  {sprint.activo && <span style={styles.activeBadge}>Active</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div style={styles.devFilterBar}>
        {DEVELOPERS.map((dev) => {
          const isActive = developerActivo === dev.initials;

          return (
            <button
              key={`${dev.label}-${dev.initials}`}
              onClick={() => setDeveloperActivo(isActive ? null : dev.initials)}
              style={{
                ...styles.devButton,
                color: isActive ? '#DC2626' : '#6B7280',
                fontWeight: isActive ? 600 : 400,
                borderBottomColor: isActive ? '#DC2626' : 'transparent',
              }}
            >
              <span
                style={{
                  ...styles.avatar,
                  backgroundColor: dev.bg,
                  color: dev.color,
                }}
              >
                {dev.initials}
              </span>
              {dev.label}
            </button>
          );
        })}
      </div>

      <main style={styles.boardCard}>
        {loading && estatuses.length === 0 ? (
          <div style={styles.emptyLoading}>Loading board...</div>
        ) : (
          <KanbanBoard
            loading={loading && estatuses.length === 0}
            sprintId={sprintSeleccionado}
            developerFilter={developerActivo}
          />
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: FONT,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    backgroundColor: '#F8F9FB',
  },

  topbar: {
    backgroundColor: '#FFFFFF',
    borderBottom: '0.5px solid #E5E7EB',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#111827',
  },

  subtitle: {
    margin: '4px 0 0',
    fontSize: 11,
    fontWeight: 400,
    color: '#9CA3AF',
  },

  dropdownWrapper: {
    position: 'relative',
  },

  sprintButton: {
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    color: '#6B7280',
    fontSize: 12,
    fontWeight: 500,
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },

  chevron: {
    fontSize: 11,
    color: '#6B7280',
  },

  dropdownMenu: {
    position: 'absolute',
    top: 34,
    right: 0,
    width: 190,
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    borderRadius: 10,
    boxShadow: '0 12px 28px rgba(15,23,42,0.12)',
    padding: 6,
    zIndex: 20,
  },

  dropdownItem: {
    width: '100%',
    border: 'none',
    backgroundColor: 'transparent',
    padding: '8px 10px',
    borderRadius: 6,
    fontSize: 12,
    color: '#374151',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  dropdownItemActive: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    fontWeight: 600,
  },

  activeBadge: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: 20,
    padding: '1px 7px',
    fontSize: 10,
    fontWeight: 500,
  },

  devFilterBar: {
    backgroundColor: '#FFFFFF',
    borderBottom: '0.5px solid #E5E7EB',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    overflowX: 'auto',
  },

  devButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 14px',
    fontSize: 12,
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  avatar: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 8,
    fontWeight: 600,
  },

  boardCard: {
    margin: '16px 24px',
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    borderRadius: 10,
    padding: '16px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    minHeight: 'calc(100vh - 185px)',
    overflowX: 'auto',
  },

  emptyLoading: {
    fontSize: 12,
    color: '#9CA3AF',
  },
};