import React, { useState, useCallback } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import useAppStore from '../../store/index';
import { updateTarea as apiUpdateTarea, createTarea } from '../../api/tareas';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import TaskForm from '../tasks/TaskForm';
import '../../styles/animations.css';

/* ── TaskFormModal ──────────────────────────────────────────────────────────── */
function TaskFormModal({ open, onClose, initialEstatus }) {
  const addTarea  = useAppStore((s) => s.addTarea);
  const addToast  = useAppStore((s) => s.addToast);

  if (!open) return null;

  async function handleSubmit(datos) {
    const estatusObj = initialEstatus
      ? { idEstatus: initialEstatus.idEstatus }
      : datos.idEstatus
      ? { idEstatus: datos.idEstatus }
      : undefined;

    try {
      const nueva = await createTarea({
        titulo:          datos.titulo,
        descripcion:     datos.descripcion,
        estatus:         estatusObj,
        prioridad:       datos.idPrioridad ? { idPrioridad: datos.idPrioridad } : undefined,
        usuarioAsignado: datos.idUsuarioAsignado ? { idUsuario: datos.idUsuarioAsignado } : null,
        fechaVencimiento: datos.fechaVencimiento || null,
      });
      addTarea(nueva);
      addToast({ id: `cre-${Date.now()}`, message: 'Task created', type: 'success' });
      onClose();
    } catch {
      addToast({ id: `err-${Date.now()}`, message: 'Error creating task', type: 'error' });
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(26,26,26,0.5)',
        zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: '520px',
          boxShadow: 'var(--shadow-md)', animation: 'scaleIn 150ms ease-out both',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 style={{
          fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600,
          fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '20px',
        }}>
          New task
          {initialEstatus && (
            <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '10px' }}>
              in {initialEstatus.nombre}
            </span>
          )}
        </h2>
        <TaskForm
          onSubmit={handleSubmit}
          onCancel={onClose}
          initialValues={initialEstatus ? { idEstatus: initialEstatus.idEstatus } : undefined}
        />
      </div>
    </div>
  );
}

/* ── LogHoursModal ──────────────────────────────────────────────────────────── */
function LogHoursModal({ open, tarea, hoursInput, onHoursChange, onConfirm, onSkip }) {
  if (!open || !tarea) return null;

  const hoursValue  = parseFloat(hoursInput);
  const hoursValid  = hoursInput !== '' && !isNaN(hoursValue) && hoursValue > 0;

  function handleConfirm() {
    onConfirm(hoursValid ? hoursValue : null);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && hoursValid) handleConfirm();
    if (e.key === 'Escape')              onSkip();
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(15,20,30,0.65)',
        zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-hours-title"
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '32px 28px 28px',
          width: '100%', maxWidth: '440px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04)',
          animation: 'scaleIn 150ms ease-out both',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Checkmark icon */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: '50%',
              backgroundColor: 'rgba(45,125,70,0.15)', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="#2d7d46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <h2
              id="log-hours-title"
              style={{
                fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600,
                fontSize: '1.0625rem', color: 'var(--text-primary)', margin: 0,
              }}
            >
              Log Time Spent
            </h2>
          </div>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.8125rem',
            color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55, paddingLeft: '42px',
          }}>
            Accurate time logs help the team measure velocity and improve future sprint estimates.
          </p>
        </div>

        {/* ── Task name pill ── */}
        <div style={{
          backgroundColor: 'var(--bg-base, #f4f6f8)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem',
            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
            display: 'block', marginBottom: '4px',
          }}>
            Task
          </span>
          <span style={{
            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.875rem',
            fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {tarea.titulo}
          </span>
        </div>

        {/* ── Hours input ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            htmlFor="log-hours-input"
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.875rem',
              fontWeight: 500, color: 'var(--text-primary)',
            }}
          >
            How long did it take to complete this task?
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              id="log-hours-input"
              type="number"
              min="0.5"
              max="99"
              step="0.5"
              placeholder="e.g. 2.5"
              value={hoursInput}
              onChange={(e) => onHoursChange(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '1rem',
                fontWeight: 500, color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '9px 12px',
                width: '110px', outline: 'none',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
                transition: 'border-color 150ms ease',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
            />
            <span style={{
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}>
              hours
            </span>
          </div>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.75rem',
            color: 'var(--text-muted)', margin: 0,
          }}>
            Use increments of 0.5 — e.g. 1, 1.5, 2, 3.5
          </p>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          <button
            onClick={handleConfirm}
            disabled={!hoursValid}
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600,
              fontSize: '0.9375rem', cursor: hoursValid ? 'pointer' : 'not-allowed',
              padding: '10px 16px', borderRadius: 'var(--radius-md)',
              border: 'none', width: '100%',
              backgroundColor: hoursValid ? 'var(--accent, #0f62fe)' : 'var(--border)',
              color: hoursValid ? '#ffffff' : 'var(--text-muted)',
              transition: 'background-color 150ms ease, opacity 150ms ease',
              opacity: hoursValid ? 1 : 0.6,
            }}
          >
            Log Hours &amp; Complete
          </button>
          <button
            onClick={onSkip}
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
              fontSize: '0.875rem', cursor: 'pointer',
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', width: '100%',
              backgroundColor: 'transparent', color: 'var(--text-secondary)',
              transition: 'background-color 150ms ease, color 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-base, #f4f6f8)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Complete without logging hours
          </button>
        </div>

      </div>
    </div>
  );
}

/* ── KanbanBoard ────────────────────────────────────────────────────────────── */
export default function KanbanBoard({ loading = false, sprintId = '' }) {
  const tareas      = useAppStore((s) => s.tareas);
  const estatuses   = useAppStore((s) => s.estatuses);
  const updateTarea = useAppStore((s) => s.updateTarea);
  const addToast    = useAppStore((s) => s.addToast);

  const tareasFiltradas = sprintId
    ? tareas.filter((t) => t.sprint && String(t.sprint.idSprint) === String(sprintId))
    : tareas;

  const [activeCard,  setActiveCard]  = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [formEstatus, setFormEstatus] = useState(null);

  // Hours modal state
  const [hoursModal, setHoursModal] = useState({ open: false, tarea: null, estatusDestino: null });
  const [hoursInput, setHoursInput] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const columnasOrdenadas = [...estatuses].sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0)
  );

  // Completed = the status with the highest orden value
  const idEstatusCompletado = columnasOrdenadas.length > 0
    ? columnasOrdenadas[columnasOrdenadas.length - 1].idEstatus
    : null;

  const tareasPorEstatus = useCallback(
    (idEstatus) => tareasFiltradas.filter((t) => t.estatus?.idEstatus === idEstatus),
    [tareasFiltradas]
  );

  function handleDragStart(event) {
    const tarea = tareasFiltradas.find((t) => String(t.idTarea) === event.active.id);
    setActiveCard(tarea ?? null);
  }

  async function handleDragEnd(event) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const idTarea          = Number(active.id);
    const idEstatusDestino = Number(over.id);

    const tarea = tareas.find((t) => t.idTarea === idTarea);
    if (!tarea) return;
    if (tarea.estatus?.idEstatus === idEstatusDestino) return;

    const estatusDestino = estatuses.find((e) => e.idEstatus === idEstatusDestino);
    if (!estatusDestino) return;

    // ── Moving to Completed → intercept and ask for hours ──
    if (idEstatusDestino === idEstatusCompletado) {
      setHoursInput('');
      setHoursModal({ open: true, tarea, estatusDestino });
      return;
    }

    // ── Any other column → proceed immediately ──
    updateTarea(idTarea, { estatus: estatusDestino });
    try {
      await apiUpdateTarea(idTarea, {
        ...tarea,
        estatus: { idEstatus: idEstatusDestino },
      });
      addToast({
        id: `move-${idTarea}-${Date.now()}`,
        message: `Task moved to "${estatusDestino.nombre}"`,
        type: 'success',
      });
    } catch {
      updateTarea(idTarea, { estatus: tarea.estatus });
      addToast({
        id: `err-${idTarea}-${Date.now()}`,
        message: 'Could not move task. Please try again.',
        type: 'error',
      });
    }
  }

  // Called when developer clicks "Log Hours & Complete" or "Complete without logging"
  async function handleCompleteTask(horasReales) {
    const { tarea, estatusDestino } = hoursModal;
    setHoursModal({ open: false, tarea: null, estatusDestino: null });

    // Optimistic update
    updateTarea(tarea.idTarea, { estatus: estatusDestino });

    try {
      await apiUpdateTarea(tarea.idTarea, {
        ...tarea,
        estatus:     { idEstatus: estatusDestino.idEstatus },
        horasReales: horasReales ?? null,
      });
      addToast({
        id:      `move-${tarea.idTarea}-${Date.now()}`,
        message: horasReales
          ? `Task completed · ${horasReales}h logged`
          : `Task moved to "${estatusDestino.nombre}"`,
        type: 'success',
      });
    } catch {
      updateTarea(tarea.idTarea, { estatus: tarea.estatus });
      addToast({
        id:      `err-${tarea.idTarea}-${Date.now()}`,
        message: 'Could not complete task. Please try again.',
        type: 'error',
      });
    }
  }

  function handleAddCard(estatus) {
    setFormEstatus(estatus);
    setShowForm(true);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{
          display: 'flex', gap: '16px',
          overflowX: 'auto', overflowY: 'visible',
          paddingBottom: '16px', alignItems: 'flex-start',
        }}>
          {columnasOrdenadas.map((estatus) => (
            <KanbanColumn
              key={estatus.idEstatus}
              estatus={estatus}
              tareas={tareasPorEstatus(estatus.idEstatus)}
              onAddCard={handleAddCard}
              loading={loading}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div style={{ opacity: 0.92, pointerEvents: 'none' }}>
              <KanbanCard tarea={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setFormEstatus(null); }}
        initialEstatus={formEstatus}
      />

      <LogHoursModal
        open={hoursModal.open}
        tarea={hoursModal.tarea}
        hoursInput={hoursInput}
        onHoursChange={setHoursInput}
        onConfirm={handleCompleteTask}
        onSkip={() => handleCompleteTask(null)}
      />
    </>
  );
}
