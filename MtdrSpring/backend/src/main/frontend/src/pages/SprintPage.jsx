import React, { useState, useEffect, useCallback } from 'react';
import SprintList from '../components/sprint/SprintList';
import '../styles/animations.css';

function normalizarSprint(s) {
  return { ...s, id: s.idSprint };
}

function ModalNuevoSprint({ onClose, onCrear }) {
  const [form, setForm] = useState({
    nombre: '',
    fechaInicio: '',
    fechaFin: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError('El nombre del sprint es obligatorio.');
      return;
    }
    if (!form.fechaInicio || !form.fechaFin) {
      setError('Debes indicar las fechas de inicio y fin.');
      return;
    }
    if (new Date(form.fechaFin) <= new Date(form.fechaInicio)) {
      setError('La fecha de fin debe ser posterior a la de inicio.');
      return;
    }
    setError('');
    onCrear({
      nombre: form.nombre.trim(),
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
    });
  }

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
    padding: '28px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: 'var(--shadow-md)',
    animation: 'scaleIn 150ms ease-out both',
  };

  const estiloTitulo = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '1.125rem',
    color: 'var(--text-primary)',
    marginBottom: '20px',
  };

  const estiloLabel = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    fontFamily: 'var(--font-body)',
  };

  const estiloInputBase = {
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const estiloGrupo = { marginBottom: '16px' };

  const estiloFila2 = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  };

  const estiloError = {
    color: 'var(--danger)',
    fontSize: '0.8125rem',
    marginBottom: '12px',
  };

  const estiloAcciones = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '24px',
  };

  return (
    <div style={estiloOverlay} onClick={onClose}>
      <div
        style={estiloPanel}
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
      >
        <h2 style={estiloTitulo}>Nuevo Sprint</h2>
        <form onSubmit={handleSubmit}>
          <div style={estiloGrupo}>
            <label style={estiloLabel} htmlFor='sp-nombre'>
              Nombre *
            </label>
            <input
              id='sp-nombre'
              type='text'
              placeholder='Sprint 1'
              value={form.nombre}
              onChange={(e) =>
                setForm((p) => ({ ...p, nombre: e.target.value }))
              }
              autoFocus
              style={estiloInputBase}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow =
                  '0 0 0 3px rgba(6,111,204,0.18)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          <div style={estiloFila2}>
            <div style={estiloGrupo}>
              <label style={estiloLabel} htmlFor='sp-inicio'>
                Inicio *
              </label>
              <input
                id='sp-inicio'
                type='date'
                value={form.fechaInicio}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fechaInicio: e.target.value }))
                }
                style={{ ...estiloInputBase, colorScheme: 'light' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              />
            </div>
            <div style={estiloGrupo}>
              <label style={estiloLabel} htmlFor='sp-fin'>
                Fin *
              </label>
              <input
                id='sp-fin'
                type='date'
                value={form.fechaFin}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fechaFin: e.target.value }))
                }
                style={{ ...estiloInputBase, colorScheme: 'light' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              />
            </div>
          </div>
          {error && <p style={estiloError}>{error}</p>}
          <div style={estiloAcciones}>
            <button
              type='button'
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
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
              type='submit'
              style={{
                padding: '9px 20px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#fff',
                background: 'var(--accent)',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Crear Sprint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SprintPage() {
  const [sprints, setSprints] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const cargarSprints = useCallback(async () => {
    try {
      const res = await fetch('/api/sprints');
      if (!res.ok) return;
      const data = await res.json();
      setSprints(data.map(normalizarSprint));
    } catch (e) {
      console.error('Error cargando sprints', e);
    }
  }, []);

  useEffect(() => {
    cargarSprints();
  }, [cargarSprints]);

  async function handleCrear(datos) {
    try {
      const res = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) return;
      await cargarSprints();
      setShowModal(false);
    } catch (e) {
      console.error('Error creando sprint', e);
    }
  }

  async function handleCompletar(id) {
    try {
      await fetch(`/api/sprints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: false }),
      });
      await cargarSprints();
    } catch (e) {
      console.error('Error completando sprint', e);
    }
  }

  const estiloPage = { display: 'flex', flexDirection: 'column', gap: '24px' };

  const estiloTitulo = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '1.375rem',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  };

  return (
    <div style={estiloPage}>
      <h1 style={estiloTitulo}>Sprints</h1>
      <SprintList
        sprints={sprints}
        onCreateSprint={() => setShowModal(true)}
        onCompleteSprint={handleCompletar}
      />
      {showModal && (
        <ModalNuevoSprint
          onClose={() => setShowModal(false)}
          onCrear={handleCrear}
        />
      )}
    </div>
  );
}
