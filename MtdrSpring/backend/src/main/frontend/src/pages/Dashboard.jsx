import React, { useState, useEffect, useCallback } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  Bar, BarChart, ResponsiveContainer, ComposedChart, Line, LabelList,
} from 'recharts';
import { apiFetch } from '../api/client';
import '../styles/animations.css';
import Avatar from '../components/shared/Avatar';
import MetricCard from '../components/dashboard/MetricCard';
import GaugeSprint from '../components/sprint/GaugeSprint';
import DevFilterBar from '../components/dashboard/DevFilterBar';
import { DEVELOPERS, getDeveloperByName } from '../utils/developers';
import { useCurrentUser } from '../utils/auth';
import SprintBadge from '../components/sprint/SprintBadge';
import { generateSprintPDF } from '../utils/generatePDF';
import {
  RED, RED_LIGHT, RED_BORDER,
  BLUE, SUCCESS, WARNING,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED,
  BORDER, BG_PAGE, BG_CARD, BG_SOFT,
  COLORES_SPRINTS, EJE_TICK, TOOLTIP_STYLE, CARD,
} from '../theme';

// ── Date helpers ──────────────────────────────────────────────────────────────
function parseSprintDate(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) { const [y, m, d] = raw; return new Date(y, m - 1, d); }
  if (typeof raw === 'string') { const [y, m, d] = raw.split('-').map(Number); return new Date(y, m - 1, d); }
  return null;
}

function formatSprintDate(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const [y, m, d] = raw;
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }
  if (typeof raw === 'string') {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }
  return null;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  'to do':       { label: 'To Do',       color: BLUE      },
  'pending':     { label: 'To Do',       color: BLUE      },
  'in progress': { label: 'In Progress', color: WARNING    },
  'in review':   { label: 'In Review',   color: '#a855f7' },
  'done':        { label: 'Done',        color: SUCCESS    },
  'completed':   { label: 'Done',        color: SUCCESS    },
};

function getStatusConfig(raw = '') {
  return STATUS_CONFIG[raw.toLowerCase().trim()] ?? { label: raw, color: TEXT_MUTED };
}

// ── Math helpers ──────────────────────────────────────────────────────────────
function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ── Pivot by sprint (rows = sprints, cols = devs) ────────────────────────────
function pivotPorSprint(datos, campoValor) {
  if (!datos || datos.length === 0) return { pivotado: [], devs: [] };
  const sprintList = [...new Set(datos.map(d => d.sprint).filter(Boolean))].sort();
  const devs       = [...new Set(datos.map(d => d.usuario).filter(Boolean))];
  const pivotado   = sprintList.map(sprint => {
    const fila = { sprint };
    devs.forEach(dev => {
      const enc = datos.find(d => d.usuario === dev && d.sprint === sprint);
      fila[dev] = enc ? (Number(enc[campoValor]) || 0) : 0;
    });
    return fila;
  });
  return { pivotado, devs };
}

// ── Pivot helper ──────────────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [datos,            setDatos]            = useState({});
  const [cargando,         setCargando]         = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [error,            setError]            = useState(null);
  const [ultimaAct,        setUltimaAct]        = useState(null);
  const [sprints,          setSprints]          = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [dropdownOpen,     setDropdownOpen]     = useState(false);
  const [generandoPDF,     setGenerandoPDF]     = useState(false);
  const [activeDev,        setActiveDev]        = useState(null);
  const currentUser = useCurrentUser();

  // ── Fetching ──────────────────────────────────────────────────────────────
  const cargarDashboard = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const [
        personalWork, statusDist, kpiPorSprint,
        horasPorSprint, resumenSprints, contribucionesPorSprint,
      ] = await Promise.all([
        apiFetch('/api/dashboard/personal-work'),
        apiFetch('/api/dashboard/status-distribution'),
        apiFetch('/api/dashboard/kpi-por-sprint'),
        apiFetch('/api/dashboard/horas-por-sprint'),
        apiFetch('/api/dashboard/resumen-sprints'),
        apiFetch('/api/dashboard/contribuciones-por-sprint'),
      ]);
      setDatos({ personalWork, statusDist, kpiPorSprint,
                 horasPorSprint, resumenSprints, contribucionesPorSprint });
      setUltimaAct(new Date());
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarDashboard();
    const id = setInterval(() => cargarDashboard(false), 3_600_000);
    return () => clearInterval(id);
  }, [cargarDashboard]);

  useEffect(() => {
    apiFetch('/api/sprints')
      .then(list => {
        setSprints(list || []);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let chosen = (list || []).find(s => s.estado === 'ACTIVE' || s.estado === 'current');

        if (!chosen) {
          chosen = (list || []).find(s => {
            const start = parseSprintDate(s.fechaInicio);
            const end   = parseSprintDate(s.fechaFin);
            if (!start || !end) return false;
            end.setHours(23, 59, 59, 999);
            return today >= start && today <= end;
          });
        }

        if (!chosen) {
          const past = (list || [])
            .filter(s => { const e = parseSprintDate(s.fechaFin); return e && e < today; })
            .sort((a, b) => parseSprintDate(b.fechaFin) - parseSprintDate(a.fechaFin));
          chosen = past[0] ?? null;
        }

        if (chosen) setSelectedSprintId(chosen.idSprint);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = () => setDropdownOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownOpen]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const personal   = datos.personalWork            ?? [];
  const statusDist = datos.statusDist              ?? [];
  const resumen    = datos.resumenSprints          ?? [];
  const kpi        = datos.kpiPorSprint            ?? [];
  const horas      = datos.horasPorSprint          ?? [];

  const activo = resumen.find(s => s.estado === 'ACTIVE');
  const ORDER  = { ACTIVE: 0, FUTURO: 1, PASADO: 2 };

  const resumenConTareas = resumen
    .filter(s => (s.totalTareas ?? 0) > 0)
    .sort((a, b) => (ORDER[a.estado] ?? 3) - (ORDER[b.estado] ?? 3));

  const selectedSprint     = sprints.find(s => s.idSprint === selectedSprintId) ?? null;
  const selectedSprintName = selectedSprint?.nombre ?? null;

  const sprintFechaInicio = selectedSprint ? formatSprintDate(selectedSprint.fechaInicio) : null;
  const sprintFechaFin    = selectedSprint ? formatSprintDate(selectedSprint.fechaFin)    : null;

  const kpiFiltered   = selectedSprintName ? kpi.filter(d   => d.sprint === selectedSprintName) : kpi;
  const horasFiltered = selectedSprintName ? horas.filter(d => d.sprint === selectedSprintName) : horas;
  const resumenConTareasFiltered = selectedSprintName
    ? resumenConTareas.filter(s => s.sprint === selectedSprintName)
    : resumenConTareas;

  const totalCompletadas = kpiFiltered.length > 0
    ? kpiFiltered.reduce((s, d) => s + (Number(d.tasksCompletadas) || 0), 0)
    : (resumen.find(s => s.sprint === selectedSprintName)?.completadas ?? 0);
  const totalHorasReales = horasFiltered.length > 0
    ? horasFiltered.reduce((s, d) => s + (Number(d.horasReales) || 0), 0)
    : (resumen.find(s => s.sprint === selectedSprintName)?.horasReales ?? 0);

  const totalEstimadas = resumenConTareasFiltered.reduce((s, r) => s + (Number(r.horasEstimadas) || 0), 0);
  const totalReales    = resumenConTareasFiltered.reduce((s, r) => s + (Number(r.horasReales)    || 0), 0);
  const eficiencia     = totalEstimadas > 0 ? Math.round((totalReales / totalEstimadas) * 100) : 0;

  const gaugeSource       = selectedSprintName
    ? (resumen.find(s => s.sprint === selectedSprintName) ?? activo)
    : activo;
  const pctGaugeDisplay   = gaugeSource
    ? Math.round(((gaugeSource.completadas ?? 0) / Math.max(gaugeSource.totalTareas ?? 1, 1)) * 100)
    : 0;
  const complGaugeDisplay = gaugeSource?.completadas ?? 0;
  const restGaugeDisplay  = (gaugeSource?.totalTareas ?? 0) - (gaugeSource?.completadas ?? 0);

  // Status distribution
  const statusDistDisplay = (() => {
    const base = selectedSprintName
      ? (() => {
          const sr = resumen.find(s => s.sprint === selectedSprintName);
          if (!sr) return statusDist;
          const total       = sr.totalTareas  ?? 0;
          const completadas = sr.completadas  ?? 0;
          const restantes   = total - completadas;
          const noComp      = statusDist.filter(s =>
            !s.estatus.toLowerCase().includes('complet') &&
            !s.estatus.toLowerCase().includes('done')
          );
          const totalNC = noComp.reduce((s, d) => s + d.cantidad, 0);
          const dist    = noComp.map(s => {
            const cantidad = totalNC > 0 ? Math.round((s.cantidad / totalNC) * restantes) : 0;
            return {
              estatus:    s.estatus,
              cantidad,
              porcentaje: total > 0 ? Math.round((cantidad / total) * 100) : 0,
            };
          });
          const completedLabel = statusDist.find(s =>
            s.estatus.toLowerCase().includes('complet') ||
            s.estatus.toLowerCase().includes('done')
          )?.estatus ?? 'Completed';
          const resultado = [
            ...dist,
            {
              estatus:    completedLabel,
              cantidad:   completadas,
              porcentaje: total > 0 ? Math.round((completadas / total) * 100) : 0,
            },
          ].filter(s => s.cantidad > 0);
          return resultado.length > 0 ? resultado : statusDist;
        })()
      : statusDist;
    return base.map(item => ({ ...item, ...getStatusConfig(item.estatus) }));
  })();

  const maxEstatus = Math.max(...statusDistDisplay.map(d => d.cantidad ?? 0), 1);

  const { pivotado: dataKpi,  sprints: sprintsKpi  } = pivotarDatos(kpiFiltered,   'tasksCompletadas');
  const { pivotado: dataHoras, sprints: sprintsHoras } = pivotarDatos(horasFiltered, 'horasReales');

  // ── Individual work ───────────────────────────────────────────────────────
  const personalParaSprint = (() => {
    const base = personal.map(u => {
      const firstName = (u.nombre || u.usuario || '').trim().toLowerCase();

      // Match hours by first name
      const horaRow = horasFiltered.find(h =>
        (h.usuario || '').trim().toLowerCase() === firstName
      );

      // Resolve full name + initials from DEVELOPERS list
      const devEntry = DEVELOPERS.find(d =>
        d.filterName !== '__me__' &&
        (d.filterName || d.label || '').split(' ')[0].toLowerCase() === firstName
      );

      return {
        nombre:     devEntry?.filterName ?? (u.nombre || u.usuario),
        initials:   devEntry?.initials   ?? firstName.substring(0, 2).toUpperCase(),
        tareas:     Number(u.tareas)     || 0,
        porcentaje: Number(u.porcentaje) || 0,
        horas:      horaRow ? (Number(horaRow.horasReales) || 0) : 0,
      };
    }).filter(u => u.tareas > 0);

    // Apply dev filter — match on first name of filterName
    if (!activeDev) return base;
    const dev      = DEVELOPERS.find(d => d.initials === activeDev);
    const devFirst = (dev?.filterName || dev?.label || '').split(' ')[0].toLowerCase();
    if (!devFirst) return base;
    return base.filter(u =>
      u.nombre.split(' ')[0].toLowerCase() === devFirst
    );
  })();

  // Generic filter for chart data (usuario field = first name)
  const filterByDev = arr => {
    if (!activeDev) return arr;
    const dev = DEVELOPERS.find(d => d.initials === activeDev);
    const rawName = dev?.filterName === '__me__'
      ? (currentUser.name ?? '')
      : (dev?.filterName ?? '');
    const devFirst = rawName.split(' ')[0].toLowerCase();
    if (!devFirst) return arr;
    return arr.filter(d =>
      (d.usuario ?? '').trim().toLowerCase() === devFirst
    );
  };

  const dataKpiFiltered = filterByDev(dataKpi);

  const normalize = str => str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const TEAM = DEVELOPERS.filter(d => d.filterName !== '__me__');
  const teamFirstNames = TEAM.map(d => normalize(d.filterName.split(' ')[0]));

  const { pivotado: dataTasksRaw, devs: devsKpiRaw   } = pivotPorSprint(kpiFiltered,   'tasksCompletadas');
  const { pivotado: dataHorasRaw, devs: devsHorasRaw } = pivotPorSprint(horasFiltered, 'horasReales');

  const devsKpi   = teamFirstNames;
  const devsHoras = teamFirstNames;

  const allSprintSlots = selectedSprintName
    ? [selectedSprintName]
    : [...new Set([
        ...sprints.map(s => s.nombre).filter(Boolean),
        ...dataTasksRaw.map(r => r.sprint),
      ])].sort().slice(0, 5);

  const buildPivot = (raw, slots) => slots.map(sprintName => {
    const existing = raw.find(r => r.sprint === sprintName) ?? {};
    const filled = { sprint: sprintName };
    teamFirstNames.forEach(n => { filled[n] = existing[n] ?? 0; });
    return filled;
  });

  const dataTasksSprint = buildPivot(dataTasksRaw, allSprintSlots);
  const dataHorasSprint = buildPivot(dataHorasRaw, allSprintSlots);

  const numDevs      = personalParaSprint.length || 1;
  const avgTaskDev   = Math.round(totalCompletadas / numDevs);
  const avgHoursDev  = +(totalHorasReales / numDevs).toFixed(1);
  const medTaskDev   = Math.round(median(personalParaSprint.map(u => u.tareas)));
  const medHoursDev  = +median(personalParaSprint.map(u => u.horas)).toFixed(1);

  const generarPDF = async () => {
  setGenerandoPDF(true);

  try {
    await generateSprintPDF({
      selectedSprintName,
      sprintFechaInicio,
      sprintFechaFin,
      sprints,
      resumen,
      resumenConTareas,
      totalCompletadas,
      totalHorasReales,
      eficiencia,
      statusDistDisplay,
      dataKpi,
      sprintsKpi,
      dataHoras,
      sprintsHoras,
      gaugeSource,
      restGaugeDisplay,
      totalEstimadas,
      totalReales,
      personal,
    });
  } catch (err) {
    console.error('Error generating PDF:', err);
    alert('Error generating report. Please try again.');
  } finally {
    setGenerandoPDF(false);
  }
};

  // ── Guards ────────────────────────────────────────────────────────────────
  if (cargando) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 320, color: TEXT_SECONDARY, fontSize: 14, background: BG_PAGE,
    }}>
      Loading sprint metrics…
    </div>
  );

  if (error) return (
    <div style={{ ...CARD, borderColor: RED, color: RED, fontSize: 14, margin: 20 }}>
      <strong>Error:</strong> {error}<br />
      <button
        onClick={() => cargarDashboard(true)}
        style={{
          marginTop: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
          border: `1px solid ${RED}`, background: 'transparent',
          color: RED, fontSize: 13, fontWeight: 600,
        }}
      >
        Retry
      </button>
    </div>
  );

  // ── Sprint dropdown ───────────────────────────────────────────────────────
  const SprintDropdown = (
    <div style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setDropdownOpen(v => !v); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
          cursor: 'pointer', border: `1px solid ${BORDER}`,
          background: BG_CARD, color: TEXT_PRIMARY,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        {selectedSprintName ?? 'All Sprints'}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.5"
             strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {dropdownOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 999,
            background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: 160, maxHeight: 200, overflowY: 'auto',
          }}
        >
          {[{ idSprint: null, nombre: 'All Sprints' }, ...sprints].map(sp => (
            <button
              key={sp.idSprint ?? 'all'}
              onClick={() => { setSelectedSprintId(sp.idSprint); setDropdownOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 14px', fontSize: 12, cursor: 'pointer',
                background: selectedSprintId === sp.idSprint ? RED_LIGHT : 'transparent',
                color: selectedSprintId === sp.idSprint ? RED : TEXT_PRIMARY,
                border: 'none',
                fontWeight: selectedSprintId === sp.idSprint ? 600 : 400,
              }}
            >
              {sp.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: BG_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Topbar ── */}
      <div style={{
        background: BG_CARD, borderBottom: `1px solid ${BORDER}`,
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '-0.02em' }}>
            Dashboard
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            {ultimaAct && (
              <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                Updated {ultimaAct.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · refreshes every hour
              </span>
            )}
            {selectedSprintName && (sprintFechaInicio || sprintFechaFin) && (
              <>
                <span style={{ fontSize: 11, color: BORDER }}>·</span>
                <span style={{
                  fontSize: 11, fontWeight: 500, color: TEXT_SECONDARY,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8"  y1="2" x2="8"  y2="6"/>
                    <line x1="3"  y1="10" x2="21" y2="10"/>
                  </svg>
                  {sprintFechaInicio ?? '—'} → {sprintFechaFin ?? '—'}
                </span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={generarPDF} disabled={generandoPDF}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 13px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              cursor: generandoPDF ? 'not-allowed' : 'pointer',
              border: 'none',
              background: generandoPDF ? '#FCA5A5' : RED,
              color: '#fff',
              boxShadow: '0 1px 3px rgba(220,38,38,0.3)',
              transition: 'background 0.2s',
            }}
          >
            {generandoPDF ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.5"
                     strokeLinecap="round" strokeLinejoin="round"
                     style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export Report
              </>
            )}
          </button>
          {SprintDropdown}
          <button
            onClick={() => cargarDashboard(true)}
            disabled={refreshing}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              border: `1px solid ${BORDER}`,
              background: BG_CARD,
              color: refreshing ? TEXT_MUTED : TEXT_SECONDARY,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'color 0.2s',
            }}
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
        </div>
      </div>

      {/* ── Developer filter bar ── */}
      <DevFilterBar active={activeDev} onChange={setActiveDev} />

      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

        {/* ── Row 1: KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <MetricCard
            label="Active sprint"
            value={selectedSprintName ?? activo?.sprint ?? 'None'}
            sub="Start a sprint to track progress"
          />
          <MetricCard
            label="Completed tasks"
            value={String(totalCompletadas)}
            sub={activeDev
              ? `Filtered: ${DEVELOPERS.find(d => d.initials === activeDev)?.label ?? ''}`
              : 'All sprints'}
          />
          <MetricCard
            label="Total actual hours"
            value={`${Number(totalHorasReales).toFixed(1)}h`}
            sub={`Est ${totalEstimadas.toFixed(1)}h`}
          />
          <MetricCard
            label="Efficiency"
            value={`${eficiencia}%`}
            sub={eficiencia >= 70 ? 'On target · goal ≥ 70%' : 'Below target · goal ≥ 70%'}
            accent={eficiencia >= 70 ? SUCCESS : RED}
          />
          <MetricCard
            label="Avg Task / Dev"
            value={String(avgTaskDev)}
            sub="Per developer"
          />
          <MetricCard
            label="Avg Hours / Dev"
            value={`${avgHoursDev}h`}
            sub="Per developer"
          />
          <MetricCard
            label="Median Task / Dev"
            value={String(medTaskDev)}
            sub="Middle value"
          />
          <MetricCard
            label="Median Hours / Dev"
            value={`${medHoursDev}h`}
            sub="Middle value"
          />
        </div>

        {/* ── Row 2: Gauge + Status Distribution + Sprint Summary ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

          {/* Gauge */}
          <div style={CARD}>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 2 }}>Current sprint</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 14 }}>
              Progress
            </div>
            <GaugeSprint
              pct={pctGaugeDisplay}
              completadas={complGaugeDisplay}
              restantes={restGaugeDisplay}
              nombreSprint={gaugeSource?.sprint ?? null}
            />
          </div>

          {/* Status Distribution */}
          <div style={CARD}>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 2 }}>Tasks</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 14 }}>
              Status Distribution
              {selectedSprintName && (
                <span style={{ fontSize: 11, fontWeight: 400, color: TEXT_MUTED, marginLeft: 6 }}>
                  — {selectedSprintName}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 16 }}>
              {statusDistDisplay.map((item, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: TEXT_SECONDARY }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
                  {item.label}
                </span>
              ))}
            </div>
            {statusDistDisplay.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {statusDistDisplay.map((item, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 5 }}>
                      <span style={{ color: TEXT_SECONDARY }}>{item.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: TEXT_PRIMARY }}>{item.cantidad}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 500,
                          padding: '1px 7px', borderRadius: 20,
                          background: `${item.color}20`,
                          color: item.color,
                        }}>
                          {item.porcentaje}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: BG_SOFT, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: 6,
                        width: `${Math.round((item.cantidad / maxEstatus) * 100)}%`,
                        background: item.color,
                        borderRadius: 3,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: 13, padding: '32px 0' }}>
                No tasks registered
              </div>
            )}
          </div>

          {/* Sprint Summary */}
          <div style={CARD}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 14 }}>
              Sprint summary
            </div>
            {resumenConTareas.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {resumenConTareas.map((sprint, i) => {
                  const pct      = Math.round(((sprint.completadas ?? 0) / Math.max(sprint.totalTareas ?? 1, 1)) * 100);
                  const barColor = sprint.estado === 'ACTIVE' ? RED
                    : sprint.estado === 'PASADO' ? SUCCESS : BLUE;
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '10px 12px', borderRadius: 8,
                        border: sprint.estado === 'ACTIVE'
                          ? `1.5px solid ${RED_BORDER}`
                          : `1px solid ${BORDER}`,
                        background: sprint.estado === 'ACTIVE' ? '#FFF5F5' : BG_SOFT,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <SprintBadge estado={sprint.estado} />
                          <span style={{ fontWeight: 700, color: TEXT_PRIMARY, fontSize: 13 }}>
                            {sprint.sprint}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_PRIMARY }}>
                          {sprint.completadas} / {sprint.totalTareas}
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 999, background: BORDER, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{
                          height: 4, borderRadius: 999,
                          width: `${pct}%`,
                          background: barColor,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: TEXT_MUTED }}>
                        <span>Est: {sprint.horasEstimadas}h</span>
                        <span>Act: {sprint.horasReales}h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: 13, padding: '24px 0' }}>
                No sprints with tasks
              </div>
            )}
          </div>
        </div>

        {/* ── Row 3: Est vs Actual Hours + Individual Work ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>

          {/* Est vs Actual Hours with Tasks line */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 2 }}>Planning effectiveness</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>
                  Estimated vs Actual Hours per Sprint
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: TEXT_MUTED }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: RED_LIGHT, display: 'inline-block' }} />
                  Estimated
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: RED, display: 'inline-block' }} />
                  Actual
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: BLUE, display: 'inline-block' }} />
                  Tasks done
                </span>
              </div>
            </div>
            {resumenConTareasFiltered.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart
                  data={resumenConTareasFiltered}
                  margin={{ top: 10, right: 24, left: -15, bottom: 5 }}
                  barSize={20}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                  <XAxis dataKey="sprint" tick={EJE_TICK} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="hours"
                    orientation="left"
                    tick={EJE_TICK}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="tasks"
                    orientation="right"
                    tick={EJE_TICK}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v, name) =>
                      name === 'Tasks done' ? [v, name] : [`${v}h`, name]
                    }
                  />
                  <Bar yAxisId="hours" dataKey="horasEstimadas" name="Estimated" fill={RED_LIGHT} radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="hours" dataKey="horasReales"    name="Actual"    fill={RED}       radius={[3, 3, 0, 0]} />
                  <Line
                    yAxisId="tasks"
                    type="monotone"
                    dataKey="completadas"
                    name="Tasks done"
                    stroke={BLUE}
                    strokeWidth={2}
                    dot={{ fill: BLUE, r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: 13, padding: '60px 0' }}>
                No sprint hours data
              </div>
            )}
          </div>

          {/* Individual Work */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 2 }}>Statistics</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>
                  Individual work
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 500,
                padding: '2px 8px', borderRadius: 20,
                background: selectedSprintName ? RED_LIGHT : BG_SOFT,
                color:      selectedSprintName ? RED       : TEXT_MUTED,
              }}>
                {selectedSprintName ?? 'All sprints'}
              </span>
            </div>
            {personalParaSprint.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {personalParaSprint.slice(0, 8).map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
  style={{
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: getDeveloperByName(u.nombre)?.bg ?? '#F9FAFB',
    color: getDeveloperByName(u.nombre)?.color ?? '#6B7280',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
  }}
>
  {u.initials}
</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>
                          {u.nombre}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_PRIMARY }}>
                            {u.tareas}
                          </span>
                          <span style={{ fontSize: 10, color: TEXT_MUTED }}>tasks</span>
                          {u.horas > 0 && (
                            <>
                              <span style={{ fontSize: 10, color: BORDER }}>·</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: BLUE }}>
                                {u.horas.toFixed(1)}h
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ height: 5, background: BG_SOFT, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: 5,
                          width: `${Math.min(u.porcentaje * 6, 100)}%`,
                          background: getDeveloperByName(u.nombre)?.color ?? COLORES_SPRINTS[i % COLORES_SPRINTS.length],
                          borderRadius: 3,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 3 }}>
                        {u.porcentaje.toFixed(1)}% of total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: 13, padding: '40px 0' }}>
                No assigned tasks
              </div>
            )}
          </div>

        </div>

        {/* ── Tasks & Hours per Developer / Sprint (side by side) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Tasks Completed per Developer / Sprint */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>Tasks Terminadas por Desarrollador / Sprint</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {devsKpi.map(dev => {
                  const d = getDeveloperByName(dev);
                  return (
                    <span key={dev} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: TEXT_MUTED }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: d?.color ?? '#6B7280', display: 'inline-block' }} />
                      {d ? `${d.filterName.split(' ')[0]} ${d.filterName.split(' ')[1]?.[0] ?? ''}.` : dev}
                    </span>
                  );
                })}
              </div>
            </div>
            {dataTasksSprint.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dataTasksSprint} margin={{ top: 18, right: 10, left: -15, bottom: 5 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                  <XAxis dataKey="sprint" tick={EJE_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} label={{ value: 'Tareas', angle: -90, position: 'insideLeft', offset: 20, style: { fontSize: 10, fill: TEXT_MUTED } }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => {
                    const d = getDeveloperByName(name);
                    const label = d ? `${d.filterName.split(' ')[0]} ${d.filterName.split(' ')[1]?.[0] ?? ''}.` : name;
                    return [v, label];
                  }} />
                  {devsKpi.map(dev => {
                    const d = getDeveloperByName(dev);
                    return (
                      <Bar key={dev} dataKey={dev} name={dev} fill={d?.color ?? '#6B7280'} radius={[3, 3, 0, 0]} maxBarSize={22}>
                        <LabelList dataKey={dev} position="top" style={{ fontSize: 10, fill: TEXT_MUTED }} formatter={v => v > 0 ? v : ''} />
                      </Bar>
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: 13, padding: '60px 0' }}>No tasks data</div>
            )}
          </div>

          {/* Real Hours per Developer / Sprint */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>Horas Reales por Desarrollador / Sprint</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {devsHoras.map(dev => {
                  const d = getDeveloperByName(dev);
                  return (
                    <span key={dev} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: TEXT_MUTED }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: d?.color ?? '#6B7280', display: 'inline-block' }} />
                      {d ? `${d.filterName.split(' ')[0]} ${d.filterName.split(' ')[1]?.[0] ?? ''}.` : dev}
                    </span>
                  );
                })}
              </div>
            </div>
            {dataHorasSprint.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dataHorasSprint} margin={{ top: 18, right: 10, left: -15, bottom: 5 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                  <XAxis dataKey="sprint" tick={EJE_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} label={{ value: 'hrs', angle: -90, position: 'insideLeft', offset: 20, style: { fontSize: 10, fill: TEXT_MUTED } }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => {
                    const d = getDeveloperByName(name);
                    const label = d ? `${d.filterName.split(' ')[0]} ${d.filterName.split(' ')[1]?.[0] ?? ''}.` : name;
                    return [`${v}h`, label];
                  }} />
                  {devsHoras.map(dev => {
                    const d = getDeveloperByName(dev);
                    return (
                      <Bar key={dev} dataKey={dev} name={dev} fill={d?.color ?? '#6B7280'} radius={[3, 3, 0, 0]} maxBarSize={22}>
                        <LabelList dataKey={dev} position="top" style={{ fontSize: 10, fill: TEXT_MUTED }} formatter={v => v > 0 ? `${v}h` : ''} />
                      </Bar>
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: 13, padding: '60px 0' }}>No hours data</div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}