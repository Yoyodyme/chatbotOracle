# Guía de Pruebas E2E — Bot de Telegram

Esta guía explica cómo configurar el entorno, ejecutar las pruebas end-to-end y verificar que el bot de Telegram y la base de datos responden correctamente.

---

## Arquitectura de las pruebas

```
[ TelegramE2ETest ] ──sendMessage──▶ [ Telegram API ]
         │                                   │
         │                             (entrega el msg)
         │                                   ▼
    verifica BD ◀── actualiza BD ── [ Bot corriendo en otro proceso ]
```

El proceso de prueba levanta el contexto de Spring Boot **sin** el bot de long-polling (`TELEGRAM_BOT_ENABLED=false`) únicamente para acceder a los repositorios JPA.  
El bot real corre en paralelo (otra terminal o pod de K8s) y procesa los mensajes de Telegram actualizando la misma base de datos Oracle ADB.

---

## Requisitos previos

| Requisito | Detalle |
|---|---|
| Java 17+ | Requerido por el proyecto |
| Maven 3.6+ | Para compilar y ejecutar los tests |
| Bot corriendo | `mvn spring-boot:run` en otra terminal, o pod de K8s activo |
| Oracle ADB accesible | Wallet en `MtdrSpring/backend/wallet/` |
| Variables de entorno | `TELEGRAM_BOT_TOKEN`, `DEEPSEEK_API_KEY` |
| Chat ID personal | Obtenido desde @userinfobot en Telegram |
| Datos iniciales en BD | Ejecutar `SCRIPT_DATOS_INICIALES.sql` al menos una vez |

---

## Paso 1 — Obtener tu Chat ID de Telegram

1. Abre Telegram y busca el bot **@userinfobot**.
2. Envía cualquier mensaje (por ejemplo `/start`).
3. El bot responde con tu `Id:` — ese número es tu `chat_id`.

```
Tu chat_id → ejemplo: 123456789
```

---

## Paso 2 — Configurar application-test.properties

Abre el archivo:

```
MtdrSpring/backend/src/test/resources/application-test.properties
```

Reemplaza el placeholder por tu chat_id real:

```properties
TEST_CHAT_ID=123456789
```

No subas este archivo con tu chat_id real a repositorios públicos.

---

## Paso 3 — Configurar variables de entorno

Las siguientes variables deben estar presentes en la shell donde ejecutarás los tests:

```bash
# Linux / macOS
export TELEGRAM_BOT_TOKEN=bot_token_de_BotFather
export DEEPSEEK_API_KEY=tu_deepseek_api_key
# SPRING_ADMIN_PASSWORD ya está sobreescrita en application-test.properties

# Windows (PowerShell)
$env:TELEGRAM_BOT_TOKEN = "bot_token_de_BotFather"
$env:DEEPSEEK_API_KEY   = "tu_deepseek_api_key"
```

---

## Paso 4 — Levantar el bot en otra terminal

El bot debe estar activo antes de ejecutar los tests para que procese los mensajes de Telegram y actualice la BD.

```bash
# Terminal 1 — bot en ejecución
cd MtdrSpring/backend
./mvnw spring-boot:run
```

Espera a ver en los logs:

```
Bot registered successfully: Eq51_bot
```

---

## Paso 5 — Ejecutar las pruebas E2E

```bash
# Terminal 2 — ejecutar los tests
cd MtdrSpring/backend
./mvnw test -Dtest=TelegramE2ETest -Dspring.profiles.active=test
```

Para ejecutar un solo test (útil durante depuración):

```bash
./mvnw test -Dtest=TelegramE2ETest#testDarDeAltaTarea -Dspring.profiles.active=test
```

---

## Descripción de cada test

| # | Nombre | Qué verifica |
|---|---|---|
| 1 | `testDarDeAltaTarea` | El bot crea una tarea con título "Implementar login" y la persiste en BD |
| 2 | `testDarDeBajaTarea` | El bot elimina la tarea creada en (1) y deja de existir en BD |
| 3 | `testAsignarTarea` | El bot asigna una tarea al usuario "Ana"; se verifica el campo `usuarioAsignado` en BD |
| 4 | `testCompletarTarea` | El bot marca la tarea como completada; se verifica `estatus.nombre` contains "complet" |
| 5 | `testVisualizarTareasDesarrollador` | El bot responde con las tareas asignadas a "Ana" (insertas directamente en BD) |
| 6 | `testVisualizarKPIs` | El bot responde con métricas de "Luis" (tareas completadas vs pendientes insertadas en BD) |
| 7 | `testManagerVisualizaEquipo` | El bot responde con la vista de equipo cuando el chat_id tiene rol MANAGER |

---

## Flujo esperado durante la ejecución

```
[Test 1] → sendMessage("nueva tarea Implementar login 3 puntos Sprint 1")
         → espera 3s
         → getUpdates → verifica "creada" en respuesta del bot
         → tareaRepository.findAll() → verifica título contiene "login"

[Test 2] → sendMessage("eliminar tarea <id>")
         → espera 3s
         → getUpdates → verifica "eliminada" en respuesta
         → tareaRepository.findById(<id>) → verifica que no existe

[Test 3] → INSERT tarea en BD (ID controlado)
         → sendMessage("asignar tarea <id> a Ana")
         → espera 3s
         → tareaRepository.findById(<id>) → verifica usuarioAsignado.nombreCompleto contains "Ana"

[Test 4] → sendMessage("completar tarea <id>")
         → espera 3s
         → tareaRepository.findById(<id>) → verifica estatus.nombre contains "complet"

[Test 5] → INSERT 2 tareas asignadas a "Ana"
         → sendMessage("que tareas tiene Ana")
         → espera 3s
         → verifica respuesta contiene "ana" o títulos de las tareas

[Test 6] → INSERT 2 tareas completadas y 1 pendiente para "Luis"
         → sendMessage("kpi de Luis")
         → espera 3s
         → verifica respuesta contiene palabras clave de KPI

[Test 7] → UPDATE usuario de prueba → rol = MANAGER
         → sendMessage("ver tareas del equipo")
         → espera 3s
         → verifica respuesta contiene información del equipo
```

---

## Qué hacer si un test falla

### El contexto de Spring no levanta

- Verifica que el wallet de Oracle está en `MtdrSpring/backend/wallet/`.
- Verifica que las variables de entorno `TELEGRAM_BOT_TOKEN` y `DEEPSEEK_API_KEY` están seteadas.
- Verifica que el archivo `application-test.properties` tiene `TEST_CHAT_ID` con un valor numérico real.

### Error 409 de Telegram (Conflict)

Hay dos instancias del bot tratando de hacer long-polling con el mismo token.  
Asegúrate de que `TELEGRAM_BOT_ENABLED=false` en `application-test.properties` y que sólo una instancia del bot corre.

### La aserción de BD pasa pero la de texto del bot falla

`getLastBotResponse()` devuelve el último mensaje en `getUpdates`, que puede ser un mensaje de usuario, no la respuesta del bot. Esto es una limitación conocida del Bot API (getUpdates solo devuelve mensajes RECIBIDOS por el bot, no los que el bot envía).  

**Solución recomendada para CI/CD:** agregar una tabla `LOG_MENSAJES_BOT` en BD donde el bot registre cada mensaje que envía, y modificar `getLastBotResponse()` para leer de esa tabla.

### El test `testDarDeBajaTarea` falla con "La tarea todavía existe"

El bot no pudo procesar el mensaje de eliminación. Verifica que:
1. El bot está corriendo y en los logs aparece el comando recibido.
2. El `tareaIdCreada` (del test 1) corresponde a una tarea que el bot tiene permiso de eliminar.
3. El formato del comando ("eliminar tarea X") coincide con el parser de comandos del bot.

---

## Notas sobre el mecanismo de sendMessageToBot

`sendMessageToBot(String texto)` usa el endpoint `POST /sendMessage` de la Telegram Bot API con el token del bot. Esto envía un mensaje **FROM el bot TO el chat de prueba**, no simula un mensaje de usuario.

Para que el bot RECIBA y procese el comando, el tester debe enviarlo manualmente desde la app real de Telegram, o bien:

- Implementar un endpoint interno en Spring Boot que acepte un `Update` JSON simulado (recomendado para CI/CD sin interacción humana).
- Usar la Telegram User API (TDLib, Pyrogram) con una cuenta real para inyectar mensajes.

Para propósitos de demostración y QA manual, el flujo es:
1. Ejecutar `mvn test` → el test llama a `sendMessageToBot` (envía el comando desde el bot).
2. El tester **también** envía el mismo comando desde su cuenta real en Telegram.
3. El bot lo procesa y actualiza la BD.
4. La aserción de BD pasa.

---

## Comandos rápidos de referencia

```bash
# Compilar el proyecto sin ejecutar tests
./mvnw clean package -DskipTests -pl MtdrSpring/backend

# Ejecutar TODOS los tests del proyecto
./mvnw test -pl MtdrSpring/backend

# Ejecutar sólo los E2E de Telegram con perfil test
./mvnw test -Dtest=TelegramE2ETest -Dspring.profiles.active=test -pl MtdrSpring/backend

# Ejecutar un test individual con salida detallada
./mvnw test -Dtest=TelegramE2ETest#testCompletarTarea -Dspring.profiles.active=test -pl MtdrSpring/backend -X 2>&1 | tail -50

# Ver logs del bot en tiempo real
tail -f MtdrSpring/backend/logs.log
```
