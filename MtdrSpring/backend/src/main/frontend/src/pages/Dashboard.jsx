// Instalar con: npm install jspdf jspdf-autotable
import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '../api/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../styles/animations.css';

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
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 'var(--radius-xl)',
  padding: '20px 22px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

const CARD_DARK = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 'var(--radius-xl)',
  padding: '20px 22px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
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
              <Cell fill="#e2e8f0" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: ACENTO, lineHeight: 1 }}>{safe}%</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {nombreSprint
              ? <><strong style={{ color: '#374151' }}>{nombreSprint}</strong> — {completadas} <span style={{ color: '#64748b' }}>completed</span></>
              : 'No active sprint'}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>{restantes} remaining</div>
    </div>
  );
}

function BadgeEstado({ estado }) {
  const cfg = {
    PASADO: { label: 'Past',   bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
    ACTIVE: { label: 'Active', bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
    FUTURO: { label: 'Future', bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' },
  }[estado] ?? { label: estado, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      borderRadius: 999, padding: '2px 10px',
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
      backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}

// Converts an image URL to a base64 data URL via a canvas so jsPDF can embed it.
const cargarImagenBase64 = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });

export default function Dashboard() {
  const [datos,    setDatos]    = useState({});
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);
  const [ultimaAct, setUltimaAct] = useState(null);
  const [sprints,          setSprints]          = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [dropdownOpen,     setDropdownOpen]     = useState(false);
  const [generandoPDF,     setGenerandoPDF]     = useState(false);

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

  useEffect(() => {
    apiFetch('/api/sprints')
      .then(list => {
        setSprints(list || []);
        const active = (list || []).find(s => s.estado === 'current' || s.estado === 'ACTIVE');
        if (active) setSelectedSprintId(active.idSprint);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = () => setDropdownOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownOpen]);

  const personal   = datos.personalWork            ?? [];
  const statusDist = datos.statusDist              ?? [];
  const resumen    = datos.resumenSprints          ?? [];
  const kpi        = datos.kpiPorSprint            ?? [];
  const horas      = datos.horasPorSprint          ?? [];
  const contrib    = datos.contribucionesPorSprint ?? [];

  const activo = resumen.find(s => s.estado === 'ACTIVE');

  const ORDER = { ACTIVE: 0, FUTURO: 1, PASADO: 2 };
  const resumenConTareas = resumen
    .filter(s => (s.totalTareas ?? 0) > 0)
    .sort((a, b) => (ORDER[a.estado] ?? 3) - (ORDER[b.estado] ?? 3));

  const selectedSprint     = sprints.find(s => s.idSprint === selectedSprintId) ?? null;
  const selectedSprintName = selectedSprint?.nombre ?? null;

  const kpiFiltered     = selectedSprintName ? kpi.filter(d    => d.sprint === selectedSprintName) : kpi;
  const horasFiltered   = selectedSprintName ? horas.filter(d  => d.sprint === selectedSprintName) : horas;
  const contribFiltered = selectedSprintName ? contrib.filter(d => d.sprint === selectedSprintName) : contrib;

  const resumenConTareasFiltered = selectedSprintName
    ? resumenConTareas.filter(s => s.sprint === selectedSprintName)
    : resumenConTareas;

  const totalCompletadas = kpiFiltered.length > 0
    ? kpiFiltered.reduce((s, d) => s + (Number(d.tasksCompletadas) || 0), 0)
    : (resumen.find(s => s.sprint === selectedSprintName)?.completadas ?? 0);

  const totalHorasReales = horasFiltered.length > 0
    ? horasFiltered.reduce((s, d) => s + (Number(d.horasReales) || 0), 0)
    : (resumen.find(s => s.sprint === selectedSprintName)?.horasReales ?? 0);

  const totalEstimadas = resumenConTareasFiltered.reduce(
    (s, r) => s + (Number(r.horasEstimadas) || 0), 0);
  const totalReales    = resumenConTareasFiltered.reduce(
    (s, r) => s + (Number(r.horasReales) || 0), 0);
  const eficiencia     = totalEstimadas > 0
    ? Math.round((totalReales / totalEstimadas) * 100) : 0;

  const gaugeSource       = selectedSprintName
    ? (resumen.find(s => s.sprint === selectedSprintName) ?? activo)
    : activo;
  const pctGaugeDisplay   = gaugeSource
    ? Math.round(
        ((gaugeSource.completadas ?? 0) /
         Math.max(gaugeSource.totalTareas ?? 1, 1)) * 100
      )
    : 0;
  const complGaugeDisplay = gaugeSource?.completadas ?? 0;
  const restGaugeDisplay  = (gaugeSource?.totalTareas ?? 0) - (gaugeSource?.completadas ?? 0);

  const statusDistDisplay = selectedSprintName
    ? (() => {
        const sprintResumen = resumen.find(s => s.sprint === selectedSprintName);
        if (!sprintResumen) return statusDist;
        const total       = sprintResumen.totalTareas ?? 0;
        const completadas = sprintResumen.completadas ?? 0;
        const restantes   = total - completadas;
        const noCompletadas = statusDist.filter(
          s => !s.estatus.toLowerCase().includes('complet') &&
               !s.estatus.toLowerCase().includes('done')
        );
        const totalNoCompletadasGlobal = noCompletadas.reduce(
          (s, d) => s + d.cantidad, 0);
        const distribuidos = noCompletadas.map(s => {
          const cantidad = totalNoCompletadasGlobal > 0
            ? Math.round((s.cantidad / totalNoCompletadasGlobal) * restantes)
            : 0;
          return {
            estatus: s.estatus,
            cantidad,
            porcentaje: total > 0 ? Math.round((cantidad / total) * 100) : 0,
          };
        });
        const completedLabel =
          statusDist.find(
            s => s.estatus.toLowerCase().includes('complet') ||
                 s.estatus.toLowerCase().includes('done')
          )?.estatus ?? 'Completed';
        const resultado = [
          ...distribuidos,
          {
            estatus: completedLabel,
            cantidad: completadas,
            porcentaje: total > 0 ? Math.round((completadas / total) * 100) : 0,
          },
        ].filter(s => s.cantidad > 0);
        return resultado.length > 0 ? resultado : statusDist;
      })()
    : statusDist;

  const maxEstatus = Math.max(...statusDistDisplay.map(d => d.cantidad ?? 0), 1);

  const { pivotado: dataKpi,   sprints: sprintsKpi   } = pivotarDatos(kpiFiltered,     'tasksCompletadas');
  const { pivotado: dataHoras, sprints: sprintsHoras  } = pivotarDatos(horasFiltered,   'horasReales');
  const { pivotado: dataCont,  sprints: sprintsCont   } = pivotarDatos(contribFiltered, 'tareas');

  // ── AI-Powered PDF Export ───────────────────────────────────────────────────
  const generarPDF = async () => {
    setGenerandoPDF(true);
    try {
      // Pre-load logo
      let logoBase64 = null;
      try {
        logoBase64 = await cargarImagenBase64('/yoyodyne.png');
      } catch {
        logoBase64 = null;
      }

      // Color palette
      const PDF_AZUL       = [6, 111, 204];
      const PDF_AZUL_DARK  = [15, 40, 80];
      const PDF_GRIS_DARK  = [30, 41, 59];
      const PDF_GRIS_MID   = [71, 85, 105];
      const PDF_GRIS_LIGHT = [148, 163, 184];
      const PDF_BG_SOFT    = [248, 250, 252];
      const PDF_WHITE      = [255, 255, 255];
      const PDF_BORDER     = [226, 232, 240];

      const sprintLabel  = selectedSprintName ?? 'All Sprints';
      const sprintDetalle = resumen.find(s => s.sprint === sprintLabel) ?? resumenConTareas[0] ?? null;
      const sprintInfo    = sprints.find(s => s.nombre === sprintLabel) ?? null;

      // 1. Build developer stats for the prompt
      const topDev = [...dataKpi].sort((a, b) => {
        const sumA = sprintsKpi.reduce((s, sp) => s + (a[sp] ?? 0), 0);
        const sumB = sprintsKpi.reduce((s, sp) => s + (b[sp] ?? 0), 0);
        return sumB - sumA;
      })[0];

      const promptData = {
        sprint: sprintLabel,
        completedTasks: totalCompletadas,
        actualHours: Number(totalHorasReales).toFixed(1),
        efficiency: eficiencia,
        statusDistribution: statusDistDisplay
          .map(s => `${s.estatus}: ${s.cantidad} tasks (${s.porcentaje}%)`)
          .join(', '),
        developerStats: dataKpi.map(row => ({
          name: row.usuario,
          tasksCompleted: sprintsKpi.reduce((s, sp) => s + (row[sp] ?? 0), 0),
          actualHours: sprintsHoras.reduce((s, sp) => {
            const devHoras = dataHoras.find(d => d.usuario === row.usuario);
            return s + (devHoras?.[sp] ?? 0);
          }, 0),
        })),
        sprintSummary: resumenConTareas.map(s =>
          `${s.sprint} (${s.estado}): ${s.completadas}/${s.totalTareas} tasks, ` +
          `${Math.round(((s.completadas ?? 0) / Math.max(s.totalTareas ?? 1, 1)) * 100)}% complete, ` +
          `${s.horasEstimadas}h estimated vs ${s.horasReales}h actual`
        ).join('\n'),
        individualWork: personal
          .map(u => `${u.nombre || u.usuario}: ${u.tareas} tasks (${Number(u.porcentaje).toFixed(1)}%)`)
          .join(', '),
        sprintStartDate: sprintInfo?.fechaInicio
          ? new Date(sprintInfo.fechaInicio).toLocaleDateString('en-US',
              { year: 'numeric', month: 'short', day: 'numeric' })
          : 'N/A',
        sprintEndDate: sprintInfo?.fechaFin
          ? new Date(sprintInfo.fechaFin).toLocaleDateString('en-US',
              { year: 'numeric', month: 'short', day: 'numeric' })
          : 'N/A',
        avgHoursPerTask: totalCompletadas > 0
          ? (totalHorasReales / totalCompletadas).toFixed(1) : 'N/A',
        tasksCarryover:  (sprintDetalle?.totalTareas ?? 0) - (sprintDetalle?.completadas ?? 0),
        topDeveloper:    topDev?.usuario ?? 'N/A',
      };

      // 2. Call backend proxy → DeepSeek (API key stays server-side)
      const aiData = await apiFetch('/api/dashboard/generar-reporte', {
        method: 'POST',
        body: promptData,
      });

      const aiText = aiData.reporte ?? '';

      // 3. Parse AI sections
      const secciones = {};
      const seccionesOrden = [
        'EXECUTIVE SUMMARY',
        'TEAM PERFORMANCE',
        'INDIVIDUAL HIGHLIGHTS',
        'SPRINT HEALTH',
        'RECOMMENDATIONS',
      ];
      seccionesOrden.forEach((sec, i) => {
        const inicio = aiText.indexOf(sec);
        if (inicio === -1) return;
        const siguiente = seccionesOrden
          .slice(i + 1)
          .map(s => aiText.indexOf(s))
          .filter(idx => idx > inicio)[0] ?? aiText.length;
        secciones[sec] = aiText
          .slice(inicio + sec.length, siguiente)
          .replace(/\n+/g, ' ')
          .trim();
      });

      // 4. Build PDF
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const fechaActual = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      let y = 20;

      // ── HEADER ────────────────────────────────────────────────────────────────
      doc.setFillColor(...PDF_AZUL_DARK);
      doc.rect(0, 0, W, 50, 'F');
      doc.setFillColor(...PDF_AZUL);
      doc.rect(0, 48, W, 2, 'F');
      if (logoBase64) {
        const tmpImg = new Image();
        tmpImg.src = logoBase64;
        const logoH = 28;
        const ratio = tmpImg.naturalWidth > 0
          ? tmpImg.naturalWidth / tmpImg.naturalHeight : 2;
        const logoW = Math.min(logoH * ratio, 50);
        const padX = 4;
        const padY = 4;
        doc.setFillColor(...PDF_WHITE);
        doc.roundedRect(12, 8, logoW + padX * 2, logoH + padY * 2, 5, 5, 'F');
        doc.addImage(logoBase64, 'PNG', 12 + padX, 8 + padY, logoW, logoH);
        const textX = 12 + logoW + padX * 2 + 8;
        doc.setTextColor(...PDF_WHITE);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Sprint Performance Report', textX, 22);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 200, 230);
        doc.text(`Equipo 51  ·  ${sprintLabel}  ·  ${fechaActual}`, textX, 31);
        doc.setFontSize(8);
        doc.setTextColor(140, 170, 210);
        doc.text('Yoyodyne Task Manager', textX, 39);
      } else {
        doc.setTextColor(...PDF_WHITE);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Sprint Performance Report', 14, 25);
      }
      y = 60;

      // ── KPI CARDS ─────────────────────────────────────────────────────────────
      const kpis = [
        { label: 'Sprint',          value: sprintLabel },
        { label: 'Completed Tasks', value: String(totalCompletadas) },
        { label: 'Actual Hours',    value: `${Number(totalHorasReales).toFixed(1)}h` },
        { label: 'Efficiency',      value: `${eficiencia}%` },
      ];
      const boxW = (W - 28 - 9) / 4;
      kpis.forEach(({ label, value }, i) => {
        const x = 14 + i * (boxW + 3);
        doc.setFillColor(...PDF_BG_SOFT);
        doc.roundedRect(x, y, boxW, 20, 2, 2, 'F');
        doc.setDrawColor(...PDF_BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, boxW, 20, 2, 2, 'S');
        doc.setFillColor(...PDF_AZUL);
        doc.rect(x + 3, y + 3, 3, 3, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_GRIS_MID);
        doc.text(label.toUpperCase(), x + 3, y + 10);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PDF_AZUL_DARK);
        doc.text(value, x + 3, y + 17);
      });
      y += 28;

      // ── SECTION HEADER HELPER ──────────────────────────────────────────────────
      const renderTituloSeccion = (titulo) => {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFillColor(...PDF_AZUL);
        doc.rect(14, y, 3, 7, 'F');
        doc.setTextColor(...PDF_AZUL_DARK);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(titulo, 20, y + 5.5);
        doc.setDrawColor(...PDF_BORDER);
        doc.setLineWidth(0.3);
        doc.line(14, y + 9, W - 14, y + 9);
        y += 15;
      };

      // ── PARAGRAPH HELPER ───────────────────────────────────────────────────────
      const renderParrafo = (contenido) => {
        if (!contenido) return;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_GRIS_DARK);
        const lineas = doc.splitTextToSize(contenido, W - 28);
        lineas.forEach(linea => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(linea, 14, y);
          y += 5;
        });
        y += 4;
      };

      // ── SPRINT DETAILS ────────────────────────────────────────────────────────
      if (sprintDetalle || sprintInfo) {
        if (y > 220) { doc.addPage(); y = 20; }
        renderTituloSeccion('SPRINT DETAILS');

        const sprintLeftCol = [
          ['Sprint Name',  sprintDetalle?.sprint ?? sprintLabel],
          ['Status',       sprintDetalle?.estado === 'ACTIVE' ? 'Active'
                             : sprintDetalle?.estado === 'PASADO' ? 'Completed' : 'Future'],
          ['Start Date',   sprintInfo?.fechaInicio
                             ? new Date(sprintInfo.fechaInicio).toLocaleDateString('en-US',
                                 { year: 'numeric', month: 'short', day: 'numeric' })
                             : 'N/A'],
          ['End Date',     sprintInfo?.fechaFin
                             ? new Date(sprintInfo.fechaFin).toLocaleDateString('en-US',
                                 { year: 'numeric', month: 'short', day: 'numeric' })
                             : 'N/A'],
          ['Total Tasks',  String(sprintDetalle?.totalTareas ?? 0)],
          ['Completed',    String(sprintDetalle?.completadas ?? 0)],
        ];
        const sprintRightCol = [
          ['Remaining',          String((sprintDetalle?.totalTareas ?? 0) - (sprintDetalle?.completadas ?? 0))],
          ['Completion Rate',    `${Math.round(((sprintDetalle?.completadas ?? 0) / Math.max(sprintDetalle?.totalTareas ?? 1, 1)) * 100)}%`],
          ['Estimated Hours',    `${sprintDetalle?.horasEstimadas ?? 0}h`],
          ['Actual Hours',       `${sprintDetalle?.horasReales ?? 0}h`],
          ['Planning Efficiency',`${eficiencia}%`],
          ['Hour Variance',      `${((sprintDetalle?.horasReales ?? 0) - (sprintDetalle?.horasEstimadas ?? 0)).toFixed(1)}h`],
        ];
        const sprintTableBody = sprintLeftCol.map((row, i) => [
          row[0], row[1],
          sprintRightCol[i]?.[0] ?? '', sprintRightCol[i]?.[1] ?? '',
        ]);
        autoTable(doc, {
          startY: y,
          body: sprintTableBody,
          theme: 'striped',
          alternateRowStyles: { fillColor: PDF_BG_SOFT },
          bodyStyles: { fontSize: 8.5, cellPadding: 4 },
          columnStyles: {
            0: { fontStyle: 'bold', textColor: PDF_GRIS_MID,   cellWidth: 42, fontSize: 7.5 },
            1: { fontStyle: 'bold', textColor: PDF_AZUL_DARK,  cellWidth: 48 },
            2: { fontStyle: 'bold', textColor: PDF_GRIS_MID,   cellWidth: 42, fontSize: 7.5 },
            3: { fontStyle: 'bold', textColor: PDF_AZUL_DARK,  cellWidth: 48 },
          },
          tableLineColor: PDF_BORDER,
          tableLineWidth: 0.2,
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── TASK STATUS BREAKDOWN ──────────────────────────────────────────────────
      if (statusDistDisplay.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        renderTituloSeccion('TASK STATUS BREAKDOWN');

        // Table header
        doc.setFillColor(...PDF_AZUL_DARK);
        doc.rect(14, y, W - 28, 8, 'F');
        doc.setTextColor(...PDF_WHITE);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Status',       18,  y + 5.5);
        doc.text('Tasks',        90,  y + 5.5);
        doc.text('%',           115,  y + 5.5);
        doc.text('Distribution', 130, y + 5.5);
        y += 8;
        // Rows with real progress bars
        const barMaxW = 60;
        statusDistDisplay.forEach((s, i) => {
          const rowH = 10;
          if (i % 2 === 0) {
            doc.setFillColor(...PDF_BG_SOFT);
            doc.rect(14, y, W - 28, rowH, 'F');
          }
          doc.setTextColor(...PDF_GRIS_DARK);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.text(s.estatus, 18, y + 6.5);
          doc.text(String(s.cantidad), 90, y + 6.5);
          doc.text(`${s.porcentaje}%`, 115, y + 6.5);
          // Bar track
          doc.setFillColor(...PDF_BORDER);
          doc.rect(130, y + 3, barMaxW, 4, 'F');
          // Bar fill
          const barW = ((s.porcentaje ?? 0) / 100) * barMaxW;
          if (barW > 0) {
            doc.setFillColor(...PDF_AZUL);
            doc.rect(130, y + 3, barW, 4, 'F');
          }
          y += rowH;
        });
        y += 8;
      }

      // ── EXECUTIVE SUMMARY ──────────────────────────────────────────────────────
      renderTituloSeccion('EXECUTIVE SUMMARY');
      renderParrafo(secciones['EXECUTIVE SUMMARY']);

      // ── TEAM PERFORMANCE ───────────────────────────────────────────────────────
      renderTituloSeccion('TEAM PERFORMANCE');
      renderParrafo(secciones['TEAM PERFORMANCE']);

      // Visual developer table with real progress bars
      if (promptData.developerStats.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        const maxTasks = Math.max(...promptData.developerStats.map(d => d.tasksCompleted), 1);
        // Header row
        doc.setFillColor(...PDF_AZUL_DARK);
        doc.rect(14, y, W - 28, 8, 'F');
        doc.setTextColor(...PDF_WHITE);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Developer', 18,  y + 5.5);
        doc.text('Tasks',     80,  y + 5.5);
        doc.text('Hours',    105,  y + 5.5);
        doc.text('Progress', 130,  y + 5.5);
        y += 8;
        promptData.developerStats.forEach((dev, i) => {
          const rowH = 12;
          if (y + rowH > 275) { doc.addPage(); y = 20; }
          if (i % 2 === 0) {
            doc.setFillColor(...PDF_BG_SOFT);
            doc.rect(14, y, W - 28, rowH, 'F');
          }
          // Name
          doc.setTextColor(...PDF_GRIS_DARK);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.text(dev.name, 18, y + 8);
          // Tasks & hours
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...PDF_AZUL_DARK);
          doc.text(String(dev.tasksCompleted), 80, y + 8);
          doc.text(`${dev.actualHours.toFixed(1)}h`, 105, y + 8);
          // Progress bar
          const barMaxW = 55;
          const barW = dev.tasksCompleted > 0 ? (dev.tasksCompleted / maxTasks) * barMaxW : 0;
          doc.setFillColor(...PDF_BORDER);
          doc.rect(130, y + 4, barMaxW, 4, 'F');
          if (barW > 0) {
            doc.setFillColor(...PDF_AZUL);
            doc.rect(130, y + 4, barW, 4, 'F');
          }
          y += rowH;
        });
        y += 8;
      }

      // ── INDIVIDUAL HIGHLIGHTS ──────────────────────────────────────────────────
      const alturaEstimadaIndividual = promptData.developerStats.length * 34 + 20;
      if (y + alturaEstimadaIndividual > 260) { doc.addPage(); y = 20; }
      renderTituloSeccion('INDIVIDUAL HIGHLIGHTS');

      const textoIndividual = secciones['INDIVIDUAL HIGHLIGHTS'] ?? '';
      const oraciones = textoIndividual
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 15);

      promptData.developerStats.forEach((dev, i) => {
        if (y + 30 > 270) { doc.addPage(); y = 20; }

        doc.setFillColor(...PDF_BG_SOFT);
        doc.roundedRect(14, y, W - 28, 28, 3, 3, 'F');
        doc.setDrawColor(...PDF_BORDER);
        doc.roundedRect(14, y, W - 28, 28, 3, 3, 'S');

        doc.setFillColor(...PDF_AZUL);
        doc.circle(20, y + 8, 2.5, 'F');

        doc.setTextColor(...PDF_AZUL_DARK);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(dev.name, 25, y + 9);

        const totalT = promptData.developerStats
          .reduce((s, d) => s + d.tasksCompleted, 0);
        const pct = totalT > 0
          ? Math.round((dev.tasksCompleted / totalT) * 100) : 0;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_GRIS_MID);
        doc.text(
          `${dev.tasksCompleted} tasks  ·  ${dev.actualHours.toFixed(1)}h  ·  ${pct}% of team`,
          W - 14, y + 9, { align: 'right' });

        const insight = oraciones[i % oraciones.length] ?? '';
        const lineas = doc.splitTextToSize(insight, W - 36);
        doc.setFontSize(8);
        doc.setTextColor(...PDF_GRIS_DARK);
        lineas.slice(0, 2).forEach((linea, li) => {
          doc.text(linea, 25, y + 17 + li * 5);
        });

        y += 32;
      });
      y += 6;

      // ── SPRINT HEALTH ──────────────────────────────────────────────────────────
      renderTituloSeccion('SPRINT HEALTH');

      if (y > 220) { doc.addPage(); y = 20; }
      const completionRate = Math.round(
        ((gaugeSource?.completadas ?? 0) / Math.max(gaugeSource?.totalTareas ?? 1, 1)) * 100
      );
      const healthStats = [
        { label: 'COMPLETION RATE',
          value: `${completionRate}%`,
          color: completionRate >= 70 ? [34, 197, 94] : [239, 68, 68] },
        { label: 'TASKS REMAINING',
          value: String(restGaugeDisplay) },
        { label: 'EST VS ACTUAL',
          value: `${totalEstimadas.toFixed(0)}h / ${totalReales.toFixed(0)}h` },
        { label: 'SPRINT VELOCITY',
          value: `${totalCompletadas} tasks` },
      ];
      const statW = (W - 28 - 9) / 4;
      healthStats.forEach(({ label, value, color }, i) => {
        const x = 14 + i * (statW + 3);
        const cardH = 22;
        doc.setFillColor(...PDF_BG_SOFT);
        doc.roundedRect(x, y, statW, cardH, 3, 3, 'F');
        doc.setDrawColor(...PDF_BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, statW, cardH, 3, 3, 'S');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_GRIS_MID);
        doc.text(label, x + statW / 2, y + 7, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(color ?? PDF_AZUL_DARK));
        doc.text(value, x + statW / 2, y + 16, { align: 'center' });
      });
      y += 28;

      renderParrafo(secciones['SPRINT HEALTH']);

      // Extra KPI row
      if (y > 230) { doc.addPage(); y = 20; }
      const PDF_BG_BLUE_LOCAL = [239, 246, 255];
      const kpisExtra = [
        {
          label: 'Avg Hours / Task',
          value: totalCompletadas > 0
            ? `${(totalHorasReales / totalCompletadas).toFixed(1)}h` : 'N/A',
        },
        {
          label: 'Tasks / Developer',
          value: promptData.developerStats.length > 0
            ? `${(totalCompletadas / promptData.developerStats.length).toFixed(1)}` : 'N/A',
        },
        {
          label: 'Most Productive',
          value: [...promptData.developerStats]
            .sort((a, b) => b.tasksCompleted - a.tasksCompleted)[0]?.name ?? 'N/A',
        },
        {
          label: 'Hour Utilization',
          value: totalEstimadas > 0
            ? `${Math.round((totalReales / totalEstimadas) * 100)}%` : 'N/A',
        },
      ];
      const kpiExtraW = (W - 28 - 9) / 4;
      kpisExtra.forEach(({ label, value }, i) => {
        const x = 14 + i * (kpiExtraW + 3);
        doc.setFillColor(...PDF_BG_BLUE_LOCAL);
        doc.roundedRect(x, y, kpiExtraW, 18, 2, 2, 'F');
        doc.setDrawColor(...PDF_BORDER);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, kpiExtraW, 18, 2, 2, 'S');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_GRIS_MID);
        doc.text(label.toUpperCase(), x + 3, y + 6);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PDF_AZUL_DARK);
        doc.text(value, x + 3, y + 14);
      });
      y += 24;

      // ── RECOMMENDATIONS ────────────────────────────────────────────────────────
      renderTituloSeccion('RECOMMENDATIONS');

      const recomendaciones = (secciones['RECOMMENDATIONS'] ?? '')
        .split(/(?<=\.) /)
        .map(s => s.trim())
        .filter(s => s.length > 20)
        .slice(0, 5);

      if (recomendaciones.length === 0) {
        renderParrafo(secciones['RECOMMENDATIONS']);
      } else {
        recomendaciones.forEach((rec, i) => {
          if (y > 260) { doc.addPage(); y = 20; }
          doc.setFillColor(...PDF_AZUL);
          doc.circle(17, y + 3, 3, 'F');
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...PDF_WHITE);
          doc.text(String(i + 1), 17, y + 4.5, { align: 'center' });
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...PDF_GRIS_DARK);
          const lines = doc.splitTextToSize(rec, W - 36);
          lines.forEach((line, li) => {
            if (y + 4 + li * 4.5 > 270) return;
            doc.text(line, 23, y + 4 + li * 4.5);
          });
          y += Math.max(lines.length * 4.5 + 6, 12);
        });
        y += 4;
      }

      // ── DEVELOPER BREAKDOWN TABLE ──────────────────────────────────────────────
      if (y > 220) { doc.addPage(); y = 20; }
      renderTituloSeccion('DEVELOPER BREAKDOWN');

      const devRows = promptData.developerStats.map(d => [
        d.name,
        String(d.tasksCompleted),
        `${d.actualHours.toFixed(1)}h`,
      ]);
      autoTable(doc, {
        startY: y,
        head: [['Developer', 'Tasks Completed', 'Hours Invested']],
        body: devRows,
        theme: 'striped',
        headStyles: {
          fillColor: PDF_AZUL_DARK, textColor: PDF_WHITE,
          fontSize: 8, fontStyle: 'bold', cellPadding: 4,
        },
        alternateRowStyles: { fillColor: PDF_BG_SOFT },
        bodyStyles: { fontSize: 8, textColor: PDF_GRIS_DARK, cellPadding: 3.5 },
        tableLineColor: PDF_BORDER,
        tableLineWidth: 0.2,
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 8;

      // ── SPRINT HISTORY TABLE ───────────────────────────────────────────────────
      if (y > 220) { doc.addPage(); y = 20; }
      renderTituloSeccion('SPRINT HISTORY');

      const sprintRows = resumenConTareas.map(s => [
        s.sprint,
        s.estado === 'ACTIVE' ? 'Active' : s.estado === 'PASADO' ? 'Past' : 'Future',
        `${s.completadas}/${s.totalTareas}`,
        `${Math.round(((s.completadas ?? 0) / Math.max(s.totalTareas ?? 1, 1)) * 100)}%`,
        `${s.horasEstimadas}h est · ${s.horasReales}h act`,
      ]);
      autoTable(doc, {
        startY: y,
        head: [['Sprint', 'Status', 'Tasks', 'Progress', 'Hours']],
        body: sprintRows,
        theme: 'striped',
        headStyles: {
          fillColor: PDF_AZUL_DARK, textColor: PDF_WHITE,
          fontSize: 8, fontStyle: 'bold', cellPadding: 4,
        },
        alternateRowStyles: { fillColor: PDF_BG_SOFT },
        bodyStyles: { fontSize: 8, textColor: PDF_GRIS_DARK, cellPadding: 3.5 },
        tableLineColor: PDF_BORDER,
        tableLineWidth: 0.2,
        margin: { left: 14, right: 14 },
      });

      // ── FOOTER ─────────────────────────────────────────────────────────────────
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(...PDF_BORDER);
        doc.setLineWidth(0.3);
        doc.line(14, 284, W - 14, 284);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_GRIS_LIGHT);
        doc.text('Equipo 51 · Yoyodyne Task Manager', 14, 289);
        doc.setFont('helvetica', 'italic');
        doc.text('CONFIDENTIAL', W / 2, 289, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_GRIS_MID);
        doc.text(`Page ${i} of ${pageCount}`, W - 14, 289, { align: 'right' });
      }

      const filename = `sprint-report-${sprintLabel.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
      doc.save(filename);

    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error generating report. Please try again.');
    } finally {
      setGenerandoPDF(false);
    }
  };

  // ── Render guards ───────────────────────────────────────────────────────────
  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 320, color: '#64748b', fontSize: 14 }}>
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
    <div style={{ padding: '40px 32px 28px 32px', background: 'var(--bg-base)', minHeight: '100vh',
                  display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── SECTION 1 — Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--text-primary)',
                        letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Dashboard
          </h1>
          {ultimaAct && (
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Updated {ultimaAct.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · refreshes every hour
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Export Report — AI-powered */}
          <button
            onClick={generarPDF}
            disabled={generandoPDF}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              cursor: generandoPDF ? 'not-allowed' : 'pointer',
              border: '1px solid #066FCC',
              background: generandoPDF ? '#93c5fd' : '#066FCC',
              color: '#ffffff',
              boxShadow: '0 1px 3px rgba(6,111,204,0.3)',
              transition: 'background 0.2s',
            }}
          >
            {generandoPDF ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.5"
                     strokeLinecap="round" strokeLinejoin="round"
                     style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
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

          {/* Sprint selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setDropdownOpen(v => !v); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'var(--bg-surface)',
                color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)',
              }}
            >
              {selectedSprintName ?? 'All Sprints'}
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
                  background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8,
                  boxShadow: 'var(--shadow-md)',
                  minWidth: 160, maxHeight: 200, overflowY: 'auto',
                }}
              >
                <button
                  onClick={() => { setSelectedSprintId(null); setDropdownOpen(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 14px', fontSize: 13, cursor: 'pointer',
                    background: selectedSprintId === null ? 'var(--bg-hover)' : 'transparent',
                    color: 'var(--text-primary)', border: 'none',
                    fontWeight: selectedSprintId === null ? 700 : 400,
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
                      background: selectedSprintId === sp.idSprint ? 'var(--bg-hover)' : 'transparent',
                      color: 'var(--text-primary)', border: 'none',
                      fontWeight: selectedSprintId === sp.idSprint ? 700 : 400,
                    }}
                  >
                    {sp.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh */}
          <button onClick={cargarDashboard} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'var(--bg-surface)',
            color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)',
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
          { label: 'SPRINT',             value: selectedSprintName ?? activo?.sprint ?? 'None' },
          { label: 'COMPLETED TASKS',    value: String(totalCompletadas) },
          { label: 'TOTAL ACTUAL HOURS', value: `${Number(totalHorasReales).toFixed(1)}h` },
          { label: 'EFFICIENCY',         value: `${eficiencia}%` },
        ].map(({ label, value }) => (
          <div key={label} style={CARD}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                          letterSpacing: '0.07em', color: '#64748b', marginBottom: 8 }}>
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
        <div style={CARD_DARK}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: '#64748b', marginBottom: 4 }}>
            Current Sprint
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>
            Progress
          </div>
          <GaugeSprint
            pct={pctGaugeDisplay}
            completadas={complGaugeDisplay}
            restantes={restGaugeDisplay}
            nombreSprint={gaugeSource?.sprint ?? null}
          />
        </div>

        <div style={CARD_DARK}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: '#64748b', marginBottom: 4 }}>
            Tasks
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>
            Status Distribution
            {selectedSprintName && (
              <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                — {selectedSprintName}
              </span>
            )}
          </div>
          {statusDistDisplay.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {statusDistDisplay.map((item, i) => (
                <div key={i}>
                  <div style={{ height: 6, borderRadius: 999, backgroundColor: '#e2e8f0',
                                overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{
                      height: '100%', borderRadius: 999, transition: 'width 0.5s ease',
                      width: `${Math.round((item.cantidad / maxEstatus) * 100)}%`,
                      backgroundColor: i === 0 ? ACENTO
                        : i === statusDistDisplay.length - 1 ? '#94a3b8' : ACENTO_SOFT,
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                                fontSize: 13, color: '#374151' }}>
                    <span style={{ textTransform: 'capitalize' }}>{item.estatus}</span>
                    <span style={{ fontWeight: 600, color: '#1a1a2e' }}>
                      {item.cantidad}{' '}
                      <span style={{ color: '#64748b', fontWeight: 400 }}>
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

      {/* ── SECTIONS 4 & 5 — Developer charts side by side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={CARD_DARK}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>
            Tasks Completed by Developer per Sprint
          </div>
          {dataKpi.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dataKpi} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                        barGap={6} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="usuario" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b', paddingTop: 8 }} />
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

        <div style={CARD_DARK}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>
            Total Actual Hours by Developer per Sprint
          </div>
          {dataHoras.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dataHoras} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                        barGap={6} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="usuario" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b', paddingTop: 8 }} />
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
      </div>

      {/* ── SECTION 6 — Planning Effectiveness + Team Velocity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={CARD_DARK}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                            letterSpacing: '0.07em', color: '#64748b', marginBottom: 4 }}>
                Planning Effectiveness
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>
                Estimated vs Actual Hours per Sprint
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b' }}>
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
              <BarChart data={resumenConTareasFiltered}
                        margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                        barSize={18} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="sprint" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v, name) => [`${v} h`, name]} />
                <Bar dataKey="horasEstimadas" name="Estimated" fill={ACENTO_SOFT} radius={[3, 3, 0, 0]} />
                <Bar dataKey="horasReales"    name="Actual"    fill={ACENTO}      radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '60px 0' }}>
              No sprint hours data
            </div>
          )}
        </div>

        <div style={CARD_DARK}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                            letterSpacing: '0.07em', color: '#64748b', marginBottom: 4 }}>
                Team Velocity
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>
                Tasks Completed per Sprint
              </div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                           fontSize: 11, color: '#64748b' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2,
                             backgroundColor: ACENTO, display: 'inline-block' }} />
              Completed
            </span>
          </div>
          {resumenConTareasFiltered.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={resumenConTareasFiltered}
                        margin={{ top: 10, right: 10, left: -15, bottom: 5 }} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
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

      {/* ── SECTION 7 — Individual Work + Contributions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={CARD_DARK}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: '#64748b', marginBottom: 4 }}>
            Statistics
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>
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
                      <span style={{ color: '#374151', fontWeight: 500 }}>
                        {u.nombre || u.usuario || u.name}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#1a1a2e' }}>
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

        <div style={CARD_DARK}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: '#64748b', marginBottom: 4 }}>
            Contributions
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>
            Contributions per Sprint
          </div>
          {dataCont.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataCont} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                        barGap={6} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="usuario" tick={EJE_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={EJE_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b', paddingTop: 8 }} />
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

      {/* ── Sprint Summary ── */}
      <div style={CARD_DARK}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>
          Sprint Summary
        </div>
        {resumenConTareas.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {resumenConTareas.map((sprint, i) => (
              <div key={i} style={{
                padding: '12px 14px', borderRadius: 10,
                border: '1px solid #e2e8f0',
                backgroundColor: sprint.estado === 'ACTIVE' ? '#eff6ff' : '#f8fafc',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              gap: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BadgeEstado estado={sprint.estado} />
                    <span style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>
                      {sprint.sprint}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {sprint.completadas} / {sprint.totalTareas} completed
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 999, backgroundColor: '#e2e8f0',
                              overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    height: '100%', borderRadius: 999, transition: 'width 0.5s ease',
                    width: `${Math.round(((sprint.completadas ?? 0) / Math.max(sprint.totalTareas ?? 1, 1)) * 100)}%`,
                    backgroundColor: sprint.estado === 'ACTIVE' ? ACENTO
                      : sprint.estado === 'PASADO' ? '#94a3b8' : ACENTO_SOFT,
                  }} />
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
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
