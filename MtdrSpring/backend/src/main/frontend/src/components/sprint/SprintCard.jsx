import React from 'react';
import { Link } from 'react-router-dom';

function formatFecha(fechaStr) {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcularPorcentaje(sprint) {
  const total = sprint.tareaIds?.length ?? 0;
  const completadas = sprint.tareasCompletadas ?? 0;
  if (total === 0) return 0;
  return Math.round((completadas / total) * 100);
}

function getBadgeEstatus(sprint) {
  if (sprint.activo) {
    return {
      label: 'ACTIVO',
      color: 'var(--accent)',
      bg: 'var(--accent-soft)',
      border: 'rgba(6,111,204,0.25)',
    };
  }
  const ahora = new Date();
  const fin = sprint.fechaFin ? new Date(sprint.fechaFin) : null;
  if (fin && ahora > fin) {
    return {
      label: 'COMPLETADO',
      color: '#2d7d46',
      bg: 'rgba(45,125,70,0.10)',
      border: 'rgba(45,125,70,0.30)',
    };
  }
  return {
    label: 'PENDIENTE',
    color: 'var(--text-muted)',
    bg: 'rgba(141,141,141,0.10)',
    border: 'rgba(141,141,141,0.25)',
  };
}

export default function SprintCard({ sprint, onCompleteSprint }) {
  const badge = getBadgeEstatus(sprint);
  const porcentaje = calcularPorcentaje(sprint);
  const total = sprint.tareaIds?.length ?? 0;
  const completadas = sprint.tareasCompletadas ?? 0;

  const estiloCard = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    animation: 'fadeInUp 200ms ease-out both',
    boxShadow: 'var(--shadow-sm)',
  };

  const estiloHeader = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  };

  const estiloNombre = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '1.0625rem',
    color: 'var(--text-primary)',
    margin: 0,
  };

  const estiloBadge = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 9px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    backgroundColor: badge.bg,
    border: `1px solid ${badge.border}`,
    color: badge.color,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  const estiloFechas = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
  };

  const estiloProgresoWrapper = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  };

  const estiloProgresoHeader = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const estiloProgresoLabel = {
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
  };

  const estiloPorcentaje = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--accent)',
    fontWeight: 600,
  };

  const estiloBarraFondo = {
    height: '6px',
    borderRadius: '9999px',
    backgroundColor: 'var(--border)',
    overflow: 'hidden',
  };

  const estiloBarraRelleno = {
    height: '100%',
    borderRadius: '9999px',
    backgroundColor: 'var(--accent)',
    width: `${porcentaje}%`,
    transition: 'width 600ms ease',
  };

  const estiloAcciones = {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  };

  const estiloBtnBoard = {
    padding: '7px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--accent)',
    background: 'var(--accent-soft)',
    border: '1px solid rgba(6,111,204,0.25)',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'opacity 150ms',
  };

  const estiloBtnCompletar = {
    padding: '7px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#2d7d46',
    background: 'rgba(45,125,70,0.10)',
    border: '1px solid rgba(45,125,70,0.30)',
    cursor: 'pointer',
    transition: 'opacity 150ms',
  };

  return (
    <div style={estiloCard}>
      <div style={estiloHeader}>
        <h3 style={estiloNombre}>{sprint.nombre}</h3>
        <span style={estiloBadge}>{badge.label}</span>
      </div>

      <span style={estiloFechas}>
        {formatFecha(sprint.fechaInicio)} → {formatFecha(sprint.fechaFin)}
      </span>

      <div style={estiloProgresoWrapper}>
        <div style={estiloProgresoHeader}>
          <span style={estiloProgresoLabel}>
            {completadas} / {total} tareas completadas
          </span>
          <span style={estiloPorcentaje}>{porcentaje}%</span>
        </div>
        <div style={estiloBarraFondo}>
          <div style={estiloBarraRelleno} />
        </div>
      </div>

      {sprint.activo && (
        <div style={estiloAcciones}>
          <Link to="/board" style={estiloBtnBoard}>
            <span>▶</span> Ver Board
          </Link>
          {onCompleteSprint && (
            <button
              style={estiloBtnCompletar}
              onClick={() => onCompleteSprint(sprint.id)}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              ✓ Completar Sprint
            </button>
          )}
        </div>
      )}
    </div>
  );
}
