-- ============================================================================
-- SQL SCRIPT - REAL DATA FROM NOTION TASKS TRACKER (CSV EXPORT 2026-06-10)
-- MyTodoList REST API - Oracle Autonomous Database
-- Project: Oracle ChatBot (OracleChatBot) — EQUIPO51
--
-- Source: Tasks Tracker Notion export (Context: Development)
-- Scope:  4 Features + 14 User Stories — all top-level items from the CSV.
--         Sub-tasks (T#) and Bugs (B#) are intentionally excluded from
--         TAREAS; they are referenced only in comments and logs where useful.
--
-- Team:
--   Eugenio Díaz López    — Product Owner / Fullstack  → Admin
--   Grecia López          — Scrum Master / Frontend    → Admin
--   Gabriel Peres Baptista — Developer / Fullstack     → Developer
--   Elian Genc Minondo    — Developer / Fullstack      → Developer
--   Rutilo De la Peña     — Developer / Frontend       → Developer
--   Alejandro López       — Developer / Frontend       → Developer
--
-- Assignee logic (CSV assignee = "Grecia" = SM who owns the story on Notion;
-- actual dev assignee is derived from sub-task ownership in the CSV):
--   FEAT1 stories (CRUD / DB)       → Gabriel, Elian
--   FEAT2 stories (Telegram)        → Elian, Alejandro
--   FEAT3 stories (Metrics/Views)   → Rutilo, Alejandro, Eugenio
--   FEAT4 stories (Infra/Quality)   → Elian, Eugenio
--   Feature-level entries           → Eugenio (PO)
--
-- HOW TO RUN:
--   OCI Console → Autonomous Database → chatbotdb
--   → Database Actions → SQL
--   Paste this complete script → Run Script (F5)
--   Enable first: View → DBMS Output (to see messages)
-- ============================================================================

SET SERVEROUTPUT ON;

DECLARE
  -- ── Roles ──────────────────────────────────────────────────────────────────
  v_rol_admin     NUMBER;
  v_rol_developer NUMBER;

  -- ── Statuses ───────────────────────────────────────────────────────────────
  v_est_pendiente  NUMBER;
  v_est_progreso   NUMBER;
  v_est_completada NUMBER;

  -- ── Priorities ─────────────────────────────────────────────────────────────
  v_pri_baja  NUMBER;
  v_pri_media NUMBER;
  v_pri_alta  NUMBER;

  -- ── Teams (by specialty, matching the real structure) ──────────────────────
  v_eq_backend  NUMBER;
  v_eq_frontend NUMBER;

  -- ── Users ──────────────────────────────────────────────────────────────────
  v_usr_eugenio   NUMBER;
  v_usr_grecia    NUMBER;
  v_usr_gabriel   NUMBER;
  v_usr_elian     NUMBER;
  v_usr_rutilo    NUMBER;
  v_usr_alejandro NUMBER;

  -- ── Features (4) ───────────────────────────────────────────────────────────
  v_tar_feat1 NUMBER;
  v_tar_feat2 NUMBER;
  v_tar_feat3 NUMBER;
  v_tar_feat4 NUMBER;

  -- ── User Stories (14) ──────────────────────────────────────────────────────
  -- FEAT1 — Gestión de Tareas CRUD
  v_tar_us3  NUMBER;   -- Crear nueva tarea
  v_tar_us5  NUMBER;   -- Editar tareas
  v_tar_us6  NUMBER;   -- Detalle de tareas (logs y evidencias)
  v_tar_us8  NUMBER;   -- Completar tarea
  -- FEAT2 — Integración con Telegram Bot
  v_tar_us1  NUMBER;   -- Consultar tareas en Telegram
  v_tar_us2  NUMBER;   -- Notificaciones de tareas
  v_tar_us11 NUMBER;   -- Integración completa con Telegram Bot
  v_tar_us14 NUMBER;   -- Uso del sistema para gestión real del proyecto
  -- FEAT3 — Visibilidad y Métricas
  v_tar_us4  NUMBER;   -- Vista de tareas (Manager)
  v_tar_us7  NUMBER;   -- Métricas Agile
  v_tar_us9  NUMBER;   -- Visualizar tareas del sprint actual
  -- FEAT4 — Infraestructura y Calidad
  v_tar_us10 NUMBER;   -- Implementar endpoints REST completos
  v_tar_us12 NUMBER;   -- Evidencia de cambios en Oracle DB
  v_tar_us13 NUMBER;   -- Validación de infraestructura (IP pública + Kubernetes)

BEGIN

  -- ============================================================================
  -- PRIOR CLEANUP
  -- ============================================================================
  DELETE FROM EQUIPO51.LOGS_TAREA;
  DELETE FROM EQUIPO51.EVIDENCIAS_TAREA;
  DELETE FROM EQUIPO51.COMENTARIOS_TAREA;
  DELETE FROM EQUIPO51.MIEMBROS_EQUIPO;
  DELETE FROM EQUIPO51.TAREAS;
  DELETE FROM EQUIPO51.USUARIOS;
  DELETE FROM EQUIPO51.PRIORIDAD_TAREA;
  DELETE FROM EQUIPO51.ESTATUS_TAREA;
  DELETE FROM EQUIPO51.EQUIPOS;
  DELETE FROM EQUIPO51.ROLES;
  DBMS_OUTPUT.PUT_LINE('Cleanup completed.');


  -- ============================================================================
  -- 1. ROLES
  -- ============================================================================
  INSERT INTO EQUIPO51.ROLES (NOMBRE, DESCRIPCION)
  VALUES ('Admin', 'Full system control — Product Owner and Scrum Master')
  RETURNING ID_ROL INTO v_rol_admin;

  INSERT INTO EQUIPO51.ROLES (NOMBRE, DESCRIPCION)
  VALUES ('Developer', 'Manages own tasks and participates in code reviews')
  RETURNING ID_ROL INTO v_rol_developer;

  DBMS_OUTPUT.PUT_LINE('Roles: Admin=' || v_rol_admin || ', Developer=' || v_rol_developer);


  -- ============================================================================
  -- 2. TASK STATUSES
  -- ============================================================================
  INSERT INTO EQUIPO51.ESTATUS_TAREA (NOMBRE, ORDEN) VALUES ('Pending',     1) RETURNING ID_ESTATUS INTO v_est_pendiente;
  INSERT INTO EQUIPO51.ESTATUS_TAREA (NOMBRE, ORDEN) VALUES ('In Progress', 2) RETURNING ID_ESTATUS INTO v_est_progreso;
  INSERT INTO EQUIPO51.ESTATUS_TAREA (NOMBRE, ORDEN) VALUES ('Completed',   3) RETURNING ID_ESTATUS INTO v_est_completada;

  DBMS_OUTPUT.PUT_LINE('Statuses: Pending=' || v_est_pendiente ||
                       ', In Progress=' || v_est_progreso ||
                       ', Completed=' || v_est_completada);


  -- ============================================================================
  -- 3. PRIORITIES
  -- ============================================================================
  INSERT INTO EQUIPO51.PRIORIDAD_TAREA (NOMBRE, ORDEN) VALUES ('Low',    1) RETURNING ID_PRIORIDAD INTO v_pri_baja;
  INSERT INTO EQUIPO51.PRIORIDAD_TAREA (NOMBRE, ORDEN) VALUES ('Medium', 2) RETURNING ID_PRIORIDAD INTO v_pri_media;
  INSERT INTO EQUIPO51.PRIORIDAD_TAREA (NOMBRE, ORDEN) VALUES ('High',   3) RETURNING ID_PRIORIDAD INTO v_pri_alta;

  DBMS_OUTPUT.PUT_LINE('Priorities: Low=' || v_pri_baja ||
                       ', Medium=' || v_pri_media ||
                       ', High=' || v_pri_alta);


  -- ============================================================================
  -- 4. TEAMS
  -- ============================================================================
  INSERT INTO EQUIPO51.EQUIPOS (NOMBRE) VALUES ('Team Backend')  RETURNING ID_EQUIPO INTO v_eq_backend;
  INSERT INTO EQUIPO51.EQUIPOS (NOMBRE) VALUES ('Team Frontend') RETURNING ID_EQUIPO INTO v_eq_frontend;

  DBMS_OUTPUT.PUT_LINE('Teams: Backend=' || v_eq_backend || ', Frontend=' || v_eq_frontend);


  -- ============================================================================
  -- 5. USERS
  -- Telegram IDs match the real bot registration order in the project.
  -- ============================================================================
  INSERT INTO EQUIPO51.USUARIOS (ID_INTEGRATION_USUARIO, NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_ROL, CREADO_EN)
  VALUES ('TG_001', 'eugenio.po', 'Eugenio Diaz Lopez', v_rol_admin, SYSDATE)
  RETURNING ID_USUARIO INTO v_usr_eugenio;

  INSERT INTO EQUIPO51.USUARIOS (ID_INTEGRATION_USUARIO, NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_ROL, CREADO_EN)
  VALUES ('TG_002', 'grecia.sm', 'Grecia Lopez', v_rol_admin, SYSDATE)
  RETURNING ID_USUARIO INTO v_usr_grecia;

  INSERT INTO EQUIPO51.USUARIOS (ID_INTEGRATION_USUARIO, NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_ROL, CREADO_EN)
  VALUES ('TG_003', 'gabriel.dev', 'Gabriel Peres Baptista', v_rol_developer, SYSDATE)
  RETURNING ID_USUARIO INTO v_usr_gabriel;

  INSERT INTO EQUIPO51.USUARIOS (ID_INTEGRATION_USUARIO, NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_ROL, CREADO_EN)
  VALUES ('TG_004', 'elian.dev', 'Elian Genc Minondo', v_rol_developer, SYSDATE)
  RETURNING ID_USUARIO INTO v_usr_elian;

  INSERT INTO EQUIPO51.USUARIOS (ID_INTEGRATION_USUARIO, NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_ROL, CREADO_EN)
  VALUES ('TG_005', 'rutilo.dev', 'Rutilo De la Pena Rodriguez', v_rol_developer, SYSDATE)
  RETURNING ID_USUARIO INTO v_usr_rutilo;

  INSERT INTO EQUIPO51.USUARIOS (ID_INTEGRATION_USUARIO, NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_ROL, CREADO_EN)
  VALUES ('TG_006', 'alejandro.dev', 'Alejandro Lopez Gonzalez', v_rol_developer, SYSDATE)
  RETURNING ID_USUARIO INTO v_usr_alejandro;

  DBMS_OUTPUT.PUT_LINE('Users: eugenio=' || v_usr_eugenio ||
                       ', grecia='   || v_usr_grecia   ||
                       ', gabriel='  || v_usr_gabriel  ||
                       ', elian='    || v_usr_elian    ||
                       ', rutilo='   || v_usr_rutilo   ||
                       ', alejandro='|| v_usr_alejandro);


  -- ============================================================================
  -- 6. TASKS
  --
  -- Section A: FEATURES (4)
  --   Status → In Progress (all four features are still open in Notion)
  --   Creator → Eugenio (PO)  |  Assignee → Eugenio (PO owns feature-level)
  --   HORAS_ESTIMADAS from CSV; no HORAS_REALES (feature-level not tracked)
  --
  -- Section B: USER STORIES (14)
  --   Status mapping:  Done → Completed | In progress → In Progress
  --   Assignee: derived from the primary sub-task owners in the CSV
  --   Creator:  Grecia (SM registers stories in Notion)
  --   Due dates converted from MM/DD/YYYY → YYYY-MM-DD where present
  -- ============================================================================

  -- ── SECTION A: FEATURES ────────────────────────────────────────────────────

  -- FEAT1 | Gestión de Tareas CRUD  (est 29h, In Progress)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'FEAT1 | Gestion de Tareas CRUD',
    'Core feature: create, edit, complete and view task details. '
    || 'Covers US3, US5, US6 and US8. Backbone of the REST API.',
    v_est_progreso, v_pri_alta,
    v_usr_eugenio, v_usr_eugenio,
    29, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_feat1;

  -- FEAT2 | Integración con Telegram Bot  (est 32h, In Progress)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'FEAT2 | Integracion con Telegram Bot',
    'Feature: interact with the system through Telegram Bot. '
    || 'Covers US1, US2, US11 and US14. '
    || 'Commands: /mis_tareas, /nueva_tarea, /actualizar_estado, /progreso, /ayuda.',
    v_est_progreso, v_pri_alta,
    v_usr_eugenio, v_usr_eugenio,
    32, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_feat2;

  -- FEAT3 | Visibilidad y Métricas  (est 25h, In Progress)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'FEAT3 | Visibilidad y Metricas',
    'Feature: visibility and agile metrics for managers and developers. '
    || 'Covers US4, US7 and US9. '
    || 'Endpoints: /manager/tareas, /metricas/resumen, /metricas/sprint/{id}/*, /sprints/actual/tareas.',
    v_est_progreso, v_pri_alta,
    v_usr_eugenio, v_usr_eugenio,
    25, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_feat3;

  -- FEAT4 | Infraestructura y Calidad  (est 24h, In Progress)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'FEAT4 | Infraestructura y Calidad',
    'Feature: infrastructure validation, REST quality, and Oracle DB evidence. '
    || 'Covers US10, US12 and US13. '
    || 'Kubernetes on OCI, public IP LoadBalancer, Swagger docs, global error handling.',
    v_est_progreso, v_pri_alta,
    v_usr_eugenio, v_usr_eugenio,
    24, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_feat4;

  DBMS_OUTPUT.PUT_LINE('Features: feat1=' || v_tar_feat1 || ', feat2=' || v_tar_feat2 ||
                       ', feat3=' || v_tar_feat3 || ', feat4=' || v_tar_feat4);


  -- ── SECTION B: USER STORIES ────────────────────────────────────────────────
  -- Ordered by Feature, then by story number within each feature.

  -- ── FEAT1: Gestión de Tareas CRUD ──────────────────────────────────────────

  -- US3 | Crear nueva tarea  (Done · est 8h · real 12h · due 2026-03-27)
  -- Primary sub-task owners: Gabriel (T1,T2,T4), Elian (T3,T5)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO, FECHA_VENCIMIENTO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US3 | Crear nueva tarea',
    'As a developer, create a new task by providing title, description and due date, '
    || 'so it is registered in Oracle DB with status PENDING and assigned to me.',
    v_est_completada, v_pri_alta,
    v_usr_grecia, v_usr_gabriel,
    TO_DATE('2026-03-27','YYYY-MM-DD'),
    8, 12, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us3;

  -- US5 | Editar tareas  (Done · est 5h · real 7h · no due date in CSV)
  -- Primary sub-task owners: Elian (T1,T3), Gabriel (T2)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US5 | Editar tareas',
    'As a developer, edit the title, description, and due date of an existing task '
    || 'so changes are persisted in Oracle DB. Non-editable fields (status, created_at) '
    || 'must be protected.',
    v_est_completada, v_pri_alta,
    v_usr_grecia, v_usr_elian,
    5, 7, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us5;

  -- US6 | Detalle de tareas (logs y evidencias)  (Done · est 10h · real 13h)
  -- Primary sub-task owners: Gabriel (T1,T4), Elian (T2,T3)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US6 | Detalle de tareas (logs y evidencias)',
    'As a manager, view full task details including description, evidence list, '
    || 'comments and progress logs to track each developer''s work. '
    || 'Endpoints: GET /tareas/{id}, POST /tareas/{id}/logs, POST /tareas/{id}/evidencias.',
    v_est_completada, v_pri_alta,
    v_usr_grecia, v_usr_gabriel,
    10, 13, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us6;

  -- US8 | Completar tarea  (Done · est 6h · real 6h · due 2026-04-17)
  -- Primary sub-task owners: Gabriel (T1,T3,T4,T5), Elian (T2)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO, FECHA_VENCIMIENTO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US8 | Completar tarea',
    'As a developer, mark a task as completed by entering actual hours worked, '
    || 'updating Oracle DB status to COMPLETED and recording actualHours. '
    || 'Endpoint: PATCH /tareas/{id}/completar.',
    v_est_completada, v_pri_alta,
    v_usr_grecia, v_usr_gabriel,
    TO_DATE('2026-04-17','YYYY-MM-DD'),
    6, 6, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us8;

  -- ── FEAT2: Integración con Telegram Bot ────────────────────────────────────

  -- US1 | Consultar tareas en Telegram  (Done · est 10h · real 9h)
  -- Primary sub-task owners: Rutilo (T4,T5,T6,T7), Elian (T1,T3)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US1 | Consultar tareas en Telegram',
    'As a developer, use the Telegram command /mis_tareas to receive a formatted '
    || 'list of my assigned tasks with their status and estimated hours, '
    || 'so I can check my workload without accessing the web interface.',
    v_est_completada, v_pri_alta,
    v_usr_grecia, v_usr_rutilo,
    10, 9, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us1;

  -- US2 | Notificaciones de tareas  (Done · est 9h · real 9h · due 2026-04-24)
  -- Primary sub-task owners: Elian (T1,T2,T3,T8), Gabriel (T4,T5), Rutilo (T6,T7)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO, FECHA_VENCIMIENTO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US2 | Notificaciones de tareas',
    'As a developer, receive a Telegram notification when a task is assigned to me '
    || 'and use /actualizar_estado {taskId} {estado} to update progress and '
    || '/progreso {taskId} to view completion percentage (actualHours/estimatedHours).',
    v_est_completada, v_pri_alta,
    v_usr_grecia, v_usr_elian,
    TO_DATE('2026-04-24','YYYY-MM-DD'),
    9, 9, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us2;

  -- US11 | Integración completa con Telegram Bot  (Done · est 8h · real 6h)
  -- Primary sub-task owners: Alejandro (T1,T2), Rutilo (T3,T4), Elian (T5,T6)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US11 | Integracion completa con Telegram Bot',
    'As a user, interact with the full system through Telegram: '
    || 'create tasks (/nueva_tarea), consult them (/mis_tareas), update status '
    || '(/actualizar_estado), and get help (/ayuda). '
    || 'All actions must persist to Oracle DB.',
    v_est_completada, v_pri_alta,
    v_usr_grecia, v_usr_alejandro,
    8, 6, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us11;

  -- US14 | Uso del sistema para gestión real del proyecto  (Done · est 5h)
  -- Primary sub-task owners: Alejandro (T1,T2), Rutilo (T3,T4), Elian (T5,T6)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US14 | Uso del sistema para gestion real del proyecto',
    'As a team, use our own chatbot to register and manage all Sprint 5 tasks '
    || 'through Telegram, validating real-world utility and capturing evidence '
    || 'of the system working as a primary project management tool.',
    v_est_completada, v_pri_alta,
    v_usr_eugenio, v_usr_grecia,
    5, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us14;

  -- ── FEAT3: Visibilidad y Métricas ───────────────────────────────────────────

  -- US4 | Vista de tareas (Manager)  (Done · est 7h · real 8h)
  -- Primary sub-task owners: Eugenio (T4,T5,T7), Elian (T2,T3), Gabriel (T1)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US4 | Vista de tareas (Manager)',
    'As a manager, access GET /manager/tareas (MANAGER role required) to view '
    || 'all tasks grouped by developer with status and hours, '
    || 'so I can monitor team progress at a glance.',
    v_est_completada, v_pri_alta,
    v_usr_grecia, v_usr_eugenio,
    7, 8, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us4;

  -- US7 | Métricas Agile  (Done · est 8h · real 9h)
  -- Primary sub-task owners: Rutilo (T1,T3,T5), Gabriel (T2), Alejandro (T4,T6), Eugenio (T7)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US7 | Metricas Agile',
    'As a user or manager, visualize project metrics: '
    || 'GET /metricas/resumen (Feature/Story/Bug/Task counts), '
    || 'GET /metricas/sprint/{id}/horas (hours by developer), '
    || 'GET /metricas/sprint/{id}/progreso (completion %), '
    || 'GET /metricas/sprint/{id}/fechas (delivery dates). '
    || 'Enables data-driven decisions.',
    v_est_completada, v_pri_alta,
    v_usr_grecia, v_usr_rutilo,
    8, 9, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us7;

  -- US9 | Visualizar tareas del sprint actual  (Done · est 10h · real 12h)
  -- Primary sub-task owners: Alejandro (T2,T7), Rutilo (T3), Gabriel (T1,T4), Eugenio (T5,T6)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US9 | Visualizar tareas del sprint actual',
    'As a developer or manager, call GET /sprints/actual/tareas to receive a '
    || 'readable table of all tasks in the active sprint with assignee, status, '
    || 'estimated hours and actual hours, enabling sprint health monitoring.',
    v_est_completada, v_pri_alta,
    v_usr_grecia, v_usr_alejandro,
    10, 12, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us9;

  -- ── FEAT4: Infraestructura y Calidad ───────────────────────────────────────

  -- US10 | Implementar endpoints REST completos  (Done · est 6h · real 10h)
  -- Primary sub-task owners: Eugenio (T1,T5,T6,T7), Elian (T2,T3)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US10 | Implementar endpoints REST completos',
    'As a team, define all REST routes, implement global exception handling '
    || '(@ControllerAdvice), standardize error format {status, error, message, path}, '
    || 'generate a Postman collection, and verify no endpoint exposes a stack trace.',
    v_est_completada, v_pri_alta,
    v_usr_grecia, v_usr_eugenio,
    6, 10, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us10;

  -- US12 | Evidencia de cambios en Oracle DB  (Done · est 4h · real 4h · due 2026-04-17)
  -- Primary sub-task owner: Eugenio (T1–T6 all owned by Eugenio)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO, FECHA_VENCIMIENTO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US12 | Evidencia de cambios en Oracle DB',
    'As a team, capture SQL screenshot evidence for every critical DB operation: '
    || 'CREATE (INSERT), UPDATE (status change), ASSIGN (asignado_a update), '
    || 'COMPLETE (estado=COMPLETED), LOG (INSERT in TAREA_LOGS). '
    || 'Upload all captures to Supporting files.',
    v_est_completada, v_pri_alta,
    v_usr_grecia, v_usr_eugenio,
    TO_DATE('2026-04-17','YYYY-MM-DD'),
    4, 4, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us12;

  -- US13 | Validación de infraestructura (IP pública + Kubernetes)
  -- (In Progress · est 14h · real 13h)
  -- Primary sub-task owners: Elian (T1,T2,T3,T4), Eugenio (T5,T7)
  INSERT INTO EQUIPO51.TAREAS (
    TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
    ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO,
    HORAS_ESTIMADAS, HORAS_REALES, CREADO_EN, ACTUALIZADO_EN)
  VALUES (
    'US13 | Validacion de infraestructura (IP publica + Kubernetes)',
    'As a team, validate that the system is correctly deployed: '
    || 'Docker image pushed to OCI Container Registry, Spring Boot service '
    || 'running on OKE (Kubernetes), public IP assigned via LoadBalancer, '
    || 'and all endpoints reachable from Postman via public IP.',
    v_est_progreso, v_pri_alta,
    v_usr_grecia, v_usr_elian,
    14, 13, SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_us13;

  DBMS_OUTPUT.PUT_LINE('Stories: us1='  || v_tar_us1  || ', us2='  || v_tar_us2  ||
                       ', us3='  || v_tar_us3  || ', us4='  || v_tar_us4  ||
                       ', us5='  || v_tar_us5  || ', us6='  || v_tar_us6  ||
                       ', us7='  || v_tar_us7  || ', us8='  || v_tar_us8  ||
                       ', us9='  || v_tar_us9  || ', us10=' || v_tar_us10 ||
                       ', us11=' || v_tar_us11 || ', us12=' || v_tar_us12 ||
                       ', us13=' || v_tar_us13 || ', us14=' || v_tar_us14);


  -- ============================================================================
  -- 7. TEAM MEMBERS
  -- Team Backend:  Eugenio (PO), Gabriel (fullstack), Elian (fullstack)
  -- Team Frontend: Grecia (SM),  Rutilo (frontend),  Alejandro (frontend)
  -- ============================================================================
  INSERT INTO EQUIPO51.MIEMBROS_EQUIPO (ID_EQUIPO, ID_USUARIO, SE_UNIO_EN) VALUES (v_eq_backend,  v_usr_eugenio,   SYSDATE);
  INSERT INTO EQUIPO51.MIEMBROS_EQUIPO (ID_EQUIPO, ID_USUARIO, SE_UNIO_EN) VALUES (v_eq_backend,  v_usr_gabriel,   SYSDATE);
  INSERT INTO EQUIPO51.MIEMBROS_EQUIPO (ID_EQUIPO, ID_USUARIO, SE_UNIO_EN) VALUES (v_eq_backend,  v_usr_elian,     SYSDATE);
  INSERT INTO EQUIPO51.MIEMBROS_EQUIPO (ID_EQUIPO, ID_USUARIO, SE_UNIO_EN) VALUES (v_eq_frontend, v_usr_grecia,    SYSDATE);
  INSERT INTO EQUIPO51.MIEMBROS_EQUIPO (ID_EQUIPO, ID_USUARIO, SE_UNIO_EN) VALUES (v_eq_frontend, v_usr_rutilo,    SYSDATE);
  INSERT INTO EQUIPO51.MIEMBROS_EQUIPO (ID_EQUIPO, ID_USUARIO, SE_UNIO_EN) VALUES (v_eq_frontend, v_usr_alejandro, SYSDATE);
  DBMS_OUTPUT.PUT_LINE('Team members inserted: 6');


  -- ============================================================================
  -- 8. TASK COMMENTS
  -- One meaningful comment per task (features + stories), authored by the
  -- assigned developer or the SM/PO in a coordination role.
  -- ============================================================================

  -- Features
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_feat1, v_usr_eugenio,
     'FEAT1 scope confirmed: US3, US5, US6, US8. '
     || 'JPA entities and Oracle schema in Sprint 1-2. CRUD endpoints in Sprint 2.', SYSDATE);

  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_feat2, v_usr_eugenio,
     'FEAT2 scope confirmed: US1, US2, US11, US14. '
     || 'Bot registered with BotFather in Sprint 1. Full integration tested in Sprint 3-4.', SYSDATE);

  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_feat3, v_usr_eugenio,
     'FEAT3 scope confirmed: US4, US7, US9. '
     || 'Manager view and metrics endpoints planned for Sprint 3-6.', SYSDATE);

  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_feat4, v_usr_eugenio,
     'FEAT4 scope confirmed: US10, US12, US13. '
     || 'OKE cluster creation in Sprint 4. Public IP validation pending in Sprint 7.', SYSDATE);

  -- US3
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us3, v_usr_gabriel,
     'Data model designed and CREATE TABLE script executed on Oracle ADB. '
     || 'POST /tareas endpoint ready and tested in Sprint 2.', SYSDATE);

  -- US5
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us5, v_usr_elian,
     'PUT /tareas/{id} implemented. Validation added to prevent editing '
     || 'non-editable fields (estado, fecha_creacion). Tested in Postman.', SYSDATE);

  -- US6
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us6, v_usr_elian,
     'Evidence and log endpoints implemented. '
     || 'GET /tareas/{id} returns full object with tarea_logs and evidencias joined.', SYSDATE);

  -- US8
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us8, v_usr_gabriel,
     'PATCH /tareas/{id}/completar validates task exists and is IN_PROGRESS. '
     || 'actualHours saved to Oracle DB, status set to COMPLETED.', SYSDATE);

  -- US1
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us1, v_usr_rutilo,
     '/mis_tareas command live and tested. Response time < 3s validated in Sprint 3. '
     || 'Tasks filtered by Telegram user ID mapped to Oracle usuario.', SYSDATE);

  -- US2
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us2, v_usr_elian,
     'NotificacionService sends Telegram message on task assignment. '
     || '/actualizar_estado and /progreso commands implemented and tested end-to-end.', SYSDATE);

  -- US11
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us11, v_usr_alejandro,
     'All bot commands functional: /nueva_tarea, /mis_tareas, /actualizar_estado, /ayuda. '
     || 'Full demo recorded in Sprint 4. Actions persist correctly to Oracle DB.', SYSDATE);

  -- US14
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us14, v_usr_grecia,
     'All Sprint 5 stories registered and assigned through the bot. '
     || 'System used as primary task management tool — validates real-world utility.', SYSDATE);

  -- US4
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us4, v_usr_eugenio,
     'GET /manager/tareas returns tasks grouped by developer with MANAGER role guard. '
     || 'DEVELOPER role correctly blocked — 403 returned for unauthorized access.', SYSDATE);

  -- US7
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us7, v_usr_rutilo,
     'All four metrics endpoints implemented and tested in Sprint 6. '
     || 'Responses formatted as { data: {...}, sprint: {id, nombre} }. '
     || 'SQL queries validated directly in Oracle DB.', SYSDATE);

  -- US9
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us9, v_usr_alejandro,
     'GET /sprints/actual/tareas uses JOIN TAREAS + USUARIOS + SPRINTS. '
     || 'Sprint identified by current date between fecha_inicio and fecha_fin. '
     || 'Response includes usuario, estado, horas_estimadas, horas_reales.', SYSDATE);

  -- US10
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us10, v_usr_eugenio,
     'All REST endpoints documented in Swagger. @ControllerAdvice returns '
     || '{ status, error, message, path } for all 400/404/500 cases. '
     || 'Postman collection generated and committed to repo.', SYSDATE);

  -- US12
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us12, v_usr_eugenio,
     'SQL evidence screenshots captured for CREATE, UPDATE, ASSIGN, COMPLETE, LOG operations. '
     || 'All uploads organized in Supporting files on Notion.', SYSDATE);

  -- US13
  INSERT INTO EQUIPO51.COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN) VALUES
    (v_tar_us13, v_usr_eugenio,
     'OKE cluster running, Spring Boot image deployed via OCI Container Registry. '
     || 'Public LoadBalancer IP assigned. Pending: full endpoint validation from public IP (Sprint 7).', SYSDATE);

  DBMS_OUTPUT.PUT_LINE('Comments inserted: 18');


  -- ============================================================================
  -- 9. TASK EVIDENCE
  -- One evidence entry per completed story/feature that generated a deliverable.
  -- ============================================================================
  INSERT INTO EQUIPO51.EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN) VALUES
    (v_tar_us3, v_usr_gabriel,
     'https://storage.oracle.com/evidencias/us3-post-tareas-postman.png',
     'Postman screenshot: POST /tareas returning 201 with new task data', SYSDATE);

  INSERT INTO EQUIPO51.EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN) VALUES
    (v_tar_us5, v_usr_elian,
     'https://storage.oracle.com/evidencias/us5-put-tareas-id-postman.png',
     'Postman screenshot: PUT /tareas/{id} returning 200 with updated fields', SYSDATE);

  INSERT INTO EQUIPO51.EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN) VALUES
    (v_tar_us6, v_usr_elian,
     'https://storage.oracle.com/evidencias/us6-task-detail-logs.png',
     'GET /tareas/{id} response showing logs and evidencias arrays populated', SYSDATE);

  INSERT INTO EQUIPO51.EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN) VALUES
    (v_tar_us8, v_usr_gabriel,
     'https://storage.oracle.com/evidencias/us8-completar-tarea-sql.png',
     'Oracle DB row: status=COMPLETED, actual_hours recorded after PATCH call', SYSDATE);

  INSERT INTO EQUIPO51.EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN) VALUES
    (v_tar_us1, v_usr_rutilo,
     'https://storage.oracle.com/evidencias/us1-mis-tareas-telegram.png',
     'Telegram screenshot: /mis_tareas command returning task list for the user', SYSDATE);

  INSERT INTO EQUIPO51.EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN) VALUES
    (v_tar_us2, v_usr_elian,
     'https://storage.oracle.com/evidencias/us2-notificacion-telegram.png',
     'Telegram notification received on task assignment via NotificacionService', SYSDATE);

  INSERT INTO EQUIPO51.EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN) VALUES
    (v_tar_us11, v_usr_alejandro,
     'https://storage.oracle.com/evidencias/us11-telegram-bot-commands.mp4',
     'Full demo video: create, list and complete task flow via Telegram', SYSDATE);

  INSERT INTO EQUIPO51.EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN) VALUES
    (v_tar_us7, v_usr_rutilo,
     'https://storage.oracle.com/evidencias/us7-metricas-agile-postman.png',
     'Postman: GET /metricas/resumen returning Feature/Story/Bug/Task counts', SYSDATE);

  INSERT INTO EQUIPO51.EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN) VALUES
    (v_tar_us9, v_usr_alejandro,
     'https://storage.oracle.com/evidencias/us9-sprint-actual-tareas.png',
     'GET /sprints/actual/tareas response with all Sprint 6 tasks and hours', SYSDATE);

  INSERT INTO EQUIPO51.EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN) VALUES
    (v_tar_us10, v_usr_eugenio,
     'https://storage.oracle.com/evidencias/us10-swagger-docs.pdf',
     'PDF export of complete Swagger UI documentation for all endpoints', SYSDATE);

  INSERT INTO EQUIPO51.EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN) VALUES
    (v_tar_us12, v_usr_eugenio,
     'https://storage.oracle.com/evidencias/us12-sql-evidence-bundle.zip',
     'ZIP with CREATE, UPDATE, ASSIGN, COMPLETE and LOG SQL screenshots', SYSDATE);

  INSERT INTO EQUIPO51.EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN) VALUES
    (v_tar_us13, v_usr_eugenio,
     'https://storage.oracle.com/evidencias/us13-kubernetes-nodes.png',
     'kubectl get nodes output: cluster active with public LoadBalancer IP assigned', SYSDATE);

  DBMS_OUTPUT.PUT_LINE('Evidence inserted: 12');


  -- ============================================================================
  -- 10. TASK CHANGE LOGS
  -- Key status transitions extracted from sprint history in the CSV.
  -- ============================================================================

  -- Features started
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_feat1, v_usr_eugenio, v_est_pendiente, v_est_progreso,
     'FEAT1 kicked off in Sprint 1 — data model and CREATE TABLE scripts assigned to Gabriel', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_feat2, v_usr_eugenio, v_est_pendiente, v_est_progreso,
     'FEAT2 kicked off in Sprint 1 — bot registered with BotFather, token obtained', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_feat3, v_usr_eugenio, v_est_pendiente, v_est_progreso,
     'FEAT3 kicked off in Sprint 3 — manager view and metrics scoped', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_feat4, v_usr_eugenio, v_est_pendiente, v_est_progreso,
     'FEAT4 kicked off in Sprint 3 — OCI Container Registry and OKE cluster planned', SYSDATE);

  -- US3
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us3, v_usr_gabriel, v_est_pendiente, v_est_progreso,
     'US3 started — Oracle schema designed and CREATE TABLE tareas executed in Sprint 1', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us3, v_usr_elian, v_est_progreso, v_est_completada,
     'US3 completed — POST /tareas endpoint tested in Postman, Sprint 2 delivery', SYSDATE);

  -- US5
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us5, v_usr_elian, v_est_pendiente, v_est_progreso,
     'US5 started — PUT /tareas/{id} and UPDATE in TareaRepository implemented in Sprint 2', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us5, v_usr_rutilo, v_est_progreso, v_est_completada,
     'US5 completed — Postman evidence captured in Sprint 4', SYSDATE);

  -- US6
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us6, v_usr_gabriel, v_est_pendiente, v_est_progreso,
     'US6 started — tarea_logs table created, GET /tareas/{id} scaffolded in Sprint 2', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us6, v_usr_elian, v_est_progreso, v_est_completada,
     'US6 completed — evidence and log endpoints finalized and tested in Sprint 2', SYSDATE);

  -- US8
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us8, v_usr_elian, v_est_pendiente, v_est_progreso,
     'US8 started — PATCH /tareas/{id}/completar scaffolded in Sprint 3', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us8, v_usr_gabriel, v_est_progreso, v_est_completada,
     'US8 completed — actual_hours saved to Oracle DB, state transition validated', SYSDATE);

  -- US1
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us1, v_usr_elian, v_est_pendiente, v_est_progreso,
     'US1 started — OracleChatBot base class created, /mis_tareas handler started in Sprint 3', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us1, v_usr_rutilo, v_est_progreso, v_est_completada,
     'US1 completed — full /mis_tareas flow tested end-to-end in Sprint 3', SYSDATE);

  -- US2
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us2, v_usr_elian, v_est_pendiente, v_est_progreso,
     'US2 started — NotificacionService and /actualizar_estado handler implemented in Sprint 3', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us2, v_usr_elian, v_est_progreso, v_est_completada,
     'US2 completed — full notification and progress command flow verified in Sprint 3', SYSDATE);

  -- US11
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us11, v_usr_alejandro, v_est_pendiente, v_est_progreso,
     'US11 started — /nueva_tarea handler connected to TareaService in Sprint 3', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us11, v_usr_rutilo, v_est_progreso, v_est_completada,
     'US11 completed — all commands verified end-to-end, actions persist in Oracle DB', SYSDATE);

  -- US14
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us14, v_usr_grecia, v_est_pendiente, v_est_progreso,
     'US14 started — Sprint 5 stories registered via bot in Sprint 5', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us14, v_usr_grecia, v_est_progreso, v_est_completada,
     'US14 completed — all sprint tasks managed through bot as primary tool', SYSDATE);

  -- US4
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us4, v_usr_elian, v_est_pendiente, v_est_progreso,
     'US4 started — USUARIOS table with rol field created, manager endpoint scaffolded in Sprint 2', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us4, v_usr_eugenio, v_est_progreso, v_est_completada,
     'US4 completed — GET /manager/tareas tested in Postman with role validation', SYSDATE);

  -- US7
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us7, v_usr_rutilo, v_est_pendiente, v_est_progreso,
     'US7 started — GET /metricas/resumen and sprint metrics endpoints implemented in Sprint 6', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us7, v_usr_eugenio, v_est_progreso, v_est_completada,
     'US7 completed — all metrics endpoints tested in Postman and SQL validated in Oracle DB', SYSDATE);

  -- US9
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us9, v_usr_alejandro, v_est_pendiente, v_est_progreso,
     'US9 started — SPRINTS table created, GET /sprints/actual/tareas implemented in Sprint 6', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us9, v_usr_eugenio, v_est_progreso, v_est_completada,
     'US9 completed — JOIN query validated in Oracle DB, Postman evidence captured', SYSDATE);

  -- US10
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us10, v_usr_eugenio, v_est_pendiente, v_est_progreso,
     'US10 started — all REST routes defined in Sprint 3, global exception handler added', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us10, v_usr_eugenio, v_est_progreso, v_est_completada,
     'US10 completed — Postman collection generated, Swagger deployed, no stack traces exposed', SYSDATE);

  -- US12
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us12, v_usr_eugenio, v_est_pendiente, v_est_progreso,
     'US12 started — SQL evidence capture planned for Sprint 6 alongside other stories', SYSDATE);

  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us12, v_usr_eugenio, v_est_progreso, v_est_completada,
     'US12 completed — all 5 DB operation screenshots captured and uploaded', SYSDATE);

  -- US13 (In Progress — only the start log exists)
  INSERT INTO EQUIPO51.LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN) VALUES
    (v_tar_us13, v_usr_elian, v_est_pendiente, v_est_progreso,
     'US13 started — OCI Container Registry configured, OKE cluster created in Sprint 4. '
     || 'Public IP assigned. LoadBalancer endpoint validation pending in Sprint 7.', SYSDATE);

  DBMS_OUTPUT.PUT_LINE('Logs inserted: 31');


  -- ============================================================================
  -- FINAL COMMIT
  -- ============================================================================
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('===== SCRIPT COMPLETED SUCCESSFULLY =====');

EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    DBMS_OUTPUT.PUT_LINE('ERROR: ' || SQLERRM);
    RAISE;
END;
/


-- ============================================================================
-- FINAL VERIFICATION (run after the PL/SQL block)
-- ============================================================================
SELECT 'ROLES'             AS TABLA, COUNT(*) AS TOTAL FROM EQUIPO51.ROLES             UNION ALL
SELECT 'ESTATUS_TAREA',              COUNT(*)           FROM EQUIPO51.ESTATUS_TAREA    UNION ALL
SELECT 'PRIORIDAD_TAREA',            COUNT(*)           FROM EQUIPO51.PRIORIDAD_TAREA  UNION ALL
SELECT 'EQUIPOS',                    COUNT(*)           FROM EQUIPO51.EQUIPOS           UNION ALL
SELECT 'USUARIOS',                   COUNT(*)           FROM EQUIPO51.USUARIOS          UNION ALL
SELECT 'TAREAS',                     COUNT(*)           FROM EQUIPO51.TAREAS            UNION ALL
SELECT 'MIEMBROS_EQUIPO',            COUNT(*)           FROM EQUIPO51.MIEMBROS_EQUIPO   UNION ALL
SELECT 'COMENTARIOS_TAREA',          COUNT(*)           FROM EQUIPO51.COMENTARIOS_TAREA UNION ALL
SELECT 'EVIDENCIAS_TAREA',           COUNT(*)           FROM EQUIPO51.EVIDENCIAS_TAREA  UNION ALL
SELECT 'LOGS_TAREA',                 COUNT(*)           FROM EQUIPO51.LOGS_TAREA;

-- EXPECTED RESULT:
-- ROLES              2
-- ESTATUS_TAREA      3
-- PRIORIDAD_TAREA    3
-- EQUIPOS            2
-- USUARIOS           6
-- TAREAS             18   (4 Features + 14 User Stories)
-- MIEMBROS_EQUIPO    6
-- COMENTARIOS_TAREA  18   (1 per task)
-- EVIDENCIAS_TAREA   12   (1 per completed story + key features)
-- LOGS_TAREA         31   (start + complete per story; start-only for US13)


-- ============================================================================
-- USER LOOKUP
-- ============================================================================
SELECT NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_USUARIO
FROM   EQUIPO51.USUARIOS
ORDER  BY ID_USUARIO;


-- ============================================================================
-- TASK OVERVIEW (title, type inferred from prefix, status, assignee, hours)
-- ============================================================================
SELECT
  T.TITULO,
  ES.NOMBRE   AS ESTATUS,
  PR.NOMBRE   AS PRIORIDAD,
  UA.NOMBRE_USUARIO AS ASIGNADO,
  T.HORAS_ESTIMADAS,
  T.HORAS_REALES
FROM   EQUIPO51.TAREAS         T
JOIN   EQUIPO51.ESTATUS_TAREA  ES ON ES.ID_ESTATUS  = T.ID_ESTATUS
JOIN   EQUIPO51.PRIORIDAD_TAREA PR ON PR.ID_PRIORIDAD = T.ID_PRIORIDAD
JOIN   EQUIPO51.USUARIOS       UA ON UA.ID_USUARIO  = T.ID_USUARIO_ASIGNADO
ORDER  BY T.ID_TAREA;