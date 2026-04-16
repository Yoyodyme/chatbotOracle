import React from 'react';

export default function EmptyState({ icon, title, message, action }) {
  const estiloContenedor = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '56px 24px',
    textAlign: 'center',
    gap: '12px',
  };

  const estiloIcono = {
    fontSize: '48px',
    lineHeight: 1,
    color: 'var(--text-muted)',
    marginBottom: '4px',
    userSelect: 'none',
  };

  const estiloTitulo = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '1.0625rem',
    color: 'var(--text-primary)',
    marginBottom: '2px',
  };

  const estiloMensaje = {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    maxWidth: '320px',
  };

  const estiloBoton = {
    marginTop: '16px',
    padding: '9px 20px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    background: 'var(--accent)',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 100ms',
  };

  return (
    <div style={estiloContenedor}>
      {icon && (
        <div style={estiloIcono} aria-hidden="true">
          {icon}
        </div>
      )}
      {title && <h3 style={estiloTitulo}>{title}</h3>}
      {message && <p style={estiloMensaje}>{message}</p>}
      {action && (
        <button
          style={estiloBoton}
          onClick={action.onClick}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
