# NEXT_STEPS.md — chatbotOracle Roadmap

Active development roadmap. Mark items `[x]` when done and commit so the whole team stays in sync.

---

## 1. Frontend UI Fixes
**Status:** `[ ] Pending`

Several buttons and UI elements have visual issues after the OCI Redwood redesign. Go through each page and fix:

- [ ] Audit every button across all pages (Dashboard, Backlog, Board, Sprints, Team) — check hover states, disabled states, spacing
- [ ] Fix any modals that don't close correctly or have broken overlays
- [ ] Verify form inputs (TaskForm, SprintForm) render correctly on light theme — labels, focus rings, date picker
- [ ] Check badge alignment in the Kanban cards and Backlog table
- [ ] Test on different screen sizes and fix any obvious overflow or clipping

**Files likely involved:** `src/components/tasks/`, `src/pages/`, `src/components/shared/`

---

## 2. Project Cleanup — Remove Unused Files and Dead Code
**Status:** `[ ] Pending`

- [ ] Audit all frontend source files — remove any unused components, hooks, or pages
- [ ] Remove unused backend classes, services, or controllers
- [ ] Clean up `application.properties` — remove commented-out lines and dead config keys
- [ ] Remove any leftover Terraform/K8s files that are outdated or duplicated
- [ ] Verify `pom.xml` dependencies — remove any unused Maven dependencies
- [ ] Consolidate duplicate utility functions across backend service classes

**Goal:** Lean codebase that is easy to onboard onto.

---

## 3. Security — Environment Variables and No Public Tokens
**Status:** `[x] Done`

Currently `application.properties` contains sensitive values in plaintext. Fix:

- [ ] Move `telegram.bot.token` → read from `TELEGRAM_BOT_TOKEN` env var
- [ ] Move `deepseek.api.key` → read from `DEEPSEEK_API_KEY` env var
- [ ] Move Oracle ADB password → read from `ORACLE_DB_PASSWORD` env var
- [ ] Use Spring Boot pattern `${VAR_NAME}` (no fallback default) so the app fails fast if vars are missing
- [ ] Add a `.env.example` file at the repo root documenting all required env vars (no real values)
- [ ] Add `.env` to `.gitignore` if not already there
- [ ] Audit Git history — if any real tokens were previously committed, rotate them immediately
- [ ] Update CI/CD workflow (`build.yml`) to inject secrets from GitHub Actions Secrets

**Pattern to follow in `application.properties`:**
```properties
telegram.bot.token=${TELEGRAM_BOT_TOKEN}
deepseek.api.key=${DEEPSEEK_API_KEY}
```

---

## 4. Telegram Bot ↔ Frontend Sync — Real-Time Task Updates
**Status:** `[ ] Pending`

Tasks created or modified via the Telegram bot are not reflected in the web frontend without a manual page reload. Fix this:

- [ ] Identify the data flow: bot writes to DB via `ToDoItemService` / `TareaService` → frontend needs to poll or receive push
- [ ] **Option A (simpler — polling):** Add a periodic `setInterval` in the frontend store (e.g. every 30s) that re-fetches `/api/tareas` and merges with local state
- [ ] **Option B (better — SSE or WebSocket):** Add a Spring Boot `SseEmitter` endpoint (`/api/tareas/stream`) that pushes task-change events; frontend subscribes with `EventSource`
- [ ] Decide on Option A or B as a team and implement it
- [ ] Test the full flow: add a task via Telegram → verify it appears in the web UI within the polling/push window
- [ ] Also verify: task status changes done in the web UI appear correctly in the bot's `/todolist` command

**Key files:** `ToDoItemController.java`, `TareaController.java`, `src/store/index.js`, `src/hooks/useTareas.js`

---

## 5. Docker and Kubernetes — Clear Deployment Structure
**Status:** `[ ] Pending`

Standardize the deployment pipeline so any developer can build and deploy with minimal setup:

### Docker
- [ ] Verify `Dockerfile` at `MtdrSpring/backend/` builds correctly (multi-stage: Maven build → JRE runtime)
- [ ] Confirm the JAR includes the built frontend (Maven `frontend-maven-plugin` must run before `package`)
- [ ] Document the build command in this file:
  ```bash
  docker build -t chatbot-oracle:latest MtdrSpring/backend/
  docker run -p 8080:8080 \
    -e TELEGRAM_BOT_TOKEN=... \
    -e DEEPSEEK_API_KEY=... \
    -e ORACLE_DB_PASSWORD=... \
    chatbot-oracle:latest
  ```
- [ ] Add a `docker-compose.yml` at the repo root for local development (app + any local dependencies)

### Kubernetes (OKE / Minikube)
- [ ] Audit existing manifests in `MtdrSpring/backend/minikube/` — ensure they reference the correct image and secrets
- [ ] Create a `k8s/` folder at the repo root with clean, documented manifests:
  - `deployment.yaml` — app Deployment with resource limits and health probes (`livenessProbe`, `readinessProbe`)
  - `service.yaml` — ClusterIP or LoadBalancer Service
  - `secret.yaml.example` — template for K8s Secret (no real values)
  - `ingress.yaml` — optional, for domain routing
- [ ] Document the deploy sequence in `k8s/README.md`:
  ```bash
  kubectl apply -f k8s/secret.yaml      # fill in real values first
  kubectl apply -f k8s/deployment.yaml
  kubectl apply -f k8s/service.yaml
  ```
- [ ] Update CI/CD (`oci_devops.yml`) to build the Docker image and push to OCI Container Registry on merge to `main`

---

## Suggested Order of Work

| Priority | Step | Reason |
|---|---|---|
| 1 | Security (Step 3) | Tokens in repo is an active risk — fix before next push |
| 2 | Frontend fixes (Step 1) | Unblocks QA and demos |
| 3 | Bot ↔ Frontend sync (Step 4) | Core feature gap |
| 4 | Docker/K8s structure (Step 5) | Enables team deployments |
| 5 | Cleanup (Step 2) | Do last to avoid disrupting in-progress work |
