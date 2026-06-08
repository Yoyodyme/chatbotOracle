import React, { useState, useEffect } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import useAppStore from '../../store/index';
import { updateTarea as apiActualizarTarea, deleteTarea as apiEliminarTarea } from '../../api/tareas';
import { getSprints } from '../../api/sprints';
import ConfirmDialog from '../shared/ConfirmDialog';
import '../../styles/animations.css';

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatearFechaHora(fecha) {
  if (!fecha) return '';
  try {
    const parsed = typeof fecha === 'string' ? parseISO(fecha) : new Date(fecha);
    if (!isValid(parsed)) return '';
    return format(parsed, "MMM d, yyyy 'at' HH:mm");
  } catch {
    return '';
  }
}

function formatearFechaInput(fecha) {
  if (!fecha) return '';
  try {
    const parsed = typeof fecha === 'string' ? parseISO(fecha) : new Date(fecha);
    if (!isValid(parsed)) return '';
    return format(parsed, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

// ── Estilos compartidos ──────────────────────────────────────────────────────
const ESTILO_INPUT = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.9375rem',
  color: 'var(--text-primary)',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
  appearance: 'none',
  WebkitAppearance: 'none',
};

const ESTILO_INPUT_FOCUS = {
  borderColor: 'var(--accent)',
  boxShadow: '0 0 0 3px rgba(6,111,204,0.18)',
};

const ESTILO_LABEL = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '5px',
  display: 'block',
};

function CampoEditable({ label, children }) {
  return (
    <div>
      <label style={ESTILO_LABEL}>{label}</label>
      {children}
    </div>
  );
}

function InputFocusable({ style = {}, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...ESTILO_INPUT, ...style, ...(focused ? ESTILO_INPUT_FOCUS : {}) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function TextareaFocusable({ style = {}, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      style={{
        ...ESTILO_INPUT,
        minHeight: '80px',
        resize: 'vertical',
        ...style,
        ...(focused ? ESTILO_INPUT_FOCUS : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function SelectFocusable({ style = {}, children, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        ...ESTILO_INPUT,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238d8d8d' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: '32px',
        cursor: 'pointer',
        ...style,
        ...(focused ? ESTILO_INPUT_FOCUS : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function TaskDetailModal() {
  const selectedTask = useAppStore((s) => s.selectedTask);
  const setSelectedTask = useAppStore((s) => s.setSelectedTask);
  const estatuses = useAppStore((s) => s.estatuses);
  const prioridades = useAppStore((s) => s.prioridades);
  const usuarios = useAppStore((s) => s.usuarios);
  const storeSprints = useAppStore((s) => s.sprints);
  const setStoreSprints = useAppStore((s) => s.setSprints);
  const updateTarea = useAppStore((s) => s.updateTarea);
  const deleteTarea = useAppStore((s) => s.deleteTarea);
  const addToast = useAppStore((s) => s.addToast);

  const [campos, setCampos] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  // Load sprints once (use store cache)
  useEffect(() => {
    if (storeSprints.length > 0) {
      setSprints(storeSprints);
      return;
    }
    getSprints()
      .then((data) => {
        const lista = data ?? [];
        setSprints(lista);
        setStoreSprints(lista);
      })
      .catch(() => {});
  }, []);

  // Sync store sprints into local state when store updates
  useEffect(() => {
    if (storeSprints.length > 0) setSprints(storeSprints);
  }, [storeSprints]);

  useEffect(() => {
    if (!selectedTask) return;
    setCampos({
      titulo: selectedTask.titulo ?? '',
      descripcion: selectedTask.descripcion ?? '',
      idEstatus: selectedTask.estatus?.idEstatus ?? selectedTask.idEstatus ?? '',
      idPrioridad: selectedTask.prioridad?.idPrioridad ?? selectedTask.idPrioridad ?? '',
      idUsuarioAsignado: selectedTask.usuarioAsignado?.idUsuario ?? selectedTask.idUsuarioAsignado ?? '',
      fechaVencimiento: formatearFechaInput(selectedTask.fechaVencimiento),
      idSprint: selectedTask.sprint?.idSprint ?? selectedTask.idSprint ?? '',
      horasEstimadas: selectedTask.horasEstimadas ?? '',
      horasReales: selectedTask.horasReales ?? '',
    });
  }, [selectedTask?.idTarea]);

  async function manejarGuardar() {
    if (!selectedTask || !campos) return;
    setGuardando(true);

    // Resolve full nested objects from local catalogs so display is instant
    const estatusObj  = campos.idEstatus
      ? (estatuses.find(e => e.idEstatus === Number(campos.idEstatus)) ?? { idEstatus: Number(campos.idEstatus) })
      : null;
    const prioridadObj = campos.idPrioridad
      ? (prioridades.find(p => p.idPrioridad === Number(campos.idPrioridad)) ?? { idPrioridad: Number(campos.idPrioridad) })
      : null;
    const usuarioObj  = campos.idUsuarioAsignado
      ? (usuarios.find(u => u.idUsuario === Number(campos.idUsuarioAsignado)) ?? { idUsuario: Number(campos.idUsuarioAsignado) })
      : null;
    const sprintObj   = campos.idSprint
      ? (sprints.find(s => s.idSprint === Number(campos.idSprint)) ?? { idSprint: Number(campos.idSprint) })
      : null;

    // Payload sent to the API (IDs only, as the backend expects)
    const payload = {
      ...selectedTask,
      titulo:           campos.titulo.trim(),
      descripcion:      campos.descripcion.trim() || null,
      estatus:          campos.idEstatus ? { idEstatus: Number(campos.idEstatus) } : null,
      prioridad:        campos.idPrioridad ? { idPrioridad: Number(campos.idPrioridad) } : null,
      usuarioAsignado:  campos.idUsuarioAsignado ? { idUsuario: Number(campos.idUsuarioAsignado) } : null,
      fechaVencimiento: campos.fechaVencimiento || null,
      sprint:           campos.idSprint ? { idSprint: Number(campos.idSprint) } : null,
      horasEstimadas:   campos.horasEstimadas !== '' ? Number(campos.horasEstimadas) : null,
      horasReales:      campos.horasReales !== '' ? Number(campos.horasReales) : null,
    };

    // Optimistic update — store gets full display objects immediately, modal closes
    updateTarea(selectedTask.idTarea, { ...payload, estatus: estatusObj, prioridad: prioridadObj, usuarioAsignado: usuarioObj, sprint: sprintObj });
    cerrarModal();

    try {
      const actualizada = await apiActualizarTarea(selectedTask.idTarea, payload);
      // If the API returns richer data (e.g. server-computed fields), apply it
      if (actualizada) updateTarea(selectedTask.idTarea, actualizada);
      addToast({ id: `upd-${Date.now()}`, type: 'success', message: 'Task updated successfully' });
    } catch {
      // Rollback to the original task on failure
      updateTarea(selectedTask.idTarea, selectedTask);
      addToast({ id: `err-${Date.now()}`, type: 'error', message: 'Error saving task — changes reverted' });
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar() {
    if (!selectedTask) return;
    try {
      await apiEliminarTarea(selectedTask.idTarea);
      deleteTarea(selectedTask.idTarea);
      addToast({ id: `del-${Date.now()}`, type: 'success', message: `Task YD-${selectedTask.idTarea} deleted` });
      setSelectedTask(null);
    } catch {
      addToast({ id: `err-${Date.now()}`, type: 'error', message: 'Error deleting task' });
    }
    setConfirmarEliminar(false);
  }

  function cerrarModal() {
    setSelectedTask(null);
    setCampos(null);
  }

  useEffect(() => {
    if (!selectedTask) return;
    const handler = (e) => { if (e.key === 'Escape') cerrarModal(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedTask]);

  if (!selectedTask || !campos) return null;

  // ── Estilos ────────────────────────────────────────────────────────────────
  const estiloOverlay = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    overflowY: 'auto',
  };

  const estiloCard = {
    width: '100%',
    maxWidth: '520px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    animation: 'scaleIn 150ms ease-out both',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 32px)',
    overflow: 'hidden',
  };

  const estiloHeader = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '18px 22px 16px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  };

  const estiloTituloHeader = {
    flex: 1,
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '1.0625rem',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const estiloCuerpo = {
    flex: 1,
    overflow: 'hidden',
  };

  const estiloColumnaIzq = {
    padding: '20px 22px',
    overflowY: 'auto',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    alignItems: 'stretch',
  };

  const estiloFooter = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 22px',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
    backgroundColor: 'var(--bg-surface)',
  };

  const estiloBotonGuardar = {
    padding: '9px 20px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    background: 'var(--accent)',
    border: 'none',
    cursor: guardando ? 'not-allowed' : 'pointer',
    opacity: guardando ? 0.7 : 1,
    transition: 'opacity 100ms',
  };

  const estiloBotonEliminar = {
    padding: '9px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--danger)',
    background: 'rgba(218,30,40,0.08)',
    border: '1px solid rgba(218,30,40,0.25)',
    cursor: 'pointer',
    transition: 'opacity 100ms',
  };

  const estiloBotonCerrar = {
    width: 30,
    height: 30,
    borderRadius: 'var(--radius-md)',
    fontSize: '18px',
    color: 'var(--text-muted)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'color 100ms, background-color 100ms',
  };

  return (
    <>
      <div style={estiloOverlay} onClick={cerrarModal}>
        <div style={estiloCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          {/* Header */}
          <div style={estiloHeader}>
            <span style={estiloTituloHeader}>{campos.titulo || selectedTask.titulo}</span>
            <button
              style={estiloBotonCerrar}
              onClick={cerrarModal}
              aria-label="Close"
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

          {/* Body */}
          <div style={estiloCuerpo}>
            <div style={estiloColumnaIzq}>
              <CampoEditable label="Title">
                <InputFocusable
                  type="text"
                  value={campos.titulo}
                  onChange={(e) => setCampos((p) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Task title"
                  maxLength={200}
                />
              </CampoEditable>

              <CampoEditable label="Description">
                <TextareaFocusable
                  value={campos.descripcion}
                  onChange={(e) => setCampos((p) => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Detailed description..."
                  style={{ minHeight: '100px' }}
                />
              </CampoEditable>

              <CampoEditable label="Priority">
                <SelectFocusable
                  value={campos.idPrioridad}
                  onChange={(e) => setCampos((p) => ({ ...p, idPrioridad: e.target.value }))}
                >
                  <option value="">No priority</option>
                  {(prioridades || []).map((pri) => (
                    <option key={pri.idPrioridad} value={pri.idPrioridad}>
                      {pri.nombre}
                    </option>
                  ))}
                </SelectFocusable>
              </CampoEditable>

              <CampoEditable label="Assigned to">
                <SelectFocusable
                  value={campos.idUsuarioAsignado}
                  onChange={(e) => setCampos((p) => ({ ...p, idUsuarioAsignado: e.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {(usuarios || []).map((usr) => (
                    <option key={usr.idUsuario} value={usr.idUsuario}>
                      {usr.nombreCompleto || usr.nombreUsuario}
                    </option>
                  ))}
                </SelectFocusable>
              </CampoEditable>

              <CampoEditable label="Sprint">
                <SelectFocusable
                  value={campos.idSprint}
                  onChange={(e) => setCampos((p) => ({ ...p, idSprint: e.target.value }))}
                >
                  <option value="">No sprint</option>
                  {sprints.map((sp) => (
                    <option key={sp.idSprint} value={sp.idSprint}>
                      {sp.nombre}
                    </option>
                  ))}
                </SelectFocusable>
              </CampoEditable>

              <CampoEditable label="Due date">
                <InputFocusable
                  type="date"
                  value={campos.fechaVencimiento}
                  onChange={(e) => setCampos((p) => ({ ...p, fechaVencimiento: e.target.value }))}
                  style={{ colorScheme: 'light' }}
                />
              </CampoEditable>

              <CampoEditable label="Estimated hours">
                <InputFocusable
                  type="number"
                  min="0"
                  step="0.5"
                  value={campos.horasEstimadas}
                  onChange={(e) => setCampos((p) => ({ ...p, horasEstimadas: e.target.value }))}
                  placeholder="0"
                />
              </CampoEditable>

              {/* Audit dates */}
              {selectedTask.creadoEn && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Created: {formatearFechaHora(selectedTask.creadoEn)}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={estiloFooter}>
            <button
              style={estiloBotonEliminar}
              onClick={() => setConfirmarEliminar(true)}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Delete task
            </button>
            <button
              style={estiloBotonGuardar}
              onClick={manejarGuardar}
              disabled={guardando}
              onMouseEnter={(e) => { if (!guardando) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = guardando ? '0.7' : '1'; }}
            >
              {guardando ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmarEliminar}
        title="Delete task"
        message={`Are you sure you want to delete task YD-${selectedTask.idTarea}? This action cannot be undone.`}
        onConfirm={manejarEliminar}
        onCancel={() => setConfirmarEliminar(false)}
        confirmLabel="Delete"
        dangerous={true}
      />
    </>
  );
}
