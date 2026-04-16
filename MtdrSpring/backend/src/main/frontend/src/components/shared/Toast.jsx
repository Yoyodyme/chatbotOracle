import React, { useEffect, useRef } from 'react';
import '../../styles/animations.css';
import useAppStore from '../../store/index';

const DURACION_DEFAULT = 4000;

const BORDER_COLOR_MAP = {
  success: 'var(--success)',
  error: 'var(--danger)',
  info: 'var(--accent)',
  warning: 'var(--warning)',
  default: 'transparent',
};

function ToastItem({ toast }) {
  const removeToast = useAppStore((s) => s.removeToast);
  const timerRef = useRef(null);

  useEffect(() => {
    const duracion = toast.duration ?? DURACION_DEFAULT;
    timerRef.current = setTimeout(() => {
      removeToast(toast.id);
    }, duracion);

    return () => clearTimeout(timerRef.current);
  }, [toast.id, toast.duration, removeToast]);

  const borderColor = BORDER_COLOR_MAP[toast.type] ?? BORDER_COLOR_MAP.default;

  const estiloToast = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderLeft: toast.type && toast.type !== 'default'
      ? `3px solid ${borderColor}`
      : '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    minWidth: '280px',
    maxWidth: '400px',
    boxShadow: 'var(--shadow-md)',
    animation: 'slideInBottom 200ms ease-out both',
  };

  const estiloContenido = {
    flex: 1,
    minWidth: 0,
  };

  const estiloMensaje = {
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    lineHeight: '1.5',
    wordBreak: 'break-word',
    fontFamily: 'var(--font-body)',
  };

  const estiloBotonCerrar = {
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    fontSize: '14px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 100ms, background-color 100ms',
  };

  const estiloBotonAccion = {
    marginTop: '8px',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--accent)',
    background: 'var(--accent-soft)',
    border: '1px solid rgba(6,111,204,0.25)',
    cursor: 'pointer',
    transition: 'opacity 100ms',
  };

  return (
    <div style={estiloToast} role="alert" aria-live="polite">
      <div style={estiloContenido}>
        <p style={estiloMensaje}>{toast.message}</p>
        {toast.action && (
          <button
            style={estiloBotonAccion}
            onClick={() => {
              toast.action.onClick();
              removeToast(toast.id);
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        style={estiloBotonCerrar}
        onClick={() => removeToast(toast.id)}
        aria-label="Cerrar notificación"
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function Toast() {
  const toasts = useAppStore((s) => s.toasts);

  const estiloContenedor = {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'flex-end',
    pointerEvents: 'none',
  };

  const estiloItemWrapper = {
    pointerEvents: 'auto',
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={estiloContenedor} aria-label="Notificaciones">
      {toasts.map((toast) => (
        <div key={toast.id} style={estiloItemWrapper}>
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
