import React, { useEffect } from 'react';
import '../../styles/animations.css';

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Eliminar',
  dangerous = true,
}) {
  useEffect(() => {
    if (!open) return;
    const manejarTeclado = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', manejarTeclado);
    return () => document.removeEventListener('keydown', manejarTeclado);
  }, [open, onCancel]);

  if (!open) return null;

  const estiloOverlay = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  };

  const estiloPanel = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px 28px 24px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: 'var(--shadow-md)',
    animation: 'scaleIn 150ms ease-out both',
  };

  const estiloTitulo = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '1.0625rem',
    color: 'var(--text-primary)',
    marginBottom: '10px',
  };

  const estiloMensaje = {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '24px',
  };

  const estiloAcciones = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  };

  const estiloBotonCancelar = {
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'background-color 100ms, color 100ms',
  };

  const estiloBotonConfirmar = {
    padding: '8px 18px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    background: dangerous ? 'var(--danger)' : 'var(--accent)',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 100ms',
  };

  return (
    <div style={estiloOverlay} onClick={onCancel}>
      <div style={estiloPanel} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 style={estiloTitulo}>{title}</h2>
        <p style={estiloMensaje}>{message}</p>
        <div style={estiloAcciones}>
          <button
            style={estiloBotonCancelar}
            onClick={onCancel}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            Cancelar
          </button>
          <button
            style={estiloBotonConfirmar}
            onClick={onConfirm}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
