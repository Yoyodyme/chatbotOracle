import React from 'react';
import '../../styles/animations.css';

export default function MetricCard({ label, value, color = 'var(--accent)', icon }) {
  const estiloCard = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderLeft: `4px solid ${color}`,
    borderRadius: 'var(--radius-lg)',
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    position: 'relative',
    overflow: 'hidden',
    animation: 'fadeInUp 200ms ease-out both',
    transition: 'box-shadow 150ms ease, background-color 150ms ease',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'default',
  };

  const estiloIcono = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    fontSize: '22px',
    color: color,
    lineHeight: 1,
    userSelect: 'none',
    pointerEvents: 'none',
    opacity: 0.35,
  };

  const estiloValor = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontWeight: 700,
    fontSize: '2rem',
    color: 'var(--text-primary)',
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
  };

  const estiloLabel = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    letterSpacing: '0.01em',
  };

  return (
    <div
      style={estiloCard}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
      }}
    >
      {icon && <div style={estiloIcono}>{icon}</div>}
      <span style={estiloValor}>{value}</span>
      <span style={estiloLabel}>{label}</span>
    </div>
  );
}
