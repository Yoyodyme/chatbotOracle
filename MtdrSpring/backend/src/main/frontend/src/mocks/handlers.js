import { http, HttpResponse } from 'msw';

// ── Seed data ────────────────────────────────────────────────────────────────

const ESTATUSES = [
  { idEstatus: 1, nombre: 'To Do',       orden: 1 },
  { idEstatus: 2, nombre: 'In Progress', orden: 2 },
  { idEstatus: 3, nombre: 'In Review',   orden: 3 },
  { idEstatus: 4, nombre: 'Done',        orden: 4 },
];

const PRIORIDADES = [
  { idPrioridad: 1, nombre: 'Low',      orden: 1 },
  { idPrioridad: 2, nombre: 'Medium',   orden: 2 },
  { idPrioridad: 3, nombre: 'High',     orden: 3 },
  { idPrioridad: 4, nombre: 'Critical', orden: 4 },
];

const USUARIOS = [
  { idUsuario: 1, nombreUsuario: 'ale.garcia',  nombreCompleto: 'Alejandro García',  rol: { idRol: 1, nombre: 'Scrum Master' } },
  { idUsuario: 2, nombreUsuario: 'grecia.s',    nombreCompleto: 'Grecia Saucedo',    rol: { idRol: 2, nombre: 'Developer' } },
  { idUsuario: 3, nombreUsuario: 'carlos.m',    nombreCompleto: 'Carlos Mendoza',    rol: { idRol: 2, nombre: 'Developer' } },
  { idUsuario: 4, nombreUsuario: 'sofia.r',     nombreCompleto: 'Sofía Ramírez',     rol: { idRol: 2, nombre: 'Developer' } },
  { idUsuario: 5, nombreUsuario: 'juan.p',      nombreCompleto: 'Juan Pérez',        rol: { idRol: 3, nombre: 'Product Owner' } },
];

const EQUIPOS = [
  { idEquipo: 1, nombre: 'Equipo 51' },
];

const MIEMBROS_EQUIPO = {
  1: USUARIOS,
};

const SPRINTS = [
  { idSprint: 1, nombre: 'Sprint 1', estado: 'PASADO', fechaInicio: '2026-01-06', fechaFin: '2026-01-17', activo: false },
  { idSprint: 2, nombre: 'Sprint 2', estado: 'PASADO', fechaInicio: '2026-01-20', fechaFin: '2026-01-31', activo: false },
  { idSprint: 3, nombre: 'Sprint 3', estado: 'ACTIVE', fechaInicio: '2026-02-03', fechaFin: '2026-02-28', activo: true  },
  { idSprint: 4, nombre: 'Sprint 4', estado: 'FUTURO', fechaInicio: '2026-03-03', fechaFin: '2026-03-14', activo: false },
];

let tareas = [
  { idTarea: 1,  titulo: 'Setup CI/CD pipeline',         descripcion: 'Configure GitHub Actions for automated builds.',  estatus: ESTATUSES[3], prioridad: PRIORIDADES[2], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[1], fechaVencimiento: '2026-01-10', horasEstimadas: 4, horasReales: 5, sprint: SPRINTS[0], creadoEn: '2026-01-06T09:00:00', actualizadoEn: '2026-01-10T17:00:00' },
  { idTarea: 2,  titulo: 'Design database schema',        descripcion: 'Define all JPA entities and relationships.',       estatus: ESTATUSES[3], prioridad: PRIORIDADES[2], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[2], fechaVencimiento: '2026-01-12', horasEstimadas: 6, horasReales: 7, sprint: SPRINTS[0], creadoEn: '2026-01-06T09:00:00', actualizadoEn: '2026-01-12T16:00:00' },
  { idTarea: 3,  titulo: 'REST API authentication',       descripcion: 'Implement Spring Security HTTP Basic auth.',       estatus: ESTATUSES[3], prioridad: PRIORIDADES[3], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[3], fechaVencimiento: '2026-01-15', horasEstimadas: 8, horasReales: 6, sprint: SPRINTS[0], creadoEn: '2026-01-07T09:00:00', actualizadoEn: '2026-01-15T15:00:00' },
  { idTarea: 4,  titulo: 'Frontend routing setup',        descripcion: 'Configure React Router v6 with all routes.',       estatus: ESTATUSES[3], prioridad: PRIORIDADES[1], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[1], fechaVencimiento: '2026-01-16', horasEstimadas: 3, horasReales: 3, sprint: SPRINTS[0], creadoEn: '2026-01-08T09:00:00', actualizadoEn: '2026-01-16T14:00:00' },
  { idTarea: 5,  titulo: 'Kanban board drag & drop',      descripcion: 'Integrate dnd-kit for task cards.',                estatus: ESTATUSES[3], prioridad: PRIORIDADES[2], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[2], fechaVencimiento: '2026-01-28', horasEstimadas: 10, horasReales: 12, sprint: SPRINTS[1], creadoEn: '2026-01-20T09:00:00', actualizadoEn: '2026-01-28T17:00:00' },
  { idTarea: 6,  titulo: 'Task detail modal',             descripcion: 'Build modal with comments and audit log.',         estatus: ESTATUSES[3], prioridad: PRIORIDADES[2], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[3], fechaVencimiento: '2026-01-29', horasEstimadas: 8, horasReales: 9, sprint: SPRINTS[1], creadoEn: '2026-01-21T09:00:00', actualizadoEn: '2026-01-29T16:00:00' },
  { idTarea: 7,  titulo: 'Sprint management page',        descripcion: 'Create SprintPage with CRUD operations.',         estatus: ESTATUSES[3], prioridad: PRIORIDADES[2], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[1], fechaVencimiento: '2026-01-30', horasEstimadas: 7, horasReales: 8, sprint: SPRINTS[1], creadoEn: '2026-01-22T09:00:00', actualizadoEn: '2026-01-30T15:00:00' },
  { idTarea: 8,  titulo: 'Dashboard charts',              descripcion: 'Implement Recharts visualizations for KPIs.',      estatus: ESTATUSES[1], prioridad: PRIORIDADES[2], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[2], fechaVencimiento: '2026-02-10', horasEstimadas: 8, horasReales: 5, sprint: SPRINTS[2], creadoEn: '2026-02-03T09:00:00', actualizadoEn: '2026-02-05T14:00:00' },
  { idTarea: 9,  titulo: 'PDF export feature',            descripcion: 'Generate sprint reports using jsPDF.',            estatus: ESTATUSES[1], prioridad: PRIORIDADES[1], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[3], fechaVencimiento: '2026-02-12', horasEstimadas: 6, horasReales: 4, sprint: SPRINTS[2], creadoEn: '2026-02-03T09:00:00', actualizadoEn: '2026-02-06T11:00:00' },
  { idTarea: 10, titulo: 'Team page',                     descripcion: 'Display team members grouped by team.',           estatus: ESTATUSES[3], prioridad: PRIORIDADES[1], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[1], fechaVencimiento: '2026-02-07', horasEstimadas: 4, horasReales: 3, sprint: SPRINTS[2], creadoEn: '2026-02-04T09:00:00', actualizadoEn: '2026-02-07T16:00:00' },
  { idTarea: 11, titulo: 'Backlog filtering',             descripcion: 'Add filters by status, priority and assignee.',   estatus: ESTATUSES[2], prioridad: PRIORIDADES[2], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[2], fechaVencimiento: '2026-02-14', horasEstimadas: 5, horasReales: 3, sprint: SPRINTS[2], creadoEn: '2026-02-04T09:00:00', actualizadoEn: '2026-02-08T10:00:00' },
  { idTarea: 12, titulo: 'Fix mobile responsiveness',     descripcion: 'Ensure all pages work on small screens.',         estatus: ESTATUSES[0], prioridad: PRIORIDADES[1], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[3], fechaVencimiento: '2026-02-14', horasEstimadas: 3, horasReales: 0, sprint: SPRINTS[2], creadoEn: '2026-02-05T09:00:00', actualizadoEn: '2026-02-05T09:00:00' },
  { idTarea: 13, titulo: 'Write E2E tests',               descripcion: 'Cover main user flows with Playwright.',          estatus: ESTATUSES[0], prioridad: PRIORIDADES[0], usuarioCreador: USUARIOS[0], usuarioAsignado: USUARIOS[1], fechaVencimiento: '2026-02-14', horasEstimadas: 6, horasReales: 0, sprint: SPRINTS[2], creadoEn: '2026-02-05T09:00:00', actualizadoEn: '2026-02-05T09:00:00' },
  { idTarea: 14, titulo: 'Performance optimization',      descripcion: 'Reduce bundle size and lazy-load routes.',        estatus: ESTATUSES[0], prioridad: PRIORIDADES[1], usuarioCreador: USUARIOS[0], usuarioAsignado: null,          fechaVencimiento: '2026-03-10', horasEstimadas: 5, horasReales: 0, sprint: SPRINTS[3], creadoEn: '2026-02-10T09:00:00', actualizadoEn: '2026-02-10T09:00:00' },
];

let nextId = 15;

const COMENTARIOS = {
  8:  [{ idComentario: 1, tarea: { idTarea: 8 }, usuarioAutor: USUARIOS[0], cuerpo: 'Recharts integration looks good, just need to wire the real data.', creadoEn: '2026-02-04T10:00:00' }],
  9:  [{ idComentario: 2, tarea: { idTarea: 9 }, usuarioAutor: USUARIOS[1], cuerpo: 'jsPDF renders the header correctly. Working on the tables.', creadoEn: '2026-02-05T14:00:00' }],
};

const LOGS = {
  8: [
    { idLog: 1, tarea: { idTarea: 8 }, usuario: USUARIOS[2], estatusAnterior: ESTATUSES[0], estatusNuevo: ESTATUSES[1], creadoEn: '2026-02-05T09:30:00' },
  ],
};

// ── Dashboard computed helpers ───────────────────────────────────────────────

const RESUMEN_SPRINTS = [
  { sprint: 'Sprint 1', estado: 'PASADO', completadas: 4, totalTareas: 4, horasEstimadas: 21, horasReales: 21 },
  { sprint: 'Sprint 2', estado: 'PASADO', completadas: 3, totalTareas: 3, horasEstimadas: 25, horasReales: 29 },
  { sprint: 'Sprint 3', estado: 'ACTIVE', completadas: 1, totalTareas: 6, horasEstimadas: 32, horasReales: 15 },
  { sprint: 'Sprint 4', estado: 'FUTURO', completadas: 0, totalTareas: 0, horasEstimadas: 0,  horasReales: 0  },
];

const KPI_POR_SPRINT = [
  { sprint: 'Sprint 1', usuario: 'Alejandro García', tasksCompletadas: 2 },
  { sprint: 'Sprint 1', usuario: 'Carlos Mendoza',   tasksCompletadas: 1 },
  { sprint: 'Sprint 1', usuario: 'Sofía Ramírez',    tasksCompletadas: 1 },
  { sprint: 'Sprint 2', usuario: 'Alejandro García', tasksCompletadas: 1 },
  { sprint: 'Sprint 2', usuario: 'Carlos Mendoza',   tasksCompletadas: 1 },
  { sprint: 'Sprint 2', usuario: 'Sofía Ramírez',    tasksCompletadas: 1 },
  { sprint: 'Sprint 3', usuario: 'Alejandro García', tasksCompletadas: 1 },
];

const HORAS_POR_SPRINT = [
  { sprint: 'Sprint 1', usuario: 'Alejandro García', horasReales: 8  },
  { sprint: 'Sprint 1', usuario: 'Carlos Mendoza',   horasReales: 7  },
  { sprint: 'Sprint 1', usuario: 'Sofía Ramírez',    horasReales: 6  },
  { sprint: 'Sprint 2', usuario: 'Alejandro García', horasReales: 8  },
  { sprint: 'Sprint 2', usuario: 'Carlos Mendoza',   horasReales: 9  },
  { sprint: 'Sprint 2', usuario: 'Sofía Ramírez',    horasReales: 9  },
  { sprint: 'Sprint 3', usuario: 'Carlos Mendoza',   horasReales: 5  },
  { sprint: 'Sprint 3', usuario: 'Sofía Ramírez',    horasReales: 4  },
  { sprint: 'Sprint 3', usuario: 'Alejandro García', horasReales: 3  },
];

const CONTRIBUCIONES_POR_SPRINT = KPI_POR_SPRINT.map(d => ({ ...d, tareas: d.tasksCompletadas }));

// ── Handlers ─────────────────────────────────────────────────────────────────

export const handlers = [

  // — Catálogos —
  http.get('/api/estatus-tareas',    () => HttpResponse.json(ESTATUSES)),
  http.get('/api/prioridades-tareas', () => HttpResponse.json(PRIORIDADES)),

  // — Usuarios —
  http.get('/api/usuarios',      () => HttpResponse.json(USUARIOS)),
  http.get('/api/usuarios/:id',  ({ params }) => {
    const u = USUARIOS.find(u => u.idUsuario === Number(params.id));
    return u ? HttpResponse.json(u) : HttpResponse.json({ message: 'Not found' }, { status: 404 });
  }),

  // — Equipos —
  http.get('/api/equipos', () => HttpResponse.json(EQUIPOS)),
  http.get('/api/miembros-equipo/equipo/:id', ({ params }) => {
    return HttpResponse.json(MIEMBROS_EQUIPO[Number(params.id)] ?? []);
  }),

  // — Sprints —
  http.get('/api/sprints',        () => HttpResponse.json(SPRINTS)),
  http.get('/api/sprints/activo', () => {
    const activo = SPRINTS.find(s => s.activo) ?? null;
    return HttpResponse.json(activo);
  }),
  http.get('/api/sprints/:id', ({ params }) => {
    const s = SPRINTS.find(s => s.idSprint === Number(params.id));
    return s ? HttpResponse.json(s) : HttpResponse.json({ message: 'Not found' }, { status: 404 });
  }),
  http.post('/api/sprints', async ({ request }) => {
    const body = await request.json();
    const nuevo = { idSprint: SPRINTS.length + 1, activo: false, ...body };
    SPRINTS.push(nuevo);
    return HttpResponse.json(nuevo, { status: 201 });
  }),
  http.put('/api/sprints/:id', async ({ params, request }) => {
    const idx = SPRINTS.findIndex(s => s.idSprint === Number(params.id));
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    const body = await request.json();
    SPRINTS[idx] = { ...SPRINTS[idx], ...body };
    return HttpResponse.json(SPRINTS[idx]);
  }),
  http.delete('/api/sprints/:id', ({ params }) => {
    const idx = SPRINTS.findIndex(s => s.idSprint === Number(params.id));
    if (idx !== -1) SPRINTS.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // — Tareas —
  http.get('/api/tareas', () => HttpResponse.json(tareas)),
  http.get('/api/tareas/:id', ({ params }) => {
    if (params.id === 'sprint') return; // let the sprint route handle it
    const t = tareas.find(t => t.idTarea === Number(params.id));
    return t ? HttpResponse.json(t) : HttpResponse.json({ message: 'Not found' }, { status: 404 });
  }),
  http.get('/api/tareas/sprint/:sprintId', ({ params }) => {
    const filtered = tareas.filter(t => t.sprint?.idSprint === Number(params.sprintId));
    return HttpResponse.json(filtered);
  }),
  http.post('/api/tareas', async ({ request }) => {
    const body = await request.json();
    const nueva = {
      idTarea: nextId++,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      ...body,
    };
    tareas.push(nueva);
    return HttpResponse.json(nueva, { status: 201 });
  }),
  http.put('/api/tareas/:id', async ({ params, request }) => {
    const idx = tareas.findIndex(t => t.idTarea === Number(params.id));
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    const body = await request.json();
    tareas[idx] = { ...tareas[idx], ...body, actualizadoEn: new Date().toISOString() };
    return HttpResponse.json(tareas[idx]);
  }),
  http.delete('/api/tareas/:id', ({ params }) => {
    tareas = tareas.filter(t => t.idTarea !== Number(params.id));
    return new HttpResponse(null, { status: 204 });
  }),

  // — Comentarios —
  http.get('/api/comentarios-tareas/tarea/:id', ({ params }) => {
    return HttpResponse.json(COMENTARIOS[Number(params.id)] ?? []);
  }),
  http.post('/api/comentarios-tareas', async ({ request }) => {
    const body = await request.json();
    const nuevo = { idComentario: Date.now(), creadoEn: new Date().toISOString(), ...body };
    const idTarea = body.tarea?.idTarea;
    if (idTarea) {
      if (!COMENTARIOS[idTarea]) COMENTARIOS[idTarea] = [];
      COMENTARIOS[idTarea].push(nuevo);
    }
    return HttpResponse.json(nuevo, { status: 201 });
  }),

  // — Logs —
  http.get('/api/logs-tareas/tarea/:id', ({ params }) => {
    return HttpResponse.json(LOGS[Number(params.id)] ?? []);
  }),

  // — Dashboard —
  http.get('/api/dashboard/personal-work', () => HttpResponse.json([
    { nombre: 'Alejandro García', usuario: 'ale.garcia', tareas: 4, porcentaje: 30.8 },
    { nombre: 'Carlos Mendoza',   usuario: 'carlos.m',   tareas: 3, porcentaje: 23.1 },
    { nombre: 'Sofía Ramírez',    usuario: 'sofia.r',    tareas: 3, porcentaje: 23.1 },
    { nombre: 'Grecia Saucedo',   usuario: 'grecia.s',   tareas: 2, porcentaje: 15.4 },
    { nombre: 'Juan Pérez',       usuario: 'juan.p',     tareas: 1, porcentaje: 7.7  },
  ])),
  http.get('/api/dashboard/status-distribution', () => HttpResponse.json([
    { estatus: 'Done',        cantidad: 8,  porcentaje: 57 },
    { estatus: 'In Progress', cantidad: 2,  porcentaje: 14 },
    { estatus: 'In Review',   cantidad: 1,  porcentaje: 7  },
    { estatus: 'To Do',       cantidad: 3,  porcentaje: 21 },
  ])),
  http.get('/api/dashboard/kpi-por-sprint',            () => HttpResponse.json(KPI_POR_SPRINT)),
  http.get('/api/dashboard/horas-por-sprint',          () => HttpResponse.json(HORAS_POR_SPRINT)),
  http.get('/api/dashboard/resumen-sprints',           () => HttpResponse.json(RESUMEN_SPRINTS)),
  http.get('/api/dashboard/contribuciones-por-sprint', () => HttpResponse.json(CONTRIBUCIONES_POR_SPRINT)),

  // — AI report (returns a canned response so PDF export works) —
  http.post('/api/dashboard/generar-reporte', () => HttpResponse.json({
    reporte: [
      'EXECUTIVE SUMMARY The team completed Sprint 3 with strong momentum, delivering core dashboard features ahead of schedule.',
      'TEAM PERFORMANCE Overall velocity improved compared to previous sprints. The team maintained consistent output across all members.',
      'INDIVIDUAL HIGHLIGHTS Alejandro led task completion this sprint. Carlos and Sofía maintained steady contribution levels.',
      'SPRINT HEALTH Sprint progress is on track. Estimated vs actual hours variance remains within acceptable range.',
      'RECOMMENDATIONS Continue current sprint cadence. Address the mobile responsiveness backlog item in the next sprint. Consider increasing E2E test coverage.',
    ].join('\n'),
  })),
];
