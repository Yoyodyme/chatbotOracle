import React from 'react';
import SprintCard from './SprintCard';

export default function SprintList({ sprints = [], onCreateSprint, onCompleteSprint }) {
  const ordenados = [...sprints].sort((a, b) => {
    // Activos primero, luego por fecha de inicio descendente
    if (a.activo && !b.activo) return -1;
    if (!a.activo && b.activo) return 1;
    return new Date(b.fechaInicio || 0) - new Date(a.fechaInicio || 0);
  });

  const estiloContenedor = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const estiloHeader = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  };

  const estiloBotonNuevo = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 18px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    background: 'var(--accent)',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 150ms',
  };

  const estiloVacio = {
    textAlign: 'center',
    padding: '56px 24px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9375rem',
  };

  return (
    <div style={estiloContenedor}>
      <div style={estiloHeader}>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
          }}
        >
          {ordenados.length} sprint{ordenados.length !== 1 ? 's' : ''}
        </span>
        {onCreateSprint && (
          <button
            style={estiloBotonNuevo}
            onClick={onCreateSprint}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
            Nuevo Sprint
          </button>
        )}
      </div>

      {ordenados.length === 0 ? (
        <div style={estiloVacio}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏃</div>
          <p>No hay sprints. Crea el primero.</p>
        </div>
      ) : (
        ordenados.map((sprint) => (
          <SprintCard
            key={sprint.id}
            sprint={sprint}
            onCompleteSprint={onCompleteSprint}
          />
        ))
      )}
    </div>
  );
}
