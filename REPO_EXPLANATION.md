# chatbotOracle — Detailed Repository Explanation

## What Is This Project?

**chatbotOracle** is a full-stack, cloud-native task management application built on top of Oracle Cloud Infrastructure (OCI). It combines:

- A **Spring Boot REST API** (Java backend) with an **Oracle Autonomous Database (ADB)**
- A **React.js web frontend** served directly from the Spring Boot application
- A **Telegram bot** that lets users manage to-do items via chat commands
- A **DeepSeek AI (LLM) integration** for natural-language features inside the bot
- **Infrastructure-as-Code** with Terraform to provision everything on OCI
- **Kubernetes (OCI Container Engine / OKE)** for deploying the containerized application
- **CI/CD workflows** via GitHub Actions and OCI DevOps

The project is developed by a student team ("Equipo 51") as a workshop/lab exercise using Oracle's cloud stack.

---

## Top-Level Directory Structure

```
chatbotOracle/
├── MtdrSpring/                  # Main application source root
│   ├── backend/                 # Spring Boot backend + React frontend
│   ├── terraform/               # Terraform IaC for OCI resources
│   └── utils/                   # Shell scripts for setup/teardown
├── test/                        # Docker-based test environment
├── .github/workflows/           # GitHub Actions CI pipelines
├── SCRIPT_DATOS_INICIALES.sql   # Seed SQL script for Oracle ADB
├── MATRIZ_ENDPOINTS_REST.md     # Complete REST endpoint reference
├── GUIA_PASO_A_PASO_POSTMAN.md  # Postman testing guide
├── CONTRIBUTING.md              # Contribution guidelines
├── SECURITY.md                  # Security policy
├── oci_devops.yml               # OCI DevOps pipeline configuration
└── test1.py                     # Standalone test script
```

---

## Backend — Spring Boot Application

**Location:** `MtdrSpring/backend/`

Built with **Spring Boot 3.5.6** and **Java 11**, the backend is the application's core. It handles REST API endpoints, database access, Telegram bot logic, and AI integration.

### Key Configuration Files

| File | Purpose |
|---|---|
| `pom.xml` | Maven build descriptor; defines all dependencies |
| `src/main/resources/application.properties` | Main Spring configuration (JPA, security, Telegram, DeepSeek) |
| `src/main/resources/application-dev.properties` | Dev/test profile using H2 in-memory database |
| `src/main/resources/data-test.sql` | Test data loaded in dev mode |
| `wallet/` | Oracle Wallet files (SSL certificates for ADB connection) |

### Package Structure

```
com.springboot.MyTodoList/
├── config/          # Configuration beans
├── controller/      # REST controllers + Telegram bot controller
├── model/           # JPA entities
├── repository/      # Spring Data JPA repositories
├── security/        # Spring Security config
├── service/         # Business logic services
└── util/            # Telegram bot utilities
```

### Data Model (JPA Entities)

The application has two parallel domain models:

#### Legacy Model (original OCI workshop)
- **`ToDoItem`** — Simple to-do item with a description, `done` flag, and creation timestamp. Used by the Telegram bot's CRUD operations.
- **`User`** — Basic user entity.

#### Extended Domain Model (team additions)
These entities map to Oracle ADB tables and are exposed via the full REST API:

| Entity | Table | Description |
|---|---|---|
| `Rol` | `ROLES` | User roles (Admin, Developer, etc.) |
| `Usuario` | `USUARIOS` | Application users with role, username, and an integration ID for external systems (e.g., Telegram user IDs) |
| `Equipo` | `EQUIPOS` | Teams/groups of users |
| `MiembroEquipo` | `MIEMBROS_EQUIPO` | Join table linking users to teams (composite key) |
| `EstatusTarea` | `ESTATUS_TAREA` | Task status catalog (Pending, In Progress, Completed) |
| `PrioridadTarea` | `PRIORIDAD_TAREA` | Task priority catalog (Low, Medium, High) |
| `Tarea` | `TAREAS` | Full task entity with title, description, status, priority, creator, assignee, and due date |
| `ComentarioTarea` | `COMENTARIOS_TAREA` | Comments on tasks |
| `EvidenciaTarea` | `EVIDENCIAS_TAREA` | File/URL evidence attached to tasks |
| `LogTarea` | `LOGS_TAREA` | Audit log of status transitions on tasks |

### REST API Controllers

The API base URL is `http://localhost:8080/api`. There are **10 controllers** exposing **60+ endpoints**:

| Controller | Path | Key features |
|---|---|---|
| `RolController` | `/api/roles` | Standard CRUD |
| `EstatusTareaController` | `/api/estatus-tareas` | Standard CRUD |
| `PrioridadTareaController` | `/api/prioridades-tareas` | Standard CRUD |
| `EquipoController` | `/api/equipos` | Standard CRUD |
| `UsuarioController` | `/api/usuarios` | Standard CRUD |
| `TareaController` | `/api/tareas` | CRUD + filter by assignee, creator, status, priority |
| `MiembroEquipoController` | `/api/miembros-equipos` | Add/remove members; list by team or user |
| `ComentarioTareaController` | `/api/comentarios-tareas` | CRUD + list by task or user |
| `EvidenciaTareaController` | `/api/evidencias-tareas` | CRUD + list by task or user |
| `LogTareaController` | `/api/logs-tareas` | Create/read/delete + list by task or user |
| `ToDoItemController` | `/todolist` | Legacy simple to-do CRUD used by the Telegram bot |
| `UserController` | `/users` | Legacy user CRUD |

The API is documented with **Swagger UI** (`/swagger-ui.html`) and a Swagger JSON/YAML definition in the frontend's public folder.

### Database Configuration

**`config/OracleConfiguration.java`** configures the datasource programmatically. It reads Oracle Wallet files from the `wallet/` directory to establish a secure TLS connection to the Oracle Autonomous Database in OCI's Querétaro region (`adb.mx-queretaro-1.oraclecloud.com`). The connection uses the `chatbotdb_high` service name.

A **dev profile** (`application-dev.properties`) swaps Oracle for an **H2 in-memory database** so the application runs locally without cloud access.

**`config/DataInitializer.java`** seeds reference data on startup. The SQL script `SCRIPT_DATOS_INICIALES.sql` provides a full PL/SQL block to insert roles, statuses, priorities, teams, users, tasks, comments, evidence, and logs into the Oracle ADB.

### Security

**`security/WebSecurityConfiguration.java`** configures Spring Security with HTTP Basic authentication. Development credentials are set directly in `application.properties` (`admin` / `admin123`). The Telegram bot and certain REST endpoints are permit-listed to avoid authentication overhead during development.

### Services

Each entity has a corresponding service class implementing business logic between the controller and the repository. Notable services:

- **`ToDoItemService`** — CRUD for legacy to-do items; used directly by the Telegram bot.
- **`TareaService`** — Full task management with specialized queries (by status, priority, assignee, creator).
- **`DeepSeekService`** — Makes HTTP POST calls to the **DeepSeek AI API** (`https://api.deepseek.com/v1/chat/completions`) using the `deepseek-chat` model. Sends a prompt and returns the raw JSON response.

---

## Telegram Bot

The Telegram bot is the project's signature feature. It is implemented with the **TelegramBots library** (v9.1.0) using the long-polling strategy.

### Bot Controllers

There are two bot implementations (a legacy stub and the active one):

- **`util/MyTodoListBot.java`** — Prototype/stub that echoes messages back.
- **`controller/ToDoItemBotController.java`** — The active production bot. Registered as a Spring `@Component` and `SpringLongPollingBot`, it connects to Telegram using the token from `application.properties` and dispatches every incoming message to a `BotActions` handler.

### Bot Commands and Actions (`util/BotActions.java`)

The bot recognizes these slash commands and interactive button labels:

| Command / Label | Action |
|---|---|
| `/start` or "Show Main Screen" | Displays the main keyboard with navigation buttons |
| `/hide` or "Hide Main Screen" | Dismisses the keyboard |
| `/todolist` or "List All Items" | Fetches all to-do items; renders active items with a "Done" button and completed items with "Undo" and "Delete" buttons |
| `/additem` or "Add New Item" | Prompts the user to type a new item |
| `{id}-Done` | Marks the item with that ID as done |
| `{id}-Undo` | Marks the item with that ID as not done |
| `{id}-Delete` | Deletes the item |
| `/llm` | Sends a hardcoded weather prompt ("Dame los datos del clima en mty") to DeepSeek and replies with the AI's response |
| Any other text | Treated as a new to-do item description and saved to the database |

Bot utilities are organized across:
- **`BotCommands`** — Enum of slash command strings.
- **`BotLabels`** — Enum of button/keyboard label strings.
- **`BotMessages`** — Enum of user-facing message strings.
- **`BotHelper`** — Helper to send text messages with optional reply keyboard markup.
- **`BotClient`** — HTTP client wrapper for external calls.

---

## React Frontend

**Location:** `MtdrSpring/backend/src/main/frontend/`

A **Create React App** project bundled into the Spring Boot JAR via the `frontend-maven-plugin`. On `mvn package`, Node.js is installed automatically, `npm install` is run, and the production build is copied into `src/main/resources/static` so Spring Boot serves it at the root URL.

### Key Frontend Files

| File | Purpose |
|---|---|
| `src/App.js` | Main app component; fetches and renders all to-do items in two tables (pending and done); supports add, delete, and toggle-done |
| `src/NewItem.js` | Form component for adding a new to-do item |
| `src/API.js` | Exports the base API URL (`/todolist`) |
| `src/index.css` | Global CSS styles |
| `public/swagger_APIs_definition.json/.yaml` | Swagger spec for the REST API |

The UI uses **Material UI** components (`Button`, `CircularProgress`, `TableBody`) and **react-moment** for date formatting.

---

## Infrastructure (Terraform on OCI)

**Location:** `MtdrSpring/terraform/`

Terraform scripts provision the full cloud environment on OCI:

| File | Resources |
|---|---|
| `provider.tf` | OCI Terraform provider configuration |
| `main-var.tf` | Input variables (tenancy, compartment, region, DB name) |
| `database.tf` | Oracle Autonomous Database (ATP, 1 OCPU, 1 TB, free tier) with random admin password |
| `containerengine.tf` | OCI Kubernetes Engine (OKE) cluster |
| `core.tf` | VCN, subnets, security lists, internet gateway |
| `apigateway.tf` | OCI API Gateway |
| `repositories.tf` | OCI Container Registry repositories for Docker images |
| `object_storage.tf` | OCI Object Storage buckets |
| `availability_domain.tf` | Availability domain data source |
| `outputs.tf` | Terraform outputs (connection strings, endpoints) |

---

## Kubernetes Deployment

**Location:** `MtdrSpring/backend/minikube/` and `src/main/resources/todolistapp-springboot.yaml`

The application is containerized with a **Dockerfile** (production) and **DockerfileDev** (development). Kubernetes manifests and helper scripts are provided for both local Minikube and OKE deployments:

| Script | Purpose |
|---|---|
| `build.sh` / `buildImgContainer.ps1` | Build the Docker image |
| `deploy.sh` / `minikube/deploy.ps1` | Deploy to Kubernetes |
| `undeploy.sh` | Remove Kubernetes deployment |
| `minikube/wallet2k8s.ps1` | Load Oracle Wallet into a Kubernetes Secret |
| `minikube/dbpass.ps1` | Create database password Secret |
| `minikube/nm.ps1` | Set up namespace |

The Kubernetes YAML manifest (`todolistapp-springboot.yaml`) defines the Deployment and Service for the Spring Boot pod.

---

## CI/CD Pipelines

**`.github/workflows/`**

| Workflow | Purpose |
|---|---|
| `build.yml` | Compiles the Maven project and builds the Docker image on every push |
| `lint.yml` | Runs code style checks against `java_checks.xml` (Checkstyle configuration) |

An `oci_devops.yml` file defines an OCI DevOps pipeline for automated deployment to OKE.

---

## Utility Scripts

**`MtdrSpring/utils/`** and **`MtdrSpring/`**

| Script | Purpose |
|---|---|
| `setup.sh` / `env.sh` | Bootstrap the entire OCI environment |
| `destroy.sh` | Tear down all OCI resources |
| `utils/main-setup.sh` | Full setup orchestration |
| `utils/oke-setup.sh` | OKE-specific setup |
| `utils/db-setup.sh` | Database initialization |
| `utils/terraform.sh` | Terraform apply wrapper |
| `utils/lb-destroy.sh` / `os-destroy.sh` / `repo-destroy.sh` | Partial teardown helpers |
| `utils/kube_token_cache.sh` | Kubernetes token caching |
| `utils/python-scripts/generate-unique-key.py` | Generates a unique run key for resource naming |
| `utils/python-scripts/process-cluster-ocid-json.py` | Parses cluster OCID JSON from Terraform output |

---

## Technology Stack Summary

| Layer | Technology |
|---|---|
| Backend framework | Spring Boot 3.5.6 (Java 11) |
| ORM | Hibernate / Spring Data JPA |
| Database (production) | Oracle Autonomous Database (ATP) on OCI |
| Database (development) | H2 in-memory |
| JDBC Driver | ojdbc11 23.9.0 |
| Frontend | React.js (Create React App), Material UI |
| Bot platform | Telegram (TelegramBots library 9.1.0) |
| AI / LLM | DeepSeek Chat API |
| Security | Spring Security (HTTP Basic) |
| API docs | Springfox Swagger 2 |
| Build tool | Maven 3 + frontend-maven-plugin |
| Containerization | Docker |
| Orchestration | Kubernetes (Minikube for local, OKE for cloud) |
| Infrastructure | Terraform (OCI provider) |
| CI/CD | GitHub Actions + OCI DevOps |
| Code quality | Checkstyle (java_checks.xml) |
| Utilities | Lombok, Apache HttpClient 5 |

---

## Data Flow Overview

```
User (Telegram) ──► Telegram Bot API ──► ToDoItemBotController
                                              │
                                    ┌─────────┴──────────┐
                                    │                    │
                              ToDoItemService      DeepSeekService
                                    │                    │
                              ToDoItemRepository    DeepSeek API
                                    │
                         Oracle Autonomous Database
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                   REST API (60+)        React Frontend
                  /api/tareas, etc.     (served at /)
                         │
                  Web Browser / Postman
```

---

## Seed Data

The file `SCRIPT_DATOS_INICIALES.sql` seeds the Oracle ADB with:
- **2 roles**: Admin, Developer
- **3 task statuses**: Pending, In Progress, Completed
- **3 priorities**: Low, Medium, High
- **3 teams**: Alpha, Beta, Gamma
- **6 users**: gabriel.admin, rutilo.dev, grecia.dev, eugenio.dev, elian.dev, alejandro.dev
- **5 tasks** representing real project work (JWT login, DB design, CI/CD pipeline, Telegram bot integration, Swagger docs)
- **6 comments**, **5 evidence files**, and **5 audit log entries** linked to those tasks
