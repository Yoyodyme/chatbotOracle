import React, { useState, useCallback } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import useAppStore from '../../store/index';
import { updateTarea as apiUpdateTarea, createTarea } from '../../api/tareas';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import TaskForm from '../tasks/TaskForm';
import '../../styles/animations.css';

/* Modal wrapper alrededor del TaskForm existente */
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
        prioridad: datos.idPrioridad ? { idPrioridad: datos.idPrioridad } : undefined,
        usuarioAsignado: datos.idUsuarioAsignado
          ? { idUsuario: datos.idUsuarioAsignado }
          : null,
        fechaVencimiento: datos.fechaVencimiento || null,
      });
      addTarea(nueva);
      addToast({ id: `cre-${Date.now()}`, message: 'Tarea creada', type: 'success' });
      onClose();
    } catch (err) {
      addToast({ id: `err-${Date.now()}`, message: 'Error al crear la tarea', type: 'error' });
    }
  }

  const estiloOverlay = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(26,26,26,0.5)',
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
    maxWidth: '520px',
    boxShadow: 'var(--shadow-md)',
    animation: 'scaleIn 150ms ease-out both',
  };

  const estiloTitulo = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontWeight: 600,
    fontSize: '1.125rem',
    color: 'var(--text-primary)',
    marginBottom: '20px',
  };

  return (
    <div style={estiloOverlay} onClick={onClose}>
      <div style={estiloPanel} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 style={estiloTitulo}>
          Nueva tarea
          {initialEstatus && (
            <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '10px' }}>
              en {initialEstatus.nombre}
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

export default function KanbanBoard({ loading = false }) {
  const tareas = useAppStore((s) => s.tareas);
  const estatuses = useAppStore((s) => s.estatuses);
  const updateTarea = useAppStore((s) => s.updateTarea);
  const addToast = useAppStore((s) => s.addToast);

  const [activeCard, setActiveCard] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formEstatus, setFormEstatus] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const columnasOrdenadas = [...estatuses].sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0)
  );

  const tareasPorEstatus = useCallback(
    (idEstatus) => tareas.filter((t) => t.estatus?.idEstatus === idEstatus),
    [tareas]
  );

  function handleDragStart(event) {
    const tarea = tareas.find((t) => String(t.idTarea) === event.active.id);
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

    const estatusDestino = estatuses.find((e) => e.idEstatus === idEstatusDestino);
    if (!estatusDestino) return;

    // Optimistic update
    updateTarea(idTarea, { estatus: estatusDestino });

    try {
      await apiUpdateTarea(idTarea, {
        ...tarea,
        estatus: { idEstatus: idEstatusDestino },
      });
      addToast({
        id: `move-${idTarea}-${Date.now()}`,
        message: `Tarea movida a "${estatusDestino.nombre}"`,
        type: 'success',
      });
    } catch (err) {
      // Revert on failure
      updateTarea(idTarea, { estatus: tarea.estatus });
      addToast({
        id: `err-${idTarea}-${Date.now()}`,
        message: 'No se pudo mover la tarea. Intenta de nuevo.',
        type: 'error',
      });
    }
  }

  function handleAddCard(estatus) {
    setFormEstatus(estatus);
    setShowForm(true);
  }

  const estiloContenedor = {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    overflowY: 'visible',
    paddingBottom: '16px',
    alignItems: 'flex-start',
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={estiloContenedor}>
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
    </>
  );
}
