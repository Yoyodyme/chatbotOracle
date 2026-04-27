import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import useAppStore from '../../store/index';
import { updateTarea as apiActualizarTarea, deleteTarea as apiEliminarTarea } from '../../api/tareas';
import ConfirmDialog from '../shared/ConfirmDialog';
import Avatar from '../shared/Avatar';

import Skeleton from '../shared/Skeleton';
import '../../styles/animations.css';

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatearFechaHora(fecha) {
  if (!fecha) return '';
  try {
    const parsed = typeof fecha === 'string' ? parseISO(fecha) : new Date(fecha);
    if (!isValid(parsed)) return '';
    return format(parsed, "d MMM yyyy 'a las' HH:mm", { locale: es });
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
    <div style={{ marginBottom: '16px' }}>
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
  const updateTarea = useAppStore((s) => s.updateTarea);
  const deleteTarea = useAppStore((s) => s.deleteTarea);
  const addToast = useAppStore((s) => s.addToast);

  const [campos, setCampos] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [cargandoComentarios, setCargandoComentarios] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  useEffect(() => {
    if (!selectedTask) return;
    setCampos({
      titulo: selectedTask.titulo ?? '',
      descripcion: selectedTask.descripcion ?? '',
      idEstatus: selectedTask.estatus?.idEstatus ?? selectedTask.idEstatus ?? '',
      idPrioridad: selectedTask.prioridad?.idPrioridad ?? selectedTask.idPrioridad ?? '',
      idUsuarioAsignado: selectedTask.usuarioAsignado?.idUsuario ?? selectedTask.idUsuarioAsignado ?? '',
      fechaVencimiento: formatearFechaInput(selectedTask.fechaVencimiento),
    });
    cargarComentarios(selectedTask.idTarea);
  }, [selectedTask?.idTarea]);

  const cargarComentarios = useCallback(async (idTarea) => {
    if (!idTarea) return;
    setCargandoComentarios(true);
    try {
      const resp = await fetch(`/api/comentarios-tareas/tarea/${idTarea}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (resp.ok) {
        const datos = await resp.json();
        setComentarios(datos);
      }
    } catch (err) {
      // Fallo silencioso — la sección queda vacía
    } finally {
      setCargandoComentarios(false);
    }
  }, []);

  async function manejarGuardar() {
    if (!selectedTask || !campos) return;
    setGuardando(true);
    try {
      const payload = {
        ...selectedTask,
        titulo: campos.titulo.trim(),
        descripcion: campos.descripcion.trim() || null,
        estatus: campos.idEstatus ? { idEstatus: Number(campos.idEstatus) } : null,
        prioridad: campos.idPrioridad ? { idPrioridad: Number(campos.idPrioridad) } : null,
        usuarioAsignado: campos.idUsuarioAsignado
          ? { idUsuario: Number(campos.idUsuarioAsignado) }
          : null,
        fechaVencimiento: campos.fechaVencimiento || null,
      };
      const actualizada = await apiActualizarTarea(selectedTask.idTarea, payload);
      updateTarea(selectedTask.idTarea, actualizada ?? payload);
      addToast({ id: `upd-${Date.now()}`, type: 'success', message: 'Tarea actualizada correctamente' });
    } catch (err) {
      addToast({ id: `err-${Date.now()}`, type: 'error', message: 'Error al guardar la tarea' });
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar() {
    if (!selectedTask) return;
    try {
      await apiEliminarTarea(selectedTask.idTarea);
      deleteTarea(selectedTask.idTarea);
      addToast({ id: `del-${Date.now()}`, type: 'success', message: `Tarea EQ51-${selectedTask.idTarea} eliminada` });
      setSelectedTask(null);
    } catch (err) {
      addToast({ id: `err-${Date.now()}`, type: 'error', message: 'Error al eliminar la tarea' });
    }
    setConfirmarEliminar(false);
  }

  async function manejarEnviarComentario(e) {
    e.preventDefault();
    if (!nuevoComentario.trim() || !selectedTask) return;
    setEnviandoComentario(true);
    try {
      const resp = await fetch('/api/comentarios-tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cuerpo: nuevoComentario.trim(),
          idTarea: selectedTask.idTarea,
        }),
      });
      if (resp.ok) {
        const nuevo = await resp.json();
        setComentarios((prev) => [...prev, nuevo]);
        setNuevoComentario('');
      } else {
        addToast({ type: 'error', message: 'Error al publicar el comentario' });
      }
    } catch {
      addToast({ type: 'error', message: 'Error al publicar el comentario' });
    } finally {
      setEnviandoComentario(false);
    }
  }

  function cerrarModal() {
    setSelectedTask(null);
    setComentarios([]);
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
    maxWidth: '800px',
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

  const estiloIDHeader = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    backgroundColor: '#f7f8f9',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '3px 8px',
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
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    flex: 1,
    overflow: 'hidden',
  };

  const estiloColumnaIzq = {
    padding: '20px 22px',
    overflowY: 'auto',
    borderRight: '1px solid var(--border)',
  };

  const estiloColumnaDer = {
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
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

  const estiloSeccionComentarios = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  };

  const estiloTituloSeccion = {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '12px',
  };

  const estiloListaComentarios = {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '14px',
    minHeight: 0,
    maxHeight: '280px',
  };

  const estiloItemComentario = {
    backgroundColor: '#f7f8f9',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
  };

  const estiloAutorComentario = {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    marginBottom: '5px',
  };

  const estiloNombreAutor = {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  };

  const estiloFechaComentario = {
    fontSize: '0.7rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    marginLeft: 'auto',
  };

  const estiloCuerpoComentario = {
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  };

  return (
    <>
      <div style={estiloOverlay} onClick={cerrarModal}>
        <div style={estiloCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          {/* Header */}
          <div style={estiloHeader}>
            <span style={estiloIDHeader}>EQ51-{selectedTask.idTarea}</span>
            <span style={estiloTituloHeader}>{campos.titulo || selectedTask.titulo}</span>
            <button
              style={estiloBotonCerrar}
              onClick={cerrarModal}
              aria-label="Cerrar"
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

          {/* Cuerpo en dos columnas */}
          <div style={estiloCuerpo}>
            {/* Columna izquierda — formulario de edición */}
            <div style={estiloColumnaIzq}>
              <CampoEditable label="Título">
                <InputFocusable
                  type="text"
                  value={campos.titulo}
                  onChange={(e) => setCampos((p) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Título de la tarea"
                  maxLength={200}
                />
              </CampoEditable>

              <CampoEditable label="Descripción">
                <TextareaFocusable
                  value={campos.descripcion}
                  onChange={(e) => setCampos((p) => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Descripción detallada..."
                  style={{ minHeight: '100px' }}
                />
              </CampoEditable>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <CampoEditable label="Estatus">
                  <SelectFocusable
                    value={campos.idEstatus}
                    onChange={(e) => setCampos((p) => ({ ...p, idEstatus: e.target.value }))}
                  >
                    <option value="">Sin estatus</option>
                    {(estatuses || []).map((est) => (
                      <option key={est.idEstatus} value={est.idEstatus}>
                        {est.nombre}
                      </option>
                    ))}
                  </SelectFocusable>
                </CampoEditable>

                <CampoEditable label="Prioridad">
                  <SelectFocusable
                    value={campos.idPrioridad}
                    onChange={(e) => setCampos((p) => ({ ...p, idPrioridad: e.target.value }))}
                  >
                    <option value="">Sin prioridad</option>
                    {(prioridades || []).map((pri) => (
                      <option key={pri.idPrioridad} value={pri.idPrioridad}>
                        {pri.nombre}
                      </option>
                    ))}
                  </SelectFocusable>
                </CampoEditable>
              </div>

              <CampoEditable label="Asignado a">
                <SelectFocusable
                  value={campos.idUsuarioAsignado}
                  onChange={(e) => setCampos((p) => ({ ...p, idUsuarioAsignado: e.target.value }))}
                >
                  <option value="">Sin asignar</option>
                  {(usuarios || []).map((usr) => (
                    <option key={usr.idUsuario} value={usr.idUsuario}>
                      {usr.nombreCompleto || usr.nombreUsuario}
                    </option>
                  ))}
                </SelectFocusable>
              </CampoEditable>

              <CampoEditable label="Fecha de vencimiento">
                <InputFocusable
                  type="date"
                  value={campos.fechaVencimiento}
                  onChange={(e) => setCampos((p) => ({ ...p, fechaVencimiento: e.target.value }))}
                  style={{ colorScheme: 'light' }}
                />
              </CampoEditable>

              {/* Fechas de auditoría */}
              {selectedTask.creadoEn && (
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Creado: {formatearFechaHora(selectedTask.creadoEn)}
                </div>
              )}
            </div>

            {/* Columna derecha — comentarios */}
            <div style={estiloColumnaDer}>
              <div style={estiloSeccionComentarios}>
                <p style={estiloTituloSeccion}>Comentarios</p>

                <div style={estiloListaComentarios}>
                  {cargandoComentarios ? (
                    <>
                      <Skeleton height="60px" borderRadius="4px" />
                      <Skeleton height="60px" borderRadius="4px" />
                    </>
                  ) : comentarios.length === 0 ? (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                      Sin comentarios aún
                    </p>
                  ) : (
                    comentarios.map((com, idx) => (
                      <div key={com.idComentario ?? idx} style={estiloItemComentario}>
                        <div style={estiloAutorComentario}>
                          {com.usuarioAutor && <Avatar user={com.usuarioAutor} size="sm" />}
                          <span style={estiloNombreAutor}>
                            {com.usuarioAutor?.nombreUsuario ?? 'Desconocido'}
                          </span>
                          <span style={estiloFechaComentario}>
                            {formatearFechaHora(com.creadoEn)}
                          </span>
                        </div>
                        <p style={estiloCuerpoComentario}>{com.cuerpo}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Nuevo comentario */}
                <form onSubmit={manejarEnviarComentario} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <TextareaFocusable
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    placeholder="Escribe un comentario..."
                    style={{ minHeight: '72px', fontSize: '0.875rem' }}
                  />
                  <button
                    type="submit"
                    disabled={!nuevoComentario.trim() || enviandoComentario}
                    style={{
                      alignSelf: 'flex-end',
                      padding: '7px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#fff',
                      background: 'var(--accent)',
                      border: 'none',
                      cursor: !nuevoComentario.trim() || enviandoComentario ? 'not-allowed' : 'pointer',
                      opacity: !nuevoComentario.trim() || enviandoComentario ? 0.5 : 1,
                      transition: 'opacity 100ms',
                    }}
                  >
                    {enviandoComentario ? 'Enviando…' : 'Comentar'}
                  </button>
                </form>
              </div>
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
              Eliminar tarea
            </button>
            <button
              style={estiloBotonGuardar}
              onClick={manejarGuardar}
              disabled={guardando}
              onMouseEnter={(e) => { if (!guardando) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = guardando ? '0.7' : '1'; }}
            >
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmarEliminar}
        title="Eliminar tarea"
        message={`¿Estás seguro de que deseas eliminar la tarea EQ51-${selectedTask.idTarea}? Esta acción no se puede deshacer.`}
        onConfirm={manejarEliminar}
        onCancel={() => setConfirmarEliminar(false)}
        confirmLabel="Eliminar"
        dangerous={true}
      />
    </>
  );
}
