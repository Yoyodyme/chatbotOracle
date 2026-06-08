import React, { useState, useMemo, useRef } from 'react';
import useAppStore from '../store/index';
import useTareas from '../hooks/useTareas';
import { deleteTarea as apiDeleteTarea, createTarea } from '../api/tareas';
import TaskForm from '../components/tasks/TaskForm';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import Skeleton from '../components/shared/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import Avatar from '../components/shared/Avatar';
import { PriorityBadge, StatusBadge } from '../components/tasks/TaskBadge';

function formatFecha(fechaStr) {
  if (!fechaStr) return '—';
  try {
    return new Date(fechaStr).toLocaleDateString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return fechaStr;
  }
}

function SortIcon({ direction }) {
  if (!direction) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginLeft: '4px' }}>⇅</span>;
  }
  return (
    <span style={{ color: 'var(--accent)', fontSize: '10px', marginLeft: '4px' }}>
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  );
}

function SkeletonRows({ n = 5 }) {
  return (
    <>
      {[...Array(n)].map((_, i) => (
        <tr key={i}>
          {[200, 100, 80, 120, 110, 90, 60].map((w, j) => (
            <td key={j} style={{ padding: '12px 16px' }}>
              <Skeleton width={`${w}px`} height="14px" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function BacklogPage() {
  const { loading, refetch } = useTareas();
  const tareas = useAppStore((s) => s.tareas);
  const estatuses = useAppStore((s) => s.estatuses);
  const prioridades = useAppStore((s) => s.prioridades);
  const addTareaStore = useAppStore((s) => s.addTarea);
  const deleteTareaStore = useAppStore((s) => s.deleteTarea);
  const addTarea = useAppStore((s) => s.addTarea);
  const addToast = useAppStore((s) => s.addToast);
  const setSelectedTask = useAppStore((s) => s.setSelectedTask);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [sort, setSort] = useState({ key: 'idTarea', dir: 'asc' });
  const [showForm, setShowForm] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const undoBufferRef = useRef(null);

  const tareasFiltradas = useMemo(() => {
    let lista = [...tareas];

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(
        (t) =>
          t.titulo?.toLowerCase().includes(q) ||
          t.descripcion?.toLowerCase().includes(q)
      );
    }

    if (filtroEstatus) {
      lista = lista.filter((t) => String(t.estatus?.idEstatus) === filtroEstatus);
    }

    if (filtroPrioridad) {
      lista = lista.filter((t) => String(t.prioridad?.idPrioridad) === filtroPrioridad);
    }

    lista.sort((a, b) => {
      let va = a[sort.key] ?? '';
      let vb = b[sort.key] ?? '';
      if (sort.key === 'estatus') { va = a.estatus?.nombre ?? ''; vb = b.estatus?.nombre ?? ''; }
      if (sort.key === 'prioridad') { va = a.prioridad?.nombre ?? ''; vb = b.prioridad?.nombre ?? ''; }
      if (sort.key === 'usuarioAsignado') {
        va = a.usuarioAsignado?.nombreCompleto ?? '';
        vb = b.usuarioAsignado?.nombreCompleto ?? '';
      }
      if (sort.key === 'sprint') {
        va = a.sprint?.nombre ?? '';
        vb = b.sprint?.nombre ?? '';
      }
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return lista;
  }, [tareas, busqueda, filtroEstatus, filtroPrioridad, sort]);

  function toggleSort(key) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  }

  async function handleCrearTarea(datos) {
    try {
      const nueva = await createTarea({
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        estatus: datos.idEstatus ? { idEstatus: datos.idEstatus } : undefined,
        prioridad: datos.idPrioridad ? { idPrioridad: datos.idPrioridad } : undefined,
        usuarioAsignado: datos.idUsuarioAsignado
          ? { idUsuario: datos.idUsuarioAsignado }
          : null,
        fechaVencimiento: datos.fechaVencimiento || null,
      });
      addTareaStore(nueva);
      addToast({ id: `cre-${Date.now()}`, message: 'Task created', type: 'success' });
      setShowForm(false);
    } catch {
      addToast({ id: `err-${Date.now()}`, message: 'Error creating task', type: 'error' });
    }
  }

  async function handleEliminar() {
    if (!confirmEliminar) return;
    const tarea = confirmEliminar;
    setConfirmEliminar(null);

    undoBufferRef.current = tarea;
    deleteTareaStore(tarea.idTarea);

    try {
      await apiDeleteTarea(tarea.idTarea);
      addToast({
        id: `del-${tarea.idTarea}-${Date.now()}`,
        message: `Task "${tarea.titulo}" deleted`,
        type: 'info',
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              const restaurada = await createTarea({
                titulo: tarea.titulo,
                descripcion: tarea.descripcion,
                estatus: tarea.estatus ? { idEstatus: tarea.estatus.idEstatus } : undefined,
                prioridad: tarea.prioridad ? { idPrioridad: tarea.prioridad.idPrioridad } : undefined,
                usuarioAsignado: tarea.usuarioAsignado
                  ? { idUsuario: tarea.usuarioAsignado.idUsuario }
                  : null,
                fechaVencimiento: tarea.fechaVencimiento || null,
              });
              addTarea(restaurada);
              addToast({ id: `rest-${Date.now()}`, message: 'Task restored', type: 'success' });
            } catch {
              addToast({ id: `errrest-${Date.now()}`, message: 'Could not restore task', type: 'error' });
            }
          },
        },
      });
    } catch {
      addTareaStore(tarea);
      addToast({ id: `errdel-${Date.now()}`, message: 'Error deleting task', type: 'error' });
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const estiloPage = { display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: 24 };

  const estiloHeaderRow = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  };

  const estiloTitulo = {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-primary)',
  };

  const estiloBtnNueva = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 18px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    background: 'var(--accent)',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 150ms',
    flexShrink: 0,
  };

  const estiloFiltros = {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  };

  const estiloInput = {
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    outline: 'none',
    transition: 'border-color 150ms',
    width: '220px',
  };

  const estiloSelect = {
    ...estiloInput,
    width: 'auto',
    minWidth: '140px',
    cursor: 'pointer',
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238d8d8d' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: '32px',
    appearance: 'none',
    WebkitAppearance: 'none',
  };

  const estiloTablaWrapper = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    overflowX: 'auto',
    boxShadow: 'var(--shadow-sm)',
  };

  const estiloTabla = {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  };

  const estiloTh = {
    padding: '12px 16px',
    textAlign: 'left',
    fontFamily: 'var(--font-body)',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    backgroundColor: '#f7f8f9',
  };

  const estiloThAcciones = {
    ...estiloTh,
    cursor: 'default',
  };

  const estiloTd = {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  };

  const estiloIdCell = {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  };

  const estiloTituloCell = {
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const estiloFechaCell = {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  };

  const estiloBtnEliminar = {
    padding: '5px 11px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--danger)',
    background: 'transparent',
    border: '1px solid rgba(218,30,40,0.25)',
    cursor: 'pointer',
    transition: 'background-color 150ms',
  };

  const columnas = [
    { key: 'titulo', label: 'Title', sortable: true },
    { key: 'estatus', label: 'Status', sortable: true },
    { key: 'prioridad', label: 'Priority', sortable: true },
    { key: 'usuarioAsignado', label: 'Assigned', sortable: false },
    { key: 'sprint', label: 'Sprint', sortable: true },
    { key: 'fechaVencimiento', label: 'Due date', sortable: true },
    { key: 'acciones', label: 'Actions', sortable: false },
  ];

  return (
    <div style={estiloPage}>
      <div style={estiloHeaderRow}>
        <h1 style={estiloTitulo}>Backlog</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={refetch}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 150ms',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.75'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = loading ? '0.6' : '1'; }}
            title="Refresh tasks"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                 style={loading ? { animation: 'spin 1s linear infinite' } : undefined}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
          <button
            style={estiloBtnNueva}
            onClick={() => setShowForm(true)}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
            New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={estiloFiltros}>
        <input
          type="text"
          placeholder="Search by title or description…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={estiloInput}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        />
        <select
          value={filtroEstatus}
          onChange={(e) => setFiltroEstatus(e.target.value)}
          style={estiloSelect}
        >
          <option value="">All statuses</option>
          {estatuses.map((e) => (
            <option key={e.idEstatus} value={String(e.idEstatus)}>
              {e.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroPrioridad}
          onChange={(e) => setFiltroPrioridad(e.target.value)}
          style={estiloSelect}
        >
          <option value="">All priorities</option>
          {prioridades.map((p) => (
            <option key={p.idPrioridad} value={String(p.idPrioridad)}>
              {p.nombre}
            </option>
          ))}
        </select>
        {(busqueda || filtroEstatus || filtroPrioridad) && (
          <button
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
            onClick={() => { setBusqueda(''); setFiltroEstatus(''); setFiltroPrioridad(''); }}
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={estiloTablaWrapper}>
        <table style={estiloTabla}>
          <colgroup>
            <col />
            <col style={{ width: '120px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '80px' }} />
          </colgroup>
          <thead>
            <tr>
              {columnas.map((col) => (
                <th
                  key={col.key}
                  style={col.sortable ? estiloTh : estiloThAcciones}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  title={col.sortable ? `Sort by ${col.label}` : undefined}
                >
                  {col.label}
                  {col.sortable && (
                    <SortIcon direction={sort.key === col.key ? sort.dir : null} />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows n={6} />
            ) : tareasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="🔍"
                    title="No results"
                    message={
                      busqueda || filtroEstatus || filtroPrioridad
                        ? 'No tasks match the applied filters.'
                        : 'No tasks in the backlog. Create the first one.'
                    }
                    action={
                      !busqueda && !filtroEstatus && !filtroPrioridad
                        ? { label: '+ New Task', onClick: () => setShowForm(true) }
                        : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              tareasFiltradas.map((tarea) => (
                <tr
                  key={tarea.idTarea}
                  onClick={() => setSelectedTask(tarea)}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  style={{ transition: 'background-color 100ms', cursor: 'pointer' }}
                  title="Click to edit"
                >
                  <td style={estiloTd}>
                    <span style={estiloTituloCell} title={tarea.titulo}>
                      {tarea.titulo}
                    </span>
                  </td>
                  <td style={estiloTd}>
                    <StatusBadge estatus={tarea.estatus} />
                  </td>
                  <td style={estiloTd}>
                    <PriorityBadge prioridad={tarea.prioridad} />
                  </td>
                  <td style={estiloTd}>
                    {tarea.usuarioAsignado ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar user={tarea.usuarioAsignado} size="sm" />
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '120px',
                          }}
                        >
                          {tarea.usuarioAsignado.nombreCompleto ||
                            tarea.usuarioAsignado.nombreUsuario}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>
                    )}
                  </td>
                  <td style={estiloTd}>
                    {tarea.sprint ? (
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--text-secondary)',
                          backgroundColor: 'rgba(6,111,204,0.08)',
                          border: '1px solid rgba(6,111,204,0.2)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '2px 8px',
                          whiteSpace: 'nowrap',
                          fontWeight: 500,
                        }}
                      >
                        {tarea.sprint.nombre}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>
                    )}
                  </td>
                  <td style={estiloTd}>
                    <span style={estiloFechaCell}>
                      {formatFecha(tarea.fechaVencimiento)}
                    </span>
                  </td>
                  <td style={estiloTd}>
                    <button
                      style={estiloBtnEliminar}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmEliminar(tarea);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(218,30,40,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Delete task"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create task */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: 'var(--shadow-md)',
              animation: 'scaleIn 150ms ease-out both',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: '1.125rem',
                color: 'var(--text-primary)',
                marginBottom: '20px',
              }}
            >
              New task
            </h2>
            <TaskForm
              onSubmit={handleCrearTarea}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        open={Boolean(confirmEliminar)}
        title="Delete task?"
        message={
          confirmEliminar
            ? `Are you sure you want to delete "${confirmEliminar.titulo}"? This action can be undone.`
            : ''
        }
        confirmLabel="Delete"
        dangerous
        onConfirm={handleEliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  );
}
