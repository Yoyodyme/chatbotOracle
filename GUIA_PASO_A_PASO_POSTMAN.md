# Guía de Pruebas Postman — API ChatbotOracle
**Base URL:** `http://localhost:8080`

---

## Configuración inicial 

### Autenticación en cada request
Pestaña **Authorization**:
- Type: `Basic Auth`
- Username: `admin`
- Password: `admin123`

Header en POST y PUT:
- Key: `Content-Type` / Value: `application/json`

### Iniciar la aplicación
```bash
cd MtdrSpring/backend
mvn spring-boot:run
```
Esperar: `========== PRUEBAS COMPLETADAS EXITOSAMENTE ==========`

---

## Reparto de endpoints

| Persona | Endpoints a probar |
|---|---|
| **Gabriel** | `/api/roles` + `/api/estatus-tareas` |
| **Rutilo** | `/api/prioridades-tareas` + `/api/equipos` |
| **Grecia** | `/api/usuarios` |
| **Eugenio** | `/api/tareas` (CRUD + todos los filtros) |
| **Elian** | `/api/miembros-equipos` + `/api/comentarios-tareas` |
| **Alejandro** | `/api/evidencias-tareas` + `/api/logs-tareas` |

**Datos de referencia (IDs que dejó el script):**

| Recurso | ID | Nombre |
|---|---|---|
| Rol | 1 | Admin |
| Rol | 2 | Developer |
| Estatus | 1 | Pendiente |
| Estatus | 2 | En Progreso |
| Estatus | 3 | Completada |
| Prioridad | 1 | Baja |
| Prioridad | 2 | Media |
| Prioridad | 3 | Alta |
| Equipo | 1 | Equipo Alpha |
| Equipo | 2 | Equipo Beta |
| Equipo | 3 | Equipo Gamma |
| Usuario | 1 | gabriel.admin |
| Usuario | 2 | rutilo.dev |
| Usuario | 3 | grecia.dev |
| Usuario | 4 | eugenio.dev |
| Usuario | 5 | elian.dev |
| Usuario | 6 | alejandro.dev |
| Tarea | 1 | Implementar login con JWT |
| Tarea | 2 | Diseñar base de datos |
| Tarea | 3 | Configurar CI/CD pipeline |
| Tarea | 4 | Integrar bot de Telegram |
| Tarea | 5 | Documentar API con Swagger |

---
---

# 1. GABRIEL — Roles + Estatus de Tareas

## `/api/roles`

### 1.1 Listar todos los roles
```
GET http://localhost:8080/api/roles
```
Verificar: devuelve Admin (id 1) y Developer (id 2).

### 1.2 Obtener rol por ID
```
GET http://localhost:8080/api/roles/1
```

### 1.3 Crear un nuevo rol
```
POST http://localhost:8080/api/roles
```
```json
{
  "nombre": "QA Tester",
  "descripcion": "Responsable de pruebas y calidad"
}
```
Verificar: `201 Created`. **Guardar el `idRol` devuelto.**

### 1.4 Actualizar el rol recién creado
```
PUT http://localhost:8080/api/roles/{id_del_paso_1.3}
```
```json
{
  "nombre": "QA Tester",
  "descripcion": "Responsable de pruebas, calidad y documentación"
}
```
Verificar: `200 OK` con descripción actualizada.

### 1.5 Eliminar el rol creado en 1.3
```
DELETE http://localhost:8080/api/roles/{id_del_paso_1.3}
```
Verificar: `200 OK` con `true`. Confirmar con GET que ya no aparece.

---

## `/api/estatus-tareas`

### 1.6 Listar todos los estatus
```
GET http://localhost:8080/api/estatus-tareas
```
Verificar: Pendiente, En Progreso, Completada.

### 1.7 Obtener estatus por ID
```
GET http://localhost:8080/api/estatus-tareas/2
```
Verificar: devuelve "En Progreso".

### 1.8 Crear un nuevo estatus
```
POST http://localhost:8080/api/estatus-tareas
```
```json
{
  "nombre": "Bloqueada",
  "orden": 4
}
```
**Guardar el `idEstatus` devuelto.**

### 1.9 Actualizar el estatus creado
```
PUT http://localhost:8080/api/estatus-tareas/{id_del_paso_1.8}
```
```json
{
  "nombre": "Bloqueada",
  "orden": 4
}
```

### 1.10 Actualizar estatus existente
```
PUT http://localhost:8080/api/estatus-tareas/1
```
```json
{
  "nombre": "Pendiente",
  "orden": 1
}
```

### 1.11 Eliminar el estatus creado en 1.8
```
DELETE http://localhost:8080/api/estatus-tareas/{id_del_paso_1.8}
```
Verificar: `true`.

---
---

# 2. RUTILO — Prioridades + Equipos

## `/api/prioridades-tareas`

### 2.1 Listar todas las prioridades
```
GET http://localhost:8080/api/prioridades-tareas
```
Verificar: Baja, Media, Alta.

### 2.2 Obtener prioridad por ID
```
GET http://localhost:8080/api/prioridades-tareas/3
```
Verificar: devuelve "Alta".

### 2.3 Crear una nueva prioridad
```
POST http://localhost:8080/api/prioridades-tareas
```
```json
{
  "nombre": "Crítica",
  "orden": 4
}
```
**Guardar el `idPrioridad` devuelto.**

### 2.4 Actualizar la prioridad creada
```
PUT http://localhost:8080/api/prioridades-tareas/{id_del_paso_2.3}
```
```json
{
  "nombre": "Crítica - Urgente",
  "orden": 4
}
```
Verificar: nombre actualizado.

### 2.5 Eliminar la prioridad creada en 2.3
```
DELETE http://localhost:8080/api/prioridades-tareas/{id_del_paso_2.3}
```
Verificar: `true`.

---

## `/api/equipos`

### 2.6 Listar todos los equipos
```
GET http://localhost:8080/api/equipos
```
Verificar: Alpha, Beta, Gamma.

### 2.7 Obtener equipo por ID
```
GET http://localhost:8080/api/equipos/1
```

### 2.8 Crear un nuevo equipo
```
POST http://localhost:8080/api/equipos
```
```json
{
  "nombre": "Equipo Delta"
}
```
**Guardar el `idEquipo` devuelto.**

### 2.9 Actualizar el equipo creado
```
PUT http://localhost:8080/api/equipos/{id_del_paso_2.8}
```
```json
{
  "nombre": "Equipo Delta v2"
}
```

### 2.10 Actualizar equipo existente
```
PUT http://localhost:8080/api/equipos/3
```
```json
{
  "nombre": "Equipo Gamma Pro"
}
```

### 2.11 Eliminar el equipo creado en 2.8
```
DELETE http://localhost:8080/api/equipos/{id_del_paso_2.8}
```
Verificar: `true`.

---
---

# 3. GRECIA — Usuarios

## `/api/usuarios`

### 3.1 Listar todos los usuarios
```
GET http://localhost:8080/api/usuarios
```
Verificar: 6 usuarios, cada uno con su rol incluido en el JSON.

### 3.2 Obtener usuario por ID
```
GET http://localhost:8080/api/usuarios/1
```
Verificar: gabriel.admin con rol Admin.

### 3.3 Obtener otro usuario
```
GET http://localhost:8080/api/usuarios/4
```
Verificar: eugenio.dev.

### 3.4 Crear un nuevo usuario
```
POST http://localhost:8080/api/usuarios
```
```json
{
  "nombreUsuario": "nuevo.tester",
  "nombreCompleto": "Nuevo Tester",
  "idIntegrationUsuario": "TG_007",
  "rol": { "idRol": 2 }
}
```
**Guardar el `idUsuario` devuelto.**

### 3.5 Actualizar el usuario creado
```
PUT http://localhost:8080/api/usuarios/{id_del_paso_3.4}
```
```json
{
  "nombreUsuario": "nuevo.tester",
  "nombreCompleto": "Nuevo Tester Senior",
  "idIntegrationUsuario": "TG_007",
  "rol": { "idRol": 1 }
}
```
Verificar: nombre y rol actualizados.

### 3.6 Actualizar usuario existente (cambio de rol)
```
PUT http://localhost:8080/api/usuarios/6
```
```json
{
  "nombreUsuario": "alejandro.dev",
  "nombreCompleto": "Alejandro Developer Senior",
  "idIntegrationUsuario": "TG_006",
  "rol": { "idRol": 2 }
}
```

### 3.7 Eliminar el usuario creado en 3.4
```
DELETE http://localhost:8080/api/usuarios/{id_del_paso_3.4}
```
Verificar: `true`. Confirmar con GET que ya no aparece.

---
---

# 4. EUGENIO — Tareas

## `/api/tareas`

### 4.1 Listar todas las tareas
```
GET http://localhost:8080/api/tareas
```
Verificar: 5 tareas con estatus, prioridad y usuarios anidados.

### 4.2 Obtener tarea por ID
```
GET http://localhost:8080/api/tareas/1
```
Verificar: "Implementar login con JWT".

### 4.3 Filtrar por usuario asignado
```
GET http://localhost:8080/api/tareas/asignado/2
```
Verificar: tareas asignadas a rutilo.dev.

### 4.4 Filtrar por usuario creador
```
GET http://localhost:8080/api/tareas/creador/1
```
Verificar: tareas creadas por gabriel.admin.

### 4.5 Filtrar por estatus Pendiente
```
GET http://localhost:8080/api/tareas/estatus/1
```
Verificar: solo tareas con estatus "Pendiente".

### 4.6 Filtrar por prioridad Alta
```
GET http://localhost:8080/api/tareas/prioridad/3
```
Verificar: solo tareas con prioridad "Alta".

### 4.7 Crear una nueva tarea
```
POST http://localhost:8080/api/tareas
```
```json
{
  "titulo": "Optimizar queries de base de datos",
  "descripcion": "Revisar y mejorar el rendimiento de las consultas SQL",
  "fechaVencimiento": "2026-05-15",
  "estatus": { "idEstatus": 1 },
  "prioridad": { "idPrioridad": 2 },
  "usuarioCreador": { "idUsuario": 1 },
  "usuarioAsignado": { "idUsuario": 4 }
}
```
**Guardar el `idTarea` devuelto.**

### 4.8 Actualizar la tarea creada (cambiar estatus a En Progreso)
```
PUT http://localhost:8080/api/tareas/{id_del_paso_4.7}
```
```json
{
  "titulo": "Optimizar queries de base de datos",
  "descripcion": "Revisar y mejorar el rendimiento de las consultas SQL",
  "fechaVencimiento": "2026-05-15",
  "estatus": { "idEstatus": 2 },
  "prioridad": { "idPrioridad": 2 },
  "usuarioCreador": { "idUsuario": 1 },
  "usuarioAsignado": { "idUsuario": 4 }
}
```

### 4.9 Actualizar tarea existente (completar tarea 5)
```
PUT http://localhost:8080/api/tareas/5
```
```json
{
  "titulo": "Documentar API con Swagger",
  "descripcion": "Crear documentación completa de todos los endpoints",
  "fechaVencimiento": "2026-04-20",
  "estatus": { "idEstatus": 3 },
  "prioridad": { "idPrioridad": 1 },
  "usuarioCreador": { "idUsuario": 2 },
  "usuarioAsignado": { "idUsuario": 6 }
}
```

### 4.10 Eliminar la tarea creada en 4.7
```
DELETE http://localhost:8080/api/tareas/{id_del_paso_4.7}
```
Verificar: `true`.

---
---

# 5. ELIAN — Miembros de Equipo + Comentarios

## `/api/miembros-equipos`

### 5.1 Listar todos los miembros
```
GET http://localhost:8080/api/miembros-equipos
```
Verificar: 6 relaciones equipo-usuario.

### 5.2 Miembros del equipo Alpha
```
GET http://localhost:8080/api/miembros-equipos/equipo/1
```
Verificar: gabriel.admin, rutilo.dev, grecia.dev.

### 5.3 Miembros del equipo Beta
```
GET http://localhost:8080/api/miembros-equipos/equipo/2
```
Verificar: eugenio.dev, elian.dev.

### 5.4 Equipos de un usuario
```
GET http://localhost:8080/api/miembros-equipos/usuario/6
```
Verificar: alejandro.dev está en Equipo Gamma.

### 5.5 Agregar un nuevo miembro
```
POST http://localhost:8080/api/miembros-equipos
```
```json
{
  "equipo": { "idEquipo": 3 },
  "usuario": { "idUsuario": 4 }
}
```
Verificar: eugenio.dev agregado a Equipo Gamma.

### 5.6 Eliminar el miembro agregado en 5.5
```
DELETE http://localhost:8080/api/miembros-equipos/3/4
```
(idEquipo=3, idUsuario=4)

Verificar: `true`. Confirmar con:
```
GET http://localhost:8080/api/miembros-equipos/equipo/3
```

---

## `/api/comentarios-tareas`

### 5.7 Listar todos los comentarios
```
GET http://localhost:8080/api/comentarios-tareas
```
Verificar: 6 comentarios.

### 5.8 Obtener comentario por ID
```
GET http://localhost:8080/api/comentarios-tareas/1
```

### 5.9 Comentarios de la tarea 1
```
GET http://localhost:8080/api/comentarios-tareas/tarea/1
```
Verificar: 2 comentarios sobre el login JWT.

### 5.10 Comentarios del usuario 1
```
GET http://localhost:8080/api/comentarios-tareas/usuario/1
```

### 5.11 Crear un nuevo comentario
```
POST http://localhost:8080/api/comentarios-tareas
```
```json
{
  "tarea": { "idTarea": 3 },
  "usuarioAutor": { "idUsuario": 5 },
  "cuerpo": "Revisé el pipeline, falta configurar las variables de entorno para OCI."
}
```
**Guardar el `idComentario` devuelto.**

### 5.12 Actualizar el comentario creado
```
PUT http://localhost:8080/api/comentarios-tareas/{id_del_paso_5.11}
```
```json
{
  "tarea": { "idTarea": 3 },
  "usuarioAutor": { "idUsuario": 5 },
  "cuerpo": "Variables de entorno configuradas. El pipeline ya despliega correctamente a OCI."
}
```

### 5.13 Actualizar comentario existente
```
PUT http://localhost:8080/api/comentarios-tareas/1
```
```json
{
  "tarea": { "idTarea": 1 },
  "usuarioAutor": { "idUsuario": 2 },
  "cuerpo": "JWT implementado y probado. Access token 1h, refresh token 7 días."
}
```

### 5.14 Eliminar el comentario creado en 5.11
```
DELETE http://localhost:8080/api/comentarios-tareas/{id_del_paso_5.11}
```
Verificar: `true`.

---
---

# 6. ALEJANDRO — Evidencias + Logs de Tareas

## `/api/evidencias-tareas`

### 6.1 Listar todas las evidencias
```
GET http://localhost:8080/api/evidencias-tareas
```
Verificar: 5 evidencias.

### 6.2 Obtener evidencia por ID
```
GET http://localhost:8080/api/evidencias-tareas/1
```

### 6.3 Evidencias de la tarea 2
```
GET http://localhost:8080/api/evidencias-tareas/tarea/2
```
Verificar: diagrama ER de grecia.dev.

### 6.4 Evidencias subidas por un usuario
```
GET http://localhost:8080/api/evidencias-tareas/usuario/6
```
Verificar: evidencia de alejandro.dev.

### 6.5 Crear una nueva evidencia
```
POST http://localhost:8080/api/evidencias-tareas
```
```json
{
  "tarea": { "idTarea": 4 },
  "usuarioSubio": { "idUsuario": 5 },
  "urlArchivo": "https://storage.oracle.com/evidencias/bot-comandos-lista.png",
  "nota": "Captura de los comandos del bot funcionando en Telegram"
}
```
**Guardar el `idEvidencia` devuelto.**

### 6.6 Actualizar la evidencia creada
```
PUT http://localhost:8080/api/evidencias-tareas/{id_del_paso_6.5}
```
```json
{
  "tarea": { "idTarea": 4 },
  "usuarioSubio": { "idUsuario": 5 },
  "urlArchivo": "https://storage.oracle.com/evidencias/bot-comandos-lista-v2.png",
  "nota": "Versión 2 — incluye comandos /done y /list"
}
```

### 6.7 Actualizar evidencia existente
```
PUT http://localhost:8080/api/evidencias-tareas/1
```
```json
{
  "tarea": { "idTarea": 1 },
  "usuarioSubio": { "idUsuario": 2 },
  "urlArchivo": "https://storage.oracle.com/evidencias/login-jwt-v2.png",
  "nota": "Captura actualizada del login con token renovado"
}
```

### 6.8 Eliminar la evidencia creada en 6.5
```
DELETE http://localhost:8080/api/evidencias-tareas/{id_del_paso_6.5}
```
Verificar: `true`.

---

## `/api/logs-tareas`

### 6.9 Listar todos los logs
```
GET http://localhost:8080/api/logs-tareas
```
Verificar: 5 logs.

### 6.10 Obtener log por ID
```
GET http://localhost:8080/api/logs-tareas/1
```

### 6.11 Logs de la tarea 1
```
GET http://localhost:8080/api/logs-tareas/tarea/1
```
Verificar: log del cambio de estatus de la tarea de login.

### 6.12 Logs del usuario 1
```
GET http://localhost:8080/api/logs-tareas/usuario/1
```

### 6.13 Crear un nuevo log
```
POST http://localhost:8080/api/logs-tareas
```
```json
{
  "tarea": { "idTarea": 3 },
  "usuario": { "idUsuario": 4 },
  "idEstatusOrigen": 2,
  "idEstatuDestino": 3,
  "mensaje": "Pipeline CI/CD completado y desplegado en producción"
}
```
**Guardar el `idLog` devuelto.**

### 6.14 Crear otro log
```
POST http://localhost:8080/api/logs-tareas
```
```json
{
  "tarea": { "idTarea": 4 },
  "usuario": { "idUsuario": 5 },
  "idEstatusOrigen": 1,
  "idEstatuDestino": 3,
  "mensaje": "Bot de Telegram integrado y funcionando en producción"
}
```

### 6.15 Eliminar el log creado en 6.13
```
DELETE http://localhost:8080/api/logs-tareas/{id_del_paso_6.13}
```
Verificar: `true`.

---

## Solución de Problemas

| Error | Causa | Solución |
|---|---|---|
| `401 Unauthorized` | Sin autenticación | Agregar Basic Auth: `admin` / `admin123` |
| `404 Not Found` | URL incorrecta o ID no existe | Verificar URL y tabla de IDs al inicio de esta guía |
| `400 Bad Request` | JSON malformado | Verificar que el Content-Type sea `application/json` |
| `500 Internal Server Error` | Constraint violada o campo faltante | Revisar que todos los campos obligatorios estén presentes |
| `Connection refused` | App no está corriendo | Ejecutar `mvn spring-boot:run` en `MtdrSpring/backend` |
| Lista vacía en GET | Script SQL no ejecutado | Pedir a Gabriel que ejecute `SCRIPT_DATOS_INICIALES.sql` |
