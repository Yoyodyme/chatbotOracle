import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { PriorityBadge } from '../tasks/TaskBadge';

function getStatusStyle(nombre) {
  const n = (nombre || '').toLowerCase();

  if (n.includes('progress') || n.includes('progreso')) {
    return { color: '#92400E', accent: '#F59E0B', bg: '#FEF3C7' };
  }

  if (n.includes('review') || n.includes('revisión') || n.includes('revision')) {
    return { color: '#7E22CE', accent: '#a855f7', bg: '#F3E8FF' };
  }

  if (n.includes('done') || n.includes('complet')) {
    return { color: '#166534', accent: '#22C55E', bg: '#DCFCE7' };
  }

  return { color: '#2563EB', accent: '#2563EB', bg: '#EFF6FF' };
}

function getInitials(user) {
  if (!user) return '';

  const text = [
    user.nombre,
    user.apellido,
    user.apellidos,
    user.nombreCompleto,
    user.name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const parts = text.split(/\s+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function getAvatarStyle(initials) {
  const map = {
    GP: { bg: '#EFF6FF', color: '#1E40AF' },
    AL: { bg: '#FEF3C7', color: '#92400E' },
    ED: { bg: '#EDE9FE', color: '#5B21B6' },
    EG: { bg: '#FEE2E2', color: '#991B1B' },
    GS: { bg: '#DCFCE7', color: '#166534' },
  };

  return map[initials] ?? { bg: '#F9FAFB', color: '#6B7280' };
}

export default function KanbanCard({ tarea }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: String(tarea.idTarea), data: { tarea } });

  const status = getStatusStyle(tarea.estatus?.nombre);
  const initials = getInitials(tarea.usuarioAsignado);
  const avatar = getAvatarStyle(initials);

  const hasAccent =
    tarea.estatus?.nombre?.toLowerCase().includes('progress') ||
    tarea.estatus?.nombre?.toLowerCase().includes('progreso') ||
    tarea.estatus?.nombre?.toLowerCase().includes('done') ||
    tarea.estatus?.nombre?.toLowerCase().includes('complet');

  return (
    <div
      ref={setNodeRef}
      style={{
        ...styles.card,
        borderLeft: hasAccent ? `2px solid ${status.accent}` : '0.5px solid #E5E7EB',
        borderRadius: hasAccent ? '0 8px 8px 0' : 8,
        opacity: isDragging ? 0.6 : 1,
        transform: CSS.Translate.toString(transform),
        boxShadow: isDragging
          ? '0 8px 20px rgba(0,0,0,0.14)'
          : '0 1px 3px rgba(0,0,0,0.06)',
      }}
      {...attributes}
      {...listeners}
    >
      <div style={styles.topRow}>
        <span style={styles.taskId}>YD-{tarea.idTarea}</span>
        <PriorityBadge prioridad={tarea.prioridad} />
      </div>

      <p style={styles.title}>{tarea.titulo}</p>

      {tarea.sprint && (
        <div style={styles.meta}>↯ {tarea.sprint.nombre}</div>
      )}

      <div style={styles.bottomRow}>
        <span style={{ ...styles.statusText, color: status.color }}>
          <span style={{ ...styles.dot, backgroundColor: status.accent }} />
          {tarea.estatus?.nombre}
        </span>

        {initials ? (
          <span
            style={{
              ...styles.avatar,
              backgroundColor: avatar.bg,
              color: avatar.color,
            }}
          >
            {initials}
          </span>
        ) : (
          <span style={styles.emptyAvatar} />
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    cursor: 'grab',
    userSelect: 'none',
  },

  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  taskId: {
    fontSize: 10,
    fontWeight: 400,
    color: '#9CA3AF',
  },

  title: {
    margin: 0,
    fontSize: 12,
    fontWeight: 500,
    color: '#111827',
    lineHeight: 1.4,
  },

  meta: {
    fontSize: 11,
    fontWeight: 400,
    color: '#9CA3AF',
  },

  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  statusText: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 400,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },

  avatar: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 8,
    fontWeight: 600,
    flexShrink: 0,
  },

  emptyAvatar: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: '0.5px dashed #E5E7EB',
  },
};