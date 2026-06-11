import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import KanbanCard from './KanbanCard';
import CardSkeleton from './CardSkeleton';

function getStatusColor(nombre) {
  const n = (nombre || '').toLowerCase();

  if (n.includes('progress') || n.includes('progreso')) return '#F59E0B';
  if (n.includes('review') || n.includes('revisión') || n.includes('revision')) return '#a855f7';
  if (n.includes('done') || n.includes('complet')) return '#22C55E';
  return '#2563EB';
}

export default function KanbanColumn({ estatus, tareas, onAddCard, loading = false }) {
  const { setNodeRef, isOver } = useDroppable({ id: String(estatus.idEstatus) });
  const color = getStatusColor(estatus.nombre);

  return (
    <div style={styles.column}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.name}>{estatus.nombre}</span>
          <span
            style={{
              ...styles.counter,
              backgroundColor: `${color}14`,
              color,
            }}
          >
            {loading ? '…' : tareas.length}
          </span>
        </div>

        <button
          style={styles.addButton}
          onClick={() => onAddCard && onAddCard(estatus)}
        >
          +
        </button>
      </div>

      <div
        ref={setNodeRef}
        style={{
          ...styles.dropArea,
          borderColor: isOver ? color : '#E5E7EB',
          backgroundColor: isOver ? `${color}0D` : '#F9FAFB',
        }}
      >
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          tareas.map((tarea) => (
            <KanbanCard key={tarea.idTarea} tarea={tarea} />
          ))
        )}

        {!loading && tareas.length === 0 && (
          <div style={styles.empty}>
            {isOver ? 'Drop here' : 'No tasks'}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  column: {
    width: 280,
    minWidth: 280,
    flexShrink: 0,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  name: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
  },

  counter: {
    borderRadius: 20,
    padding: '1px 7px',
    fontSize: 10,
    fontWeight: 500,
  },

  addButton: {
    border: 'none',
    background: 'transparent',
    color: '#111827',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },

  dropArea: {
    minHeight: 460,
    borderRadius: 10,
    padding: 10,
    border: '0.5px solid #E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    transition: 'background-color 0.15s, border-color 0.15s',
  },

  empty: {
    flex: 1,
    minHeight: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9CA3AF',
    fontSize: 12,
  },
};