# CLAUDE.md — chatbotOracle

> **Roadmap activo del proyecto:** ver [`NEXT_STEPS.md`](./NEXT_STEPS.md) en la raíz del repo.

## Descripción del Proyecto
Aplicación cloud-native de gestión de tareas construida sobre Oracle Cloud Infrastructure (OCI).
- **Backend:** Spring Boot 3.5.6 (Java 11) + Hibernate JPA + Oracle Autonomous Database
- **Frontend:** React.js (empaquetado dentro del JAR de Spring Boot por Maven)
- **Bot:** Bot de Telegram (long-polling) para gestionar tareas vía chat
- **IA:** Integración con DeepSeek Chat API (comando `/llm` del bot)
- **Infraestructura:** Por configurar (OCI, Docker, Kubernetes)

---

## Configuración del Entorno de Desarrollo

### Requisitos Previos
- Java 11+
- Maven 3.6+
- Node.js v23 / npm (instalado automáticamente por Maven si no está presente)
- Oracle Wallet en `MtdrSpring/backend/wallet/` (para la base de datos en producción)

### Ejecutar Localmente (Perfil Dev — Base de Datos H2 en Memoria)
```bash
cd MtdrSpring/backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Ejecutar Contra Oracle ADB (Producción)
Asegurarse de que `wallet/` contenga los archivos del Oracle Wallet, luego:
```bash
cd MtdrSpring/backend
./mvnw spring-boot:run
```

### Compilar (JAR completo con React incluido)
```bash
cd MtdrSpring/backend
./mvnw clean package -DskipTests
```

### Ejecutar Pruebas
```bash
cd MtdrSpring/backend
./mvnw test
```

---

## Configuración Clave

| Parámetro | Ubicación | Notas |
|---|---|---|
| Conexión Oracle ADB | `config/OracleConfiguration.java` | Lee el wallet desde el directorio `wallet/` |
| Token del bot de Telegram | `application.properties` | `telegram.bot.token` |
| Clave API DeepSeek | `application.properties` | `deepseek.api.key` |
| Credenciales dev | `application.properties` | `admin` / `admin123` |
| BD de desarrollo (H2) | `application-dev.properties` | Activar con `-Dspring.profiles.active=dev` |

---

## Arquitectura

```
com.springboot.MyTodoList/
├── config/        # Beans de DataSource, CORS, Seguridad, cliente HTTP DeepSeek
├── controller/    # Endpoints REST + controlador del bot de Telegram
├── model/         # Entidades JPA (Tarea, Usuario, Equipo, Rol, etc.)
├── repository/    # Repositorios Spring Data JPA
├── security/      # Configuración Spring Security (HTTP Basic)
├── service/       # Lógica de negocio (ToDoItemService, TareaService, DeepSeekService…)
└── util/          # Comandos, etiquetas, mensajes y acciones del bot
```

### URL Base de la API REST
`http://localhost:8080/api`

Grupos de endpoints principales:
- `/api/tareas` — CRUD completo de tareas + filtros por usuario/estatus/prioridad
- `/api/usuarios`, `/api/roles`, `/api/equipos` — gestión de usuarios y equipos
- `/api/comentarios-tareas`, `/api/evidencias-tareas`, `/api/logs-tareas` — metadatos de tareas
- `/todolist` — to-do simple legado, usado por el bot de Telegram

Matriz completa de endpoints: ver `MATRIZ_ENDPOINTS_REST.md`

### Comandos del Bot de Telegram

| Comando | Acción |
|---|---|
| `/start` | Mostrar teclado principal |
| `/todolist` | Listar todos los elementos |
| `/additem` | Solicitar nuevo elemento |
| `/llm` | Llamar a DeepSeek AI |
| `/hide` | Ocultar teclado |
| `{id}-Done/Undo/Delete` | Acciones en línea sobre un elemento |
| Cualquier texto libre | Se guarda como nuevo elemento de to-do |

---

## Base de Datos

### Producción: Oracle ADB (Querétaro)
- Servicio: `chatbotdb_high.adb.oraclecloud.com`
- Wallet: `MtdrSpring/backend/wallet/`
- Esquema gestionado automáticamente por Hibernate (`ddl-auto=update`)
- Datos iniciales: ejecutar `SCRIPT_DATOS_INICIALES.sql` en OCI → Database Actions → SQL

### Desarrollo: H2 en Memoria
- Datos de prueba cargados desde `src/main/resources/data-test.sql`

---

## Infraestructura

Pendiente de configurar. La infraestructura (Docker, Kubernetes, OCI Terraform) se añadirá desde cero.
Los archivos de referencia del setup anterior se conservan en la rama `main`.

---

## CI/CD
- `.github/workflows/build.yml` — Compila y ejecuta tests con Maven en cada push
- `.github/workflows/lint.yml` — Checkstyle con `java_checks.xml`

---

## Documentación de la API
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Archivos de especificación: `src/main/frontend/public/swagger_APIs_definition.json/.yaml`
- Guía de pruebas con Postman: `GUIA_PASO_A_PASO_POSTMAN.md`

---

## Convenciones del Equipo

### Idioma
Todo el código nuevo, comentarios, nombres de variables y mensajes debe escribirse en **español**, coherente con el modelo de dominio existente (Tarea, Usuario, Equipo, etc.).

### Estilo de Código
Antes de escribir cualquier código en este proyecto, invocar siempre el skill `/coding-standards` como base para garantizar consistencia y calidad.

### Agentes Requeridos

| Cuándo | Agente a usar |
|---|---|
| Antes de cualquier decisión de arquitectura (nuevas entidades, cambios de paquetes, integraciones externas, refactorizaciones mayores) | `/architect` |
| Siempre que se trabaje con Oracle ADB: consultas SQL, migraciones, cambios de esquema, nuevas entidades JPA, modificaciones al `DataSource` | `/database-reviewer` |
| Después de cada implementación completada, antes de hacer merge a `develop` o `main` | `/code-review:code-review` |

### Secretos y Credenciales
- **Nunca** confirmar valores reales de tokens, contraseñas o claves de API en el repositorio.
- Las siguientes variables deben leerse desde **variables de entorno**:
  - `TELEGRAM_BOT_TOKEN` → `telegram.bot.token`
  - `DEEPSEEK_API_KEY` → `deepseek.api.key`
  - `ORACLE_DB_PASSWORD` → contraseña de la ADB
- Usar el patrón `${NOMBRE_VAR:valor-placeholder}` en `application.properties` para que la aplicación falle de forma explícita si falta el valor en el entorno.

### Estrategia de Ramas (Gitflow)

```
main          ← código estable/release únicamente
  └─ develop  ← rama de integración activa
       └─ feature/nombre-feature  ← una rama por feature → PR a develop
       └─ hotfix/nombre-fix       ← correcciones urgentes desde main
```

- Todo cambio a `develop` o `main` requiere Pull Request.
- Las ramas de feature siguen el formato `feature/descripcion-breve`.
- Los hotfixes se ramifican desde `main` y se mergean tanto a `main` como a `develop`.
