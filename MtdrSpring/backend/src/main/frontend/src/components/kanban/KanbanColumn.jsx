import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import KanbanCard from './KanbanCard';
import CardSkeleton from './CardSkeleton';

function getCountColor(nombreEstatus) {
  const nombre = (nombreEstatus || '').toLowerCase().trim();
  if (nombre === 'en progreso') return 'var(--warning)';
  if (nombre === 'completada') return 'var(--success)';
  return 'var(--text-muted)';
}

export default function KanbanColumn({ estatus, tareas, onAddCard, loading = false }) {
  const { setNodeRef, isOver } = useDroppable({ id: String(estatus.idEstatus) });

  const countColor = getCountColor(estatus.nombre);

  const estiloColumna = {
    width: '280px',
    minWidth: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    flexShrink: 0,
  };

  const estiloHeader = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
    padding: '0 2px',
  };

  const estiloHeaderLeft = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const estiloNombre = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontWeight: 600,
    fontSize: '13px',
    color: 'var(--text-primary)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  };

  const estiloContador = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    padding: '0 6px',
    borderRadius: '9999px',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border)',
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: '11px',
    fontWeight: 600,
    color: countColor,
    lineHeight: 1,
  };

  const estiloBotonAgregar = {
    width: '24px',
    height: '24px',
    borderRadius: 'var(--radius-md)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: 'var(--text-muted)',
    background: 'transparent',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'color 150ms ease, border-color 150ms ease, background-color 150ms ease',
    lineHeight: 1,
    flexShrink: 0,
  };

  const estiloDropArea = {
    minHeight: '400px',
    borderRadius: 'var(--radius-lg)',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: isOver ? 'var(--accent-soft)' : '#ebedf0',
    border: `1.5px dashed ${isOver ? 'var(--accent)' : 'transparent'}`,
    transition: 'background-color 150ms ease, border-color 150ms ease',
  };

  return (
    <div style={estiloColumna}>
      <div style={estiloHeader}>
        <div style={estiloHeaderLeft}>
          <span style={estiloNombre}>{estatus.nombre}</span>
          <span style={estiloContador}>{loading ? '…' : tareas.length}</span>
        </div>
        <button
          style={estiloBotonAgregar}
          onClick={() => onAddCard && onAddCard(estatus)}
          title={`Agregar tarea a ${estatus.nombre}`}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          +
        </button>
      </div>

      <div ref={setNodeRef} style={estiloDropArea}>
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              minHeight: '120px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontFamily: "'IBM Plex Sans', sans-serif",
              textAlign: 'center',
              padding: '16px',
            }}
          >
            {isOver ? 'Soltar aquí' : 'Sin tareas'}
          </div>
        )}
      </div>
    </div>
  );
}
