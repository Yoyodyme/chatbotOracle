# Documentación de la Estructura de Base de Datos y JPA

## Descripción General
Este proyecto implementa un sistema completo de gestión de tareas (To-Do List) con Spring Boot, JPA/Hibernate y Oracle Database. La arquitectura está completamente mappada con modelos JPA, repositorios y servicios.

## Estructura de Tablas de Base de Datos

### 1. Tablas Maestras (Sin Dependencias)

#### ESTATUS_TAREA
```sql
ID_ESTATUS (PK) | NOMBRE | ORDEN
```
- Contiene los diferentes estados de una tarea (Pendiente, En Progreso, Completada, Cancelada)
- **Service:** `EstatusTareaService`
- **Repository:** `EstatusTareaRepository`
- **Modelo JPA:** `EstatusTarea`

#### PRIORIDAD_TAREA
```sql
ID_PRIORIDAD (PK) | NOMBRE | ORDEN
```
- Define los niveles de prioridad (Baja, Media, Alta, Crítica)
- **Service:** `PrioridadTareaService`
- **Repository:** `PrioridadTareaRepository`
- **Modelo JPA:** `PrioridadTarea`

#### ROLES
```sql
ID_ROL (PK) | NOMBRE | DESCRIPCION
```
- Defines los roles de usuario (Admin, Gerente, Desarrollador, QA)
- **Service:** `RolService`
- **Repository:** `RolRepository`
- **Modelo JPA:** `Rol`

#### EQUIPOS
```sql
ID_EQUIPO (PK) | NOMBRE
```
- Grupos de usuarios que trabaján juntos
- **Service:** `EquipoService`
- **Repository:** `EquipoRepository`
- **Modelo JPA:** `Equipo`

### 2. Tablas con Dependencias

#### USUARIOS
```sql
ID_USUARIO (PK) | ID_INTEGRATION_USUARIO (UNIQUE) | NOMBRE_USUARIO | NOMBRE_COMPLETO | ID_ROL (FK) | CREADO_EN
```
- Registro de usuarios del sistema
- Depende de: **ROLES**
- **Service:** `UsuarioService`
- **Repository:** `UsuarioRepository`
- **Modelo JPA:** `Usuario`

#### TAREAS
```sql
ID_TAREA (PK) | TITULO | DESCRIPCION | ID_ESTATUS (FK) | ID_PRIORIDAD (FK) | 
ID_USUARIO_CREADOR (FK) | ID_USUARIO_ASIGNADO (FK) | FECHA_VENCIMIENTO | 
NULL_FIELD | CREADO_EN | ACTUALIZADO_EN
```
- Tareas del sistema
- Depende de: **ESTATUS_TAREA**, **PRIORIDAD_TAREA**, **USUARIOS** (x2)
- **Service:** `TareaService`
- **Repository:** `TareaRepository`
- **Modelo JPA:** `Tarea`

### 3. Tablas de Relación y Detalle

#### MIEMBROS_EQUIPO
```sql
ID_EQUIPO (PK, FK) | ID_USUARIO (PK, FK) | SE_UNIO_EN
```
- Relaciona usuarios con equipos (Many-to-Many)
- **Service:** `MiembroEquipoService`
- **Repository:** `MiembroEquipoRepository`
- **Modelo JPA:** `MiembroEquipo` + `MiembroEquipoId` (Composite Key)

#### COMENTARIOS_TAREA
```sql
ID_COMENTARIO (PK) | ID_TAREA (FK) | ID_USUARIO_AUTOR (FK) | CUERPO | CREADO_EN
```
- Comentarios agregados a las tareas
- **Service:** `ComentarioTareaService`
- **Repository:** `ComentarioTareaRepository`
- **Modelo JPA:** `ComentarioTarea`

#### EVIDENCIAS_TAREA
```sql
ID_EVIDENCIA (PK) | ID_TAREA (FK) | ID_USUARIO_SUBIO (FK) | URL_ARCHIVO | NOTA | CREADO_EN
```
- Archivos/evidencias adjuntos a tareas
- **Service:** `EvidenciaTareaService`
- **Repository:** `EvidenciaTareaRepository`
- **Modelo JPA:** `EvidenciaTarea`

#### LOGS_TAREA
```sql
ID_LOG (PK) | ID_TAREA (FK) | ID_USUARIO (FK) | ID_ESTATUS_ORIGEN | ID_ESTATUS_DESTINO | MENSAJE | CREADO_EN
```
- Auditoría de cambios en tareas
- **Service:** `LogTareaService`
- **Repository:** `LogTareaRepository`
- **Modelo JPA:** `LogTarea`

## Cómo Usar los Servicios

### Ejemplo 1: Trabajar con Roles
```java
@Autowired
private RolService rolService;

// Crear un rol
Rol rol = new Rol();
rol.setNombre("Supervisor");
rol.setDescripcion("Supervisor de Equipos");
Rol rolGuardado = rolService.crearRol(rol);

// Obtener todos los roles
List<Rol> roles = rolService.obtenerTodosLosRoles();

// Obtener un rol por ID
Rol rolObtenido = rolService.obtenerRolPorId(1L);

// Actualizar un rol
rolObtenido.setDescripcion("Descripción actualizada");
rolService.actualizarRol(1L, rolObtenido);

// Eliminar un rol
rolService.eliminarRol(1L);
```

### Ejemplo 2: Trabajar con Usuarios
```java
@Autowired
private UsuarioService usuarioService;
@Autowired
private RolService rolService;

// Crear un usuario
Usuario usuario = new Usuario();
usuario.setNombreUsuario("john_doe");
usuario.setNombreCompleto("John Doe");
usuario.setIdIntegrationUsuario("AUTH001");
usuario.setRol(rolService.obtenerRolPorId(3L)); // Desarrollador
Usuario usuarioGuardado = usuarioService.crearUsuario(usuario);

// Obtener usuarios
List<Usuario> usuarios = usuarioService.obtenerTodosLosUsuarios();
Usuario usuarioPorNombre = usuarioService.obtenerUsuarioPorNombreUsuario("john_doe");
```

### Ejemplo 3: Trabajar con Tareas
```java
@Autowired
private TareaService tareaService;
@Autowired
private UsuarioService usuarioService;
@Autowired
private EstatusTareaService estatusTareaService;
@Autowired
private PrioridadTareaService prioridadTareaService;

// Crear una tarea
Tarea tarea = new Tarea();
tarea.setTitulo("Implementar API REST");
tarea.setDescripcion("Crear endpoints CRUD para usuarios");
tarea.setEstatus(estatusTareaService.obtenerEstatusPorNombre("Pendiente"));
tarea.setPrioridad(prioridadTareaService.obtenerPrioridadPorNombre("Alta"));
tarea.setUsuarioCreador(usuarioService.obtenerUsuarioPorId(1L));
tarea.setUsuarioAsignado(usuarioService.obtenerUsuarioPorId(3L));
tarea.setFechaVencimiento(LocalDate.of(2026, 5, 15));
Tarea tareaGuardada = tareaService.crearTarea(tarea);

// Obtener tareas por usuario asignado
List<Tarea> tareasDelUsuario = tareaService.obtenerTareasPorUsuarioAsignado(3L);

// Obtener tareas por estatus
List<Tarea> tareasPendientes = tareaService.obtenerTareasPorEstatus(1L);
```

### Ejemplo 4: Trabajar con Comentarios
```java
@Autowired
private ComentarioTareaService comentarioTareaService;

// Crear un comentario
ComentarioTarea comentario = new ComentarioTarea();
comentario.setTarea(tareaService.obtenerTareaPorId(1L));
comentario.setUsuarioAutor(usuarioService.obtenerUsuarioPorId(3L));
comentario.setCuerpo("He comenzado con la implementación de la API");
ComentarioTarea comentarioGuardado = comentarioTareaService.crearComentario(comentario);

// Obtener comentarios de una tarea
List<ComentarioTarea> comentariosDeUnaTarea = comentarioTareaService.obtenerComentariosPorTarea(1L);
```

## Scripts de Base de Datos

### Crear Tablas
El archivo `data-test.sql` contiene un script SQL con ejemplos de datos de prueba que se puede ejecutar en Oracle Database.

### Ejecutar Pruebas
Cuando la aplicación Spring Boot se inicia, ejecuta automáticamente el `CommandLineRunner` en `MyTodoListApplication.java` que:

1. **Lee todos los estatus de tareas**
2. **Lee todas las prioridades**
3. **Lee todos los roles**
4. **Lee todos los equipos**
5. **Lee todos los usuarios**
6. **Lee todas las tareas**
7. **Lee todos los comentarios**
8. **Lee todas las evidencias**
9. **Lee todos los miembros de equipos**
10. **Lee todos los logs**
11. **Realiza búsquedas específicas**

### Salida Esperada al Iniciar
```
========== INICIANDO PRUEBAS DE BASE DE DATOS ==========

--- 1. LEYENDO ESTATUS DE TAREAS ---
  Estatus: Pendiente (ID: 1)
  Estatus: En Progreso (ID: 2)
  Estatus: Completada (ID: 3)
  Estatus: Cancelada (ID: 4)
  Total de Estatus: 4

--- 2. LEYENDO PRIORIDADES DE TAREAS ---
  Prioridad: Baja (ID: 1)
  ...
```

## Estructura de Directorios
```
MtdrSpring/backend/src/main/java/com/springboot/MyTodoList/
├── model/
│   ├── EstatusTarea.java
│   ├── PrioridadTarea.java
│   ├── Rol.java
│   ├── Equipo.java
│   ├── Usuario.java
│   ├── Tarea.java
│   ├── MiembroEquipo.java
│   ├── MiembroEquipoId.java
│   ├── ComentarioTarea.java
│   ├── EvidenciaTarea.java
│   └── LogTarea.java
├── repository/
│   ├── EstatusTareaRepository.java
│   ├── PrioridadTareaRepository.java
│   ├── RolRepository.java
│   ├── EquipoRepository.java
│   ├── UsuarioRepository.java
│   ├── TareaRepository.java
│   ├── MiembroEquipoRepository.java
│   ├── ComentarioTareaRepository.java
│   ├── EvidenciaTareaRepository.java
│   └── LogTareaRepository.java
├── service/
│   ├── EstatusTareaService.java
│   ├── PrioridadTareaService.java
│   ├── RolService.java
│   ├── EquipoService.java
│   ├── UsuarioService.java
│   ├── TareaService.java
│   ├── MiembroEquipoService.java
│   ├── ComentarioTareaService.java
│   ├── EvidenciaTareaService.java
│   └── LogTareaService.java
└── MyTodoListApplication.java
```

## Requisitos de Configuración

### application.properties
Asegúrate de que tu `application.properties` esté configurado:

```properties
spring.datasource.url=jdbc:oracle:thin:@<host>:<puerto>:<sid>
spring.datasource.username=<usuario>
spring.datasource.password=<contraseña>
spring.datasource.driver-class-name=oracle.jdbc.driver.OracleDriver

spring.jpa.database-platform=org.hibernate.dialect.OracleDialect
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE
```

## Notas Importantes

1. **Lazy Loading:** Todas las relaciones `@ManyToOne` usan `fetch = FetchType.LAZY` para evitar consultas innecesarias.
2. **Auditoría:** Las fechas `CREADO_EN` y `ACTUALIZADO_EN` se establecen automáticamente mediante `@PrePersist` y `@PreUpdate`.
3. **Composite Key:** La tabla `MIEMBROS_EQUIPO` usa una clave primaria compuesta implementada con `@IdClass`.
4. **Transacciones:** Los servicios utilizan las transacciones de Spring por defecto.

---
**Creado:** Abril 2026  
**Stack:** Spring Boot 3.5.6 | JPA/Hibernate | Oracle Database | Lombok
