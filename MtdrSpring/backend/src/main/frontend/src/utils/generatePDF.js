import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PDF_RED        = [220, 38, 38];
const PDF_RED_DARK   = [153, 27, 27];
const PDF_GRIS_DARK  = [30, 41, 59];
const PDF_GRIS_MID   = [71, 85, 105];
const PDF_GRIS_LIGHT = [148, 163, 184];
const PDF_BG_SOFT    = [248, 250, 252];
const PDF_WHITE      = [255, 255, 255];
const PDF_BORDER     = [229, 231, 235];

function loadImageBase64(url) {
  return new Promise((resolve, reject) => {
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
}

export async function generateSprintPDF({
  selectedSprintName,
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
}) {
  let logoBase64 = null;
  try { logoBase64 = await loadImageBase64('/yoyodyne.png'); } catch { logoBase64 = null; }

  const sprintLabel   = selectedSprintName ?? 'All Sprints';
  const sprintDetalle = resumen.find(s => s.sprint === sprintLabel) ?? resumenConTareas[0] ?? null;
  const sprintInfo    = sprints.find(s => s.nombre === sprintLabel) ?? null;

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
    statusDistribution: statusDistDisplay.map(s => `${s.estatus}: ${s.cantidad} tasks (${s.porcentaje}%)`).join(', '),
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
    individualWork: personal.map(u => `${u.nombre || u.usuario}: ${u.tareas} tasks (${Number(u.porcentaje).toFixed(1)}%)`).join(', '),
    sprintStartDate: sprintInfo?.fechaInicio ? new Date(sprintInfo.fechaInicio).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
    sprintEndDate:   sprintInfo?.fechaFin    ? new Date(sprintInfo.fechaFin).toLocaleDateString('en-US',    { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
    avgHoursPerTask: totalCompletadas > 0 ? (totalHorasReales / totalCompletadas).toFixed(1) : 'N/A',
    tasksCarryover:  (sprintDetalle?.totalTareas ?? 0) - (sprintDetalle?.completadas ?? 0),
    topDeveloper:    topDev?.usuario ?? 'N/A',
  };

  const response = await fetch('/api/dashboard/generar-reporte', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(promptData),
  });
  const aiData = await response.json();
  if (!response.ok) throw new Error(aiData.error ?? `Server error ${response.status}`);
  const aiText = aiData.reporte ?? '';

  const secciones = {};
  const seccionesOrden = ['EXECUTIVE SUMMARY', 'TEAM PERFORMANCE', 'INDIVIDUAL HIGHLIGHTS', 'SPRINT HEALTH', 'RECOMMENDATIONS'];
  seccionesOrden.forEach((sec, i) => {
    const inicio = aiText.indexOf(sec);
    if (inicio === -1) return;
    const siguiente = seccionesOrden.slice(i + 1).map(s => aiText.indexOf(s)).filter(idx => idx > inicio)[0] ?? aiText.length;
    secciones[sec] = aiText.slice(inicio + sec.length, siguiente).replace(/\n+/g, ' ').trim();
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const fechaActual = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let y = 20;

  // Header
  doc.setFillColor(...PDF_RED_DARK);
  doc.rect(0, 0, W, 50, 'F');
  doc.setFillColor(...PDF_RED);
  doc.rect(0, 48, W, 2, 'F');
  if (logoBase64) {
    const tmpImg = new Image();
    tmpImg.src = logoBase64;
    const logoH = 28;
    const ratio = tmpImg.naturalWidth > 0 ? tmpImg.naturalWidth / tmpImg.naturalHeight : 2;
    const logoW = Math.min(logoH * ratio, 50);
    const padX = 4, padY = 4;
    doc.setFillColor(...PDF_WHITE);
    doc.roundedRect(12, 8, logoW + padX * 2, logoH + padY * 2, 5, 5, 'F');
    doc.addImage(logoBase64, 'PNG', 12 + padX, 8 + padY, logoW, logoH);
    const textX = 12 + logoW + padX * 2 + 8;
    doc.setTextColor(...PDF_WHITE);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('Sprint Performance Report', textX, 22);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 200, 200);
    doc.text(`Equipo 51  ·  ${sprintLabel}  ·  ${fechaActual}`, textX, 31);
    doc.setFontSize(8); doc.setTextColor(220, 170, 170);
    doc.text('Yoyodyne Task Manager', textX, 39);
  } else {
    doc.setTextColor(...PDF_WHITE);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('Sprint Performance Report', 14, 25);
  }
  y = 60;

  // KPI cards
  const kpis = [
    { label: 'Sprint',          value: sprintLabel },
    { label: 'Completed Tasks', value: String(totalCompletadas) },
    { label: 'Actual Hours',    value: `${Number(totalHorasReales).toFixed(1)}h` },
    { label: 'Efficiency',      value: `${eficiencia}%` },
  ];
  const boxW = (W - 28 - 9) / 4;
  kpis.forEach(({ label, value }, i) => {
    const x = 14 + i * (boxW + 3);
    doc.setFillColor(...PDF_BG_SOFT); doc.roundedRect(x, y, boxW, 20, 2, 2, 'F');
    doc.setDrawColor(...PDF_BORDER); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxW, 20, 2, 2, 'S');
    doc.setFillColor(...PDF_RED); doc.rect(x + 3, y + 3, 3, 3, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_GRIS_MID);
    doc.text(label.toUpperCase(), x + 3, y + 10);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_RED_DARK);
    doc.text(value, x + 3, y + 17);
  });
  y += 28;

  const renderSection = (titulo) => {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFillColor(...PDF_RED); doc.rect(14, y, 3, 7, 'F');
    doc.setTextColor(...PDF_RED_DARK); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(titulo, 20, y + 5.5);
    doc.setDrawColor(...PDF_BORDER); doc.setLineWidth(0.3);
    doc.line(14, y + 9, W - 14, y + 9);
    y += 15;
  };

  const renderParagraph = (content) => {
    if (!content) return;
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_GRIS_DARK);
    const lines = doc.splitTextToSize(content, W - 28);
    lines.forEach(line => { if (y > 270) { doc.addPage(); y = 20; } doc.text(line, 14, y); y += 5; });
    y += 4;
  };

  if (sprintDetalle || sprintInfo) {
    if (y > 220) { doc.addPage(); y = 20; }
    renderSection('SPRINT DETAILS');
    const leftCol  = [
      ['Sprint Name', sprintDetalle?.sprint ?? sprintLabel],
      ['Status', sprintDetalle?.estado === 'ACTIVE' ? 'Active' : sprintDetalle?.estado === 'PASADO' ? 'Completed' : 'Future'],
      ['Start Date', sprintInfo?.fechaInicio ? new Date(sprintInfo.fechaInicio).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'],
      ['End Date',   sprintInfo?.fechaFin    ? new Date(sprintInfo.fechaFin).toLocaleDateString('en-US',    { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'],
      ['Total Tasks', String(sprintDetalle?.totalTareas ?? 0)],
      ['Completed',   String(sprintDetalle?.completadas ?? 0)],
    ];
    const rightCol = [
      ['Remaining',          String((sprintDetalle?.totalTareas ?? 0) - (sprintDetalle?.completadas ?? 0))],
      ['Completion Rate',    `${Math.round(((sprintDetalle?.completadas ?? 0) / Math.max(sprintDetalle?.totalTareas ?? 1, 1)) * 100)}%`],
      ['Estimated Hours',    `${sprintDetalle?.horasEstimadas ?? 0}h`],
      ['Actual Hours',       `${sprintDetalle?.horasReales ?? 0}h`],
      ['Planning Efficiency',`${eficiencia}%`],
      ['Hour Variance',      `${((sprintDetalle?.horasReales ?? 0) - (sprintDetalle?.horasEstimadas ?? 0)).toFixed(1)}h`],
    ];
    autoTable(doc, {
      startY: y,
      body: leftCol.map((row, i) => [row[0], row[1], rightCol[i]?.[0] ?? '', rightCol[i]?.[1] ?? '']),
      theme: 'striped',
      alternateRowStyles: { fillColor: PDF_BG_SOFT },
      bodyStyles: { fontSize: 8.5, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: PDF_GRIS_MID, cellWidth: 42, fontSize: 7.5 },
        1: { fontStyle: 'bold', textColor: PDF_RED_DARK, cellWidth: 48 },
        2: { fontStyle: 'bold', textColor: PDF_GRIS_MID, cellWidth: 42, fontSize: 7.5 },
        3: { fontStyle: 'bold', textColor: PDF_RED_DARK, cellWidth: 48 },
      },
      tableLineColor: PDF_BORDER, tableLineWidth: 0.2,
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (statusDistDisplay.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    renderSection('TASK STATUS BREAKDOWN');
    doc.setFillColor(...PDF_RED_DARK); doc.rect(14, y, W - 28, 8, 'F');
    doc.setTextColor(...PDF_WHITE); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('Status', 18, y + 5.5); doc.text('Tasks', 90, y + 5.5);
    doc.text('%', 115, y + 5.5); doc.text('Distribution', 130, y + 5.5);
    y += 8;
    statusDistDisplay.forEach((s, i) => {
      const rowH = 10;
      if (i % 2 === 0) { doc.setFillColor(...PDF_BG_SOFT); doc.rect(14, y, W - 28, rowH, 'F'); }
      doc.setTextColor(...PDF_GRIS_DARK); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
      doc.text(s.estatus, 18, y + 6.5); doc.text(String(s.cantidad), 90, y + 6.5);
      doc.text(`${s.porcentaje}%`, 115, y + 6.5);
      doc.setFillColor(...PDF_BORDER); doc.rect(130, y + 3, 60, 4, 'F');
      const barW = ((s.porcentaje ?? 0) / 100) * 60;
      if (barW > 0) { doc.setFillColor(...PDF_RED); doc.rect(130, y + 3, barW, 4, 'F'); }
      y += rowH;
    });
    y += 8;
  }

  renderSection('EXECUTIVE SUMMARY'); renderParagraph(secciones['EXECUTIVE SUMMARY']);
  renderSection('TEAM PERFORMANCE'); renderParagraph(secciones['TEAM PERFORMANCE']);

  if (promptData.developerStats.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    const maxTasks = Math.max(...promptData.developerStats.map(d => d.tasksCompleted), 1);
    doc.setFillColor(...PDF_RED_DARK); doc.rect(14, y, W - 28, 8, 'F');
    doc.setTextColor(...PDF_WHITE); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('Developer', 18, y + 5.5); doc.text('Tasks', 80, y + 5.5);
    doc.text('Hours', 105, y + 5.5); doc.text('Progress', 130, y + 5.5);
    y += 8;
    promptData.developerStats.forEach((dev, i) => {
      const rowH = 12;
      if (y + rowH > 275) { doc.addPage(); y = 20; }
      if (i % 2 === 0) { doc.setFillColor(...PDF_BG_SOFT); doc.rect(14, y, W - 28, rowH, 'F'); }
      doc.setTextColor(...PDF_GRIS_DARK); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
      doc.text(dev.name, 18, y + 8);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_RED_DARK);
      doc.text(String(dev.tasksCompleted), 80, y + 8);
      doc.text(`${dev.actualHours.toFixed(1)}h`, 105, y + 8);
      const barW = dev.tasksCompleted > 0 ? (dev.tasksCompleted / maxTasks) * 55 : 0;
      doc.setFillColor(...PDF_BORDER); doc.rect(130, y + 4, 55, 4, 'F');
      if (barW > 0) { doc.setFillColor(...PDF_RED); doc.rect(130, y + 4, barW, 4, 'F'); }
      y += rowH;
    });
    y += 8;
  }

  if (y + promptData.developerStats.length * 34 + 20 > 260) { doc.addPage(); y = 20; }
  renderSection('INDIVIDUAL HIGHLIGHTS');
  const oraciones = (secciones['INDIVIDUAL HIGHLIGHTS'] ?? '').split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 15);
  promptData.developerStats.forEach((dev, i) => {
    if (y + 30 > 270) { doc.addPage(); y = 20; }
    doc.setFillColor(...PDF_BG_SOFT); doc.roundedRect(14, y, W - 28, 28, 3, 3, 'F');
    doc.setDrawColor(...PDF_BORDER); doc.roundedRect(14, y, W - 28, 28, 3, 3, 'S');
    doc.setFillColor(...PDF_RED); doc.circle(20, y + 8, 2.5, 'F');
    doc.setTextColor(...PDF_RED_DARK); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(dev.name, 25, y + 9);
    const totalT = promptData.developerStats.reduce((s, d) => s + d.tasksCompleted, 0);
    const pct = totalT > 0 ? Math.round((dev.tasksCompleted / totalT) * 100) : 0;
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_GRIS_MID);
    doc.text(`${dev.tasksCompleted} tasks  ·  ${dev.actualHours.toFixed(1)}h  ·  ${pct}% of team`, W - 14, y + 9, { align: 'right' });
    const lineas = doc.splitTextToSize(oraciones[i % oraciones.length] ?? '', W - 36);
    doc.setFontSize(8); doc.setTextColor(...PDF_GRIS_DARK);
    lineas.slice(0, 2).forEach((linea, li) => doc.text(linea, 25, y + 17 + li * 5));
    y += 32;
  });
  y += 6;

  renderSection('SPRINT HEALTH');
  if (y > 220) { doc.addPage(); y = 20; }
  const completionRate = Math.round(((gaugeSource?.completadas ?? 0) / Math.max(gaugeSource?.totalTareas ?? 1, 1)) * 100);
  const healthStats = [
    { label: 'COMPLETION RATE', value: `${completionRate}%`,         color: completionRate >= 70 ? [34, 197, 94] : [239, 68, 68] },
    { label: 'TASKS REMAINING', value: String(restGaugeDisplay) },
    { label: 'EST VS ACTUAL',   value: `${totalEstimadas.toFixed(0)}h / ${totalReales.toFixed(0)}h` },
    { label: 'SPRINT VELOCITY', value: `${totalCompletadas} tasks` },
  ];
  const statW = (W - 28 - 9) / 4;
  healthStats.forEach(({ label, value, color }, i) => {
    const x = 14 + i * (statW + 3);
    doc.setFillColor(...PDF_BG_SOFT); doc.roundedRect(x, y, statW, 22, 3, 3, 'F');
    doc.setDrawColor(...PDF_BORDER); doc.setLineWidth(0.3); doc.roundedRect(x, y, statW, 22, 3, 3, 'S');
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_GRIS_MID);
    doc.text(label, x + statW / 2, y + 7, { align: 'center' });
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...(color ?? PDF_RED_DARK));
    doc.text(value, x + statW / 2, y + 16, { align: 'center' });
  });
  y += 28;
  renderParagraph(secciones['SPRINT HEALTH']);

  if (y > 230) { doc.addPage(); y = 20; }
  const kpisExtra = [
    { label: 'Avg Hours / Task',  value: totalCompletadas > 0 ? `${(totalHorasReales / totalCompletadas).toFixed(1)}h` : 'N/A' },
    { label: 'Tasks / Developer', value: promptData.developerStats.length > 0 ? `${(totalCompletadas / promptData.developerStats.length).toFixed(1)}` : 'N/A' },
    { label: 'Most Productive',   value: [...promptData.developerStats].sort((a, b) => b.tasksCompleted - a.tasksCompleted)[0]?.name ?? 'N/A' },
    { label: 'Hour Utilization',  value: totalEstimadas > 0 ? `${Math.round((totalReales / totalEstimadas) * 100)}%` : 'N/A' },
  ];
  const kpiExtraW = (W - 28 - 9) / 4;
  kpisExtra.forEach(({ label, value }, i) => {
    const x = 14 + i * (kpiExtraW + 3);
    doc.setFillColor(254, 242, 242); doc.roundedRect(x, y, kpiExtraW, 18, 2, 2, 'F');
    doc.setDrawColor(...PDF_BORDER); doc.setLineWidth(0.2); doc.roundedRect(x, y, kpiExtraW, 18, 2, 2, 'S');
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_GRIS_MID);
    doc.text(label.toUpperCase(), x + 3, y + 6);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_RED_DARK);
    doc.text(value, x + 3, y + 14);
  });
  y += 24;

  renderSection('RECOMMENDATIONS');
  const recs = (secciones['RECOMMENDATIONS'] ?? '').split(/(?<=\.) /).map(s => s.trim()).filter(s => s.length > 20).slice(0, 5);
  if (recs.length === 0) {
    renderParagraph(secciones['RECOMMENDATIONS']);
  } else {
    recs.forEach((rec, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFillColor(...PDF_RED); doc.circle(17, y + 3, 3, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_WHITE);
      doc.text(String(i + 1), 17, y + 4.5, { align: 'center' });
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_GRIS_DARK);
      const lines = doc.splitTextToSize(rec, W - 36);
      lines.forEach((line, li) => { if (y + 4 + li * 4.5 > 270) return; doc.text(line, 23, y + 4 + li * 4.5); });
      y += Math.max(lines.length * 4.5 + 6, 12);
    });
    y += 4;
  }

  if (y > 220) { doc.addPage(); y = 20; }
  renderSection('DEVELOPER BREAKDOWN');
  autoTable(doc, {
    startY: y,
    head: [['Developer', 'Tasks Completed', 'Hours Invested']],
    body: promptData.developerStats.map(d => [d.name, String(d.tasksCompleted), `${d.actualHours.toFixed(1)}h`]),
    theme: 'striped',
    headStyles:           { fillColor: PDF_RED_DARK, textColor: PDF_WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 4 },
    alternateRowStyles:   { fillColor: PDF_BG_SOFT },
    bodyStyles:           { fontSize: 8, textColor: PDF_GRIS_DARK, cellPadding: 3.5 },
    tableLineColor: PDF_BORDER, tableLineWidth: 0.2,
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  if (y > 220) { doc.addPage(); y = 20; }
  renderSection('SPRINT HISTORY');
  autoTable(doc, {
    startY: y,
    head: [['Sprint', 'Status', 'Tasks', 'Progress', 'Hours']],
    body: resumenConTareas.map(s => [
      s.sprint,
      s.estado === 'ACTIVE' ? 'Active' : s.estado === 'PASADO' ? 'Past' : 'Future',
      `${s.completadas}/${s.totalTareas}`,
      `${Math.round(((s.completadas ?? 0) / Math.max(s.totalTareas ?? 1, 1)) * 100)}%`,
      `${s.horasEstimadas}h est · ${s.horasReales}h act`,
    ]),
    theme: 'striped',
    headStyles:           { fillColor: PDF_RED_DARK, textColor: PDF_WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 4 },
    alternateRowStyles:   { fillColor: PDF_BG_SOFT },
    bodyStyles:           { fontSize: 8, textColor: PDF_GRIS_DARK, cellPadding: 3.5 },
    tableLineColor: PDF_BORDER, tableLineWidth: 0.2,
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PDF_BORDER); doc.setLineWidth(0.3);
    doc.line(14, 284, W - 14, 284);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_GRIS_LIGHT);
    doc.text('Equipo 51 · Yoyodyne Task Manager', 14, 289);
    doc.setFont('helvetica', 'italic');
    doc.text('CONFIDENTIAL', W / 2, 289, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_GRIS_MID);
    doc.text(`Page ${i} of ${pageCount}`, W - 14, 289, { align: 'right' });
  }

  const filename = `sprint-report-${sprintLabel.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
  doc.save(filename);
}
