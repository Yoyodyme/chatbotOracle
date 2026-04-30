import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ResponsiveContainer,
} from 'recharts';
import { fetchTodoDashboard, fetchWeeklyHours } from '../api/dashboard';

const ACENTO      = '#066FCC';
const ACENTO_SOFT = '#c5d9f0';
const GRIS_ARCO   = '#e4e9f0';
const COLORES_PIE = [ACENTO, '#2d7d46', '#f59e0b', '#a855f7', '#06b6d4', '#da1e28'];
const EJE_TICK    = { fontSize: 11, fill: '#8d8d8d' };

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

function Tendencia({ valor }) {
  const pos = valor >= 0;
  return (
    <span style={{ fontSize: 12, fontWeight: 500, color: pos ? 'var(--success)' : 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {pos ? '▲' : '▼'} {Math.abs(Number(valor)).toFixed(1)}%
    </span>
  );
}

function GaugeSprint({ pct, completadas, restantes }) {
  const seguro = Math.min(100, Math.max(0, pct));
  const datos = [{ value: seguro }, { value: 100 - seguro }];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', height: 158 }}>
        <PieChart width={280} height={158}>
          <Pie
            data={datos}
            startAngle={180}
            endAngle={0}
            cx={140}
            cy={143}
            innerRadius={84}
            outerRadius={126}
            dataKey="value"
            stroke="none"
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
            Work items done: <strong>{completadas}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────────────────── */

export default function Dashboard() {
  const [datos, setDatos]           = useState(null);
  const [cargando, setCargando]     = useState(true);
  const [error, setError]           = useState(null);
  const [ultimaAct, setUltimaAct]   = useState(null);
  const [periodoHoras, setPeriodoHoras] = useState('week');
  const [horasCargando, setHorasCargando] = useState(false);

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

  const cambiarPeriodo = useCallback(async (p) => {
    if (p === periodoHoras) return;
    setPeriodoHoras(p);
    setHorasCargando(true);
    try {
      const horas = await fetchWeeklyHours(p);
      setDatos(prev => ({ ...prev, weeklyHours: horas }));
    } catch (_) {
      // mantiene los datos anteriores si falla
    } finally {
      setHorasCargando(false);
    }
  }, [periodoHoras]);

  /* ── Datos normalizados ── */
  const s           = datos?.stats          ?? {};
  const sprint      = datos?.sprint         ?? {};
  const timeCmp     = datos?.timeComparison ?? [];
  const velocity    = datos?.teamVelocity   ?? [];
  const personal    = datos?.personalWork   ?? [];
  const statusDist  = datos?.statusDist     ?? [];
  const weekly      = datos?.weeklyHours    ?? [];
  const contrib     = datos?.contributions  ?? [];

  const maxVel       = Math.max(...velocity.map(d => d.tareas ?? 0), 1);
  const maxEstatus   = Math.max(...statusDist.map(d => d.cantidad ?? 0), 1);

  function tendencia(actual, anterior) {
    if (!anterior) return actual > 0 ? 100 : 0;
    return ((actual - anterior) / anterior) * 100;
  }

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

      {/* ── Bento Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* ── Fila 1: Stats ── */}
        <Tarjeta>
          <Etiqueta>Statistics</Etiqueta>
          <Titulo mb={12}>Features closed</Titulo>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
            <div>
              <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
                {s.featuresCerradas ?? '—'}
              </div>
              <Tendencia valor={tendencia(s.featuresMesActual ?? 0, s.featuresMesAnterior ?? 0)} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Current month</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{s.featuresMesActual ?? 0}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Last month</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{s.featuresMesAnterior ?? 0}</div>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta>
          <Etiqueta>Statistics</Etiqueta>
          <Titulo mb={12}>Bugs closed</Titulo>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
            <div>
              <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
                {s.bugsCerrados ?? '—'}
              </div>
              <Tendencia valor={tendencia(s.bugsMesActual ?? 0, s.bugsMesAnterior ?? 0)} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Current month</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{s.bugsMesActual ?? 0}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Last month</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{s.bugsMesAnterior ?? 0}</div>
            </div>
          </div>
        </Tarjeta>

        {/* ── Fila 2: Sprint + Time Comparison ── */}
        <Tarjeta>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>SPRINT</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Progress</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: ACENTO, fontWeight: 500 }}>Remaining</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{sprint.restantes ?? 0} work items</div>
            </div>
          </div>
          <GaugeSprint pct={Number(sprint.porcentaje ?? 0)} completadas={sprint.completadas ?? 0} restantes={sprint.restantes ?? 0} />
        </Tarjeta>

        <Tarjeta>
          <Etiqueta>Planning effectiveness</Etiqueta>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Titulo mb={0}>Time comparison</Titulo>
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

        {/* ── Fila 3: Personal Work + Team Velocity ── */}
        <Tarjeta>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div><Etiqueta>Statistics</Etiqueta><Titulo mb={0}>Personal work</Titulo></div>
            <div style={{ fontSize: 11, padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)' }}>
              Sprint activo
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

        <Tarjeta>
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

        {/* ── Fila 4: Contributions + Test Results ── */}
        <Tarjeta>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div><Etiqueta>Code</Etiqueta><Titulo mb={0}>Contributions</Titulo></div>
            <div style={{ fontSize: 11, padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)' }}>Month</div>
          </div>
          {contrib.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={contrib} margin={{ top: 4, right: 4, bottom: 0, left: -22 }} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="usuario" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} formatter={v => [`${v} tareas`, 'Contribuciones']} />
                <Bar dataKey="tareas" radius={[3, 3, 0, 0]}>
                  {contrib.map((_, i) => <Cell key={i} fill={i === 0 ? ACENTO : ACENTO_SOFT} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Sin contribuciones este mes
            </div>
          )}
        </Tarjeta>

        <Tarjeta>
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

        {/* ── Fila 5: Weekly Hours (ancho completo) ── */}
        <Tarjeta style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div><Etiqueta>Statistics</Etiqueta><Titulo mb={0}>Weekly Hours</Titulo></div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ label: 'Día', value: 'day' }, { label: 'Semana', value: 'week' }, { label: 'Mes', value: 'month' }].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => cambiarPeriodo(value)}
                  style={{
                    padding: '3px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                    background: periodoHoras === value ? '#1d2939' : 'transparent',
                    color: periodoHoras === value ? '#fff' : 'var(--text-muted)',
                    border: periodoHoras === value ? 'none' : '1px solid var(--border)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ width: 20, height: 2, background: ACENTO_SOFT, display: 'inline-block', borderRadius: 1 }} /> Expected hours
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ width: 20, height: 2, background: ACENTO, display: 'inline-block', borderRadius: 1 }} /> Real hours
            </span>
          </div>
          {horasCargando ? (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, gap: 8 }}>
              <div style={{ width: 14, height: 14, border: `2px solid var(--border)`, borderTopColor: ACENTO, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Cargando…
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
              Sin datos de horas para este periodo
            </div>
          )}
        </Tarjeta>

      </div>
    </div>
  );
}
