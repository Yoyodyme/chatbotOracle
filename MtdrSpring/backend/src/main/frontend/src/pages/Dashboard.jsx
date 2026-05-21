import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer,
} from 'recharts';
import { fetchTodoDashboard } from '../api/dashboard';

// DevOps Modern Palette: Indigo, Cyan, Emerald, Violet
const ACCENT           = '#6366f1';
const ACCENT_SOFT      = '#4f46e5';
const ACCENT_LIGHTER   = '#e0e7ff';
const GRID_COLOR       = '#1e293b';
const TICK_COLOR       = '#64748b';
const COLORS_PIE       = ['#6366f1', '#06b6d4', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'];
const COLORS_SPRINT    = ['#6366f1', '#06b6d4', '#10b981', '#8b5cf6', '#ec4899'];
const EJE_TICK         = { fontSize: 11, fill: TICK_COLOR };

/* ── Sub-componentes ─────────────────────────────────────────────────────── */

function Card({ children, style = {} }) {
  return (
    <div style={{
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(71, 85, 105, 0.3)',
      borderRadius: '12px',
      padding: '20px 22px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
      minWidth: 0,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 3,
    }}>
      {children}
    </div>
  );
}

function Title({ children, mb = 16 }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: mb }}>
      {children}
    </div>
  );
}

function KpiCard({ label, valor, suffix = '' }) {
  return (
    <Card>
      <Label>{label}</Label>
      <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.1, color: ACCENT, letterSpacing: '-0.04em', marginTop: 6 }}>
        {valor}
        {suffix && <span style={{ fontSize: 22, fontWeight: 600, marginLeft: 3 }}>{suffix}</span>}
      </div>
    </Card>
  );
}

function GaugeSprint({ pct, completadas, restantes, nombreSprint }) {
  const seguro = Math.min(100, Math.max(0, Number(pct) || 0));
  const datosGauge = [{ value: seguro }, { value: 100 - seguro }];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', height: 158 }}>
        <PieChart width={280} height={158}>
          <Pie
            data={datosGauge}
            startAngle={180} endAngle={0}
            cx={140} cy={143}
            innerRadius={84} outerRadius={126}
            dataKey="value" stroke="none"
          >
            <Cell fill={ACCENT} />
            <Cell fill='#334155' />
          </Pie>
        </PieChart>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          textAlign: 'center', lineHeight: 1,
        }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.03em' }}>
            {seguro}%
          </div>
          <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
            {nombreSprint
              ? <><strong>{nombreSprint}</strong> — {completadas} completed</>
              : 'No active sprint'}
          </div>
        </div>
      </div>
    </div>
  );
}

function BadgeStatus({ status }) {
  const statusMap = {
    PASADO: { label: 'Past', bg: '#1e3a5f', color: '#93c5fd' },
    ACTIVO: { label: 'Active', bg: '#064e3b', color: '#86efac' },
    FUTURO: { label: 'Upcoming', bg: '#1e3a8a', color: '#93c5fd' },
  };
  const s = statusMap[status] ?? statusMap.FUTURO;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '4px 10px',
      borderRadius: 99, background: s.bg, color: s.color,
      textTransform: 'uppercase', letterSpacing: '0.05em',
      border: `1px solid ${s.color}33`,
    }}>
      {s.label}
    </span>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function pivotarDatos(datos, campoClave, campoValor) {
  if (!datos || datos.length === 0) return [];
  const sprints  = [...new Set(datos.map(d => d.sprint))].sort();
  const usuarios = [...new Set(datos.map(d => d.usuario))];
  return usuarios.map(usuario => {
    const fila = { usuario };
    sprints.forEach(sprint => {
      const encontrado = datos.find(d => d.usuario === usuario && d.sprint === sprint);
      fila[sprint] = encontrado ? (Number(encontrado[campoValor]) || 0) : 0;
    });
    return fila;
  });
}

function GroupedBarChart({ datos, campoValor, altura = 280 }) {
  if (!datos || datos.length === 0) {
    return (
      <div style={{ height: altura, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
        No sprint data available
      </div>
    );
  }

  const sprintsUnicos = [...new Set(datos.map(d => d.sprint))].sort();
  const pivotado = pivotarDatos(datos, 'sprint', campoValor);

  if (pivotado.length === 0) {
    return (
      <div style={{ height: altura, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
        No sprint data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={pivotado} margin={{ top: 4, right: 20, bottom: 0, left: -20 }} barGap={3} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="usuario" tick={EJE_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${GRID_COLOR}`, fontSize: 12, background: '#0f172a', color: '#f1f5f9' }} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }} />
        {sprintsUnicos.map((sprint, i) => (
          <Bar key={sprint} dataKey={sprint} name={sprint}
               fill={COLORS_SPRINT[i % COLORS_SPRINT.length]}
               radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Componente principal ────────────────────────────────────────────────── */

export default function Dashboard() {
  const [datos, setDatos]                  = useState(null);
  const [cargando, setCargando]            = useState(true);
  const [error, setError]                  = useState(null);
  const [ultimaAct, setUltimaAct]          = useState(null);
  const [sprintSeleccionado, setSprintSel] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetchTodoDashboard();
      setDatos(res);
      setUltimaAct(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 3_600_000);
    return () => clearInterval(id);
  }, [cargar]);

  useEffect(() => {
    if (datos?.resumenSprints?.length > 0 && !sprintSeleccionado) {
      const activo = datos.resumenSprints.find(s => s.estado === 'ACTIVO');
      setSprintSel(activo?.sprint ?? datos.resumenSprints[datos.resumenSprints.length - 1].sprint);
    }
  }, [datos, sprintSeleccionado]);

  /* ── Datos normalizados ── */
  const sprint                  = datos?.sprint                  ?? {};
  const timeCmp                 = datos?.timeComparison          ?? [];
  const velocity                = datos?.teamVelocity            ?? [];
  const personal                = datos?.personalWork            ?? [];
  const statusDist              = datos?.statusDist              ?? [];
  const resumenSprints          = datos?.resumenSprints          ?? [];
  const kpiPorSprint            = datos?.kpiPorSprint            ?? [];
  const horasPorSprint          = datos?.horasPorSprint          ?? [];
  const contribucionesPorSprint = datos?.contribucionesPorSprint ?? [];

  const maxVel     = Math.max(...velocity.map(d => d.tareas ?? 0), 1);
  const maxEstatus = Math.max(...statusDist.map(d => d.cantidad ?? 0), 1);

  /* ── KPI Calculations ── */
  const totalCompletadas = kpiPorSprint.reduce((sum, d) => sum + (Number(d.tasksCompletadas) || 0), 0);
  const totalHorasReales = horasPorSprint.reduce((sum, d) => sum + (Number(d.horasReales) || 0), 0);
  const totalEstimadas = resumenSprints.reduce((sum, s) => sum + (Number(s.horasEstimadas) || 0), 0);
  const totalRealesResumen = resumenSprints.reduce((sum, s) => sum + (Number(s.horasReales) || 0), 0);
  const eficiencia = totalEstimadas > 0 ? Math.round((totalRealesResumen / totalEstimadas) * 100) : 0;

  const sprintActivoResumen = resumenSprints.find(s => s.estado === 'ACTIVO');
  const pctGauge        = Number(sprintActivoResumen?.porcentaje ?? 0);
  const completadasGauge = sprintActivoResumen?.completadas ?? 0;
  const restantesGauge   = (sprintActivoResumen?.totalTareas ?? 0) - (sprintActivoResumen?.completadas ?? 0);
  const nombreSprintGauge = sprintActivoResumen?.sprint ?? null;

  const ordenEstado = { PASADO: 0, ACTIVO: 1, FUTURO: 2 };
  const sprintsFiltrados = resumenSprints
    .filter(s => Number(s.totalTareas) > 0)
    .slice()
    .sort((a, b) => (ordenEstado[a.estado] ?? 3) - (ordenEstado[b.estado] ?? 3));

  // FIX 1: Eliminar duplicados de sprints únicos para botones
  const sprintButtonsUnicos = Array.from(new Set(resumenSprints.map(s => s.sprint)));

  const sprintsPorEstado = {
    past:    [...resumenSprints].reverse().find(s => s.estado === 'PASADO'),
    current: resumenSprints.find(s => s.estado === 'ACTIVO'),
    next:    resumenSprints.find(s => s.estado === 'FUTURO'),
  };

  /* ── Loading ── */
  if (cargando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: '#94a3b8', gap: 10, fontSize: 14 }}>
        <div style={{ width: 16, height: 16, border: `2px solid ${ACCENT}`, borderTopColor: ACCENT, borderBottomColor: 'transparent', borderLeftColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        Loading Sprint metrics…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: '#f87171', background: 'rgba(127, 29, 29, 0.2)', borderRadius: 8, border: '1px solid rgba(248, 113, 113, 0.3)', fontSize: 14 }}>
        Error: {error}
        <button onClick={cargar} style={{ marginLeft: 12, padding: '4px 12px', borderRadius: 4, border: `1px solid #f87171`, background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 13 }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 48, background: '#0f172a' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 600, color: '#f1f5f9', letterSpacing: '-0.02em', marginBottom: 2 }}>
            Project Dashboard
          </h1>
          {ultimaAct && (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Updated {ultimaAct.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · refreshes hourly
            </span>
          )}
        </div>
        <button
          onClick={cargar}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: '1px solid rgba(71, 85, 105, 0.3)', background: 'rgba(15, 23, 42, 0.5)', color: '#cbd5e1', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Grid principal (4 columnas) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>

        {/* ── Sección 1: KPI Cards ── */}
        <KpiCard label="Completed Tasks"    valor={totalCompletadas} />
        <KpiCard label="Total Actual Hours" valor={totalHorasReales.toFixed(1)} suffix="h" />
        <KpiCard label="Active Sprint"      valor={sprintActivoResumen?.sprint ?? 'None'} />
        <KpiCard label="Efficiency"         valor={eficiencia} suffix="%" />

        {/* ── Sección 2: Gauge Sprint + Status Distribution ── */}
        <Card style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <Label>Sprint</Label>
              <Title mb={0}>Progress</Title>
            </div>
            {sprintActivoResumen && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: ACCENT, fontWeight: 500 }}>Remaining</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                  {restantesGauge} items
                </div>
              </div>
            )}
          </div>
          <GaugeSprint
            pct={pctGauge}
            completadas={completadasGauge}
            restantes={restantesGauge}
            nombreSprint={nombreSprintGauge}
          />
        </Card>

        <Card style={{ gridColumn: 'span 2' }}>
          <Label>Tasks</Label>
          <Title>Status Distribution</Title>
          {statusDist.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {statusDist.map((item, i) => (
                <div key={i}>
                  <div style={{ height: 10, borderRadius: 99, background: '#1e293b', overflow: 'hidden', marginBottom: 5 }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.round((item.cantidad / maxEstatus) * 100)}%`,
                      background: i === 0 ? '#475569' : i === statusDist.length - 1 ? ACCENT : ACCENT_LIGHTER,
                      borderRadius: 99,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#cbd5e1', textTransform: 'capitalize' }}>{item.estatus}</span>
                    <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                      {item.cantidad} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({item.porcentaje}%)</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
              No tasks registered
            </div>
          )}
        </Card>

        {/* ── Sección 3: Gráfica A ── */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <Title mb={4}>Tasks Completed by Developer per Sprint</Title>
          <GroupedBarChart datos={kpiPorSprint} campoValor="tasksCompletadas" altura={280} />
        </Card>

        {/* ── Sección 4: Gráfica B ── */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <Title mb={4}>Actual Hours Invested by Developer per Sprint</Title>
          <GroupedBarChart datos={horasPorSprint} campoValor="horasReales" altura={280} />
        </Card>

        {/* ── Sección 5: Resumen de Sprints ── */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <Title mb={14}>Sprint Summary</Title>
          {sprintsFiltrados.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sprintsFiltrados.map((s, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 100px 1fr 160px 120px',
                  alignItems: 'center',
                  gap: 16,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: s.estado === 'ACTIVO' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  border: s.estado === 'ACTIVO' ? `1px solid ${ACCENT}33` : '1px solid transparent',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#f1f5f9' }}>{s.sprint}</div>
                  <BadgeStatus estado={s.estado} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ height: 8, borderRadius: 99, background: '#1e293b', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${s.porcentaje}%`,
                        background: s.estado === 'ACTIVO' ? ACCENT : s.estado === 'PASADO' ? '#10b981' : ACCENT_LIGHTER,
                        borderRadius: 99,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{s.porcentaje}% complete</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                    <span style={{ color: '#94a3b8' }}>Est:</span> {s.horasEstimadas}h
                    {' · '}
                    <span style={{ color: '#94a3b8' }}>Real:</span> {s.horasReales}h
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'right' }}>
                    <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{s.completadas}</span>
                    <span style={{ color: '#94a3b8' }}> / {s.totalTareas} tasks</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
              No sprints with tasks
            </div>
          )}
        </Card>

        {/* ── Sección 6: Time Comparison + Team Velocity ── */}
        <Card style={{ gridColumn: 'span 2' }}>
          <Label>Planning Effectiveness</Label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Title mb={0}>Estimated vs Actual Hours</Title>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#94a3b8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT_LIGHTER, display: 'inline-block' }} /> Estimated
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, display: 'inline-block' }} /> Actual
              </span>
            </div>
          </div>
          {timeCmp.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={timeCmp} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="mes" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${GRID_COLOR}`, fontSize: 12, background: '#0f172a', color: '#f1f5f9' }} />
                <Line type="monotone" dataKey="horasEstimadas" stroke={ACCENT_LIGHTER} strokeWidth={2} dot={{ r: 3, fill: ACCENT_LIGHTER }} name="Estimated (h)" />
                <Line type="monotone" dataKey="horasReales"    stroke={ACCENT}     strokeWidth={2} dot={{ r: 4, fill: ACCENT }}     name="Actual (h)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
              No closed tasks in the last 6 months
            </div>
          )}
        </Card>

        <Card style={{ gridColumn: 'span 2' }}>
          <Label>Team Velocity</Label>
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{sprint.completadas ?? 0} tasks</span>
            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 500 }}>● completed</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={velocity} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="dia" tick={EJE_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${GRID_COLOR}`, fontSize: 12, background: '#0f172a', color: '#f1f5f9' }} formatter={v => [`${v} tasks`, 'Completed']} />
              <Bar dataKey="tareas" radius={[3, 3, 0, 0]}>
                {velocity.map((entry, i) => (
                  <Cell key={i} fill={entry.tareas === maxVel && entry.tareas > 0 ? ACCENT : ACCENT_LIGHTER} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* ── Sección 7: Personal Work + Contributions por Sprint ── */}
        <Card style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div><Label>Statistics</Label><Title mb={0}>Individual Performance</Title></div>
            <div style={{ fontSize: 11, padding: '4px 10px', border: `1px solid ${ACCENT}33`, borderRadius: 4, color: '#cbd5e1', background: 'rgba(99, 102, 241, 0.05)' }}>
              Overall
            </div>
          </div>
          {personal.length > 0 ? (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <PieChart width={140} height={140}>
                <Pie data={personal} dataKey="tareas" nameKey="nombre" cx={70} cy={70} innerRadius={38} outerRadius={64} stroke="none">
                  {personal.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${GRID_COLOR}`, fontSize: 11, background: '#0f172a', color: '#f1f5f9' }} formatter={(v, n) => [`${v} tasks`, n]} />
              </PieChart>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {personal.slice(0, 5).map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS_PIE[i % COLORS_PIE.length], display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ color: '#f1f5f9' }}>{u.nombre}</span>
                    </div>
                    <span style={{ color: '#cbd5e1', fontWeight: 500, marginLeft: 8 }}>
                      {Number(u.porcentaje).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
              No assigned tasks
            </div>
          )}
        </Card>

        <Card style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div><Label>Code</Label><Title mb={0}>Contributions per Sprint</Title></div>
          </div>
          <GroupedBarChart datos={contribucionesPorSprint} campoValor="tareas" altura={160} />
        </Card>

        {/* ── Sección 8: Sprint Hours ── */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div><Label>Statistics</Label><Title mb={0}>Sprint Hours Breakdown</Title></div>
            {/* FIX 1: Botones sin duplicados usando Set */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: 'past',    label: sprintsPorEstado.past?.sprint    ?? 'No previous sprint' },
                { key: 'current', label: sprintsPorEstado.current?.sprint ?? 'No active sprint'    },
                { key: 'next',    label: sprintsPorEstado.next?.sprint    ?? 'No upcoming sprint'  },
              ].map(({ key, label }) => {
                const existe    = sprintsPorEstado[key] != null;
                const isSelected = sprintSeleccionado === sprintsPorEstado[key]?.sprint;
                return (
                  <button
                    key={key}
                    onClick={() => existe && setSprintSel(sprintsPorEstado[key].sprint)}
                    disabled={!existe}
                    style={{
                      padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                      cursor: existe ? 'pointer' : 'not-allowed',
                      opacity: existe ? 1 : 0.4,
                      background: isSelected ? ACCENT : 'transparent',
                      color: isSelected ? '#0f172a' : '#cbd5e1',
                      border: isSelected ? `1px solid ${ACCENT}` : '1px solid #475569',
                      fontFamily: 'var(--font-body)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
              <span style={{ width: 20, height: 2, background: ACCENT_LIGHTER, display: 'inline-block', borderRadius: 1 }} /> Estimated
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
              <span style={{ width: 20, height: 2, background: ACCENT, display: 'inline-block', borderRadius: 1 }} /> Actual
            </span>
          </div>
          {resumenSprints.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={resumenSprints}
                margin={{ top: 4, right: 10, bottom: 0, left: -20 }}
                barGap={4}
                barCategoryGap="35%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="sprint" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${GRID_COLOR}`, fontSize: 12, background: '#0f172a', color: '#f1f5f9' }} />
                <Bar dataKey="horasEstimadas" name="Estimated (h)" radius={[3, 3, 0, 0]}>
                  {resumenSprints.map((s, i) => (
                    <Cell key={i} fill={sprintSeleccionado === s.sprint ? ACCENT_LIGHTER : '#334155'} />
                  ))}
                </Bar>
                <Bar dataKey="horasReales" name="Actual (h)" radius={[3, 3, 0, 0]}>
                  {resumenSprints.map((s, i) => (
                    <Cell key={i} fill={sprintSeleccionado === s.sprint ? ACCENT : '#475569'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
              No sprint hours data
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
