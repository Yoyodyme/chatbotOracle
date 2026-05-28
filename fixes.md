# fixes.md — Session Change Log & Next Steps

> Changes applied during the May 27, 2026 development session.

---

## ✅ Changes Applied

### 1. Database — Schema Mismatch Fix
**Problem:** SQL scripts run as `ADMIN` in OCI Database Actions inserted rows into `ADMIN.TAREAS`, while the app reads `EQUIPO51.TAREAS`. Data was invisible to the application.

**Changes:**
- `application.properties` — added `spring.jpa.properties.hibernate.default_schema=${ORACLE_DB_USERNAME:EQUIPO51}` so Hibernate always targets the correct schema explicitly.
- `SCRIPT_DATOS_INICIALES.sql` — prefixed every table reference (`DELETE`, `INSERT`, `SELECT`) with `EQUIPO51.` so the script is safe to run as any database user.

---

### 2. Database — Removed H2 In-Memory Database
**Problem:** H2 was a `runtime` dependency with `@Profile("!dev")` on `OracleConfiguration`, meaning anyone running with `-Dspring.profiles.active=dev` would silently get an empty in-memory database instead of Oracle ADB.

**Changes:**
- `pom.xml` — removed H2 dependency entirely.
- `OracleConfiguration.java` — removed `@Profile("!dev")` annotation; Oracle DataSource is now unconditionally active.
- `src/main/resources/data-test.sql` — deleted (unused H2 seed file with hardcoded IDs incompatible with Oracle sequences).
- `CLAUDE.md` — removed all H2/dev-profile documentation; updated run instructions to reflect Oracle-only setup.

---

### 3. Database — Seeded 30 Project Tasks
Added 5 tasks per team member (Gabriel, Rutilo, Grecia, Eugenio, Elian, Alejandro) via `SCRIPT_DATOS_INICIALES.sql` and subsequent SQL runs:

- **10 tasks marked Completed** — assigned to Sprint 4 (Apr 1–30, 2026).
- **20 tasks Pending/In Progress** — 10 assigned to Sprint 5 (May 27–Jun 5, 2026), 10 unassigned.
- All 30 tasks have `HORAS_ESTIMADAS` set; the 10 completed tasks also have `HORAS_REALES` (1–4h range) for KPI tracking.

---

### 4. Database — Sprint Setup
- **Sprint 4** (`ESTADO = 'COMPLETADO'`) — contains the 10 completed tasks.
- **Sprint 5** (`ESTADO = 'current'`) — the active sprint, contains 10 in-progress/pending tasks.
- All other spurious sprints deleted.

---

### 5. Dashboard — Active Sprint Fix + Sprint Selector
**Problem:** Dashboard showed "None" for Active Sprint. Root cause: `DashboardService.getEstadoSprint()` returns `"ACTIVE"` but the frontend checked `s.estado === 'ACTIVO'` (Spanish mismatch) in 5 places.

**Changes:**
- `Dashboard.jsx` — fixed all 5 `'ACTIVO'` → `'ACTIVE'` occurrences (`BadgeEstado` key, `resumen.find()`, `ORDER` map, two color conditions in Sprint Summary).
- `Dashboard.jsx` — added sprint selector dropdown next to the Refresh button: fetches `/api/sprints` on mount, defaults to the active sprint, filters all charts (KPI, hours, contributions, estimated vs actual, velocity) to the selected sprint while keeping Sprint Summary unfiltered.

---

### 6. Kanban — Badge Colors Not Rendering
**Problem:** `TaskBadge.jsx` had color configs keyed by Spanish names (`alta`, `media`, `baja`, `pendiente`, `en progreso`, `completada`). The database stores English names (`High`, `Medium`, `Low`, `Pending`, `In Progress`, `Completed`). All badges fell through to gray default.

**Changes:**
- `TaskBadge.jsx` — added English keys to both `CONFIG_PRIORIDAD` and `CONFIG_ESTATUS` maps pointing to the same color values. Spanish keys retained for backwards compatibility.

---

### 7. Kanban — Sprint Label on Task Cards
**Changes:**
- `KanbanCard.jsx` — added a ⚡ sprint label below the task title, rendered only when `tarea.sprint` is set. Styled with `0.72rem` / `var(--text-muted)` / no background, consistent with existing card conventions.

---

### 8. Kanban — Sprint Filter Not Working
**Problem:** `KanbanPage.jsx` had a sprint selector dropdown but never passed the selection to `KanbanBoard`. Additionally, the active sprint was detected via the nonexistent `s.activo` boolean (should be `s.estado === 'current'`).

**Changes:**
- `KanbanPage.jsx` — fixed active sprint default detection; passes `sprintId` prop to `KanbanBoard`.
- `KanbanBoard.jsx` — accepts `sprintId` prop; derives `tareasFiltradas` and passes it through to column rendering and drag interactions.

---

### 9. Kanban — Real Hours Modal on Task Completion
**Problem:** Dragging a task to Completed silently updated the status with no prompt for actual hours spent (`horasReales`), making KPI tracking incomplete.

**Changes:**
- `KanbanBoard.jsx` — added `LogHoursModal` component. When a card is dragged into the Completed column, the modal intercepts the action and asks *"How long did it take to complete this task?"* with a number input (step 0.5). Two actions:
  - **Log Hours & Complete** — saves `estatus = Completed` + `horasReales` in a single `PUT` call.
  - **Complete without logging hours** — saves only the status change.
- No backend changes required; `horasReales` is sent in the existing `PUT /api/tareas/{id}` payload.

---

## 🔜 Next Steps

### 🟠 Priority 1 — GitHub Actions Fixes

#### Maven Build (4 issues)

1. **Wrong Java version** — `build.yml` declares `java-version: '11'` but `pom.xml` requires Java 17 (Spring Boot 3.x minimum). Change the workflow to `java-version: '17'`.

2. **Missing env vars with no fallbacks** — the workflow sets zero environment variables. `application.properties` uses `${SPRING_ADMIN_PASSWORD}`, `${TELEGRAM_BOT_TOKEN}`, `${ORACLE_DB_USERNAME}`, and `${ORACLE_DB_PASSWORD}` with no defaults. Spring context crashes at startup with `IllegalArgumentException: Could not resolve placeholder`. Add all required secrets to GitHub repo settings and inject them in `build.yml`.

3. **`TelegramE2ETest` requires a live Oracle ADB connection** — annotated `@SpringBootTest @ActiveProfiles("test")`, and `application-test.properties` uses `ddl-auto=validate`, which still attempts an Oracle connection. CI has no wallet files. This test must be excluded from the CI run (e.g. `maven-surefire-plugin` exclude or `@Disabled` annotation) or refactored to mock the datasource.

4. **`OracleConfiguration` activates in CI** — now that `@Profile("!dev")` is removed (fix #2 above), Oracle config always activates. CI has no wallet → connection fails. The CI profile needs to either provide stub datasource config or skip context loading for integration tests.

#### Super Linter (3 issues)

1. **Duplicate workflows** — both `lint.yml` and `superlinter.yml` trigger on push to `main` using different versions (v7 vs v6) with conflicting configs. Delete `superlinter.yml` entirely.

2. **Wrong Checkstyle config filename** — `superlinter.yml` (before deletion) and possibly `lint.yml` reference `google_checks.xml`, which does not exist. Only `java_checks.xml` exists. Update `JAVA_FILE_NAME` in `lint.yml` to `java_checks.xml`.

3. **Widespread `AvoidStarImport` violations** — `java_checks.xml` has `<module name="AvoidStarImport"/>`. At least 10+ files use wildcard imports (`import org.springframework.web.bind.annotation.*`, `import jakarta.persistence.*`, `import static org.mockito.Mockito.*`, etc.). All must be replaced with explicit imports before the linter passes.

---

### 🟢 Priority 2 — Telegram Bot Fixes

#### Issue A — Language Fragmentation
Bot strings are split across 5 files with no single source of truth:

| File | Language |
|---|---|
| `BotMessages.java` | English |
| `BotUpdateDispatcher.java` | Spanish (greeting, cancel prompts) |
| `AgentOrchestrator.java` | Spanish (all business-logic responses hardcoded) |
| `LlmIntentParser.java` | English (system prompts) |
| `TareaBotActions.java` | Mixed |

**Fix:** Move all user-facing strings from `AgentOrchestrator.java`, `BotUpdateDispatcher.java`, and `TareaBotActions.java` into `BotMessages.java` in English. `AgentOrchestrator` should call `BotMessages` constants instead of returning inline Spanish strings.

#### Issue B — Conversation History Never Passed to LLM
`BotConversationManager` correctly accumulates per-chat message history in `historialLlmPorChat`. However, `BotUpdateDispatcher.manejarMensaje(String)` always calls the **zero-history overload** of the orchestrator — the stored history is retrieved but never forwarded. Every message is processed as if it is the first message in the conversation.

**Fix:** Update `BotUpdateDispatcher` to retrieve the chat history from `BotConversationManager` and pass it to the LLM on every incoming message.

#### Issue C — Natural Language Cannot Start Wizard Flows
`AgentOrchestrator` correctly classifies free-text intent (e.g. *"add task to sprint 4"* → `ASIGNAR_TAREA`) but has no bridge to start the corresponding wizard. It returns a static redirect string. The next message arrives with no wizard state and no history, so the bot treats it as a new isolated message.

**Fix:** When a recognized intent is returned by the classifier, `AgentOrchestrator` (or `BotUpdateDispatcher`) must start the appropriate wizard flow — the same flow that slash commands like `/newtask` and `/assignsprint` trigger — rather than returning a static string.
