# MATRIZ DE ENDPOINTS REST - MYTOODOLIST API

## Resumen Total
- **Total Controllers:** 10
- **Total Endpoints:** 60+
- **Métodos HTTP:** GET, POST, PUT, DELETE
- **Base URL:** `http://localhost:8080/api`

---

## 📊 MATRIZ DE ENDPOINTS POR CONTROLADOR

### 1️⃣ RolController (/api/roles)
```
┌─────────┬──────────────────────────────┬─────────────┬─────────────────────────────┐
│ Método  │ Endpoint                     │ Código HTTP │ Descripción                 │
├─────────┼──────────────────────────────┼─────────────┼─────────────────────────────┤
│ POST    │ POST /api/roles              │ 201/400     │ Crear rol                   │
│ GET     │ GET /api/roles               │ 200         │ Obtener todos los roles     │
│ GET     │ GET /api/roles/{id}          │ 200/404     │ Obtener rol por ID          │
│ PUT     │ PUT /api/roles/{id}          │ 200/404     │ Actualizar rol              │
│ DELETE  │ DELETE /api/roles/{id}       │ 200/404     │ Eliminar rol                │
└─────────┴──────────────────────────────┴─────────────┴─────────────────────────────┘
```

### 2️⃣ EstatusTareaController (/api/estatus-tareas)
```
┌─────────┬──────────────────────────────────────┬─────────────┬────────────────────────────────┐
│ Método  │ Endpoint                             │ Código HTTP │ Descripción                    │
├─────────┼──────────────────────────────────────┼─────────────┼────────────────────────────────┤
│ POST    │ POST /api/estatus-tareas             │ 201/400     │ Crear estatus                  │
│ GET     │ GET /api/estatus-tareas              │ 200         │ Obtener todos los estatus      │
│ GET     │ GET /api/estatus-tareas/{id}         │ 200/404     │ Obtener estatus por ID         │
│ PUT     │ PUT /api/estatus-tareas/{id}         │ 200/404     │ Actualizar estatus             │
│ DELETE  │ DELETE /api/estatus-tareas/{id}      │ 200/404     │ Eliminar estatus               │
└─────────┴──────────────────────────────────────┴─────────────┴────────────────────────────────┘
```

### 3️⃣ PrioridadTareaController (/api/prioridades-tareas)
```
┌─────────┬───────────────────────────────────────┬─────────────┬──────────────────────────────────┐
│ Método  │ Endpoint                              │ Código HTTP │ Descripción                      │
├─────────┼───────────────────────────────────────┼─────────────┼──────────────────────────────────┤
│ POST    │ POST /api/prioridades-tareas          │ 201/400     │ Crear prioridad                  │
│ GET     │ GET /api/prioridades-tareas           │ 200         │ Obtener todas las prioridades    │
│ GET     │ GET /api/prioridades-tareas/{id}      │ 200/404     │ Obtener prioridad por ID         │
│ PUT     │ PUT /api/prioridades-tareas/{id}      │ 200/404     │ Actualizar prioridad             │
│ DELETE  │ DELETE /api/prioridades-tareas/{id}   │ 200/404     │ Eliminar prioridad               │
└─────────┴───────────────────────────────────────┴─────────────┴──────────────────────────────────┘
```

### 4️⃣ EquipoController (/api/equipos)
```
┌─────────┬──────────────────────────────┬─────────────┬──────────────────────────────┐
│ Método  │ Endpoint                     │ Código HTTP │ Descripción                  │
├─────────┼──────────────────────────────┼─────────────┼──────────────────────────────┤
│ POST    │ POST /api/equipos            │ 201/400     │ Crear equipo                 │
│ GET     │ GET /api/equipos             │ 200         │ Obtener todos los equipos    │
│ GET     │ GET /api/equipos/{id}        │ 200/404     │ Obtener equipo por ID        │
│ PUT     │ PUT /api/equipos/{id}        │ 200/404     │ Actualizar equipo            │
│ DELETE  │ DELETE /api/equipos/{id}     │ 200/404     │ Eliminar equipo              │
└─────────┴──────────────────────────────┴─────────────┴──────────────────────────────┘
```

### 5️⃣ UsuarioController (/api/usuarios)
```
┌─────────┬──────────────────────────────┬─────────────┬────────────────────────────────┐
│ Método  │ Endpoint                     │ Código HTTP │ Descripción                    │
├─────────┼──────────────────────────────┼─────────────┼────────────────────────────────┤
│ POST    │ POST /api/usuarios           │ 201/400     │ Crear usuario                  │
│ GET     │ GET /api/usuarios            │ 200         │ Obtener todos los usuarios     │
│ GET     │ GET /api/usuarios/{id}       │ 200/404     │ Obtener usuario por ID         │
│ PUT     │ PUT /api/usuarios/{id}       │ 200/404     │ Actualizar usuario             │
│ DELETE  │ DELETE /api/usuarios/{id}    │ 200/404     │ Eliminar usuario               │
└─────────┴──────────────────────────────┴─────────────┴────────────────────────────────┘
```

### 6️⃣ TareaController (/api/tareas) - 9 Endpoints
```
┌─────────┬────────────────────────────────────────────┬─────────────┬──────────────────────────┐
│ Método  │ Endpoint                                   │ Código HTTP │ Descripción              │
├─────────┼────────────────────────────────────────────┼─────────────┼──────────────────────────┤
│ POST    │ POST /api/tareas                           │ 201/400     │ Crear tarea              │
│ GET     │ GET /api/tareas                            │ 200         │ Obtener todas las tareas │
│ GET     │ GET /api/tareas/{id}                       │ 200/404     │ Obtener tarea por ID     │
│ PUT     │ PUT /api/tareas/{id}                       │ 200/404     │ Actualizar tarea         │
│ DELETE  │ DELETE /api/tareas/{id}                    │ 200/404     │ Eliminar tarea           │
│ GET     │ GET /api/tareas/asignado/{idUsuario}       │ 200         │ Tareas asignadas         │
│ GET     │ GET /api/tareas/creador/{idUsuario}        │ 200         │ Tareas creadas           │
│ GET     │ GET /api/tareas/estatus/{idEstatus}        │ 200         │ Tareas por estatus       │
│ GET     │ GET /api/tareas/prioridad/{idPrioridad}    │ 200         │ Tareas por prioridad     │
└─────────┴────────────────────────────────────────────┴─────────────┴──────────────────────────┘
```

### 7️⃣ MiembroEquipoController (/api/miembros-equipos)
```
┌─────────┬────────────────────────────────────────────┬─────────────┬──────────────────────────┐
│ Método  │ Endpoint                                   │ Código HTTP │ Descripción              │
├─────────┼────────────────────────────────────────────┼─────────────┼──────────────────────────┤
│ POST    │ POST /api/miembros-equipos                 │ 201/400     │ Agregar miembro          │
│ GET     │ GET /api/miembros-equipos                  │ 200         │ Obtener todos            │
│ GET     │ GET /api/miembros-equipos/equipo/{id}      │ 200         │ Usuarios en equipo       │
│ GET     │ GET /api/miembros-equipos/usuario/{id}     │ 200         │ Equipos de usuario       │
│ DELETE  │ DELETE /api/miembros-equipos/{idE}/{idU}   │ 200/404     │ Remover miembro          │
└─────────┴────────────────────────────────────────────┴─────────────┴──────────────────────────┘
```

### 8️⃣ ComentarioTareaController (/api/comentarios-tareas)
```
┌─────────┬──────────────────────────────────────────┬─────────────┬──────────────────────────┐
│ Método  │ Endpoint                                 │ Código HTTP │ Descripción              │
├─────────┼──────────────────────────────────────────┼─────────────┼──────────────────────────┤
│ POST    │ POST /api/comentarios-tareas             │ 201/400     │ Crear comentario         │
│ GET     │ GET /api/comentarios-tareas              │ 200         │ Obtener todos            │
│ GET     │ GET /api/comentarios-tareas/{id}         │ 200/404     │ Obtener por ID           │
│ PUT     │ PUT /api/comentarios-tareas/{id}         │ 200/404     │ Actualizar comentario    │
│ DELETE  │ DELETE /api/comentarios-tareas/{id}      │ 200/404     │ Eliminar comentario      │
│ GET     │ GET /api/comentarios-tareas/tarea/{id}   │ 200         │ Comentarios de tarea     │
│ GET     │ GET /api/comentarios-tareas/usuario/{id} │ 200         │ Comentarios de usuario   │
└─────────┴──────────────────────────────────────────┴─────────────┴──────────────────────────┘
```

### 9️⃣ EvidenciaTareaController (/api/evidencias-tareas)
```
┌─────────┬──────────────────────────────────────────┬─────────────┬──────────────────────────┐
│ Método  │ Endpoint                                 │ Código HTTP │ Descripción              │
├─────────┼──────────────────────────────────────────┼─────────────┼──────────────────────────┤
│ POST    │ POST /api/evidencias-tareas              │ 201/400     │ Crear evidencia          │
│ GET     │ GET /api/evidencias-tareas               │ 200         │ Obtener todas            │
│ GET     │ GET /api/evidencias-tareas/{id}          │ 200/404     │ Obtener por ID           │
│ PUT     │ PUT /api/evidencias-tareas/{id}          │ 200/404     │ Actualizar evidencia     │
│ DELETE  │ DELETE /api/evidencias-tareas/{id}       │ 200/404     │ Eliminar evidencia       │
│ GET     │ GET /api/evidencias-tareas/tarea/{id}    │ 200         │ Evidencias de tarea      │
│ GET     │ GET /api/evidencias-tareas/usuario/{id}  │ 200         │ Evidencias de usuario    │
└─────────┴──────────────────────────────────────────┴─────────────┴──────────────────────────┘
```

### 🔟 LogTareaController (/api/logs-tareas)
```
┌─────────┬──────────────────────────────────────┬─────────────┬──────────────────────────┐
│ Método  │ Endpoint                             │ Código HTTP │ Descripción              │
├─────────┼──────────────────────────────────────┼─────────────┼──────────────────────────┤
│ POST    │ POST /api/logs-tareas                │ 201/400     │ Crear log                │
│ GET     │ GET /api/logs-tareas                 │ 200         │ Obtener todos            │
│ GET     │ GET /api/logs-tareas/{id}            │ 200/404     │ Obtener por ID           │
│ DELETE  │ DELETE /api/logs-tareas/{id}         │ 200/404     │ Eliminar log             │
│ GET     │ GET /api/logs-tareas/tarea/{id}      │ 200         │ Logs de tarea            │
│ GET     │ GET /api/logs-tareas/usuario/{id}    │ 200         │ Logs de usuario          │
└─────────┴──────────────────────────────────────┴─────────────┴──────────────────────────┘
```

---

## 📈 Estadísticas de Endpoints

| Controlador | Total Endpoints | GET | POST | PUT | DELETE |
|---|---|---|---|---|---|
| RolController | 5 | 2 | 1 | 1 | 1 |
| EstatusTareaController | 5 | 2 | 1 | 1 | 1 |
| PrioridadTareaController | 5 | 2 | 1 | 1 | 1 |
| EquipoController | 5 | 2 | 1 | 1 | 1 |
| UsuarioController | 5 | 2 | 1 | 1 | 1 |
| TareaController | 9 | 6 | 1 | 1 | 1 |
| MiembroEquipoController | 5 | 3 | 1 | 0 | 1 |
| ComentarioTareaController | 7 | 4 | 1 | 1 | 1 |
| EvidenciaTareaController | 7 | 4 | 1 | 1 | 1 |
| LogTareaController | 6 | 4 | 1 | 0 | 1 |
| **TOTAL** | **60** | **31** | **10** | **8** | **10** |

---

## 🔗 Dependencias entre Endpoints

```
Orden de Creación Recomendado:

1. Crear ROLES
   └─> 2. Crear USUARIOS (FK: ID_ROL)
       └─> 3. Crear ESTATUS (Maestro)
       └─> 3. Crear PRIORIDADES (Maestro)
           └─> 4. Crear TAREAS (FK: multiple)
               ├─> 5. Crear COMENTARIOS
               ├─> 5. Crear EVIDENCIAS
               └─> 5. Crear LOGS
       └─> 3. Crear EQUIPOS (Maestro)
           └─> 4. Crear MIEMBROS_EQUIPOS (FK: multiple)
```

---

## 🧪 Ejemplos de Flujo de Prueba

### Flujo 1: Crear Tarea Completa
```
1. POST /api/roles → ID: 1
2. POST /api/usuarios → ID: 1, 2 (requiere rol.idRol = 1)
3. POST /api/estatus-tareas → ID: 1
4. POST /api/prioridades-tareas → ID: 1
5. POST /api/tareas → ID: 1
   {
     "titulo": "Tarea Test",
     "estatus.idEstatus": 1,
     "prioridad.idPrioridad": 1,
     "usuarioCreador.idUsuario": 1,
     "usuarioAsignado.idUsuario": 2
   }
6. POST /api/comentarios-tareas
   {
     "tarea.idTarea": 1,
     "usuarioAutor.idUsuario": 1,
     "cuerpo": "Comentario de prueba"
   }
7. GET /api/comentarios-tareas/tarea/1 → Ver comentarios creados
```

### Flujo 2: Crear Equipo con Miembros
```
1. POST /api/equipos → ID: 1
2. POST /api/usuarios → ID: 1 (ya debe existir)
3. POST /api/miembros-equipos
   {
     "equipo.idEquipo": 1,
     "usuario.idUsuario": 1
   }
4. GET /api/miembros-equipos/equipo/1 → Ver miembros del equipo
```

---

## 📱 Códigos HTTP Utilizados

| Código | Significado | Cuándo se usa |
|---|---|---|
| 200 | OK | GET, PUT, DELETE exitosos; actualización correcta |
| 201 | Created | POST exitoso; recurso creado |
| 400 | Bad Request | Datos inválidos en el body |
| 404 | Not Found | Recurso no existe |
| 500 | Server Error | Error interno del servidor |

---

## 🔐 Headers HTTP Recomendados

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token} (futuro)
X-Requested-With: XMLHttpRequest
```

---

## ✅ Verificación de Implementación

- [x] 10 Controladores creados
- [x] 60+ Endpoints implementados
- [x] Métodos CRUD implementados
- [x] Consultas especializadas implementadas
- [x] Códigos HTTP correctos
- [x] Manejo de errores incluido
- [x] Estructura REST compliant
- [x] Documentación generada

---

**Generado:** 13 Abril, 2026  
**Framework:** Spring Boot 3.5.6  
**Java Version:** 11  
**Database:** Oracle 19c+
