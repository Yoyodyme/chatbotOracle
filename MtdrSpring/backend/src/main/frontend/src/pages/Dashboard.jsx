import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer,
} from 'recharts';
import { fetchTodoDashboard } from '../api/dashboard';

const ACENTO         = '#066FCC';
const ACENTO_SOFT    = '#c5d9f0';
const GRIS_ARCO      = '#e4e9f0';
const COLORES_PIE    = [ACENTO, '#2d7d46', '#f59e0b', '#a855f7', '#06b6d4', '#da1e28'];
const COLORES_SPRINT = ['#066FCC', '#2d7d46', '#f59e0b', '#a855f7', '#06b6d4'];
const EJE_TICK       = { fontSize: 11, fill: '#8d8d8d' };

/* ── Sub-componentes ─────────────────────────────────────────────────────── */

function Tarjeta({ children, style = {} }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl)',
      padding: '20px 22px',
      boxShadow: 'var(--shadow-sm)',
      minWidth: 0,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Etiqueta({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 3,
    }}>
      {children}
    </div>
  );
}

function Titulo({ children, mb = 16 }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: mb }}>
      {children}
    </div>
  );
}

function KpiCard({ label, valor, suffix = '' }) {
  return (
    <Tarjeta>
      <Etiqueta>{label}</Etiqueta>
      <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.1, color: ACENTO, letterSpacing: '-0.04em', marginTop: 6 }}>
        {valor}
        {suffix && <span style={{ fontSize: 22, fontWeight: 600, marginLeft: 3 }}>{suffix}</span>}
      </div>
    </Tarjeta>
  );
}

function GaugeSprint({ pct, completadas, nombre }) {
  const seguro = Math.min(100, Math.max(0, pct));
  const datos  = [{ value: seguro }, { value: 100 - seguro }];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', height: 158 }}>
        <PieChart width={280} height={158}>
          <Pie
            data={datos}
            startAngle={180} endAngle={0}
            cx={140} cy={143}
            innerRadius={84} outerRadius={126}
            dataKey="value" stroke="none"
          >
            <Cell fill={ACENTO} />
            <Cell fill={GRIS_ARCO} />
          </Pie>
        </PieChart>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          textAlign: 'center', lineHeight: 1,
        }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            {seguro}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {nombre ? <strong>{nombre}</strong> : 'Sin sprint activo'} — {completadas} completadas
          </div>
        </div>
      </div>
    </div>
  );
}

function BadgeEstado({ estado }) {
  const colores = {
    PASADO: { bg: '#e5e7eb', color: '#374151' },
    ACTIVO: { bg: '#d1fae5', color: '#065f46' },
    FUTURO: { bg: '#dbeafe', color: '#1e40af' },
  };
  const c = colores[estado] ?? colores.FUTURO;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px',
      borderRadius: 99, background: c.bg, color: c.color,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {estado}
    </span>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function pivotarPorUsuario(datos, campoValor) {
  if (!datos || datos.length === 0) return { pivotado: [], sprints: [] };
  const sprints  = [...new Set(datos.map(d => d.sprint))];
  const usuarios = [...new Set(datos.map(d => d.usuario))];
  const pivotado = usuarios.map(u => {
    const fila = { usuario: u };
    sprints.forEach(s => {
      const entrada = datos.find(d => d.sprint === s && d.usuario === u);
      fila[s] = entrada ? entrada[campoValor] : 0;
    });
    return fila;
  });
  return { pivotado, sprints };
}

function GraficaBarrasAgrupadas({ datos, campoValor, altura = 280 }) {
  const { pivotado, sprints } = pivotarPorUsuario(datos, campoValor);
  if (pivotado.length === 0) {
    return (
      <div style={{ height: altura, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        No hay datos de sprints
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={pivotado} margin={{ top: 4, right: 20, bottom: 0, left: -10 }} barGap={3} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="usuario" tick={EJE_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 8 }} />
        {sprints.map((s, i) => (
          <Bar key={s} dataKey={s} name={s} fill={COLORES_SPRINT[i % COLORES_SPRINT.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Componente principal ────────────────────────────────────────────────── */

export default function Dashboard() {
  const [datos, setDatos]                   = useState(null);
  const [cargando, setCargando]             = useState(true);
  const [error, setError]                   = useState(null);
  const [ultimaAct, setUltimaAct]           = useState(null);
  const [sprintSeleccionado, setSprintSel]  = useState(null);

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
  const sprint               = datos?.sprint               ?? {};
  const timeCmp              = datos?.timeComparison       ?? [];
  const velocity             = datos?.teamVelocity         ?? [];
  const personal             = datos?.personalWork         ?? [];
  const statusDist           = datos?.statusDist           ?? [];
  const resumenSprints       = datos?.resumenSprints       ?? [];
  const kpiPorSprint         = datos?.kpiPorSprint         ?? [];
  const horasPorSprint       = datos?.horasPorSprint       ?? [];
  const contribucionesPorSprint = datos?.contribucionesPorSprint ?? [];

  const maxVel     = Math.max(...velocity.map(d => d.tareas ?? 0), 1);
  const maxEstatus = Math.max(...statusDist.map(d => d.cantidad ?? 0), 1);

  /* ── KPI computados ── */
  const sprintActivoResumen   = resumenSprints.find(s => s.estado === 'ACTIVO');
  const totalCompletadas      = sprint.completadas ?? 0;
  const totalHorasReales      = resumenSprints.reduce((sum, s) => sum + (s.horasReales || 0), 0);
  const totalHorasEstimadas   = resumenSprints.reduce((sum, s) => sum + (s.horasEstimadas || 0), 0);
  const eficiencia            = totalHorasEstimadas > 0
    ? Math.round((totalHorasReales / totalHorasEstimadas) * 1000) / 10
    : 0;

  const pctGauge        = sprintActivoResumen ? Number(sprintActivoResumen.porcentaje) : Number(sprint.porcentaje ?? 0);
  const completadasGauge = sprintActivoResumen?.completadas ?? sprint.completadas ?? 0;

  /* ── Loading ── */
  if (cargando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: 'var(--text-muted)', gap: 10, fontSize: 14 }}>
        <div style={{ width: 16, height: 16, border: `2px solid var(--border)`, borderTopColor: ACENTO, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        Cargando dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: 'var(--danger)', background: '#fff5f5', borderRadius: 8, border: '1px solid #fca5a5', fontSize: 14 }}>
        Error: {error}
        <button onClick={cargar} style={{ marginLeft: 12, padding: '4px 12px', borderRadius: 4, border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: 13 }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 48 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 2 }}>
            Dashboard
          </h1>
          {ultimaAct && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Actualizado {ultimaAct.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · actualiza cada hora
            </span>
          )}
        </div>
        <button
          onClick={cargar}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* ── Grid principal (4 columnas) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>

        {/* ── Sección 1: KPI Cards ── */}
        <KpiCard label="Tasks Completadas"    valor={totalCompletadas} />
        <KpiCard label="Horas Reales Totales" valor={Math.round(totalHorasReales * 10) / 10} suffix="h" />
        <KpiCard label="Sprint Activo"        valor={sprintActivoResumen?.sprint ?? 'Sin sprint activo'} />
        <KpiCard label="Eficiencia"           valor={eficiencia} suffix="%" />

        {/* ── Sección 2: Gauge Sprint + Status Distribution ── */}
        <Tarjeta style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>SPRINT</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Progreso</div>
            </div>
            {sprintActivoResumen && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: ACENTO, fontWeight: 500 }}>Restantes</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {(sprintActivoResumen.totalTareas - sprintActivoResumen.completadas)} tareas
                </div>
              </div>
            )}
          </div>
          <GaugeSprint
            pct={pctGauge}
            completadas={completadasGauge}
            nombre={sprintActivoResumen?.sprint}
          />
        </Tarjeta>

        <Tarjeta style={{ gridColumn: 'span 2' }}>
          <Etiqueta>Tareas</Etiqueta>
          <Titulo>Distribución por estatus</Titulo>
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
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Sin tareas registradas
            </div>
          )}
        </Tarjeta>

        {/* ── Sección 3: Gráfica A — Tasks completadas por developer por sprint ── */}
        <Tarjeta style={{ gridColumn: '1 / -1' }}>
          <Titulo mb={4}>Tasks Completadas por Developer por Sprint</Titulo>
          <GraficaBarrasAgrupadas datos={kpiPorSprint} campoValor="tasksCompletadas" altura={280} />
        </Tarjeta>

        {/* ── Sección 4: Gráfica B — Horas reales por developer por sprint ── */}
        <Tarjeta style={{ gridColumn: '1 / -1' }}>
          <Titulo mb={4}>Total Horas Reales por Developer por Sprint</Titulo>
          <GraficaBarrasAgrupadas datos={horasPorSprint} campoValor="horasReales" altura={280} />
        </Tarjeta>

        {/* ── Sección 5: Resumen de Sprints ── */}
        <Tarjeta style={{ gridColumn: '1 / -1' }}>
          <Titulo mb={14}>Resumen de Sprints</Titulo>
          {resumenSprints.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {resumenSprints.map((s, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 80px 1fr 160px 120px',
                  alignItems: 'center',
                  gap: 16,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-xl)',
                  background: s.estado === 'ACTIVO' ? 'rgba(6,111,204,0.05)' : 'transparent',
                  border: s.estado === 'ACTIVO' ? `1px solid ${ACENTO_SOFT}` : '1px solid transparent',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{s.sprint}</div>
                  <BadgeEstado estado={s.estado} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ height: 8, borderRadius: 99, background: 'var(--bg-base)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${s.porcentaje}%`,
                        background: s.estado === 'ACTIVO' ? ACENTO : s.estado === 'PASADO' ? '#2d7d46' : ACENTO_SOFT,
                        borderRadius: 99,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.porcentaje}% completado</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Est:</span> {s.horasEstimadas}h
                    {' · '}
                    <span style={{ color: 'var(--text-muted)' }}>Real:</span> {s.horasReales}h
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.completadas}</span>
                    <span style={{ color: 'var(--text-muted)' }}> / {s.totalTareas} tareas</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No hay datos de sprints
            </div>
          )}
        </Tarjeta>

        {/* ── Sección 6: Time Comparison + Team Velocity ── */}
        <Tarjeta style={{ gridColumn: 'span 2' }}>
          <Etiqueta>Planning effectiveness</Etiqueta>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Titulo mb={0}>Estimated vs Real Hours</Titulo>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACENTO_SOFT, display: 'inline-block' }} /> Estimated
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACENTO, display: 'inline-block' }} /> Real
              </span>
            </div>
          </div>
          {timeCmp.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={timeCmp} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} />
                <Line type="monotone" dataKey="horasEstimadas" stroke={ACENTO_SOFT} strokeWidth={2} dot={{ r: 3, fill: ACENTO_SOFT }} name="Estimadas (h)" />
                <Line type="monotone" dataKey="horasReales"    stroke={ACENTO}     strokeWidth={2} dot={{ r: 4, fill: ACENTO }}     name="Reales (h)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Sin tareas cerradas en los últimos 6 meses
            </div>
          )}
        </Tarjeta>

        <Tarjeta style={{ gridColumn: 'span 2' }}>
          <Etiqueta>Team Velocity</Etiqueta>
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{sprint.completadas ?? 0} tareas</span>
            <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 500 }}>● completadas</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={velocity} margin={{ top: 4, right: 4, bottom: 0, left: -22 }} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="dia" tick={EJE_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} formatter={v => [`${v} tareas`, 'Completadas']} />
              <Bar dataKey="tareas" radius={[3, 3, 0, 0]}>
                {velocity.map((entry, i) => (
                  <Cell key={i} fill={entry.tareas === maxVel && entry.tareas > 0 ? ACENTO : ACENTO_SOFT} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Tarjeta>

        {/* ── Sección 7: Personal Work + Contributions por Sprint ── */}
        <Tarjeta style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div><Etiqueta>Statistics</Etiqueta><Titulo mb={0}>Personal work</Titulo></div>
            <div style={{ fontSize: 11, padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)' }}>
              Global
            </div>
          </div>
          {personal.length > 0 ? (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <PieChart width={140} height={140}>
                <Pie data={personal} dataKey="tareas" nameKey="nombre" cx={70} cy={70} innerRadius={38} outerRadius={64} stroke="none">
                  {personal.map((_, i) => <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid var(--border)', fontSize: 11 }} formatter={(v, n) => [`${v} tareas`, n]} />
              </PieChart>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {personal.slice(0, 5).map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORES_PIE[i % COLORES_PIE.length], display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-primary)' }}>{u.nombre}</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500, marginLeft: 8 }}>
                      {Number(u.porcentaje).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Sin tareas asignadas
            </div>
          )}
        </Tarjeta>

        <Tarjeta style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div><Etiqueta>Code</Etiqueta><Titulo mb={0}>Contributions por Sprint</Titulo></div>
          </div>
          <GraficaBarrasAgrupadas datos={contribucionesPorSprint} campoValor="tareas" altura={160} />
        </Tarjeta>

        {/* ── Sección 8: Sprint Hours ── */}
        <Tarjeta style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div><Etiqueta>Statistics</Etiqueta><Titulo mb={0}>Sprint Hours</Titulo></div>
            {resumenSprints.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {resumenSprints.map(s => (
                  <button
                    key={s.sprint}
                    onClick={() => setSprintSel(s.sprint)}
                    style={{
                      padding: '3px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                      background: sprintSeleccionado === s.sprint ? '#1d2939' : 'transparent',
                      color: sprintSeleccionado === s.sprint ? '#fff' : 'var(--text-muted)',
                      border: sprintSeleccionado === s.sprint ? 'none' : '1px solid var(--border)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {s.sprint}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ width: 20, height: 2, background: ACENTO_SOFT, display: 'inline-block', borderRadius: 1 }} /> Horas estimadas
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ width: 20, height: 2, background: ACENTO, display: 'inline-block', borderRadius: 1 }} /> Horas reales
            </span>
          </div>
          {resumenSprints.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={resumenSprints}
                margin={{ top: 4, right: 10, bottom: 0, left: -10 }}
                barGap={4}
                barCategoryGap="35%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="sprint" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} />
                <Bar dataKey="horasEstimadas" name="Estimadas (h)" radius={[3, 3, 0, 0]}>
                  {resumenSprints.map((s, i) => (
                    <Cell key={i} fill={sprintSeleccionado === s.sprint ? ACENTO_SOFT : '#dce8f7'} />
                  ))}
                </Bar>
                <Bar dataKey="horasReales" name="Reales (h)" radius={[3, 3, 0, 0]}>
                  {resumenSprints.map((s, i) => (
                    <Cell key={i} fill={sprintSeleccionado === s.sprint ? ACENTO : '#5a9fd4'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No hay datos de horas por sprint
            </div>
          )}
        </Tarjeta>

      </div>
    </div>
  );
}
