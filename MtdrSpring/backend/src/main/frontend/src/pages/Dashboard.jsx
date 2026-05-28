import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '../api/client';

const ACENTO        = '#066FCC';
const ACENTO_SOFT   = '#c5d9f0';
const COLORES_SPRINTS = ['#066FCC', '#2d7d46', '#f59e0b', '#a855f7', '#06b6d4'];
const EJE_TICK      = { fontSize: 11, fill: '#8d8d8d' };

const TOOLTIP = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  color: '#f1f5f9',
  borderRadius: 8,
  fontSize: 12,
};

const CARD = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 'var(--radius-xl)',
  padding: '20px 22px',
  boxShadow: 'var(--shadow-sm)',
};

function pivotarDatos(datos, campoValor) {
  if (!datos || datos.length === 0) return { pivotado: [], sprints: [] };
  const sprints  = [...new Set(datos.map(d => d.sprint).filter(Boolean))].sort();
  const usuarios = [...new Set(datos.map(d => d.usuario).filter(Boolean))];
  const pivotado = usuarios.map(usuario => {
    const fila = { usuario };
    sprints.forEach(sprint => {
      const enc = datos.find(d => d.usuario === usuario && d.sprint === sprint);
      fila[sprint] = enc ? (Number(enc[campoValor]) || 0) : 0;
    });
    return fila;
  });
  return { pivotado, sprints };
}

function GaugeSprint({ pct, completadas, restantes, nombreSprint }) {
  const safe = Math.min(100, Math.max(0, Number(pct) || 0));
  const data = [{ value: safe }, { value: 100 - safe }];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', height: 160, width: '100%', maxWidth: 320 }}>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={data}
              startAngle={180} endAngle={0}
              cx="50%" cy="100%"
              innerRadius={78} outerRadius={110}
              dataKey="value" stroke="none"
            >
              <Cell fill={ACENTO} />
              <Cell fill="#334155" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: ACENTO, lineHeight: 1 }}>{safe}%</div>
          <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
            {nombreSprint
              ? <><strong style={{ color: '#f1f5f9' }}>{nombreSprint}</strong> — {completadas} completed</>
              : 'No active sprint'}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>{restantes} remaining</div>
    </div>
  );
}

function BadgeEstado({ estado }) {
  const cfg = {
    PASADO: { label: 'Past',   bg: 'var(--bg-base)',  color: '#94a3b8' },
    ACTIVE: { label: 'Active', bg: '#d1fae5',         color: '#065f46'           },
    FUTURO: { label: 'Future', bg: ACENTO_SOFT,       color: ACENTO              },
  }[estado] ?? { label: estado, bg: 'var(--bg-base)', color: '#94a3b8' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      borderRadius: 999, padding: '2px 10px',
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
      backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}55`,
    }}>
      {cfg.label}
    </span>
  );
}

export default function Dashboard() {
  const [datos,    setDatos]    = useState({});
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);
  const [ultimaAct, setUltimaAct] = useState(null);
  const [sprints,         setSprints]         = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [dropdownOpen,    setDropdownOpen]    = useState(false);

  const cargarDashboard = useCallback(async () => {
    try {
      const [personalWork, statusDist,
             kpiPorSprint, horasPorSprint, resumenSprints, contribucionesPorSprint] =
        await Promise.all([
          apiFetch('/api/dashboard/personal-work'),
          apiFetch('/api/dashboard/status-distribution'),
          apiFetch('/api/dashboard/kpi-por-sprint'),
          apiFetch('/api/dashboard/horas-por-sprint'),
          apiFetch('/api/dashboard/resumen-sprints'),
          apiFetch('/api/dashboard/contribuciones-por-sprint'),
        ]);
      setDatos({ personalWork, statusDist,
                 kpiPorSprint, horasPorSprint, resumenSprints, contribucionesPorSprint });
      setUltimaAct(new Date());
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDashboard();
    const id = setInterval(cargarDashboard, 3_600_000);
    return () => clearInterval(id);
  }, [cargarDashboard]);

  // Fetch sprint list on mount and default to the ACTIVE sprint
  useEffect(() => {
    apiFetch('/api/sprints')
      .then(list => {
        setSprints(list || []);
        const active = (list || []).find(s => s.estado === 'current' || s.estado === 'ACTIVE');
        if (active) setSelectedSprintId(active.idSprint);
      })
      .catch(() => { /* non-fatal: dropdown simply stays empty */ });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = () => setDropdownOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownOpen]);

  const personal  = datos.personalWork            ?? [];
  const statusDist = datos.statusDist             ?? [];
  const resumen   = datos.resumenSprints          ?? [];
  const kpi       = datos.kpiPorSprint            ?? [];
  const horas     = datos.horasPorSprint          ?? [];
  const contrib   = datos.contribucionesPorSprint ?? [];

  const totalCompletadas = kpi.reduce((s, d)    => s + (Number(d.tasksCompletadas) || 0), 0);
  const totalHorasReales = horas.reduce((s, d)  => s + (Number(d.horasReales)      || 0), 0);
  const totalEstimadas   = resumen.reduce((s, r) => s + (Number(r.horasEstimadas)  || 0), 0);
  const totalReales      = resumen.reduce((s, r) => s + (Number(r.horasReales)     || 0), 0);
  const eficiencia       = totalEstimadas > 0 ? Math.round((totalReales / totalEstimadas) * 100) : 0;

  const activo = resumen.find(s => s.estado === 'ACTIVE');

  const maxEstatus = Math.max(...statusDist.map(d => d.cantidad ?? 0), 1);

  const ORDER = { ACTIVE: 0, FUTURO: 1, PASADO: 2 };
  const resumenConTareas = resumen
    .filter(s => (s.totalTareas ?? 0) > 0)
    .sort((a, b) => (ORDER[a.estado] ?? 3) - (ORDER[b.estado] ?? 3));

  // Sprint selector helpers
  const selectedSprint     = sprints.find(s => s.idSprint === selectedSprintId) ?? null;
  const selectedSprintName = selectedSprint?.nombre ?? null;

  // Filtered datasets (applied when a specific sprint is chosen)
  const kpiFiltered    = selectedSprintName ? kpi.filter(d    => d.sprint === selectedSprintName) : kpi;
  const horasFiltered  = selectedSprintName ? horas.filter(d  => d.sprint === selectedSprintName) : horas;
  const contribFiltered = selectedSprintName ? contrib.filter(d => d.sprint === selectedSprintName) : contrib;

  const resumenConTareasFiltered = selectedSprintName
    ? resumenConTareas.filter(s => s.sprint === selectedSprintName)
    : resumenConTareas;

  // Gauge data: use selected sprint if one is chosen, otherwise fall back to the ACTIVE sprint
  const gaugeSource  = selectedSprintName
    ? (resumen.find(s => s.sprint === selectedSprintName) ?? activo)
    : activo;
  const pctGaugeDisplay   = Number(gaugeSource?.porcentaje ?? 0);
  const complGaugeDisplay = gaugeSource?.completadas ?? 0;
  const restGaugeDisplay  = (gaugeSource?.totalTareas ?? 0) - (gaugeSource?.completadas ?? 0);

  const { pivotado: dataKpi,   sprints: sprintsKpi   } = pivotarDatos(kpiFiltered,    'tasksCompletadas');
  const { pivotado: dataHoras, sprints: sprintsHoras  } = pivotarDatos(horasFiltered,  'horasReales');
  const { pivotado: dataCont,  sprints: sprintsCont   } = pivotarDatos(contribFiltered, 'tareas');

  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 320, color: '#94a3b8', fontSize: 14 }}>
      Loading sprint metrics…
    </div>
  );

  if (error) return (
    <div style={{ ...CARD, borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: 14 }}>
      <strong>Error:</strong> {error}
      <br />
      <button onClick={cargarDashboard} style={{
        marginTop: 12, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
        border: '1px solid var(--danger)', background: 'transparent',
        color: 'var(--danger)', fontSize: 13, fontWeight: 600,
      }}>
        Retry
      </button>
    </div>
  );

  return (
    <div style={{ padding: '24px 28px', background: '#f8fafc', minHeight: '100vh',
                  display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── SECTION 1 — Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>
            Dashboard
          </h1>
          {ultimaAct && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666666' }}>
              Updated {ultimaAct.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · refreshes every hour
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Sprint selector dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setDropdownOpen(v => !v); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: '1px solid #334155', background: '#1e293b',
                color: '#f1f5f9', boxShadow: 'var(--shadow-sm)',
              }}
            >
              {selectedSprintName ?? 'All Sprints'}
              {/* chevron-down icon */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {dropdownOpen && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 999,
                  background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  minWidth: 160, maxHeight: 200, overflowY: 'auto',
                }}
              >
                {/* All Sprints option */}
                <button
                  onClick={() => { setSelectedSprintId(null); setDropdownOpen(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 14px', fontSize: 13, cursor: 'pointer',
                    background: selectedSprintId === null ? '#334155' : 'transparent',
                    color: '#f1f5f9', border: 'none', fontWeight: selectedSprintId === null ? 700 : 400,
                  }}
                >
                  All Sprints
                </button>
                {sprints.map(sp => (
                  <button
                    key={sp.idSprint}
                    onClick={() => { setSelectedSprintId(sp.idSprint); setDropdownOpen(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 14px', fontSize: 13, cursor: 'pointer',
                      background: selectedSprintId === sp.idSprint ? '#334155' : 'transparent',
                      color: '#f1f5f9', border: 'none', fontWeight: selectedSprintId === sp.idSprint ? 700 : 400,
                    }}
                  >
                    {sp.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh button */}
          <button onClick={cargarDashboard} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: '1px solid #334155', background: '#1e293b',
            color: '#f1f5f9', boxShadow: 'var(--shadow-sm)',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── SECTION 2 — 4 KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'COMPLETED TASKS',    value: String(totalCompletadas)            },
          { label: 'TOTAL ACTUAL HOURS', value: `${totalHorasReales.toFixed(1)}h`  },
          { label: 'ACTIVE SPRINT',      value: selectedSprintName ?? activo?.sprint ?? 'None' },
          { label: 'EFFICIENCY',         value: `${eficiencia}%`                    },
        ].map(({ label, value }) => (
          <div key={label} style={CARD}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                          letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 8 }}>
              {label}
            </div>
            <div style={{ fontSize: 44, fontWeight: 700, color: ACENTO, lineHeight: 1.1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── SECTION 3 — Gauge + Status Distribution ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={CARD}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 4 }}>
            Current Sprint
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>
            Progress
          </div>
          <GaugeSprint
            pct={pctGaugeDisplay}
            completadas={complGaugeDisplay}
            restantes={restGaugeDisplay}
            nombreSprint={gaugeSource?.sprint ?? null}
          />
        </div>

        <div style={CARD}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 4 }}>
            Tasks
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>
            Status Distribution
          </div>
          {statusDist.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {statusDist.map((item, i) => (
                <div key={i}>
                  <div style={{ height: 6, borderRadius: 999, backgroundColor: '#334155',
                                overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{
                      height: '100%', borderRadius: 999, transition: 'width 0.5s ease',
                      width: `${Math.round((item.cantidad / maxEstatus) * 100)}%`,
                      backgroundColor: i === 0 ? ACENTO
                        : i === statusDist.length - 1 ? '#94a3b8' : ACENTO_SOFT,
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                                fontSize: 13, color: '#cbd5e1' }}>
                    <span style={{ textTransform: 'capitalize' }}>{item.estatus}</span>
                    <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
                      {item.cantidad}{' '}
                      <span style={{ color: '#94a3b8', fontWeight: 400 }}>
                        ({item.porcentaje}%)
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '32px 0' }}>
              No tasks registered
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 4 — Tasks Completadas por Developer por Sprint ── */}
      <div style={CARD}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>
          Tasks Completed by Developer per Sprint
        </div>
        {dataKpi.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataKpi} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                      barGap={6} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="usuario" tick={EJE_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#8d8d8d', paddingTop: 8 }} />
              {sprintsKpi.map((sprint, i) => (
                <Bar key={sprint} dataKey={sprint} name={sprint}
                     fill={COLORES_SPRINTS[i % COLORES_SPRINTS.length]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '60px 0' }}>
            No sprint KPI data
          </div>
        )}
      </div>

      {/* ── SECTION 5 — Total Horas Reales por Developer por Sprint ── */}
      <div style={CARD}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>
          Total Actual Hours by Developer per Sprint
        </div>
        {dataHoras.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataHoras} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                      barGap={6} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="usuario" tick={EJE_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#8d8d8d', paddingTop: 8 }} />
              {sprintsHoras.map((sprint, i) => (
                <Bar key={sprint} dataKey={sprint} name={sprint}
                     fill={COLORES_SPRINTS[i % COLORES_SPRINTS.length]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '60px 0' }}>
            No sprint hours data
          </div>
        )}
      </div>

      {/* ── SECTION 6 — Horas por Sprint + Velocidad del Equipo ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                            letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 4 }}>
                Planning Effectiveness
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
                Estimated vs Actual Hours per Sprint
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2,
                               backgroundColor: ACENTO_SOFT, display: 'inline-block' }} />
                Estimated
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2,
                               backgroundColor: ACENTO, display: 'inline-block' }} />
                Actual
              </span>
            </div>
          </div>
          {resumenConTareasFiltered.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={resumenConTareasFiltered} margin={{ top: 10, right: 10, left: -15, bottom: 5 }} barSize={18} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="sprint" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v, name) => [`${v} h`, name]} />
                <Bar dataKey="horasEstimadas" name="Estimated" fill={ACENTO_SOFT} radius={[3, 3, 0, 0]} />
                <Bar dataKey="horasReales" name="Actual" fill={ACENTO} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '60px 0' }}>
              No sprint hours data
            </div>
          )}
        </div>

        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                            letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 4 }}>
                Team Velocity
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
                Tasks Completed per Sprint
              </div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                           fontSize: 11, color: '#94a3b8' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2,
                             backgroundColor: ACENTO, display: 'inline-block' }} />
              Completed
            </span>
          </div>
          {resumenConTareasFiltered.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={resumenConTareasFiltered} margin={{ top: 10, right: 10, left: -15, bottom: 5 }} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="sprint" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} formatter={v => [`${v} tasks`, 'Completed']} />
                <Bar dataKey="completadas" name="Completed" fill={ACENTO} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '60px 0' }}>
              No sprint velocity data
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 7 — Personal Work + Contributions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={CARD}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 4 }}>
            Statistics
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>
            Individual Work
          </div>
          {personal.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <PieChart width={160} height={160}>
                <Pie data={personal} dataKey="tareas" nameKey="nombre"
                     cx={80} cy={80} innerRadius={40} outerRadius={72} stroke="none">
                  {personal.map((_, i) => (
                    <Cell key={i} fill={COLORES_SPRINTS[i % COLORES_SPRINTS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v, n) => [`${v} tasks`, n]} />
              </PieChart>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {personal.slice(0, 5).map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        display: 'inline-block',
                        backgroundColor: COLORES_SPRINTS[i % COLORES_SPRINTS.length],
                      }} />
                      <span style={{ color: '#f1f5f9', fontWeight: 500 }}>
                        {u.nombre || u.usuario || u.name}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#f1f5f9' }}>
                      {Number(u.porcentaje).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '40px 0' }}>
              No assigned tasks
            </div>
          )}
        </div>

        <div style={CARD}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 4 }}>
            Contributions
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>
            Contributions per Sprint
          </div>
          {dataCont.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataCont} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                        barGap={6} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="usuario" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#8d8d8d', paddingTop: 8 }} />
                {sprintsCont.map((sprint, i) => (
                  <Bar key={sprint} dataKey={sprint} name={sprint}
                       fill={COLORES_SPRINTS[i % COLORES_SPRINTS.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '40px 0' }}>
              No contribution data
            </div>
          )}
        </div>
      </div>

      {/* ── Resumen de Sprints ── */}
      <div style={CARD}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>
          Sprint Summary
        </div>
        {resumenConTareas.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {resumenConTareas.map((sprint, i) => (
              <div key={i} style={{
                padding: '12px 14px', borderRadius: 10,
                border: '1px solid #475569',
                backgroundColor: sprint.estado === 'ACTIVE' ? `${ACENTO}22` : '#263548',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              gap: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BadgeEstado estado={sprint.estado} />
                    <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14 }}>
                      {sprint.sprint}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {sprint.completadas} / {sprint.totalTareas} completed
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 999, backgroundColor: '#334155',
                              overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    height: '100%', borderRadius: 999, transition: 'width 0.5s ease',
                    width: `${sprint.porcentaje}%`,
                    backgroundColor: sprint.estado === 'ACTIVE' ? ACENTO
                      : sprint.estado === 'PASADO' ? '#94a3b8' : ACENTO_SOFT,
                  }} />
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Est: {sprint.horasEstimadas}h · Act: {sprint.horasReales}h
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>
            No sprints with tasks
          </div>
        )}
      </div>
    </div>
  );
}