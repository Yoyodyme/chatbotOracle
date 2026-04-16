import React from 'react';

// ── Mapa de colores por prioridad ────────────────────────────────────────────
const CONFIG_PRIORIDAD = {
  alta: {
    bg: 'rgba(218,30,40,0.10)',
    border: 'rgba(218,30,40,0.25)',
    text: '#da1e28',
    dot: '#da1e28',
  },
  media: {
    bg: 'rgba(185,80,0,0.10)',
    border: 'rgba(185,80,0,0.25)',
    text: '#b95000',
    dot: '#b95000',
  },
  baja: {
    bg: 'rgba(0,67,206,0.10)',
    border: 'rgba(0,67,206,0.25)',
    text: '#0043ce',
    dot: '#0043ce',
  },
};

// ── Mapa de colores por estatus ──────────────────────────────────────────────
const CONFIG_ESTATUS = {
  pendiente: {
    dot: '#8d8d8d',
    text: '#525252',
  },
  'en progreso': {
    dot: '#b95000',
    text: '#b95000',
  },
  completada: {
    dot: '#2d7d46',
    text: '#2d7d46',
  },
};

function normalizar(nombre) {
  return (nombre || '').toLowerCase().trim();
}

// ── PriorityBadge ────────────────────────────────────────────────────────────
export function PriorityBadge({ prioridad }) {
  const clave = normalizar(prioridad?.nombre);
  const config = CONFIG_PRIORIDAD[clave] ?? {
    bg: 'rgba(141,141,141,0.10)',
    border: 'rgba(141,141,141,0.25)',
    text: 'var(--text-secondary)',
    dot: 'var(--text-muted)',
  };

  const estiloPill = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: config.bg,
    border: `1px solid ${config.border}`,
    fontSize: '0.75rem',
    fontWeight: 600,
    color: config.text,
    whiteSpace: 'nowrap',
    lineHeight: 1,
    userSelect: 'none',
  };

  const estiloPunto = {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: config.dot,
    flexShrink: 0,
  };

  return (
    <span style={estiloPill}>
      <span style={estiloPunto} />
      {prioridad?.nombre ?? '—'}
    </span>
  );
}

// ── StatusBadge ──────────────────────────────────────────────────────────────
export function StatusBadge({ estatus }) {
  const clave = normalizar(estatus?.nombre);
  const config = CONFIG_ESTATUS[clave] ?? {
    dot: 'var(--text-muted)',
    text: 'var(--text-muted)',
  };

  const estiloContenedor = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: config.text,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  const estiloPunto = {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: config.dot,
    flexShrink: 0,
  };

  return (
    <span style={estiloContenedor}>
      <span style={estiloPunto} />
      {estatus?.nombre ?? '—'}
    </span>
  );
}
