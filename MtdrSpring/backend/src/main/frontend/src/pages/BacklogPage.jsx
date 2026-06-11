import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DEVELOPERS } from '../utils/developers';
import useAppStore from '../store/index';
import useTareas from '../hooks/useTareas';
import {
  deleteTarea as apiDeleteTarea,
  createTarea,
  updateTarea as apiUpdateTarea,
} from '../api/tareas';
import { getSprints } from '../api/sprints';
import TaskForm from '../components/tasks/TaskForm';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import Skeleton from '../components/shared/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import { PriorityBadge, StatusBadge } from '../components/tasks/TaskBadge';

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const STATUS_FILTERS = [
  { label: 'All states', value: '', bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', dot: '#9CA3AF' },
  { label: 'To Do', value: 'to do', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', dot: '#2563EB' },
  { label: 'In Progress', value: 'in progress', bg: '#FEF3C7', color: '#92400E', border: '#F59E0B', dot: '#F59E0B' },
  { label: 'In Review', value: 'in review', bg: '#F3E8FF', color: '#7E22CE', border: '#a855f7', dot: '#a855f7' },
  { label: 'Done', value: 'done', bg: '#DCFCE7', color: '#166534', border: '#22C55E', dot: '#22C55E' },
];

const PRIORITY_FILTERS = [
  { label: 'All priorities', value: '', bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', dot: '#9CA3AF' },
  { label: 'High', value: 'high', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA', dot: '#DC2626' },
  { label: 'Medium', value: 'medium', bg: '#FEF3C7', color: '#92400E', border: '#F59E0B', dot: '#F59E0B' },
  { label: 'Low', value: 'low', bg: '#DBEAFE', color: '#1E40AF', border: '#BFDBFE', dot: '#2563EB' },
];

const DEVELOPER_FILTERS = [
  { label: 'All', initials: null, bg: '#F9FAFB', color: '#6B7280' },
  ...DEVELOPERS.filter((d) => d.label !== 'My tasks'),
];

function formatFecha(fechaStr) {
  if (!fechaStr) return '—';

  try {
    return new Date(fechaStr).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return fechaStr;
  }
}

function normalizeStatus(nombre) {
  const n = (nombre || '').toLowerCase();

  if (n.includes('progress') || n.includes('progreso')) return 'in progress';
  if (n.includes('review') || n.includes('revisión') || n.includes('revision')) return 'in review';
  if (n.includes('done') || n.includes('complet')) return 'done';

  return 'to do';
}

function normalizePriority(nombre) {
  const n = (nombre || '').toLowerCase();

  if (n.includes('alta') || n.includes('high')) return 'high';
  if (n.includes('media') || n.includes('medium')) return 'medium';

  return 'low';
}

function getInitials(user) {
  const nombre = [
    user?.nombreCompleto,
    user?.nombre,
    user?.apellido,
    user?.apellidos,
    user?.nombreUsuario,
    user?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (nombre.includes('gabriel')) return 'GP';
  if (nombre.includes('alejandro')) return 'AL';
  if (nombre.includes('eugenio')) return 'ED';
  if (nombre.includes('eli')) return 'EG';
  if (nombre.includes('grecia')) return 'GS';
  if (nombre.includes('rutilo')) return 'RD';

  return '';
}

function DevAvatar({ initials, size = 24 }) {
  const dev = DEVELOPERS.find((d) => d.initials === initials);

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: dev?.bg ?? '#F9FAFB',
        color: dev?.color ?? '#6B7280',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials || '—'}
    </span>
  );
}

function SortIcon({ direction }) {
  return (
    <span style={direction ? styles.sortActive : styles.sortMuted}>
      {direction ? (direction === 'asc' ? '↑' : '↓') : '⇅'}
    </span>
  );
}

function SkeletonRows({ n = 6 }) {
  return (
    <>
      {[...Array(n)].map((_, i) => (
        <tr key={i}>
          {[220, 90, 80, 130, 100, 90, 50].map((w, j) => (
            <td key={j} style={styles.td}>
              <Skeleton width={`${w}px`} height="12px" />
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
  const [refreshing, setRefreshing] = useState(false);
  const [ultimaAct, setUltimaAct] = useState(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setUltimaAct(new Date());
    setRefreshing(false);
  };

  useEffect(() => {
    setUltimaAct(new Date());
    const id = setInterval(handleRefresh, 3_600_000);
    return () => clearInterval(id);
  }, []);
  const addTareaStore = useAppStore((s) => s.addTarea);
  const updateTareaStore = useAppStore((s) => s.updateTarea);
  const deleteTareaStore = useAppStore((s) => s.deleteTarea);
  const addTarea = useAppStore((s) => s.addTarea);
  const addToast = useAppStore((s) => s.addToast);

  const [sprints, setSprints] = useState([]);
  const [filtroSprint, setFiltroSprint] = useState('');
  const [sprintMenuOpen, setSprintMenuOpen] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [filtroDeveloper, setFiltroDeveloper] = useState(null);
  const [sort, setSort] = useState({ key: 'idTarea', dir: 'asc' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const undoBufferRef = useRef(null);

  useEffect(() => {
    getSprints()
      .then((data) => setSprints(data ?? []))
      .catch(() => {});
  }, []);

  const sprintActual = sprints.find(
    (s) => String(s.idSprint) === String(filtroSprint)
  );

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

    if (filtroSprint) {
      lista = lista.filter(
        (t) => String(t.sprint?.idSprint) === String(filtroSprint)
      );
    }

    if (filtroEstatus) {
      lista = lista.filter(
        (t) => normalizeStatus(t.estatus?.nombre) === filtroEstatus
      );
    }

    if (filtroPrioridad) {
      lista = lista.filter(
        (t) => normalizePriority(t.prioridad?.nombre) === filtroPrioridad
      );
    }

    if (filtroDeveloper) {
      lista = lista.filter(
        (t) => getInitials(t.usuarioAsignado) === filtroDeveloper
      );
    }

    lista.sort((a, b) => {
      let va = a[sort.key] ?? '';
      let vb = b[sort.key] ?? '';

      if (sort.key === 'estatus') {
        va = a.estatus?.nombre ?? '';
        vb = b.estatus?.nombre ?? '';
      }

      if (sort.key === 'prioridad') {
        va = a.prioridad?.nombre ?? '';
        vb = b.prioridad?.nombre ?? '';
      }

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
  }, [
    tareas,
    busqueda,
    filtroSprint,
    filtroEstatus,
    filtroPrioridad,
    filtroDeveloper,
    sort,
  ]);

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
      addToast({
        id: `cre-${Date.now()}`,
        message: 'Task created',
        type: 'success',
      });
      setShowCreateForm(false);
    } catch {
      addToast({
        id: `err-${Date.now()}`,
        message: 'Error creating task',
        type: 'error',
      });
    }
  }

  async function handleEditarTarea(datos) {
    if (!editingTask) return;

    try {
      const actualizada = await apiUpdateTarea(editingTask.idTarea, {
        ...editingTask,
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        estatus: datos.idEstatus ? { idEstatus: datos.idEstatus } : undefined,
        prioridad: datos.idPrioridad ? { idPrioridad: datos.idPrioridad } : undefined,
        usuarioAsignado: datos.idUsuarioAsignado
          ? { idUsuario: datos.idUsuarioAsignado }
          : null,
        fechaVencimiento: datos.fechaVencimiento || null,
      });

      updateTareaStore(editingTask.idTarea, actualizada);
      addToast({
        id: `upd-${Date.now()}`,
        message: 'Task updated',
        type: 'success',
      });
      setEditingTask(null);
    } catch {
      addToast({
        id: `errupd-${Date.now()}`,
        message: 'Error updating task',
        type: 'error',
      });
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
                estatus: tarea.estatus
                  ? { idEstatus: tarea.estatus.idEstatus }
                  : undefined,
                prioridad: tarea.prioridad
                  ? { idPrioridad: tarea.prioridad.idPrioridad }
                  : undefined,
                usuarioAsignado: tarea.usuarioAsignado
                  ? { idUsuario: tarea.usuarioAsignado.idUsuario }
                  : null,
                fechaVencimiento: tarea.fechaVencimiento || null,
              });

              addTarea(restaurada);
              addToast({
                id: `rest-${Date.now()}`,
                message: 'Task restored',
                type: 'success',
              });
            } catch {
              addToast({
                id: `errrest-${Date.now()}`,
                message: 'Could not restore task',
                type: 'error',
              });
            }
          },
        },
      });
    } catch {
      addTareaStore(tarea);
      addToast({
        id: `errdel-${Date.now()}`,
        message: 'Error deleting task',
        type: 'error',
      });
    }
  }

  const columnas = [
    { key: 'titulo', label: 'Task', sortable: true },
    { key: 'estatus', label: 'Status', sortable: true },
    { key: 'prioridad', label: 'Priority', sortable: true },
    { key: 'usuarioAsignado', label: 'Assigned', sortable: false },
    { key: 'sprint', label: 'Sprint', sortable: true },
    { key: 'fechaVencimiento', label: 'Due date', sortable: true },
    { key: 'acciones', label: '', sortable: false },
  ];

  const hasFilters =
    busqueda || filtroSprint || filtroEstatus || filtroPrioridad || filtroDeveloper;

  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <div>
          <h1 style={styles.title}>Backlog</h1>
          <p style={styles.subtitle}>
            {tareasFiltradas.length} tasks · organize, filter and edit work
            {ultimaAct && (
              <span style={{ marginLeft: 8 }}>
                · Updated {ultimaAct.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · refreshes every hour
              </span>
            )}
          </p>
        </div>

        <div style={styles.topbarActions}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={styles.refreshButton}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.2"
                 strokeLinecap="round" strokeLinejoin="round"
                 style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>

          <button
            style={styles.primaryButton}
            onClick={() => setShowCreateForm(true)}
          >
            + New Task
          </button>

          <div style={styles.dropdownWrapper}>
            <button
              style={styles.sprintButton}
              onClick={() => setSprintMenuOpen((prev) => !prev)}
            >
              {sprintActual ? sprintActual.nombre : 'All sprints'}
              <span style={styles.chevron}>⌄</span>
            </button>

            {sprintMenuOpen && (
              <div style={styles.dropdownMenu}>
                <button
                  style={styles.dropdownItem}
                  onClick={() => {
                    setFiltroSprint('');
                    setSprintMenuOpen(false);
                  }}
                >
                  All sprints
                </button>

                {sprints.map((sprint) => (
                  <button
                    key={sprint.idSprint}
                    style={{
                      ...styles.dropdownItem,
                      ...(String(filtroSprint) === String(sprint.idSprint)
                        ? styles.dropdownItemActive
                        : {}),
                    }}
                    onClick={() => {
                      setFiltroSprint(String(sprint.idSprint));
                      setSprintMenuOpen(false);
                    }}
                  >
                    {sprint.nombre}
                    {sprint.activo && (
                      <span style={styles.activeBadge}>Active</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={styles.devFilterBar}>
        {DEVELOPER_FILTERS.map((dev) => {
          const isActive = filtroDeveloper === dev.initials;

          return (
            <button
              key={dev.label}
              onClick={() => setFiltroDeveloper(dev.initials)}
              style={{
                ...styles.devButton,
                color: isActive ? '#DC2626' : '#6B7280',
                fontWeight: isActive ? 600 : 400,
                borderBottomColor: isActive ? '#DC2626' : 'transparent',
              }}
            >
              {dev.initials ? (
                <DevAvatar initials={dev.initials} size={20} />
              ) : (
                <span style={styles.allAvatar}>All</span>
              )}
              {dev.label}
            </button>
          );
        })}
      </div>

      <section style={styles.content}>
        <div style={styles.filterCard}>
          <input
            type="text"
            placeholder="Search by title or description..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={styles.input}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#DC2626';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
            }}
          />

          <div style={styles.filterDivider} />

          <div style={styles.filterGroup}>
            <div style={styles.filterLabel}>States</div>
            <div style={styles.chipRow}>
              {STATUS_FILTERS.map((status) => {
                const active = filtroEstatus === status.value;

                return (
                  <button
                    key={status.label}
                    onClick={() => setFiltroEstatus(status.value)}
                    style={{
                      ...styles.filterChip,
                      backgroundColor: active ? status.bg : '#FFFFFF',
                      color: active ? status.color : '#6B7280',
                      borderColor: active ? status.border : '#E5E7EB',
                    }}
                  >
                    <span
                      style={{
                        ...styles.statusDot,
                        backgroundColor: status.dot,
                      }}
                    />
                    {status.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.filterGroup}>
            <div style={styles.filterLabel}>Priorities</div>
            <div style={styles.chipRow}>
              {PRIORITY_FILTERS.map((priority) => {
                const active = filtroPrioridad === priority.value;

                return (
                  <button
                    key={priority.label}
                    onClick={() => setFiltroPrioridad(priority.value)}
                    style={{
                      ...styles.filterChip,
                      backgroundColor: active ? priority.bg : '#FFFFFF',
                      color: active ? priority.color : '#6B7280',
                      borderColor: active ? priority.border : '#E5E7EB',
                    }}
                  >
                    <span
                      style={{
                        ...styles.statusDot,
                        backgroundColor: priority.dot,
                      }}
                    />
                    {priority.label}
                  </button>
                );
              })}
            </div>
          </div>

          {hasFilters && (
            <button
              style={styles.clearButton}
              onClick={() => {
                setBusqueda('');
                setFiltroSprint('');
                setFiltroEstatus('');
                setFiltroPrioridad('');
                setFiltroDeveloper(null);
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <colgroup>
              <col />
              <col style={{ width: '118px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '70px' }} />
            </colgroup>

            <thead>
              <tr>
                {columnas.map((col) => (
                  <th
                    key={col.key}
                    style={col.sortable ? styles.th : styles.thNoSort}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  >
                    {col.label}
                    {col.sortable && (
                      <SortIcon
                        direction={sort.key === col.key ? sort.dir : null}
                      />
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
                        hasFilters
                          ? 'No tasks match the applied filters.'
                          : 'No tasks in the backlog. Create the first one.'
                      }
                      action={
                        !hasFilters
                          ? {
                              label: '+ New Task',
                              onClick: () => setShowCreateForm(true),
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                tareasFiltradas.map((tarea) => {
                  const initials = getInitials(tarea.usuarioAsignado);

                  return (
                    <tr
                      key={tarea.idTarea}
                      onClick={() => setEditingTask(tarea)}
                      style={styles.tr}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FAFAFA';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Click to edit"
                    >
                      <td style={styles.td}>
                        <div style={styles.taskCell}>
                          <span style={styles.taskTitle} title={tarea.titulo}>
                            {tarea.titulo}
                          </span>
                          <span style={styles.taskId}>YD-{tarea.idTarea}</span>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <StatusBadge estatus={tarea.estatus} />
                      </td>

                      <td style={styles.td}>
                        <PriorityBadge prioridad={tarea.prioridad} />
                      </td>

                      <td style={styles.td}>
                        {tarea.usuarioAsignado ? (
                          <div style={styles.assignedCell}>
                            <DevAvatar initials={initials} size={24} />
                            <span style={styles.assignedName}>
                              {tarea.usuarioAsignado.nombreCompleto ||
                                tarea.usuarioAsignado.nombreUsuario ||
                                tarea.usuarioAsignado.nombre ||
                                'Assigned'}
                            </span>
                          </div>
                        ) : (
                          <span style={styles.emptyText}>—</span>
                        )}
                      </td>

                      <td style={styles.td}>
                        {tarea.sprint ? (
                          <span style={styles.sprintBadge}>
                            {tarea.sprint.nombre}
                          </span>
                        ) : (
                          <span style={styles.emptyText}>—</span>
                        )}
                      </td>

                      <td style={styles.td}>
                        <span style={styles.dateText}>
                          {formatFecha(tarea.fechaVencimiento)}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <button
                          style={styles.deleteButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmEliminar(tarea);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showCreateForm && (
        <TaskModal title="New task" onClose={() => setShowCreateForm(false)}>
          <TaskForm
            onSubmit={handleCrearTarea}
            onCancel={() => setShowCreateForm(false)}
          />
        </TaskModal>
      )}

      {editingTask && (
        <TaskModal title="Edit task" onClose={() => setEditingTask(null)}>
          <TaskForm
            onSubmit={handleEditarTarea}
            onCancel={() => setEditingTask(null)}
            initialValues={{
              titulo: editingTask.titulo,
              descripcion: editingTask.descripcion,
              idEstatus: editingTask.estatus?.idEstatus,
              idPrioridad: editingTask.prioridad?.idPrioridad,
              idUsuarioAsignado: editingTask.usuarioAsignado?.idUsuario,
              fechaVencimiento: editingTask.fechaVencimiento,
            }}
          />
        </TaskModal>
      )}

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

function TaskModal({ title, children, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 style={styles.modalTitle}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: FONT,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    backgroundColor: '#F8F9FB',
  },

  topbar: {
    backgroundColor: '#FFFFFF',
    borderBottom: '0.5px solid #E5E7EB',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  topbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#111827',
  },

  subtitle: {
    margin: '4px 0 0',
    fontSize: 11,
    fontWeight: 400,
    color: '#9CA3AF',
  },

  refreshButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid #E5E7EB',
    background: '#FFFFFF',
    color: '#6B7280',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },

  primaryButton: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 500,
    padding: '6px 13px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(220,38,38,0.3)',
    whiteSpace: 'nowrap',
  },

  dropdownWrapper: {
    position: 'relative',
  },

  sprintButton: {
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    color: '#111827',
    fontSize: 12,
    fontWeight: 500,
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },

  chevron: {
    fontSize: 11,
    color: '#6B7280',
  },

  dropdownMenu: {
    position: 'absolute',
    top: 34,
    right: 0,
    width: 190,
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    borderRadius: 10,
    boxShadow: '0 12px 28px rgba(15,23,42,0.12)',
    padding: 6,
    zIndex: 30,
  },

  dropdownItem: {
    width: '100%',
    border: 'none',
    backgroundColor: 'transparent',
    padding: '8px 10px',
    borderRadius: 6,
    fontSize: 12,
    color: '#374151',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dropdownItemActive: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    fontWeight: 600,
  },

  activeBadge: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: 20,
    padding: '1px 7px',
    fontSize: 10,
    fontWeight: 500,
  },

  devFilterBar: {
    backgroundColor: '#FFFFFF',
    borderBottom: '0.5px solid #E5E7EB',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    overflowX: 'auto',
  },

  devButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 14px',
    fontSize: 12,
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  allAvatar: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 8,
    fontWeight: 600,
  },

  content: {
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },

  filterCard: {
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    borderRadius: 10,
    padding: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },

  input: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 400,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    border: '0.5px solid #E5E7EB',
    borderRadius: 6,
    padding: '7px 10px',
    outline: 'none',
    width: '100%',
    maxWidth: 360,
  },

  filterDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    width: '100%',
  },

  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  filterLabel: {
    fontSize: 11,
    fontWeight: 400,
    color: '#9CA3AF',
  },

  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },

  filterChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: '0.5px solid #E5E7EB',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 10,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },

  clearButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    color: '#6B7280',
    fontSize: 12,
    fontWeight: 500,
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },

  tableWrapper: {
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    overflowX: 'auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },

  th: {
    padding: '9px 12px',
    textAlign: 'left',
    fontSize: 10,
    fontWeight: 500,
    color: '#9CA3AF',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderBottom: '0.5px solid #E5E7EB',
    cursor: 'pointer',
    backgroundColor: '#F9FAFB',
  },

  thNoSort: {
    padding: '9px 12px',
    textAlign: 'left',
    fontSize: 10,
    fontWeight: 500,
    color: '#9CA3AF',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderBottom: '0.5px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
  },

  td: {
    padding: '9px 12px',
    borderBottom: '0.5px solid #F3F4F6',
    verticalAlign: 'middle',
  },

  tr: {
    transition: 'background-color 100ms',
    cursor: 'pointer',
  },

  taskCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },

  taskTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  taskId: {
    fontSize: 10,
    fontWeight: 400,
    color: '#9CA3AF',
  },

  assignedCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },

  assignedName: {
    fontSize: 12,
    fontWeight: 400,
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  sprintBadge: {
    display: 'inline-flex',
    backgroundColor: '#EFF6FF',
    color: '#1E40AF',
    border: '0.5px solid #BFDBFE',
    borderRadius: 20,
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },

  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  deleteButton: {
    fontSize: 10,
    fontWeight: 400,
    color: '#EF4444',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },

  sortMuted: {
    color: '#9CA3AF',
    fontSize: 10,
    marginLeft: 4,
  },

  sortActive: {
    color: '#DC2626',
    fontSize: 10,
    marginLeft: 4,
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

  modal: {
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
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 16px',
  },
};