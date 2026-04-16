import React from 'react';

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function calcularPorcentaje(sprint) {
  const total = sprint?.tareaIds?.length ?? 0;
  const completadas = sprint?.tareasCompletadas ?? 0;
  if (total === 0) return 0;
  return Math.round((completadas / total) * 100);
}

export default function SprintHeader({ sprint }) {
  if (!sprint) return null;

  const porcentaje = calcularPorcentaje(sprint);

  const estiloBanner = {
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border)',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  };

  const estiloNombre = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  const estiloFechas = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6875rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  const estiloProgresoWrapper = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: '160px',
  };

  const estiloBarraFondo = {
    flex: 1,
    height: '5px',
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

  const estiloPorcentaje = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6875rem',
    color: 'var(--accent)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    minWidth: '34px',
    textAlign: 'right',
  };

  const estiloActivoBadge = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.625rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    backgroundColor: 'var(--accent-soft)',
    border: '1px solid rgba(6,111,204,0.25)',
    color: 'var(--accent)',
    flexShrink: 0,
  };

  return (
    <div style={estiloBanner}>
      <span style={estiloNombre}>{sprint.nombre}</span>
      {sprint.activo && <span style={estiloActivoBadge}>ACTIVO</span>}
      <span style={estiloFechas}>
        {formatFechaCorta(sprint.fechaInicio)} → {formatFechaCorta(sprint.fechaFin)}
      </span>
      <div style={estiloProgresoWrapper}>
        <div style={estiloBarraFondo}>
          <div style={estiloBarraRelleno} />
        </div>
        <span style={estiloPorcentaje}>{porcentaje}%</span>
      </div>
    </div>
  );
}
