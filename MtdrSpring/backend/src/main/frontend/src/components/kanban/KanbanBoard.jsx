import React, { useState, useCallback } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import useAppStore from '../../store/index';
import { updateTarea as apiUpdateTarea, createTarea } from '../../api/tareas';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import TaskForm from '../tasks/TaskForm';
import '../../styles/animations.css';

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function TaskFormModal({ open, onClose, initialEstatus }) {
  const addTarea = useAppStore((s) => s.addTarea);
  const addToast = useAppStore((s) => s.addToast);

  if (!open) return null;

  async function handleSubmit(datos) {
    const estatusObj = initialEstatus
      ? { idEstatus: initialEstatus.idEstatus }
      : datos.idEstatus
        ? { idEstatus: datos.idEstatus }
        : undefined;

    try {
      const nueva = await createTarea({
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        estatus: estatusObj,
        prioridad: datos.idPrioridad
          ? { idPrioridad: datos.idPrioridad }
          : undefined,
        usuarioAsignado: datos.idUsuarioAsignado
          ? { idUsuario: datos.idUsuarioAsignado }
          : null,
        fechaVencimiento: datos.fechaVencimiento || null,
      });

      addTarea(nueva);
      addToast({
        id: `cre-${Date.now()}`,
        message: 'Task created',
        type: 'success',
      });
      onClose();
    } catch {
      addToast({
        id: `err-${Date.now()}`,
        message: 'Error creating task',
        type: 'error',
      });
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        style={styles.taskModal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 style={styles.modalTitle}>
          New task
          {initialEstatus && (
            <span style={styles.modalSubtitle}>
              in {initialEstatus.nombre}
            </span>
          )}
        </h2>

        <TaskForm
          onSubmit={handleSubmit}
          onCancel={onClose}
          initialValues={
            initialEstatus
              ? { idEstatus: initialEstatus.idEstatus }
              : undefined
          }
        />
      </div>
    </div>
  );
}

function LogHoursModal({
  open,
  tarea,
  hoursInput,
  onHoursChange,
  onConfirm,
  onSkip,
}) {
  if (!open || !tarea) return null;

  const hoursValue = parseFloat(hoursInput);
  const hoursValid = hoursInput !== '' && !isNaN(hoursValue) && hoursValue > 0;

  function handleConfirm() {
    onConfirm(hoursValid ? hoursValue : null);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && hoursValid) handleConfirm();
    if (e.key === 'Escape') onSkip();
  }

  return (
    <div
      style={styles.logModalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-hours-title"
    >
      <div style={styles.logModal}>
        <div style={styles.logHeader}>
          <div style={styles.logTitleRow}>
            <span style={styles.checkIcon}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22C55E"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>

            <h2 id="log-hours-title" style={styles.logTitle}>
              Log Time Spent
            </h2>
          </div>

          <p style={styles.logDescription}>
            Accurate time logs help the team measure velocity and improve future
            sprint estimates.
          </p>
        </div>

        <div style={styles.taskPill}>
          <span style={styles.taskLabel}>Task</span>
          <span style={styles.taskName}>{tarea.titulo}</span>
        </div>

        <div style={styles.inputGroup}>
          <label htmlFor="log-hours-input" style={styles.inputLabel}>
            How long did it take to complete this task?
          </label>

          <div style={styles.inputRow}>
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
              style={styles.hoursInput}
              onFocus={(e) => {
                e.target.style.borderColor = '#DC2626';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
              }}
            />

            <span style={styles.hoursText}>hours</span>
          </div>

          <p style={styles.helperText}>
            Use increments of 0.5 — e.g. 1, 1.5, 2, 3.5
          </p>
        </div>

        <div style={styles.modalActions}>
          <button
            onClick={handleConfirm}
            disabled={!hoursValid}
            style={{
              ...styles.primaryButton,
              cursor: hoursValid ? 'pointer' : 'not-allowed',
              backgroundColor: hoursValid ? '#DC2626' : '#E5E7EB',
              color: hoursValid ? '#FFFFFF' : '#9CA3AF',
              boxShadow: hoursValid
                ? '0 1px 3px rgba(220,38,38,0.3)'
                : 'none',
            }}
          >
            Log Hours &amp; Complete
          </button>

          <button onClick={onSkip} style={styles.secondaryButton}>
            Complete without logging hours
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KanbanBoard({
  loading = false,
  sprintId = '',
  developerFilter = null,
}) {
  const tareas = useAppStore((s) => s.tareas);
  const estatuses = useAppStore((s) => s.estatuses);
  const updateTarea = useAppStore((s) => s.updateTarea);
  const addToast = useAppStore((s) => s.addToast);

  const tareasFiltradas = tareas.filter((t) => {
    const coincideSprint = sprintId
      ? t.sprint && String(t.sprint.idSprint) === String(sprintId)
      : true;

    const nombreUsuario =
      t.usuarioAsignado?.nombre ||
      t.usuarioAsignado?.name ||
      t.usuarioAsignado?.nombreCompleto ||
      '';

    const apellidosUsuario =
      t.usuarioAsignado?.apellido ||
      t.usuarioAsignado?.apellidos ||
      '';

    const partes = `${nombreUsuario} ${apellidosUsuario}`
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const iniciales = partes
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');

    const coincideDeveloper = developerFilter
      ? iniciales === developerFilter
      : true;

    return coincideSprint && coincideDeveloper;
  });

  const [activeCard, setActiveCard] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formEstatus, setFormEstatus] = useState(null);

  const [hoursModal, setHoursModal] = useState({
    open: false,
    tarea: null,
    estatusDestino: null,
  });
  const [hoursInput, setHoursInput] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const columnasOrdenadas = [...estatuses].sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0)
  );

  const idEstatusCompletado =
    columnasOrdenadas.length > 0
      ? columnasOrdenadas[columnasOrdenadas.length - 1].idEstatus
      : null;

  const tareasPorEstatus = useCallback(
    (idEstatus) =>
      tareasFiltradas.filter((t) => t.estatus?.idEstatus === idEstatus),
    [tareasFiltradas]
  );

  function handleDragStart(event) {
    const tarea = tareasFiltradas.find(
      (t) => String(t.idTarea) === event.active.id
    );
    setActiveCard(tarea ?? null);
  }

  async function handleDragEnd(event) {
    setActiveCard(null);

    const { active, over } = event;
    if (!over) return;

    const idTarea = Number(active.id);
    const idEstatusDestino = Number(over.id);

    const tarea = tareas.find((t) => t.idTarea === idTarea);
    if (!tarea) return;
    if (tarea.estatus?.idEstatus === idEstatusDestino) return;

    const estatusDestino = estatuses.find(
      (e) => e.idEstatus === idEstatusDestino
    );
    if (!estatusDestino) return;

    if (idEstatusDestino === idEstatusCompletado) {
      setHoursInput('');
      setHoursModal({ open: true, tarea, estatusDestino });
      return;
    }

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

  async function handleCompleteTask(horasReales) {
    const { tarea, estatusDestino } = hoursModal;

    if (!tarea || !estatusDestino) return;

    setHoursModal({
      open: false,
      tarea: null,
      estatusDestino: null,
    });

    updateTarea(tarea.idTarea, { estatus: estatusDestino });

    try {
      await apiUpdateTarea(tarea.idTarea, {
        ...tarea,
        estatus: { idEstatus: estatusDestino.idEstatus },
        horasReales: horasReales ?? null,
      });

      addToast({
        id: `move-${tarea.idTarea}-${Date.now()}`,
        message: horasReales
          ? `Task completed · ${horasReales}h logged`
          : `Task moved to "${estatusDestino.nombre}"`,
        type: 'success',
      });
    } catch {
      updateTarea(tarea.idTarea, { estatus: tarea.estatus });

      addToast({
        id: `err-${tarea.idTarea}-${Date.now()}`,
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
        <div style={styles.boardWrapper}>
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
            <div style={styles.dragOverlay}>
              <KanbanCard tarea={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setFormEstatus(null);
        }}
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

const styles = {
  boardWrapper: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    overflowY: 'visible',
    padding: '0 0 14px',
    alignItems: 'flex-start',
  },

  dragOverlay: {
    opacity: 0.94,
    pointerEvents: 'none',
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(17,24,39,0.45)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  taskModal: {
    fontFamily: FONT,
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 520,
    boxShadow: '0 24px 48px rgba(15,23,42,0.18)',
    animation: 'scaleIn 150ms ease-out both',
  },

  modalTitle: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 14,
    color: '#111827',
    margin: '0 0 16px',
  },

  modalSubtitle: {
    fontSize: 11,
    fontWeight: 400,
    color: '#9CA3AF',
    marginLeft: 8,
  },

  logModalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(17,24,39,0.55)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  logModal: {
    fontFamily: FONT,
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 24px 48px rgba(0,0,0,0.24)',
    animation: 'scaleIn 150ms ease-out both',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  logHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },

  logTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  checkIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: '#DCFCE7',
    flexShrink: 0,
  },

  logTitle: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 14,
    color: '#111827',
    margin: 0,
  },

  logDescription: {
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: 400,
    color: '#9CA3AF',
    margin: 0,
    lineHeight: 1.5,
    paddingLeft: 38,
  },

  taskPill: {
    backgroundColor: '#F9FAFB',
    border: '0.5px solid #E5E7EB',
    borderRadius: 10,
    padding: '10px 12px',
  },

  taskLabel: {
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: 400,
    color: '#9CA3AF',
    display: 'block',
    marginBottom: 4,
  },

  taskName: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },

  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  inputLabel: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
  },

  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  hoursInput: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    borderRadius: 6,
    padding: '7px 10px',
    width: 100,
    outline: 'none',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
    transition: 'border-color 150ms ease',
  },

  hoursText: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 400,
    color: '#6B7280',
  },

  helperText: {
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: 400,
    color: '#9CA3AF',
    margin: 0,
  },

  modalActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 4,
  },

  primaryButton: {
    fontFamily: FONT,
    fontWeight: 500,
    fontSize: 12,
    padding: '6px 13px',
    borderRadius: 6,
    border: 'none',
    width: '100%',
    transition: 'background-color 150ms ease, opacity 150ms ease',
  },

  secondaryButton: {
    fontFamily: FONT,
    fontWeight: 500,
    fontSize: 12,
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: 6,
    border: '0.5px solid #E5E7EB',
    width: '100%',
    backgroundColor: '#FFFFFF',
    color: '#6B7280',
  },
};