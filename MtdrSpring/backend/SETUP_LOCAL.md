# Local Setup — Backend contra Oracle ADB

Guía rápida para que cualquier integrante del equipo levante el backend en su máquina y se conecte directamente a la base de datos Oracle Autonomous Database (ADB) del proyecto.

---

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Java (JDK) | 11 |
| Maven | No necesario — el proyecto incluye `mvnw` |
| Git | Cualquier versión reciente |
| Bash | Git Bash / WSL (Windows) o terminal nativa (macOS/Linux) |

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/eliangenc123/chatbotOracle.git
cd chatbotOracle
```

El wallet de Oracle ya está incluido en el repo en `MtdrSpring/backend/wallet/`. No necesitas descargarlo por separado.

---

## 2. Crear el archivo `.env`

El archivo `.env` **no está en el repositorio** (está en `.gitignore`). Debes crearlo manualmente a partir de la plantilla:

```bash
cd MtdrSpring/backend
cp .env.example .env
```

Luego abre `.env` con cualquier editor y completa los valores reales:

```env
# Oracle Autonomous Database
ORACLE_DB_USERNAME=EQUIPO51
ORACLE_DB_PASSWORD=<contraseña real de la ADB>

# Spring Security — usuario/contraseña para la API REST
SPRING_ADMIN_USER=admin
SPRING_ADMIN_PASSWORD=<elige una contraseña>

# Telegram Bot
TELEGRAM_BOT_TOKEN=<token del bot>
TELEGRAM_BOT_NAME=Eq51_bot

# DeepSeek AI (opcional — déjalo vacío si no lo usas)
DEEPSEEK_API_KEY=<tu clave de DeepSeek o deja vacío>
```

> **Pide los valores reales** (`ORACLE_DB_PASSWORD`, `TELEGRAM_BOT_TOKEN`) al líder del equipo por un canal privado. **Nunca compartas ni subas estos valores al repositorio.**

---

## 3. Arrancar el backend

```bash
cd MtdrSpring/backend
bash start-dev.sh
```

`start-dev.sh` carga automáticamente las variables de `.env` y ejecuta `./mvnw spring-boot:run` conectado a Oracle ADB.

Al ver esto en consola, el backend está listo:

```
Started MyTodoListApplication in X.XXX seconds
```

---

## 4. Verificar que funciona

```bash
curl -u admin:<SPRING_ADMIN_PASSWORD> http://localhost:8080/api/tareas
```

Deberías recibir un JSON con las tareas del equipo almacenadas en la ADB.

También puedes abrir el Swagger UI en el navegador:

```
http://localhost:8080/swagger-ui.html
```

---

## Solución de problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `ERROR: No se encontró el archivo .env` | `.env` no existe | Ejecutar el paso 2 |
| `ORA-01017: invalid username/password` | `ORACLE_DB_PASSWORD` incorrecto | Verificar el valor con el líder del equipo |
| `java.io.FileNotFoundException: wallet/` | Wallet no encontrado | Confirmar que `MtdrSpring/backend/wallet/` existe y tiene archivos |
| Puerto 8080 en uso | Otro proceso ocupa el puerto | Cambiar puerto en `application.properties` con `server.port=8081` o matar el proceso |
| `./mvnw: Permission denied` | Sin permisos de ejecución | Ejecutar `chmod +x mvnw` dentro de `MtdrSpring/backend/` |
| `TelegramApiErrorResponseException` al arrancar | Conflicto de long-polling: dos desarrolladores comparten el mismo token y Telegram sólo permite un consumidor activo | Añadir `TELEGRAM_BOT_ENABLED=false` en tu `.env` — el bot no se registra y el backend arranca con acceso completo a la API y la BD |
| Frontend con componentes o estilos faltantes | Caché de compilación de Maven (`target/`) o `node_modules` desactualizados — `spring-boot:run` reutiliza artefactos anteriores en lugar de reconstruir desde cero | Hacer primero `git pull`, luego ejecutar `bash start-dev.sh` con limpieza: detener el proceso, correr `./mvnw clean` dentro de `MtdrSpring/backend/` y volver a lanzar `bash start-dev.sh` |

---

## Estructura relevante

```
MtdrSpring/backend/
├── .env.example        ← plantilla del .env (comprometida en el repo)
├── .env                ← tu archivo local con secretos reales (NO se sube)
├── start-dev.sh        ← script de arranque (carga .env y ejecuta Maven)
├── wallet/             ← Oracle Wallet (comprometido en el repo)
└── src/main/resources/
    └── application.properties   ← configuración principal (lee variables de entorno)
```
