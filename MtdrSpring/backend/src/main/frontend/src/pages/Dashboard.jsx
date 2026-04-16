import React, { useMemo } from 'react';
import useAppStore from '../store/index';
import useTareas from '../hooks/useTareas';
import MetricCard from '../components/dashboard/MetricCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import BurndownChart from '../components/dashboard/BurndownChart';
import SprintHeader from '../components/sprint/SprintHeader';

const ICAL_PENDIENTE = 'pendiente';
const ICAL_PROGRESO = 'en progreso';
const ICAL_COMPLETADA = 'completada';

function normalizarNombre(nombre) {
  return (nombre || '').toLowerCase().trim();
}

function leerSprintActivo() {
  try {
    const raw = localStorage.getItem('eq51_sprints');
    if (!raw) return null;
    const sprints = JSON.parse(raw);
    return sprints.find((s) => s.activo) ?? null;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const { loading } = useTareas();
  const tareas = useAppStore((s) => s.tareas);

  const sprintActivo = useMemo(() => leerSprintActivo(), []);

  const conteos = useMemo(() => {
    const pendiente = tareas.filter(
      (t) => normalizarNombre(t.estatus?.nombre) === ICAL_PENDIENTE
    ).length;
    const enProgreso = tareas.filter(
      (t) => normalizarNombre(t.estatus?.nombre) === ICAL_PROGRESO
    ).length;
    const completada = tareas.filter(
      (t) => normalizarNombre(t.estatus?.nombre) === ICAL_COMPLETADA
    ).length;
    return { pendiente, enProgreso, completada, total: tareas.length };
  }, [tareas]);

  const estiloPage = {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
    padding: '0 0 40px 0',
  };

  const estiloTitulo = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontWeight: 600,
    fontSize: '1.5rem',
    color: 'var(--text-primary)',
    marginBottom: '0',
    letterSpacing: '-0.01em',
  };

  const estiloHeader = {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
    marginBottom: '4px',
  };

  const estiloSubtitulo = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  };

  const estiloMetricsGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
  };

  const estiloBottomGrid = {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '20px',
    alignItems: 'start',
  };

  const estiloPanelBurndown = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 22px',
    boxShadow: 'var(--shadow-sm)',
  };

  const estiloPanelActivity = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 22px',
    boxShadow: 'var(--shadow-sm)',
  };

  const estiloPanelTitulo = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontWeight: 600,
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    marginBottom: '16px',
  };

  return (
    <div style={estiloPage}>
      {/* Sprint banner */}
      {sprintActivo && (
        <div style={{ margin: '0 -24px' }}>
          <SprintHeader sprint={sprintActivo} />
        </div>
      )}

      {/* Page title */}
      <div>
        <div style={estiloHeader}>
          <h1 style={estiloTitulo}>Dashboard</h1>
          {loading && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Cargando…</span>
          )}
        </div>
        <p style={estiloSubtitulo}>
          Resumen del proyecto · {new Date().toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      {/* Metric cards */}
      <div style={estiloMetricsGrid}>
        <MetricCard
          label="Pendiente"
          value={loading ? '—' : conteos.pendiente}
          color="#EF4444"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />
        <MetricCard
          label="En Progreso"
          value={loading ? '—' : conteos.enProgreso}
          color="#F59E0B"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          }
        />
        <MetricCard
          label="Completadas"
          value={loading ? '—' : conteos.completada}
          color="#22C55E"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <MetricCard
          label="Total de Tareas"
          value={loading ? '—' : conteos.total}
          color="var(--accent)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          }
        />
      </div>

      {/* Burndown + Activity */}
      <div style={estiloBottomGrid}>
        <div style={estiloPanelBurndown}>
          <h3 style={estiloPanelTitulo}>Burndown del Sprint</h3>
          <BurndownChart tareas={tareas} sprint={sprintActivo} />
        </div>
        <div style={estiloPanelActivity}>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
