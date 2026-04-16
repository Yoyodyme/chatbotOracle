# Frontend Plan — Equipo 51 Task Manager
### Jira-style React SPA · Sprint & Kanban · Oracle ADB Backend

---

## 1. Design Direction

**Aesthetic: "Precision Dark"**

Inspired by Linear, JetBrains, and Bloomberg Terminal — a tool built for engineers who take their work seriously. Dark, dense, and fast. No gradients for decoration. Every pixel earns its place.

| Token | Value | Purpose |
|---|---|---|
| `--bg-base` | `#0B0D11` | App background |
| `--bg-surface` | `#13161C` | Cards, panels |
| `--bg-elevated` | `#1C2029` | Modals, dropdowns |
| `--bg-hover` | `#252A35` | Hover state |
| `--border` | `#2A2F3D` | All borders |
| `--accent` | `#4C8EF7` | Primary CTA, selected state |
| `--accent-soft` | `#1E3460` | Accent background tint |
| `--text-primary` | `#E8EAF0` | Headings, labels |
| `--text-secondary` | `#7A8299` | Subtitles, metadata |
| `--text-muted` | `#4A5068` | Placeholders, disabled |
| `--success` | `#22C55E` | Done, completed |
| `--warning` | `#F59E0B` | In Progress, medium priority |
| `--danger` | `#EF4444` | Alta priority, delete |
| `--info` | `#38BDF8` | Low priority, info badges |

**Typography**

```css
/* Display / Headings */
font-family: 'Syne', sans-serif;           /* Bold geometric — sidebar title, page headers */

/* Body / UI */
font-family: 'DM Sans', sans-serif;        /* Clean readable — all body text, buttons, labels */

/* Monospace — Task IDs, dates, technical values */
font-family: 'JetBrains Mono', monospace;

/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
```

**Motion**
- Page transitions: 150ms ease-out fade + 8px translateY
- Kanban card drag: scale(1.03) + box-shadow elevation
- Toast notifications: slide-in from bottom-right, auto-dismiss 3s
- Sidebar collapse: 250ms cubic-bezier(0.4, 0, 0.2, 1)
- Skeleton loaders on every data fetch (no spinners)

---

## 2. Application Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx           # Collapsible left nav
│   │   ├── TopBar.jsx            # Search, user, notifications
│   │   └── AppShell.jsx          # Layout wrapper
│   ├── kanban/
│   │   ├── KanbanBoard.jsx       # Full board with columns
│   │   ├── KanbanColumn.jsx      # Single status column
│   │   ├── KanbanCard.jsx        # Draggable task card
│   │   └── CardSkeleton.jsx      # Loading state
│   ├── tasks/
│   │   ├── TaskDetailModal.jsx   # Full task view/edit
│   │   ├── TaskRow.jsx           # Backlog list row
│   │   ├── TaskForm.jsx          # Create/edit form
│   │   └── TaskBadge.jsx         # Priority/status chips
│   ├── sprint/
│   │   ├── SprintHeader.jsx      # Sprint name, dates, progress bar
│   │   ├── SprintList.jsx        # All sprints overview
│   │   └── SprintCard.jsx        # Sprint summary card
│   ├── dashboard/
│   │   ├── MetricCard.jsx        # Stat tiles (tasks done, open, etc.)
│   │   ├── BurndownChart.jsx     # Sprint progress chart (recharts)
│   │   └── ActivityFeed.jsx      # Recent logs from /api/logs-tareas
│   └── shared/
│       ├── Avatar.jsx            # User avatar with initials fallback
│       ├── Toast.jsx             # Notification system
│       ├── ConfirmDialog.jsx     # Delete confirmation
│       ├── EmptyState.jsx        # Zero-data illustrations
│       └── Skeleton.jsx          # Generic skeleton loader
├── pages/
│   ├── Dashboard.jsx             # /  — metrics + activity + sprint summary
│   ├── KanbanPage.jsx            # /board — full kanban view
│   ├── BacklogPage.jsx           # /backlog — sortable task list
│   ├── SprintPage.jsx            # /sprints — sprint management
│   └── TeamPage.jsx              # /team — users + roles
├── hooks/
│   ├── useTareas.js              # CRUD for /api/tareas
│   ├── useSprints.js             # Sprint state (local until backend supports it)
│   ├── useUsuarios.js            # /api/usuarios
│   ├── useEquipos.js             # /api/equipos
│   └── useToast.js               # Global toast notifications
├── api/
│   ├── client.js                 # Base fetch wrapper with auth headers
│   ├── tareas.js                 # All /api/tareas calls
│   ├── usuarios.js               # All /api/usuarios calls
│   ├── equipos.js                # All /api/equipos calls
│   ├── comentarios.js            # All /api/comentarios-tareas calls
│   └── logs.js                   # All /api/logs-tareas calls
├── store/
│   └── index.js                  # Zustand global store (tasks, sprints, UI state)
├── styles/
│   ├── globals.css               # CSS variables + resets
│   └── animations.css            # Keyframes
└── App.jsx                       # Router setup
```

---

## 3. Pages & Views

### 3.1 Dashboard (`/`)

The command center. Loads on startup.

**Layout:** 3-column grid on desktop, stacked on mobile.

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR  │  Sprint: "Sprint 3"  ·  Apr 15 → Apr 29         │
│           │  ██████████░░░░░░░  62% complete                 │
│  Dashboard│                                                   │
│  Board    │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  Backlog  │  │ 12 Open  │ │ 5 In Prog│ │ 8 Done   │         │
│  Sprints  │  └──────────┘ └──────────┘ └──────────┘         │
│  Team     │                                                   │
│           │  Burndown Chart ─────────────  Activity Feed     │
│           │  [recharts line graph]          [log entries]    │
└─────────────────────────────────────────────────────────────┘
```

**Components used:** `MetricCard`, `BurndownChart`, `ActivityFeed`, `SprintHeader`

**API calls:**
- `GET /api/tareas` — count by status
- `GET /api/logs-tareas` — recent activity feed
- `GET /api/estatus-tareas` — status labels

---

### 3.2 Kanban Board (`/board`)

The primary daily-use view. Columns = Estatus (Pendiente / En Progreso / Completada).

```
┌──────────────────────────────────────────────────────────────┐
│  Board  [Sprint 3 ▾]  [Equipo Alpha ▾]  [+ New Task]        │
│                                                               │
│  PENDIENTE (4)      EN PROGRESO (3)     COMPLETADA (5)       │
│  ─────────────      ────────────────    ─────────────        │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │ EQ51-001     │   │ EQ51-004     │   │ EQ51-007     │     │
│  │ Login JWT    │   │ Diseño BD    │   │ Swagger docs │     │
│  │ 🔴 Alta      │   │ 🟡 Media     │   │ 🟢 Baja      │     │
│  │ @rutilo      │   │ @grecia      │   │ @alejandro   │     │
│  └──────────────┘   └──────────────┘   └──────────────┘     │
│  ┌──────────────┐   ┌──────────────┐                        │
│  │ EQ51-002     │   │ EQ51-005     │                        │
│  │ CI/CD pipe   │   │ Bot Telegram │                        │
│  └──────────────┘   └──────────────┘                        │
│  [+ Add task]                                                 │
└──────────────────────────────────────────────────────────────┘
```

**Features:**
- Drag-and-drop cards between columns using `@dnd-kit/core`
- Dropping a card calls `PUT /api/tareas/{id}` with the new `idEstatus`
- Click a card → opens `TaskDetailModal`
- Each card shows: task ID badge (monospace), title, priority chip, assignee avatar
- Column header shows count + column-level `+ Add` button

**API calls:**
- `GET /api/tareas` — all tasks
- `PUT /api/tareas/{id}` — update status on drag-drop
- `GET /api/estatus-tareas` — column headers
- `GET /api/usuarios` — assignee avatars

---

### 3.3 Backlog (`/backlog`)

Sortable, filterable full task list. The planning surface.

```
┌────────────────────────────────────────────────────────────────┐
│  Backlog  [🔍 Search...]  [Status ▾]  [Priority ▾]  [+ Task]  │
│                                                                  │
│  ID          TÍTULO                  ESTATUS       PRIORIDAD    │
│  ─────────── ─────────────────────── ─────────────  ─────────  │
│  EQ51-001    Implementar login JWT   • Pendiente    🔴 Alta     │
│  EQ51-002    Diseñar base de datos   • En Progreso  🟡 Media    │
│  EQ51-003    Configurar CI/CD        • Pendiente    🟡 Media    │
│  EQ51-004    Integrar bot Telegram   • En Progreso  🔴 Alta     │
│  EQ51-005    Documentar API Swagger  ✓ Completada   🟢 Baja     │
│                                                                  │
│  Click row → TaskDetailModal                                     │
└────────────────────────────────────────────────────────────────┘
```

**Features:**
- Sort by any column header click
- Filter by status + priority dropdowns
- Inline search (client-side filter on title/description)
- Delete row → `ConfirmDialog` → `DELETE /api/tareas/{id}` → undo toast (5s window)
- Undo calls `POST /api/tareas` to recreate the task with original data

**API calls:**
- `GET /api/tareas` — full list
- `DELETE /api/tareas/{id}` — delete
- `POST /api/tareas` — undo delete (recreate)
- `GET /api/estatus-tareas`, `GET /api/prioridades-tareas` — filter options

---

### 3.4 Sprint Page (`/sprints`)

Manage sprints. Since the backend doesn't have a Sprint entity yet, sprint data is stored in `localStorage` as a temporary measure until the backend is extended.

```
┌──────────────────────────────────────────────────────┐
│  Sprints  [+ New Sprint]                             │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ ACTIVE  Sprint 3 · Apr 15 – Apr 29           │    │
│  │ ████████████░░░░░  62% · 8/13 tasks done     │    │
│  │ [View Board]  [Complete Sprint]              │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ COMPLETED  Sprint 2 · Apr 1 – Apr 14         │    │
│  │ ████████████████████  100% · 10/10 tasks     │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

**Note for future backend work:** Add a `SPRINTS` table with `ID_SPRINT`, `NOMBRE`, `FECHA_INICIO`, `FECHA_FIN`, `ACTIVO`. Add `ID_SPRINT` FK to `TAREAS`.

---

### 3.5 Team Page (`/team`)

View team members, roles, and which equipo they belong to.

**API calls:**
- `GET /api/usuarios`
- `GET /api/equipos`
- `GET /api/roles`
- `GET /api/miembros-equipo`

---

### 3.6 Task Detail Modal

Opens on card click or row click. Full-screen overlay on mobile, centered modal on desktop.

```
┌────────────────────────────────────────────────────────┐
│  EQ51-004                                    [×] Close │
│  ─────────────────────────────────────────────────── │
│  Integrar bot de Telegram                              │
│                                                        │
│  Status:    [En Progreso ▾]    Priority: [Alta ▾]     │
│  Assignee:  [@elian.dev ▾]     Due:      May 05 2026  │
│  Team:      Equipo Beta                               │
│                                                        │
│  Description:                                          │
│  Conectar el bot con los endpoints REST de la API     │
│                                                        │
│  ── Comments ──────────────────────────────────────── │
│  @elian.dev · just now                                 │
│  Bot conectado. Falta implementar /done y /list       │
│                                                        │
│  [Add comment...]                    [Save]  [Delete] │
└────────────────────────────────────────────────────────┘
```

**API calls:**
- `GET /api/tareas/{id}`
- `PUT /api/tareas/{id}` — save changes
- `DELETE /api/tareas/{id}` — delete with confirm
- `GET /api/comentarios-tareas/tarea/{id}` — load comments
- `POST /api/comentarios-tareas` — new comment
- `GET /api/logs-tareas/tarea/{id}` — activity log

---

## 4. API Client Setup

```javascript
// src/api/client.js
const BASE_URL = 'http://localhost:8080';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Basic ' + btoa('admin:admin123'),
};

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}
```

---

## 5. State Management (Zustand)

```javascript
// src/store/index.js
import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // Tasks
  tareas: [],
  setTareas: (tareas) => set({ tareas }),
  updateTarea: (id, data) => set(state => ({
    tareas: state.tareas.map(t => t.idTarea === id ? { ...t, ...data } : t)
  })),
  deleteTarea: (id) => set(state => ({
    tareas: state.tareas.filter(t => t.idTarea !== id)
  })),

  // UI
  selectedTask: null,
  setSelectedTask: (task) => set({ selectedTask: task }),
  sidebarCollapsed: false,
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Toasts
  toasts: [],
  addToast: (toast) => set(state => ({ toasts: [...state.toasts, { id: Date.now(), ...toast }] })),
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));
```

---

## 6. Undo Delete Flow

```javascript
// In BacklogPage.jsx or KanbanCard.jsx
const handleDelete = async (tarea) => {
  // 1. Optimistically remove from UI
  deleteTarea(tarea.idTarea);

  // 2. Call API
  await deleteTareaAPI(tarea.idTarea);

  // 3. Show undo toast for 5 seconds
  addToast({
    message: `"${tarea.titulo}" eliminada`,
    action: {
      label: 'Deshacer',
      onClick: async () => {
        // Recreate the task
        const restored = await createTareaAPI({
          titulo: tarea.titulo,
          descripcion: tarea.descripcion,
          idEstatus: tarea.estatus,
          idPrioridad: tarea.prioridad,
          idUsuarioAsignado: tarea.usuarioAsignado,
        });
        setTareas([...tareas, restored]);
        removeToast(toastId);
      }
    },
    duration: 5000,
  });
};
```

---

## 7. Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "zustand": "^5.0.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "recharts": "^2.12.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0"
  }
}
```

**Why these choices:**
- `react-router-dom` — standard SPA routing
- `zustand` — minimal global state, no boilerplate
- `@dnd-kit` — modern accessible drag-and-drop (replaces deprecated react-beautiful-dnd)
- `recharts` — composable charts, works well with dark themes
- `date-fns` — lightweight date formatting (no moment.js)
- **No UI library** — all components built from scratch to match the Precision Dark aesthetic

---

## 8. Implementation Order

| Phase | What | Estimated effort |
|---|---|---|
| 1 | Replace `src/main/frontend/src/` with Vite project, set up router, AppShell, Sidebar, CSS variables | ~1 day |
| 2 | API client + Zustand store + all data hooks | ~half day |
| 3 | Backlog page (table, search, filter, delete+undo) | ~1 day |
| 4 | Kanban board (columns, cards, drag-and-drop status update) | ~1.5 days |
| 5 | Task Detail Modal (view, edit, comments, logs) | ~1 day |
| 6 | Dashboard (metrics, burndown, activity feed) | ~1 day |
| 7 | Sprint page + Team page | ~1 day |
| 8 | Polish (animations, skeletons, empty states, mobile) | ~1 day |

**Total: ~8 developer-days**

---

## 9. Backend Extensions Needed (future)

These are backend changes needed to fully support the frontend:

| Feature | What to add |
|---|---|
| Sprints | `SPRINTS` table + `/api/sprints` endpoints + `ID_SPRINT` FK in `TAREAS` |
| Epics | `EPICAS` table + `/api/epicas` + `ID_EPICA` FK in `TAREAS` |
| Task search | `GET /api/tareas?titulo=...&idEstatus=...&idPrioridad=...` query params in `TareaController` |
| Assignee filter | `GET /api/tareas?idUsuarioAsignado=...` |
| Sprint board | `GET /api/tareas?idSprint=...` |
| Auth | Replace HTTP Basic with JWT — issue token on login, store in `localStorage` |

---

## 10. Key Design Rules for Implementation

1. **No white backgrounds.** Every surface uses a `--bg-*` token.
2. **Task IDs always in `JetBrains Mono`** — prefix `EQ51-{id}`.
3. **Priority chips**: red pill = Alta, amber = Media, sky = Baja. Always 6px border-radius.
4. **Status pills**: dot + label. Dot colors match status (`--warning`, `--accent`, `--success`).
5. **All borders**: 1px solid `var(--border)`. No shadows except on modals (elevated surface).
6. **Hover states**: `background: var(--bg-hover)` transition 100ms. No color changes.
7. **Skeleton loaders on every list**, not spinners. Match the shape of the real content.
8. **Toast notifications**: bottom-right, dark glass pill, 5s auto-dismiss, manual close button.
9. **Confirmation before every delete** — `ConfirmDialog` with red confirm button.
10. **Empty states**: centered, muted icon + short message + primary action button.
