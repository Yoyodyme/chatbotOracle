import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer,
} from 'recharts';
import { fetchTodoDashboard, fetchSprintHours } from '../api/dashboard';

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
    ACTIVO: { label: 'Active', bg: '#d1fae5',         color: '#065f46'           },
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
  const [datos, setDatos]           = useState(null);
  const [cargando, setCargando]     = useState(true);
  const [error, setError]           = useState(null);
  const [ultimaAct, setUltimaAct]   = useState(null);
  const [periodoSprint, setPeriodoSprint] = useState('current');
  const [sprintHorasCargando, setSprintHorasCargando] = useState(false);

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

  const cambiarSprint = useCallback(async (s) => {
    if (s === periodoSprint) return;
    setPeriodoSprint(s);
    setSprintHorasCargando(true);
    try {
      const horas = await fetchSprintHours(s);
      setDatos(prev => ({ ...prev, weeklyHours: horas }));
    } catch (_) {
      // mantiene los datos anteriores si falla
    } finally {
      setSprintHorasCargando(false);
    }
  }, [periodoSprint]);

  const totalCompletadas = kpi.reduce((s, d)    => s + (Number(d.tasksCompletadas) || 0), 0);
  const totalHorasReales = horas.reduce((s, d)  => s + (Number(d.horasReales)      || 0), 0);
  const totalEstimadas   = resumen.reduce((s, r) => s + (Number(r.horasEstimadas)  || 0), 0);
  const totalReales      = resumen.reduce((s, r) => s + (Number(r.horasReales)     || 0), 0);
  const eficiencia       = totalEstimadas > 0 ? Math.round((totalReales / totalEstimadas) * 100) : 0;

  const activo     = resumen.find(s => s.estado === 'ACTIVO');
  const pctGauge   = Number(activo?.porcentaje ?? 0);
  const complGauge = activo?.completadas ?? 0;
  const restGauge  = (activo?.totalTareas ?? 0) - (activo?.completadas ?? 0);

  const maxEstatus = Math.max(...statusDist.map(d => d.cantidad ?? 0), 1);

  /* ── Loading ── */
  if (cargando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: 'var(--text-muted)', gap: 10, fontSize: 14 }}>
        <div style={{ width: 16, height: 16, border: `2px solid var(--border)`, borderTopColor: ACENTO, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        Loading dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: 'var(--danger)', background: '#fff5f5', borderRadius: 8, border: '1px solid #fca5a5', fontSize: 14 }}>
        Error: {error}
        <button onClick={cargar} style={{ marginLeft: 12, padding: '4px 12px', borderRadius: 4, border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: 13 }}>
          Retry
        </button>
      </div>
    );
  }

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
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Updated {ultimaAct.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · refreshes every hour
            </span>
          )}
        </div>
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

      {/* ── SECTION 2 — 4 KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'COMPLETED TASKS',    value: String(totalCompletadas)            },
          { label: 'TOTAL ACTUAL HOURS', value: `${totalHorasReales.toFixed(1)}h`  },
          { label: 'ACTIVE SPRINT',      value: activo?.sprint ?? 'None'            },
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

        {/* ── Fila 2: Sprint + Time Comparison ── */}
        <Tarjeta>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>SPRINT</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Progress</div>
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

      {/* ── SECTION 6 — Sprint Hours Breakdown ── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
            Sprint Hours Breakdown
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#94a3b8' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%',
                             backgroundColor: ACENTO_SOFT, display: 'inline-block' }} />
              Estimated
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%',
                             backgroundColor: ACENTO, display: 'inline-block' }} />
              Actual
            </span>
          </div>
        </div>
        {resumenConTareas.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={resumenConTareas} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                      barGap={6} barCategoryGap="36%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="sprint" tick={EJE_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP} />
              <Bar dataKey="horasEstimadas" name="Estimated (h)" radius={[3, 3, 0, 0]} fill={ACENTO_SOFT} />
              <Bar dataKey="horasReales"    name="Actual (h)"    radius={[3, 3, 0, 0]} fill={ACENTO} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '60px 0' }}>
            No sprint hours data
          </div>
        )}
      </div>

      {/* ── SECTION 7 — Horas por Sprint + Velocidad del Equipo ── */}
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
          {resumenConTareas.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={resumenConTareas} margin={{ top: 10, right: 10, left: -15, bottom: 5 }} barSize={18} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="sprint" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v, name) => [`${v} h`, name]} />
                <Bar dataKey="horasEstimadas" name="Estimated" fill={ACENTO_SOFT} radius={[3, 3, 0, 0]} />
                <Bar dataKey="horasReales" name="Actual" fill={ACENTO} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No tasks closed in the last 6 months
            </div>
          )}
        </div>

        {/* ── Fila 3: Personal Work + Team Velocity ── */}
        <Tarjeta>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div><Etiqueta>Statistics</Etiqueta><Titulo mb={0}>Personal work</Titulo></div>
            <div style={{ fontSize: 11, padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)' }}>
              Active sprint
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 8 — Personal Work + Contributions ── */}
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
                <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid var(--border)', fontSize: 11 }} formatter={(v, n) => [`${v} tasks`, n]} />
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
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No tasks assigned
            </div>
          )}
        </div>

        <Tarjeta>
          <Etiqueta>Team Velocity</Etiqueta>
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{sprint.completadas ?? 0} tasks</span>
            <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 500 }}>● completed</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={velocity} margin={{ top: 4, right: 4, bottom: 0, left: -22 }} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="dia" tick={EJE_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} formatter={v => [`${v} tasks`, 'Completed']} />
              <Bar dataKey="tareas" radius={[3, 3, 0, 0]}>
                {velocity.map((entry, i) => (
                  <Cell key={i} fill={entry.tareas === maxVel && entry.tareas > 0 ? ACENTO : ACENTO_SOFT} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Tarjeta>

        {/* ── Fila 4: Contributions + Test Results ── */}
        <Tarjeta>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div><Etiqueta>Code</Etiqueta><Titulo mb={0}>Contributions</Titulo></div>
            <div style={{ fontSize: 11, padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)' }}>Month</div>
          </div>
          {dataCont.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataCont} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                        barGap={6} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="usuario" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} formatter={v => [`${v} tasks`, 'Contributions']} />
                <Bar dataKey="tareas" radius={[3, 3, 0, 0]}>
                  {contrib.map((_, i) => <Cell key={i} fill={i === 0 ? ACENTO : ACENTO_SOFT} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No contributions this month
            </div>
          )}
        </div>
      </div>

        <Tarjeta>
          <Etiqueta>Tasks</Etiqueta>
          <Titulo>Status distribution</Titulo>
          {statusDist.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {statusDist.map((item, i) => (
                <div key={i}>
                  <div style={{ height: 10, borderRadius: 99, background: 'var(--bg-base)', overflow: 'hidden', marginBottom: 5 }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.round((item.cantidad / maxEstatus) * 100)}%`,
                      background: i === 0 ? 'var(--text-muted)' : i === statusDist.length - 1 ? ACENTO : ACENTO_SOFT,
                      borderRadius: 99,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{item.estatus}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {item.cantidad} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({item.porcentaje}%)</span>
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {sprint.completadas} / {sprint.totalTareas} completed
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No tasks registered
            </div>
          )}
        </Tarjeta>

        {/* ── Sprint Hours (ancho completo) ── */}
        <Tarjeta style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div><Etiqueta>Statistics</Etiqueta><Titulo mb={0}>Sprint Hours</Titulo></div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ label: 'Past Sprint', value: 'past' }, { label: 'Current Sprint', value: 'current' }, { label: 'Next Sprint', value: 'next' }].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => cambiarSprint(value)}
                  style={{
                    padding: '3px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                    background: periodoSprint === value ? '#1d2939' : 'transparent',
                    color: periodoSprint === value ? '#fff' : 'var(--text-muted)',
                    border: periodoSprint === value ? 'none' : '1px solid var(--border)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>
            No sprints with tasks
          </div>
          {sprintHorasCargando ? (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, gap: 8 }}>
              <div style={{ width: 14, height: 14, border: `2px solid var(--border)`, borderTopColor: ACENTO, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Loading…
            </div>
          ) : weekly.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={weekly} margin={{ top: 4, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="periodo" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} />
                <Line type="monotone" dataKey="horasEstimadas" stroke={ACENTO_SOFT} strokeWidth={2} dot={{ r: 4, fill: ACENTO_SOFT, stroke: '#fff', strokeWidth: 2 }} name="Estimadas (h)" />
                <Line type="monotone" dataKey="horasReales"    stroke={ACENTO}     strokeWidth={2} dot={{ r: 4, fill: ACENTO,     stroke: '#fff', strokeWidth: 2 }} name="Reales (h)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No hours data for this sprint
            </div>
          )}
        </Tarjeta>

      </div>
    </div>
  );
}
