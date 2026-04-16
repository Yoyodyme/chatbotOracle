import React, { useMemo, useState } from 'react';
import useTareas from '../hooks/useTareas';
import useAppStore from '../store/index';
import KanbanBoard from '../components/kanban/KanbanBoard';

function leerSprints() {
  try {
    const raw = localStorage.getItem('eq51_sprints');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function KanbanPage() {
  const { loading } = useTareas();
  const estatuses = useAppStore((s) => s.estatuses);
  const sprints = useMemo(() => leerSprints(), []);
  const sprintActivo = sprints.find((s) => s.activo) ?? null;

  const [sprintSeleccionado, setSprintSeleccionado] = useState(
    sprintActivo?.id ?? ''
  );

  const estiloPage = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    height: '100%',
  };

  const estiloHeader = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  };

  const estiloTitulo = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontWeight: 600,
    fontSize: '1.5rem',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  };

  const estiloSelector = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 32px 8px 12px',
    cursor: 'pointer',
    outline: 'none',
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238d8d8d' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    appearance: 'none',
    WebkitAppearance: 'none',
    boxShadow: 'var(--shadow-sm)',
  };

  const estiloSkeletonGrid = {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '16px',
  };

  const estiloSkeletonCol = {
    width: '280px',
    minWidth: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  function SkeletonColumnas() {
    const dummy = [0, 1, 2];
    return (
      <div style={estiloSkeletonGrid}>
        {dummy.map((i) => (
          <div key={i} style={estiloSkeletonCol}>
            <div
              style={{
                height: '20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#e8ecf0',
                marginBottom: '10px',
                animation: 'shimmer 1.5s infinite linear',
                background: 'linear-gradient(90deg, #e8ecf0 25%, #f0f3f7 50%, #e8ecf0 75%)',
                backgroundSize: '800px 100%',
              }}
            />
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                style={{
                  height: '96px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(90deg, #e8ecf0 25%, #f0f3f7 50%, #e8ecf0 75%)',
                  backgroundSize: '800px 100%',
                  animation: 'shimmer 1.5s infinite linear',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={estiloPage}>
      <div style={estiloHeader}>
        <h1 style={estiloTitulo}>Board</h1>
        {sprints.length > 0 && (
          <select
            value={sprintSeleccionado}
            onChange={(e) => setSprintSeleccionado(e.target.value)}
            style={estiloSelector}
          >
            <option value="">Todos los sprints</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
                {s.activo ? ' (activo)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && estatuses.length === 0 ? (
        <SkeletonColumnas />
      ) : (
        <KanbanBoard loading={loading && estatuses.length === 0} />
      )}
    </div>
  );
}
