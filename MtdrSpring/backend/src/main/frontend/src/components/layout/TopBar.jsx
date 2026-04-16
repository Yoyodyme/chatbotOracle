import React, { useState } from 'react';
import TaskForm from '../tasks/TaskForm';
import useAppStore from '../../store/index';
import { createTarea as apiCrearTarea } from '../../api/tareas';

const ALTO_TOPBAR = 48;

export default function TopBar({ titulo }) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const addTarea = useAppStore((s) => s.addTarea);
  const addToast = useAppStore((s) => s.addToast);

  async function manejarCrearTarea(datos) {
    try {
      const nueva = await apiCrearTarea({
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        estatus: datos.idEstatus ? { idEstatus: datos.idEstatus } : undefined,
        prioridad: datos.idPrioridad ? { idPrioridad: datos.idPrioridad } : undefined,
        usuarioAsignado: datos.idUsuarioAsignado
          ? { idUsuario: datos.idUsuarioAsignado }
          : null,
        fechaVencimiento: datos.fechaVencimiento || null,
      });
      addTarea(nueva);
      addToast({ id: `cre-${Date.now()}`, type: 'success', message: 'Tarea creada correctamente' });
      setMostrarFormulario(false);
    } catch {
      addToast({ id: `err-${Date.now()}`, type: 'error', message: 'Error al crear la tarea' });
    }
  }

  const estiloTopBar = {
    position: 'fixed',
    top: 0,
    right: 0,
    left: 0,
    height: ALTO_TOPBAR,
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    zIndex: 50,
    gap: '12px',
  };

  const estiloTitulo = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '1rem',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const estiloBotonNueva = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#ffffff',
    background: 'var(--accent)',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    fontFamily: 'var(--font-body)',
    transition: 'background-color var(--transition-fast)',
  };

  return (
    <>
      <header style={estiloTopBar}>
        {titulo && <h1 style={estiloTitulo}>{titulo}</h1>}

        <button
          style={estiloBotonNueva}
          onClick={() => setMostrarFormulario(true)}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent)'; }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
          Nueva Tarea
        </button>
      </header>

      {/* Modal de creación de tarea */}
      {mostrarFormulario && (
        <ModalNuevaTarea
          onSubmit={manejarCrearTarea}
          onCancel={() => setMostrarFormulario(false)}
        />
      )}
    </>
  );
}

function ModalNuevaTarea({ onSubmit, onCancel }) {
  const estiloOverlay = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  };

  const estiloPanel = {
    width: '100%',
    maxWidth: '520px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '24px',
    boxShadow: 'var(--shadow-lg)',
    animation: 'scaleIn 150ms ease-out both',
  };

  const estiloTitulo = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '1.0625rem',
    color: 'var(--text-primary)',
    marginBottom: '20px',
  };

  // Cerrar con Escape
  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div style={estiloOverlay} onClick={onCancel}>
      <div style={estiloPanel} onClick={(e) => e.stopPropagation()}>
        <h2 style={estiloTitulo}>Nueva tarea</h2>
        <TaskForm onSubmit={onSubmit} onCancel={onCancel} />
      </div>
    </div>
  );
}
