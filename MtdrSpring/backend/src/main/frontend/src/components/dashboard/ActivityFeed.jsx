import React, { useEffect, useState } from 'react';
import { getLogs } from '../../api/logs';
import Skeleton from '../shared/Skeleton';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

function estiloEntradaLog(log) {
  // Si el mensaje menciona cambio de estatus, usa color acento; de lo contrario, muted
  const esCambioEstatus =
    log.idEstatusOrigen != null ||
    (log.mensaje && /estatus|movió|cambió|completó/i.test(log.mensaje));
  return esCambioEstatus ? 'var(--accent)' : 'var(--text-muted)';
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  try {
    return formatDistanceToNow(new Date(fechaStr), { addSuffix: true, locale: es });
  } catch {
    return fechaStr;
  }
}

function SkeletonFeed() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Skeleton width="8px" height="8px" borderRadius="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton width="80%" height="12px" />
            <Skeleton width="50%" height="11px" />
          </div>
          <Skeleton width="64px" height="11px" />
        </div>
      ))}
    </div>
  );
}

export default function ActivityFeed() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function cargarLogs() {
      setLoading(true);
      try {
        const data = await getLogs();
        if (!cancelado) {
          // Ordenar por fecha descendente, tomar últimos 10
          const ordenados = [...(data ?? [])].sort(
            (a, b) => new Date(b.creadoEn || 0) - new Date(a.creadoEn || 0)
          );
          setLogs(ordenados.slice(0, 10));
        }
      } catch (err) {
        if (!cancelado) setError(err);
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargarLogs();
    return () => { cancelado = true; };
  }, []);

  const estiloContenedor = {
    display: 'flex',
    flexDirection: 'column',
  };

  const estiloHeader = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontWeight: 600,
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    marginBottom: '14px',
  };

  const estiloScroll = {
    maxHeight: '320px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  };

  const estiloEntrada = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  };

  const estiloContenidoTexto = {
    flex: 1,
    minWidth: 0,
  };

  const estiloMensaje = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: '0.8125rem',
    color: 'var(--text-primary)',
    lineHeight: '1.4',
    marginBottom: '2px',
    wordBreak: 'break-word',
  };

  const estiloTareaRef = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const estiloFecha = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    marginTop: '2px',
  };

  if (loading) {
    return (
      <div style={estiloContenedor}>
        <h3 style={estiloHeader}>Actividad reciente</h3>
        <SkeletonFeed />
      </div>
    );
  }

  if (error) {
    return (
      <div style={estiloContenedor}>
        <h3 style={estiloHeader}>Actividad reciente</h3>
        <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>
          No se pudo cargar la actividad.
        </p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={estiloContenedor}>
        <h3 style={estiloHeader}>Actividad reciente</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '20px 0' }}>
          No hay actividad registrada aún.
        </p>
      </div>
    );
  }

  return (
    <div style={estiloContenedor}>
      <h3 style={estiloHeader}>Actividad reciente</h3>
      <div style={estiloScroll}>
        {logs.map((log, idx) => {
          const dotColor = estiloEntradaLog(log);
          return (
            <div key={log.idLog ?? idx} style={estiloEntrada}>
              {/* Dot indicador */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: dotColor,
                  flexShrink: 0,
                  marginTop: '4px',
                }}
              />
              {/* Contenido */}
              <div style={estiloContenidoTexto}>
                <p style={estiloMensaje}>{log.mensaje || 'Actividad registrada'}</p>
                {log.tarea?.titulo && (
                  <span style={estiloTareaRef} title={log.tarea.titulo}>
                    {log.tarea.titulo}
                  </span>
                )}
              </div>
              {/* Fecha */}
              <span style={estiloFecha}>{formatearFecha(log.creadoEn)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
