import React, { useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import Avatar from '../shared/Avatar';
import { PriorityBadge, StatusBadge } from './TaskBadge';
import '../../styles/animations.css';

function formatearFecha(fecha) {
  if (!fecha) return null;
  try {
    const parsed = typeof fecha === 'string' ? parseISO(fecha) : new Date(fecha);
    if (!isValid(parsed)) return null;
    return format(parsed, 'd MMM yyyy', { locale: es });
  } catch {
    return null;
  }
}

// ── Icono de eliminar (SVG inline) ───────────────────────────────────────────
function IconoEliminar() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

export default function TaskRow({ tarea, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);

  const fechaFormateada = formatearFecha(tarea?.fechaVencimiento);

  const estiloFila = {
    backgroundColor: hovered ? 'var(--bg-hover)' : 'transparent',
    transition: 'background-color 100ms',
    cursor: 'pointer',
    animation: 'fadeInUp 150ms ease-out both',
    borderBottom: '1px solid var(--border)',
  };

  const estiloCelda = {
    padding: '11px 14px',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  };

  const estiloID = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
  };

  const estiloTitulo = {
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    fontWeight: 500,
    maxWidth: '260px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const estiloAsignado = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
  };

  const estiloFecha = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    letterSpacing: '0.02em',
  };

  const estiloBotonEliminar = {
    width: 28,
    height: 28,
    borderRadius: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    color: deleteHovered ? 'var(--danger)' : 'var(--text-muted)',
    backgroundColor: deleteHovered ? 'rgba(218,30,40,0.08)' : 'transparent',
    cursor: 'pointer',
    transition: 'color 100ms, background-color 100ms',
  };

  const usuarioAsignado = tarea?.usuarioAsignado;

  function manejarEliminar(e) {
    e.stopPropagation();
    onDelete && onDelete(tarea);
  }

  return (
    <tr
      style={estiloFila}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick && onClick(tarea)}
    >
      {/* ID */}
      <td style={{ ...estiloCelda, paddingLeft: '16px' }}>
        <span style={estiloID}>EQ51-{tarea?.idTarea}</span>
      </td>

      {/* Título */}
      <td style={estiloCelda}>
        <span style={estiloTitulo} title={tarea?.titulo}>
          {tarea?.titulo ?? '—'}
        </span>
      </td>

      {/* Estatus */}
      <td style={estiloCelda}>
        <StatusBadge estatus={tarea?.estatus} />
      </td>

      {/* Prioridad */}
      <td style={estiloCelda}>
        <PriorityBadge prioridad={tarea?.prioridad} />
      </td>

      {/* Asignado */}
      <td style={estiloCelda}>
        {usuarioAsignado ? (
          <span style={estiloAsignado}>
            <Avatar user={usuarioAsignado} size="sm" />
            <span>{usuarioAsignado.nombreUsuario || usuarioAsignado.nombreCompleto}</span>
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>
        )}
      </td>

      {/* Fecha */}
      <td style={estiloCelda}>
        {fechaFormateada ? (
          <span style={estiloFecha}>{fechaFormateada}</span>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>
        )}
      </td>

      {/* Acciones */}
      <td style={{ ...estiloCelda, paddingRight: '16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
        <button
          style={estiloBotonEliminar}
          onClick={manejarEliminar}
          onMouseEnter={() => setDeleteHovered(true)}
          onMouseLeave={() => setDeleteHovered(false)}
          title="Eliminar tarea"
          aria-label="Eliminar tarea"
        >
          <IconoEliminar />
        </button>
      </td>
    </tr>
  );
}
