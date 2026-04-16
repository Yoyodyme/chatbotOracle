import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { PriorityBadge, StatusBadge } from '../tasks/TaskBadge';
import Avatar from '../shared/Avatar';

export default function KanbanCard({ tarea }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: String(tarea.idTarea), data: { tarea } });

  const estiloCard = {
    backgroundColor: 'var(--bg-surface)',
    border: `1px solid ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Translate.toString(transform),
    scale: isDragging ? '1.03' : '1',
    boxShadow: isDragging
      ? '0 8px 24px rgba(0,0,0,0.15), 0 0 0 2px var(--accent)'
      : 'var(--shadow-sm)',
    transition: isDragging
      ? 'none'
      : 'background-color 150ms ease, box-shadow 150ms ease, border-color 150ms ease, transform 150ms ease',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  const estiloTopRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '6px',
  };

  const estiloId = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
    flexShrink: 0,
  };

  const estiloTitulo = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    lineHeight: '1.45',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    margin: 0,
  };

  const estiloBottomRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '6px',
    marginTop: '2px',
  };

  return (
    <div
      ref={setNodeRef}
      style={estiloCard}
      {...attributes}
      {...listeners}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <div style={estiloTopRow}>
        <span style={estiloId}>EQ51-{tarea.idTarea}</span>
        <PriorityBadge prioridad={tarea.prioridad} />
      </div>

      <p style={estiloTitulo}>{tarea.titulo}</p>

      <div style={estiloBottomRow}>
        <StatusBadge estatus={tarea.estatus} />
        {tarea.usuarioAsignado ? (
          <Avatar user={tarea.usuarioAsignado} size="sm" />
        ) : (
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '1.5px dashed var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title="Sin asignar"
          />
        )}
      </div>
    </div>
  );
}
