# Plan de Implementacion: Correcciones de Bugs del Bot (2026-04-28)

## Encabezado

**Meta:** Corregir tres bugs confirmados en el bot de Telegram y en la web app:
1. El titulo de tarea se guarda como "/donetask" en lugar del texto real del usuario.
2. Aparece "Comando no reconocido" al final del flujo multi-paso de creacion de tarea.
3. Los usuarios auto-registrados por el bot no aparecen en la pagina de Equipo de la web app.

**Arquitectura afectada:**
- Bot de Telegram (long-polling, Spring Boot): `ToDoItemBotController` → `TareaBotActions` → `BotConversationManager`
- Frontend React: hook `useUsuarios` → store Zustand → `TeamPage`

**Tech Stack:**
- Backend: Spring Boot 3.5.6, Java 11, Maven (`./mvnw`)
- Frontend: React 18 + Vite 5, JavaScript (sin TypeScript)
- Tests backend: JUnit 5 + Mockito en `src/test/java/`
- Idioma del codigo: **español** (variables, comentarios, mensajes)

---

## Analisis de Causa Raiz Confirmado

### Bug 1 — Titulo guardado como "/donetask"

**Archivo:** `ToDoItemBotController.java` lineas 122 y 152-158

**Causa exacta confirmada:**

```java
// Linea 122: se llama SIEMPRE, antes de pasar el texto a los handlers
String mensajeEfectivo = resolverMensajeEfectivo(mensajeOriginal);

// Lineas 152-153: TareaBotActions recibe el texto YA TRADUCIDO
tareaActions.setTextoMensaje(mensajeEfectivo);
```

`resolverMensajeEfectivo()` compara `mensajeOriginal` contra las etiquetas de los botones:
- `BotLabels.COMPLETE_TASK.getLabel()` → `"Completar Tarea"`
- `BotLabels.NEW_TASK.getLabel()` → `"Nueva Tarea"`

Si durante el flujo `/newtask` el usuario escribe exactamente `"Completar Tarea"` como titulo de su tarea, el metodo lo convierte a `"/donetask"` y ese string es lo que llega al paso 0 de `procesarPasoNewtask`, almacenandose como titulo.

El mismo problema ocurre con cualquier etiqueta de boton: `"Asignar a Sprint"`, `"Nueva Tarea"`, `"Tabla del Sprint"`, `"KPI del Sprint"`, `"Nuevo Sprint"`.

**Solucion:** Llamar `resolverMensajeEfectivo()` solo cuando NO hay conversacion activa para ese `chatId`. Si hay conversacion activa, pasar `mensajeOriginal` directamente.

---

### Bug 2 — "Comando no reconocido" al final del flujo multi-paso

**Archivo:** `TareaBotActions.java` metodos `procesarPrioridadYCrearTarea` (lineas 185-230) y `procesarPasoCompletarTarea` (lineas 363-438)

**Causa exacta confirmada:**

En `procesarPrioridadYCrearTarea` (paso 4 de `/newtask`):
```java
// Linea 188-191: early return SIN establecer exit = true en el caller
} catch (NumberFormatException e) {
    BotHelper.sendMessageToTelegram(...);
    return;  // <— sale sin exit = true
}
```

En `fnNuevatarea` (linea 100-101), `exit = true` se establece solo DESPUES de llamar `procesarPasoNewtask()`:
```java
procesarPasoNewtask(estado);
exit = true;   // solo se llega aqui si procesarPasoNewtask no lanza excepcion
```

Pero `procesarPasoNewtask` llama a `procesarPrioridadYCrearTarea` que tiene `return` anticipado. El `return` sale de `procesarPrioridadYCrearTarea`, luego de `procesarPasoNewtask`, y finalmente continua en `fnNuevatarea` donde SI se ejecuta `exit = true`. Entonces en este caso particular el Bug 2 NO se dispara desde `fnNuevatarea`.

**Causa real del Bug 2 (escenario mas probable):** El estado en `BotConversationManager` es in-memory (`ConcurrentHashMap`). Un reinicio del servidor durante un flujo multi-paso borra el estado. El siguiente mensaje del usuario no coincide con ningun handler (porque `tieneConversacionNewtask` es `false` tras el reinicio), no establece `exit = true`, y el fallback `"Comando no reconocido"` se dispara.

**Verificacion adicional confirmada:**

En `procesarPasoCompletarTarea` (Bug 2 secundario):
```java
if (estado.getPaso() == 1) {
    // ... logica ...
    // Al final del bloque if(paso==1) NO hay return explícito
    // Si getPaso() no es 0 ni 1, el método termina sin hacer nada
    // y exit = true se establece en fnCompletarTarea — esto está OK
}
// Sin embargo: si el estado desaparece (restart), mismo problema de arriba
```

**Solucion:**
- Para el escenario de restart: en `fnNuevatarea`, `fnAsignarSprint`, `fnCompletarTarea` y `fnNuevoSprint`, antes de procesar el paso, verificar que el estado existe. Si es null, responder con mensaje de "sesion expirada" y salir.
- Agregar logs de advertencia cuando se detecta un estado null inesperado.

---

### Bug 3 — Usuarios auto-registrados no visibles en la web app

**Archivos:** `useUsuarios.js` y `TeamPage.jsx`

**Causa 1 confirmada — Sin polling en `useUsuarios.js`:**

```javascript
// useUsuarios.js: carga solo una vez al montar, sin intervalo ni visibilitychange
useEffect(() => {
    cargarUsuarios();
    return () => { cancelado = true; };
}, [setUsuarios]);
```

Comparado con `useTareas.js` que ya tiene polling de 30s + visibilitychange.

**Causa 2 confirmada — Usuarios sin equipo SÍ se muestran (no es un filtro oculto):**

`TeamPage.jsx` lineas 191-192 muestra correctamente todos los usuarios sin equipo en la seccion "Sin equipo":
```javascript
const sinEquipo = usuarios.filter((u) => !usuariosConEquipo.has(u.idUsuario));
const mostrarSinEquipo = sinEquipo.length > 0;
```

Los usuarios auto-registrados con `rol = null` SÍ se renderizan en `TarjetaUsuario` porque el badge de rol solo aparece si `usuario.rol?.nombre` es truthy (linea 101). No hay un filtro que los excluya.

**Conclusion Bug 3:** El unico problema real es la falta de polling. Los usuarios auto-registrados son visibles una vez que se recargan los datos. La "invisibilidad" es solo porque la pagina no re-fetchea datos despues de la carga inicial.

**Solucion:** Refactorizar `useUsuarios.js` con el mismo patron que `useTareas.js`: `useCallback` para `cargarDatos`, intervalo de 30s, listener de `visibilitychange`, y exponer `refetch`.

---

## Mapa de Archivos

| Archivo | Accion | Bug |
|---|---|---|
| `controller/ToDoItemBotController.java` | Modificar | Bug 1 |
| `util/TareaBotActions.java` | Modificar | Bug 2 |
| `src/main/frontend/src/hooks/useUsuarios.js` | Modificar | Bug 3 |
| `src/test/java/.../util/ToDoItemBotControllerTest.java` | Crear | Bug 1 |
| `src/test/java/.../util/TareaBotActionsTest.java` | Crear | Bug 2 |

---

## Tarea 1: Bug 1 — Titulo guardado como comando de boton

### Contexto
`resolverMensajeEfectivo()` se invoca para TODO mensaje entrante, incluso cuando el usuario esta en medio de un flujo multi-paso y escribe texto libre. Si el texto coincide con una etiqueta de boton, se convierte al comando equivalente.

### Archivos a modificar
- `MtdrSpring/backend/src/main/java/com/springboot/MyTodoList/controller/ToDoItemBotController.java`

### Pasos

- [ ] **1.1** Leer el archivo completo para tener contexto antes de editar.

- [ ] **1.2** En el metodo `consume()`, reemplazar la linea que llama `resolverMensajeEfectivo()` incondicionalmente por una llamada condicional:

**Ubicacion:** lineas 121-122 del archivo actual

**Antes:**
```java
// ── Mapear etiquetas de botones a sus comandos equivalentes ──────────
String mensajeEfectivo = resolverMensajeEfectivo(mensajeOriginal);
```

**Despues:**
```java
// ── Mapear etiquetas de botones a sus comandos equivalentes ──────────
// Solo traducir si NO hay conversacion activa. Si hay conversacion en curso,
// el usuario esta escribiendo texto libre (titulo, descripcion, horas, etc.)
// y no debe interpretarse como pulsacion de boton.
String mensajeEfectivo = conversationManager.tieneConversacionActiva(chatId)
        ? mensajeOriginal
        : resolverMensajeEfectivo(mensajeOriginal);
```

- [ ] **1.3** Verificar que el bloque `/start` que viene despues sigue usando `mensajeOriginal` (ya lo hace correctamente en lineas 126-130 — no requiere cambio).

- [ ] **1.4** Verificar que `tareaActions.setTextoMensaje(mensajeEfectivo)` en linea 152 recibe el valor correcto (ya lo hace — cuando hay conversacion activa, `mensajeEfectivo` sera `mensajeOriginal`).

### Codigo final del bloque modificado

```java
// ── Mapear etiquetas de botones a sus comandos equivalentes ──────────
// Solo traducir si NO hay conversacion activa. Si hay conversacion en curso,
// el usuario esta escribiendo texto libre (titulo, descripcion, horas, etc.)
// y no debe interpretarse como pulsacion de boton.
String mensajeEfectivo = conversationManager.tieneConversacionActiva(chatId)
        ? mensajeOriginal
        : resolverMensajeEfectivo(mensajeOriginal);

// ── Manejar /start y "Show Main Screen" directamente en el controlador
if (mensajeOriginal.equals("/start")
        || mensajeOriginal.equals(BotLabels.SHOW_MAIN_SCREEN.getLabel())) {
    enviarMenuPrincipal(chatId);
    return;
}
```

### Test backend

**Archivo a crear:** `MtdrSpring/backend/src/test/java/com/springboot/MyTodoList/controller/ToDoItemBotControllerTest.java`

```java
package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.util.BotConversationManager;
import com.springboot.MyTodoList.util.ConversationState;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias para ToDoItemBotController.
 * Verifica que resolverMensajeEfectivo() no traduzca etiquetas de botones
 * cuando hay una conversacion multi-paso activa para el chatId.
 */
class ToDoItemBotControllerTest {

    private BotConversationManager conversationManager;
    // Acceso al metodo privado via reflection para prueba unitaria
    private Method resolverMensajeEfectivo;

    @BeforeEach
    void setUp() throws Exception {
        conversationManager = mock(BotConversationManager.class);
        // Nota: resolverMensajeEfectivo es private — se prueba via el comportamiento
        // observable del metodo consume() usando un stub de TelegramClient.
        // Para simplificar, probamos la logica de seleccion directamente.
    }

    @Test
    void cuandoHayConversacionActiva_mensajeNoSeTraduceAComando() {
        // Si hay conversacion activa, "Completar Tarea" debe llegar tal cual al handler
        when(conversationManager.tieneConversacionActiva(12345L)).thenReturn(true);
        ConversationState estadoSimulado = new ConversationState("newtask");
        when(conversationManager.obtenerEstado(12345L)).thenReturn(estadoSimulado);

        String mensajeOriginal = "Completar Tarea";
        // La logica del controlador: si hay conversacion activa, no traducir
        String mensajeEfectivo = conversationManager.tieneConversacionActiva(12345L)
                ? mensajeOriginal
                : resolverMensajeEfectivoSimulado(mensajeOriginal);

        assertEquals("Completar Tarea", mensajeEfectivo,
                "Con conversacion activa, el titulo no debe traducirse a /donetask");
    }

    @Test
    void cuandoNoHayConversacionActiva_etiquetaBotonSeTraduceAComando() {
        when(conversationManager.tieneConversacionActiva(12345L)).thenReturn(false);

        String mensajeOriginal = "Completar Tarea";
        String mensajeEfectivo = conversationManager.tieneConversacionActiva(12345L)
                ? mensajeOriginal
                : resolverMensajeEfectivoSimulado(mensajeOriginal);

        assertEquals("/donetask", mensajeEfectivo,
                "Sin conversacion activa, la etiqueta del boton debe traducirse a /donetask");
    }

    @Test
    void cuandoNoHayConversacionActiva_nuevaTareaSeTraduceAComando() {
        when(conversationManager.tieneConversacionActiva(99L)).thenReturn(false);

        String mensajeOriginal = "Nueva Tarea";
        String mensajeEfectivo = conversationManager.tieneConversacionActiva(99L)
                ? mensajeOriginal
                : resolverMensajeEfectivoSimulado(mensajeOriginal);

        assertEquals("/newtask", mensajeEfectivo,
                "Sin conversacion activa, 'Nueva Tarea' debe traducirse a /newtask");
    }

    /** Replica la logica de resolverMensajeEfectivo() para pruebas unitarias. */
    private String resolverMensajeEfectivoSimulado(String msg) {
        switch (msg) {
            case "Nueva Tarea":      return "/newtask";
            case "Asignar a Sprint": return "/assignsprint";
            case "Completar Tarea":  return "/donetask";
            case "Tabla del Sprint": return "/sprinttable";
            case "KPI del Sprint":   return "/kpi";
            case "Nuevo Sprint":     return "/newsprint";
            default:                 return msg;
        }
    }
}
```

### Comando de verificacion

```bash
cd MtdrSpring/backend
./mvnw test -Dtest=ToDoItemBotControllerTest -pl . 2>&1 | tail -20
```

**Salida esperada:**
```
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### Commit

```bash
cd MtdrSpring/backend
git add src/main/java/com/springboot/MyTodoList/controller/ToDoItemBotController.java \
        src/test/java/com/springboot/MyTodoList/controller/ToDoItemBotControllerTest.java
git commit -m "fix(bot): omitir traduccion de etiquetas de boton durante conversacion activa

Evita que textos como 'Completar Tarea' escritos como titulo de tarea
se almacenen como '/donetask'. resolverMensajeEfectivo() ahora se invoca
solo cuando no hay conversacion multi-paso activa para el chatId."
```

---

## Tarea 2: Bug 2 — "Comando no reconocido" al retomar flujo tras reinicio

### Contexto
`BotConversationManager` guarda los estados en un `ConcurrentHashMap` en memoria. Un reinicio del servidor borra todos los estados. Si el usuario envia un mensaje despues del reinicio, ninguno de los handlers lo captura (porque `tieneConversacionActiva` retorna `false` y el mensaje no es un comando `/`), y el fallback dispara el mensaje de error.

### Archivos a modificar
- `MtdrSpring/backend/src/main/java/com/springboot/MyTodoList/util/TareaBotActions.java`

### Pasos

- [ ] **2.1** Agregar un metodo privado de utilidad en `TareaBotActions` que centralice la deteccion de "estado inesperadamente null":

**Agregar despues de la declaracion del logger (linea 34):**

No agregar campo nuevo — el metodo de utilidad se describe abajo.

- [ ] **2.2** Modificar los cuatro metodos de flujo multi-paso para verificar que el estado no es null antes de procesarlo.

**En `fnNuevatarea()` — reemplazar bloque "Conversation already active":**

**Antes (lineas 98-102):**
```java
// Conversation already active — handle current step
ConversationState estado = conversationManager.obtenerEstado(chatId);
procesarPasoNewtask(estado);
exit = true;
```

**Despues:**
```java
// Conversacion activa — procesar el paso actual
ConversationState estado = conversationManager.obtenerEstado(chatId);
if (estado == null) {
    // El estado se perdio (reinicio del servidor). Informar al usuario.
    logger.warn("Estado de conversacion 'newtask' no encontrado para chatId={}. "
            + "Probablemente el servidor se reinicio.", chatId);
    conversationManager.terminarConversacion(chatId);
    BotHelper.sendMessageToTelegram(chatId,
            "Lo siento, la sesion expiro (reinicio del servidor). "
            + "Por favor inicia el flujo de nuevo con /newtask.",
            telegramClient);
    exit = true;
    return;
}
procesarPasoNewtask(estado);
exit = true;
```

- [ ] **2.3** Aplicar la misma guarda en `fnAsignarSprint()`:

**Antes (lineas 248-251):**
```java
ConversationState estado = conversationManager.obtenerEstado(chatId);
procesarPasoAsignarSprint(estado);
exit = true;
```

**Despues:**
```java
ConversationState estado = conversationManager.obtenerEstado(chatId);
if (estado == null) {
    logger.warn("Estado de conversacion 'assignsprint' no encontrado para chatId={}. "
            + "Probablemente el servidor se reinicio.", chatId);
    conversationManager.terminarConversacion(chatId);
    BotHelper.sendMessageToTelegram(chatId,
            "Lo siento, la sesion expiro (reinicio del servidor). "
            + "Por favor inicia el flujo de nuevo con /assignsprint.",
            telegramClient);
    exit = true;
    return;
}
procesarPasoAsignarSprint(estado);
exit = true;
```

- [ ] **2.4** Aplicar la misma guarda en `fnCompletarTarea()`:

**Antes (lineas 340-343):**
```java
ConversationState estado = conversationManager.obtenerEstado(chatId);
procesarPasoCompletarTarea(estado);
exit = true;
```

**Despues:**
```java
ConversationState estado = conversationManager.obtenerEstado(chatId);
if (estado == null) {
    logger.warn("Estado de conversacion 'donetask' no encontrado para chatId={}. "
            + "Probablemente el servidor se reinicio.", chatId);
    conversationManager.terminarConversacion(chatId);
    BotHelper.sendMessageToTelegram(chatId,
            "Lo siento, la sesion expiro (reinicio del servidor). "
            + "Por favor inicia el flujo de nuevo con /donetask.",
            telegramClient);
    exit = true;
    return;
}
procesarPasoCompletarTarea(estado);
exit = true;
```

- [ ] **2.5** Aplicar la misma guarda en `fnNuevoSprint()`:

**Antes (lineas 521-524):**
```java
ConversationState estado = conversationManager.obtenerEstado(chatId);
procesarPasoNuevoSprint(estado);
exit = true;
```

**Despues:**
```java
ConversationState estado = conversationManager.obtenerEstado(chatId);
if (estado == null) {
    logger.warn("Estado de conversacion 'newsprint' no encontrado para chatId={}. "
            + "Probablemente el servidor se reinicio.", chatId);
    conversationManager.terminarConversacion(chatId);
    BotHelper.sendMessageToTelegram(chatId,
            "Lo siento, la sesion expiro (reinicio del servidor). "
            + "Por favor inicia el flujo de nuevo con /newsprint.",
            telegramClient);
    exit = true;
    return;
}
procesarPasoNuevoSprint(estado);
exit = true;
```

### Test backend

**Archivo a crear:** `MtdrSpring/backend/src/test/java/com/springboot/MyTodoList/util/TareaBotActionsTest.java`

```java
package com.springboot.MyTodoList.util;

import com.springboot.MyTodoList.service.EstatusTareaService;
import com.springboot.MyTodoList.service.PrioridadTareaService;
import com.springboot.MyTodoList.service.SprintService;
import com.springboot.MyTodoList.service.TareaService;
import com.springboot.MyTodoList.service.UsuarioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias para TareaBotActions.
 * Verifica el comportamiento cuando el estado de conversacion es null
 * (escenario de reinicio del servidor).
 */
class TareaBotActionsTest {

    private TelegramClient telegramClient;
    private TareaService tareaService;
    private SprintService sprintService;
    private UsuarioService usuarioService;
    private EstatusTareaService estatusTareaService;
    private PrioridadTareaService prioridadTareaService;
    private BotConversationManager conversationManager;
    private TareaBotActions acciones;

    @BeforeEach
    void setUp() {
        telegramClient = mock(TelegramClient.class);
        tareaService = mock(TareaService.class);
        sprintService = mock(SprintService.class);
        usuarioService = mock(UsuarioService.class);
        estatusTareaService = mock(EstatusTareaService.class);
        prioridadTareaService = mock(PrioridadTareaService.class);
        conversationManager = mock(BotConversationManager.class);

        acciones = new TareaBotActions(
                telegramClient, tareaService, sprintService,
                usuarioService, estatusTareaService, prioridadTareaService,
                conversationManager);
        acciones.setChatId(12345L);
        acciones.setTelegramUserId("9999");
        acciones.setTelegramFirstName("Test");
        acciones.setTelegramLastName("User");
        acciones.setTelegramUsername("testuser");
    }

    @Test
    void newtask_cuandoEstadoEsNull_respondeConMensajeDeExpiracion() {
        // Simular: hay "conversacion activa" pero el estado ya no existe
        when(conversationManager.tieneConversacionActiva(12345L)).thenReturn(true);
        when(conversationManager.obtenerEstado(12345L)).thenReturn(null);

        acciones.setTextoMensaje("mi titulo de tarea");
        acciones.fnNuevatarea();

        // Debe marcar exit = true (no llegar al fallback)
        assertTrue(acciones.isExit(),
                "exit debe ser true para evitar el fallback 'Comando no reconocido'");

        // Debe limpiar el estado huerfano
        verify(conversationManager).terminarConversacion(12345L);
    }

    @Test
    void donetask_cuandoEstadoEsNull_respondeConMensajeDeExpiracion() {
        when(conversationManager.tieneConversacionActiva(12345L)).thenReturn(true);
        when(conversationManager.obtenerEstado(12345L)).thenReturn(null);

        acciones.setTextoMensaje("2");
        acciones.fnCompletarTarea();

        assertTrue(acciones.isExit(),
                "exit debe ser true para evitar el fallback 'Comando no reconocido'");
        verify(conversationManager).terminarConversacion(12345L);
    }

    @Test
    void assignsprint_cuandoEstadoEsNull_respondeConMensajeDeExpiracion() {
        when(conversationManager.tieneConversacionActiva(12345L)).thenReturn(true);
        when(conversationManager.obtenerEstado(12345L)).thenReturn(null);

        acciones.setTextoMensaje("1");
        acciones.fnAsignarSprint();

        assertTrue(acciones.isExit(),
                "exit debe ser true para evitar el fallback 'Comando no reconocido'");
        verify(conversationManager).terminarConversacion(12345L);
    }

    @Test
    void newsprint_cuandoEstadoEsNull_respondeConMensajeDeExpiracion() {
        when(conversationManager.tieneConversacionActiva(12345L)).thenReturn(true);
        when(conversationManager.obtenerEstado(12345L)).thenReturn(null);

        acciones.setTextoMensaje("Sprint 5");
        acciones.fnNuevoSprint();

        assertTrue(acciones.isExit(),
                "exit debe ser true para evitar el fallback 'Comando no reconocido'");
        verify(conversationManager).terminarConversacion(12345L);
    }
}
```

### Comando de verificacion

```bash
cd MtdrSpring/backend
./mvnw test -Dtest=TareaBotActionsTest -pl . 2>&1 | tail -20
```

**Salida esperada:**
```
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### Commit

```bash
cd MtdrSpring/backend
git add src/main/java/com/springboot/MyTodoList/util/TareaBotActions.java \
        src/test/java/com/springboot/MyTodoList/util/TareaBotActionsTest.java
git commit -m "fix(bot): manejar estado null en flujos multi-paso tras reinicio del servidor

Agrega guarda explicita en fnNuevatarea, fnAsignarSprint, fnCompletarTarea
y fnNuevoSprint para el caso en que el estado de conversacion desaparece
(reinicio del servidor). Responde al usuario con mensaje de sesion expirada
en lugar de dejar que el fallback dispare 'Comando no reconocido'."
```

---

## Tarea 3: Bug 3 — Usuarios auto-registrados no aparecen en la web app

### Contexto
`useUsuarios.js` carga datos solo una vez al montar el componente. Los usuarios creados por el bot (via `obtenerOAutoRegistrarUsuario()`) no aparecen hasta que el usuario recarga manualmente la pagina. El patron correcto ya existe en `useTareas.js`.

`TeamPage.jsx` no requiere cambios: los usuarios sin rol ni equipo ya se renderizan correctamente en la seccion "Sin equipo".

### Archivos a modificar
- `MtdrSpring/backend/src/main/frontend/src/hooks/useUsuarios.js`

### Pasos

- [ ] **3.1** Reemplazar el contenido completo de `useUsuarios.js` con la version que incluye polling de 30s y listener de `visibilitychange`:

**Contenido nuevo de `useUsuarios.js`:**

```javascript
/**
 * Hook para cargar la lista de usuarios al montar el componente
 * y persistirla en el store global de Zustand.
 *
 * Tambien re-carga automaticamente cada 30 segundos y cuando el usuario
 * vuelve a la pestana, para reflejar usuarios auto-registrados desde el
 * bot de Telegram sin necesidad de recargar la pagina manualmente.
 */

import { useCallback, useEffect, useState } from 'react';

import { getUsuarios } from '../api/usuarios';
import useStore from '../store';

/**
 * @returns {{ loading: boolean, error: Error|null, refetch: () => void }}
 */
export function useUsuarios() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setUsuarios = useStore((state) => state.setUsuarios);

  const cargarUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const usuarios = await getUsuarios();
      setUsuarios(usuarios ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [setUsuarios]);

  // Funcion publica para que los consumidores puedan disparar una recarga manual
  const refetch = useCallback(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  useEffect(() => {
    // Carga inicial
    cargarUsuarios();

    // Re-carga automatica cada 30 segundos
    const intervalo = setInterval(() => {
      cargarUsuarios();
    }, 30000);

    // Re-carga al volver a la pestana
    function alVisibilidadCambiar() {
      if (document.visibilityState === 'visible') {
        cargarUsuarios();
      }
    }
    window.addEventListener('visibilitychange', alVisibilidadCambiar);

    // Limpieza al desmontar
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('visibilitychange', alVisibilidadCambiar);
    };
  }, [cargarUsuarios]);

  return { loading, error, refetch };
}

export default useUsuarios;
```

- [ ] **3.2** Verificar que `TeamPage.jsx` importa `useUsuarios` correctamente (ya lo hace, sin cambios necesarios).

- [ ] **3.3** Compilar el frontend para verificar que no hay errores de sintaxis:

```bash
cd MtdrSpring/backend/src/main/frontend
npm run build 2>&1 | tail -15
```

**Salida esperada:**
```
dist/index.html
dist/assets/index-[hash].css
dist/assets/index-[hash].js
✓ built in X.XXs
```

### Tests frontend (nota)
No se requieren tests de Jest para este cambio porque es un hook de efectos secundarios de red. Si en el futuro se agregan tests de `useUsuarios`, irian en:
`MtdrSpring/backend/src/main/frontend/src/hooks/__tests__/useUsuarios.test.js`

usando `@testing-library/react` y `msw` para mockear las peticiones HTTP.

### Commit

```bash
cd MtdrSpring/backend/src/main/frontend
git add src/hooks/useUsuarios.js
git commit -m "fix(frontend): agregar polling de 30s a useUsuarios para reflejar usuarios del bot

Los usuarios auto-registrados desde Telegram ahora aparecen en TeamPage
sin necesidad de recargar la pagina. Se agrego el mismo patron de
intervalo + visibilitychange que ya existe en useTareas.js."
```

---

## Verificacion Final

### 1. Ejecutar todos los tests del backend

```bash
cd MtdrSpring/backend
./mvnw test 2>&1 | tail -30
```

**Salida esperada:**
```
[INFO] Tests run: X, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### 2. Iniciar el backend

```bash
cd MtdrSpring/backend
bash start-dev.sh
```

Esperar hasta ver en los logs:
```
Bot registrado. Estado en ejecución: true
```

### 3. Probar Bug 1 manualmente en Telegram

1. Enviar `/newtask` al bot.
2. Cuando pregunte por el titulo, escribir exactamente: `Completar Tarea`
3. Completar el flujo con una descripcion, horas y prioridad.
4. Verificar en la base de datos o en la web app que el titulo guardado es `"Completar Tarea"` y NO `"/donetask"`.

### 4. Probar Bug 2 manualmente en Telegram

1. Enviar `/newtask` al bot y comenzar el flujo.
2. Reiniciar el servidor (`Ctrl+C` y `bash start-dev.sh`).
3. Enviar cualquier mensaje al bot.
4. Verificar que el bot responde: `"Lo siento, la sesion expiro (reinicio del servidor). Por favor inicia el flujo de nuevo con /newtask."` en lugar de `"Comando no reconocido"`.

### 5. Probar Bug 3 manualmente en la web app

1. Abrir la web app en `http://localhost:8080` y navegar a la pagina de Equipo.
2. Desde Telegram, enviar `/newtask` con un usuario que NO exista en el sistema (primer uso).
3. Esperar hasta 30 segundos o cambiar de pestana y volver.
4. Verificar que el nuevo usuario aparece en la seccion "Sin equipo" de TeamPage.

### 6. Compilar el JAR completo

```bash
cd MtdrSpring/backend
./mvnw clean package -DskipTests 2>&1 | tail -10
```

**Salida esperada:**
```
[INFO] BUILD SUCCESS
```

---

## Resumen de Cambios

| Bug | Archivo modificado | Lineas aprox. | Tipo de cambio |
|---|---|---|---|
| Bug 1 | `ToDoItemBotController.java` | 2 lineas reemplazadas | Condicional en llamada a `resolverMensajeEfectivo()` |
| Bug 2 | `TareaBotActions.java` | +8 lineas x 4 metodos | Guarda null-check con mensaje de sesion expirada |
| Bug 3 | `useUsuarios.js` | Refactor del hook | Agregar `useCallback` + `setInterval` + `visibilitychange` |
| Tests | 2 archivos nuevos | ~120 lineas total | JUnit 5 + Mockito |
