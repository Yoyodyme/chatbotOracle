# Refactorizacion de Codigo — Equipo 51

## Introduccion

La **refactorizacion** es el proceso de reestructurar codigo existente sin alterar su comportamiento observable desde el exterior. No se agrega funcionalidad nueva ni se corrigen bugs: el objetivo es mejorar la legibilidad, reducir la deuda tecnica y facilitar el mantenimiento futuro.

En este proyecto — un sistema de gestion agil compuesto por un backend Spring Boot, un bot de Telegram y un frontend React — la refactorizacion fue necesaria por varias razones:

- La clase principal del bot (`ToDoItemBotController`) acumulaba logica de enrutamiento, estado conversacional y llamadas al LLM en un mismo archivo, violando el principio de responsabilidad unica.
- Las pruebas E2E enviaban texto libre al LLM para disparar operaciones, lo que las hacia fragiles ante cambios en el modelo o en el prompt.
- El frontend leia y escribia datos de sprints en `localStorage` en lugar de la API REST, causando inconsistencias entre el bot y la UI.

Las siete tecnicas documentadas a continuacion se aplicaron directamente sobre el codigo de produccion del repositorio.

---

## Tecnica 1 — Red-Green Refactoring

### Donde se aplica en el proyecto

`TelegramE2ETest.java` — pruebas de integracion end-to-end del bot de Telegram.

### Por que aplica

La tecnica Red-Green Refactoring propone escribir primero una prueba que falle (Red), luego el codigo minimo para que pase (Green) y finalmente refactorizar tanto la prueba como el codigo. En este caso la iteracion fue: los tests originales pasaban de forma no determinista porque dependian del LLM para parsear texto libre; al refactorizar, se reescribieron los tests para que dirijan el wizard paso a paso, eliminando la dependencia del modelo.

### Codigo antes

Los tests enviaban un unico mensaje en lenguaje natural esperando que el AgentOrchestrator interpretara la intencion y creara la tarea. Si el LLM cambiaba su respuesta o la clave de API fallaba, el test se rompia aunque el wizard funcionara perfectamente.

```java
// TelegramE2ETest.java — version original
@Test
@Order(1)
void testDarDeAltaTarea() throws Exception {
    long tareasAntes = tareaRepository.count();

    sendMessageToBot("nueva tarea Implementar login prueba automatica 3 puntos Sprint 1");

    List<Tarea> tareas = tareaRepository.findAll();
    Optional<Tarea> tareaLogin = tareas.stream()
            .filter(t -> t.getTitulo() != null &&
                    t.getTitulo().toLowerCase().contains("login prueba"))
            .findFirst();

    assertThat(tareaLogin)
            .withFailMessage("No se encontro la tarea creada en BD. Antes: "
                    + tareasAntes + ", despues: " + tareas.size())
            .isPresent();

    tareaIdCreada = tareaLogin.get().getIdTarea();
}

@Test
@Order(3)
void testAsignarTarea() throws Exception {
    // Crea tarea sin asignar, luego envia texto libre al LLM
    Tarea tarea = new Tarea();
    tarea.setTitulo("Tarea E2E asignacion automatica");
    tarea.setEstatus(obtenerEstatusInicial());
    tarea = tareaRepository.save(tarea);
    tareaIdAsignada = tarea.getIdTarea();

    sendMessageToBot("asignar tarea " + tareaIdAsignada + " a Ana");

    Tarea tareaActualizada = tareaRepository.findById(tareaIdAsignada).orElseThrow();
    assertThat(tareaActualizada.getUsuarioAsignado()).isNotNull();
    assertThat(tareaActualizada.getUsuarioAsignado().getNombreCompleto()
            .toLowerCase()).contains("ana");
}
```

### Codigo despues

Cada test usa helpers privados que conducen el wizard paso a paso. Si el wizard cambia de orden, el test falla en el paso correcto con un mensaje de error especifico, no de forma silenciosa por culpa del LLM.

```java
// TelegramE2ETest.java — version refactorizada

/** Conduce el wizard /newtask en 7 pasos y devuelve el ID de la tarea creada. */
private Long crearTareaConWizard(String titulo) throws Exception {
    sendMessageToBot("/newtask");
    sendMessageToBot(titulo);
    sendMessageToBot("saltar");  // omitir descripcion
    sendMessageToBot("2");       // 2 horas estimadas (no dispara advertencia)
    sendMessageToBot("1");       // prioridad: primera de la lista
    sendMessageToBot("1");       // asignado: primero de la lista
    sendMessageToBot("si");      // confirmar creacion

    return tareaRepository.findAll().stream()
            .filter(t -> t.getTitulo() != null && t.getTitulo().contains(titulo))
            .findFirst()
            .map(Tarea::getIdTarea)
            .orElseThrow(() -> new AssertionError(
                    "Tarea '" + titulo + "' no encontrada en BD tras wizard"));
}

@Test
@Order(1)
void testDarDeAltaTarea() throws Exception {
    tareaIdCreada = crearTareaConWizard("E2E alta automatica");
    assertThat(tareaIdCreada)
            .withFailMessage("No se encontro la tarea en BD")
            .isNotNull();
}

@Test
@Order(3)
void testAsignarTarea() throws Exception {
    Usuario botUser = obtenerBotTestUser();
    // La tarea debe estar asignada al bot para que /modifytask la muestre
    Tarea tarea = new Tarea();
    tarea.setTitulo("Tarea E2E asignacion automatica");
    tarea.setEstatus(obtenerEstatusInicial());
    tarea.setUsuarioAsignado(botUser);
    tarea = tareaRepository.save(tarea);
    tareaIdAsignada = tarea.getIdTarea();

    asignarTareaConFlujo(tareaIdAsignada, "Ana");

    Tarea tareaActualizada = tareaRepository.findById(tareaIdAsignada).orElseThrow();
    assertThat(tareaActualizada.getUsuarioAsignado()).isNotNull();
    assertThat(tareaActualizada.getUsuarioAsignado().getNombreCompleto()
            .toLowerCase()).contains("ana");
}
```

### Que mejoro

- Los tests son **deterministas**: no dependen del LLM ni de la red.
- Cada paso del wizard esta representado por una llamada explicita; si el orden cambia, el test falla con mensaje exacto.
- El helper `crearTareaConWizard` se reutiliza en los tests 1 y 2, eliminando duplicacion.
- Se agrego `@TestInstance(PER_CLASS)` y `@BeforeAll setUp()` para pre-registrar usuarios, lo que hace los tests independientes del orden de insercion en la BD.

---

## Tecnica 2 — Refactoring by Abstraction

### Donde se aplica en el proyecto

`IntentParser` (interfaz) → `LlmIntentParser` + `RuleBasedIntentParser` dentro del paquete `com.springboot.MyTodoList.agent`.

### Por que aplica

Refactoring by Abstraction consiste en introducir una interfaz o clase abstracta para separar el contrato del comportamiento concreto, permitiendo intercambiar implementaciones sin tocar al consumidor. Aqui, la clase `AgentOrchestrator` no debe saber si la intencion la clasifica un LLM o un conjunto de reglas.

### Codigo antes

Sin la interfaz, `AgentOrchestrator` habria tenido que instanciar directamente `LlmIntentParser` y gestionar el fallback internamente, acoplando la orquestacion con el mecanismo de clasificacion.

```java
// Diseno hipotetico sin abstraccion — TODO en AgentOrchestrator
@Service
public class AgentOrchestrator {

    private final DeepSeekService deepSeekService;

    public String manejarMensaje(String texto) {
        String intencion;
        try {
            // Llamada directa al LLM — acoplamiento fuerte
            intencion = deepSeekService.clasificarIntencion(texto);
        } catch (Exception ex) {
            // Fallback de reglas incrustado en el orquestador
            intencion = clasificarConReglas(texto);
        }
        return despacharIntencion(intencion, texto);
    }

    private String clasificarConReglas(String texto) {
        if (texto.contains("tareas")) return "LISTAR_TAREAS";
        if (texto.contains("sprint")) return "RESUMEN_SPRINT";
        return "DESCONOCIDO";
    }
}
```

### Codigo despues

Se define la interfaz `IntentParser` con un unico metodo. `LlmIntentParser` la implementa usando DeepSeek y delega al `RuleBasedIntentParser` como fallback. `AgentOrchestrator` depende solo del contrato.

```java
// IntentParser.java — contrato
public interface IntentParser {
    ParsedIntent parse(String textoMensaje);
}

// LlmIntentParser.java — implementacion LLM con fallback automatico
@Component
public class LlmIntentParser implements IntentParser {

    private final AiProps aiProps;
    private final RuleBasedIntentParser parserRespaldo;

    @Override
    public ParsedIntent parse(String textoMensaje) {
        return parse(textoMensaje, Collections.emptyList());
    }

    public ParsedIntent parse(String textoMensaje, List<Map<String, String>> historial) {
        if (!aiProps.isHabilitado() || esClaveVacia(aiProps.getApiKey())) {
            log.debug("Agente IA deshabilitado — usando clasificador de reglas");
            return parserRespaldo.parse(textoMensaje);
        }
        try {
            // ... llamada REST a DeepSeek ...
            return objectMapper.readValue(json, ParsedIntent.class);
        } catch (Exception ex) {
            log.warn("LlmIntentParser fallo — usando clasificador de reglas. Causa: {}",
                    ex.getMessage());
            return parserRespaldo.parse(textoMensaje);
        }
    }
}

// AgentOrchestrator.java — depende solo de la interfaz
@Service
public class AgentOrchestrator {

    private final LlmIntentParser llmIntentParser; // inyeccion por constructor

    public String manejarMensaje(String texto) {
        ParsedIntent intent = llmIntentParser.parse(texto);
        switch (intent.getIntent()) {
            case LISTAR_TAREAS:    return manejarListarTareas();
            case RESUMEN_SPRINT:   return manejarResumenSprint();
            // ...
            default: return llmIntentParser.generarRespuestaConversacional(texto);
        }
    }
}
```

### Que mejoro

- `AgentOrchestrator` no conoce el mecanismo de clasificacion; para tests se puede inyectar un `RuleBasedIntentParser` directo sin hacer llamadas de red.
- El fallback es responsabilidad de `LlmIntentParser`, no del orquestador.
- Para agregar un nuevo clasificador (p. ej. basado en embeddings) basta implementar la interfaz, sin modificar ninguna clase existente.

---

## Tecnica 3 — Composing Method

### Donde se aplica en el proyecto

`BotUpdateDispatcher.dispatch()` y `TareaBotActions.procesarPasoNewtask()`.

### Por que aplica

Composing Method descompone un metodo largo en metodos mas cortos con nombres descriptivos. El metodo `dispatch()` original era un bloque unico con dos responsabilidades entrelazadas: ejecutar los handlers y decidir si llamar al LLM. Al mismo tiempo, `procesarPasoNewtask()` delega cada paso a un metodo privado dedicado.

### Codigo antes

```java
// BotUpdateDispatcher.dispatch() — version original (fragmento)
public void dispatch(Update update) {
    // ... extraccion de datos del update ...

    BotActions actions = new BotActions(telegramClient, toDoItemService, deepSeekService, orquestador);
    TareaBotActions tareaActions = new TareaBotActions(/* ... */);

    // Todos los handlers legacy
    actions.fnDone();
    actions.fnUndo();
    actions.fnDelete();
    actions.fnHide();
    actions.fnListAll();
    actions.fnAddItem();
    actions.fnLLM();             // <-- se ejecuta antes de verificar wizard

    // Todos los handlers wizard
    tareaActions.fnNuevatarea();
    tareaActions.fnAsignarSprint();
    tareaActions.fnCompletarTarea();
    tareaActions.fnTablaSprint();
    tareaActions.fnKpi();
    tareaActions.fnNuevoSprint();
    tareaActions.fnModificarTarea();
    tareaActions.fnModificarSprint();

    // Logica de fallback al LLM con verificacion de wizard AL FINAL
    if (!tareaActions.isExit() && !actions.isExit()) {
        if (!conversationManager.tieneConversacionActiva(chatId)) {
            respuesta = orquestador.manejarMensaje(mensajeEfectivo);
            BotHelper.sendMessageToTelegram(chatId, respuesta, telegramClient);
        } else {
            // Nunca debia llegarse aqui si el wizard funcionaba
            BotHelper.sendMessageToTelegram(chatId,
                    "Comando no reconocido. Usa /start para ver los comandos disponibles.",
                    telegramClient);
        }
    }
}
```

### Codigo despues

Se introduce un **retorno temprano** para el wizard, y la creacion de `BotActions` (pesada e innecesaria durante el wizard) se mueve al camino que realmente la usa.

```java
// BotUpdateDispatcher.dispatch() — version refactorizada
public void dispatch(Update update) {
    // ... extraccion de datos del update ...

    TareaBotActions tareaActions = construirTareaActions(mensajeEfectivo, chatId,
            telegramUserId, telegramFirstName, telegramLastName, telegramUsername);

    // CAMINO 1: wizard activo — solo handlers de wizard, sin LLM ni handlers legacy
    if (conversationManager.tieneConversacionActiva(chatId)) {
        tareaActions.fnNuevatarea();
        tareaActions.fnAsignarSprint();
        tareaActions.fnCompletarTarea();
        tareaActions.fnNuevoSprint();
        tareaActions.fnModificarTarea();
        tareaActions.fnModificarSprint();

        if (!tareaActions.isExit()) {
            BotHelper.sendMessageToTelegram(chatId,
                    "Escribe 'cancelar' para cancelar la operacion actual.", telegramClient);
        }
        return; // retorno temprano — el resto del metodo es inalcanzable
    }

    // CAMINO 2: sin wizard — cadena completa + LLM como fallback
    BotActions actions = new BotActions(telegramClient, toDoItemService, deepSeekService, orquestador);
    actions.setRequestText(mensajeEfectivo);
    actions.setChatId(chatId);

    actions.fnDone();
    actions.fnUndo();
    actions.fnDelete();
    actions.fnHide();
    actions.fnListAll();
    actions.fnAddItem();
    actions.fnLLM();

    tareaActions.fnNuevatarea();
    // ... resto de handlers ...

    if (!tareaActions.isExit() && !actions.isExit()) {
        String respuesta = orquestador.manejarMensaje(mensajeEfectivo);
        BotHelper.sendMessageToTelegram(chatId, respuesta, telegramClient);
    }
}
```

El mismo patron se aplica en `procesarPasoNewtask()`, donde cada paso del wizard es un metodo privado independiente:

```java
// TareaBotActions — Composing Method aplicado al wizard newtask
private void procesarPasoNewtask(ConversationState estado) {
    switch (estado.getPaso()) {
        case 0: procesarTituloNewtask(estado);              break;
        case 1: procesarDescripcionNewtask(estado);         break;
        case 2: procesarHorasEstimadas(estado);             break;
        case 3: procesarConfirmacionHorasLargas(estado);    break;
        case 4: procesarPrioridadNewtask(estado);           break;
        case 5: procesarAsignadoNewtask(estado);            break;
        case 6: procesarConfirmacionTarea(estado);          break;
        default: conversationManager.terminarConversacion(chatId);
    }
}
```

### Que mejoro

- `dispatch()` pasa de ~60 lineas anidadas a dos bloques lineales independientes.
- El wizard activo ya no puede ser interceptado por handlers legacy como `fnDone()` o `fnAddItem()`.
- `procesarPasoNewtask()` actua como tabla de despacho; agregar un paso es anadir un `case` y un metodo privado.

---

## Tecnica 4 — Simplifying Methods

### Donde se aplica en el proyecto

`LlmIntentParser.construirCuerpoSolicitud()` y `TareaService.actualizarTarea()`.

### Por que aplica

Simplifying Methods extrae logica repetida o compleja a metodos con nombres que comunican la intencion. `LlmIntentParser` originalmente habria construido el cuerpo JSON inline dos veces (en `parse()` y en `generarRespuestaConversacional()`). `TareaService.actualizarTarea()` aplica null-checks para actualizacion parcial, un patron que puede simplificarse.

### Codigo antes

```java
// LlmIntentParser — construccion del cuerpo JSON incrustada en parse()
public ParsedIntent parse(String textoMensaje, List<Map<String, String>> historial) {
    try {
        List<Map<String, String>> mensajes = new ArrayList<>();
        mensajes.add(Map.of("role", "system", "content", PROMPT_SISTEMA_CLASIFICADOR));
        if (historial != null && !historial.isEmpty()) {
            mensajes.addAll(historial);
        }
        mensajes.add(Map.of("role", "user", "content", textoMensaje));

        Map<String, Object> cuerpo = Map.of(
                "model",       aiProps.getModelo(),
                "temperature", 0.0,
                "messages",    mensajes);

        String respuestaRaw = restClient.post().uri(aiProps.getApiUrl())
                .body(cuerpo).retrieve().body(String.class);
        // ...
    }
}

// Y la misma logica repetida en generarRespuestaConversacional() con temperatura 0.7
public String generarRespuestaConversacional(String texto, List<Map<String, String>> historial) {
    try {
        List<Map<String, String>> mensajes = new ArrayList<>();
        mensajes.add(Map.of("role", "system", "content", PROMPT_SISTEMA_CONVERSACIONAL));
        if (historial != null && !historial.isEmpty()) {
            mensajes.addAll(historial);
        }
        mensajes.add(Map.of("role", "user", "content", texto));

        Map<String, Object> cuerpo = Map.of(
                "model",       aiProps.getModelo(),
                "temperature", 0.7,          // diferente temperatura
                "messages",    mensajes);
        // ...
    }
}
```

### Codigo despues

La construccion del cuerpo se extrae a un metodo privado parametrizable. `extraerContenido()` y `eliminarMarkdown()` tambien son metodos independientes con nombres descriptivos.

```java
// LlmIntentParser — metodo unificado para construir el cuerpo
private Map<String, Object> construirCuerpoSolicitud(String promptSistema,
                                                      String mensajeUsuario,
                                                      double temperatura,
                                                      List<Map<String, String>> historial) {
    List<Map<String, String>> mensajes = new ArrayList<>();
    mensajes.add(Map.of("role", "system", "content", promptSistema));

    if (historial != null && !historial.isEmpty()) {
        mensajes.addAll(historial);
    }
    mensajes.add(Map.of("role", "user", "content", mensajeUsuario));

    return Map.of(
            "model",       aiProps.getModelo(),
            "temperature", temperatura,
            "messages",    mensajes
    );
}

// Los dos metodos publicos ahora son llamadores simples
public ParsedIntent parse(String textoMensaje, List<Map<String, String>> historial) {
    try {
        Map<String, Object> cuerpo = construirCuerpoSolicitud(
                PROMPT_SISTEMA_CLASIFICADOR, textoMensaje, 0.0, historial);
        String respuestaRaw = restClient.post().uri(aiProps.getApiUrl())
                .body(cuerpo).retrieve().body(String.class);
        String json = eliminarMarkdown(extraerContenido(respuestaRaw));
        return objectMapper.readValue(json, ParsedIntent.class);
    } catch (Exception ex) {
        return parserRespaldo.parse(textoMensaje);
    }
}

public String generarRespuestaConversacional(String texto, List<Map<String, String>> historial) {
    try {
        Map<String, Object> cuerpo = construirCuerpoSolicitud(
                PROMPT_SISTEMA_CONVERSACIONAL, texto, 0.7, historial);
        String respuestaRaw = restClient.post().uri(aiProps.getApiUrl())
                .body(cuerpo).retrieve().body(String.class);
        return extraerContenido(respuestaRaw);
    } catch (Exception ex) {
        return "Lo siento, no pude procesar tu consulta en este momento.";
    }
}

private String extraerContenido(String respuestaJson) throws Exception {
    return objectMapper.readTree(respuestaJson)
            .path("choices").path(0).path("message").path("content").asText();
}

private String eliminarMarkdown(String texto) {
    if (texto == null) return "";
    return texto.strip()
            .replaceAll("^```[a-zA-Z]*\\s*", "")
            .replaceAll("```\\s*$", "")
            .strip();
}
```

### Que mejoro

- La logica de construccion del request JSON existe en un solo lugar; cambiar el modelo o el formato del payload requiere modificar un unico metodo.
- `extraerContenido()` y `eliminarMarkdown()` son testeables de forma unitaria.
- Los metodos publicos tienen ~6 lineas cada uno en lugar de ~20, lo que los hace faciles de leer de un vistazo.

---

## Tecnica 5 — Moving Features Between Objects

### Donde se aplica en el proyecto

`BotUpdateDispatcher.dispatch()` — la verificacion de conversacion activa fue movida del **final** al **inicio** del metodo.

### Por que aplica

Moving Features Between Objects se aplica cuando una responsabilidad esta en el lugar incorrecto del flujo de ejecucion. La verificacion `tieneConversacionActiva` estaba en el bloque de fallback (al final), lo que significaba que todos los handlers legacy se ejecutaban de todas formas antes de descubrir que habia un wizard en curso.

### Codigo antes

```java
// BotUpdateDispatcher.dispatch() — verificacion al FINAL
public void dispatch(Update update) {
    // BotActions se crea siempre, incluso durante un wizard
    BotActions actions = new BotActions(/* ... */);
    TareaBotActions tareaActions = new TareaBotActions(/* ... */);

    // handlers legacy ejecutan SIEMPRE (riesgo de interceptar respuestas del wizard)
    actions.fnDone();    // verifica si el texto contiene "Done"
    actions.fnUndo();    // verifica si el texto contiene "Undo"
    actions.fnDelete();  // verifica si el texto contiene "Delete"
    actions.fnHide();
    actions.fnListAll();
    actions.fnAddItem(); // logs "Adding item" para CADA mensaje
    actions.fnLLM();     // logs "Invocando LLM" para CADA mensaje

    // handlers wizard ejecutan despues
    tareaActions.fnNuevatarea();
    // ...

    // verificacion de wizard SOLO como guardia del fallback LLM
    if (!tareaActions.isExit() && !actions.isExit()) {
        if (!conversationManager.tieneConversacionActiva(chatId)) {
            // llamar LLM
        } else {
            // mensaje "Comando no reconocido" — nunca debia llegar aqui
            BotHelper.sendMessageToTelegram(chatId,
                    "Comando no reconocido. Usa /start.", telegramClient);
        }
    }
}
```

### Codigo despues

```java
// BotUpdateDispatcher.dispatch() — verificacion al INICIO
public void dispatch(Update update) {
    // TareaBotActions se crea antes del check (necesita los datos del usuario)
    TareaBotActions tareaActions = new TareaBotActions(/* ... */);
    tareaActions.setTextoMensaje(mensajeEfectivo);
    tareaActions.setChatId(chatId);
    // ... setters de datos del usuario ...

    // verificacion PRIMERO: si hay wizard, ningun handler legacy se ejecuta jamas
    if (conversationManager.tieneConversacionActiva(chatId)) {
        tareaActions.fnNuevatarea();
        tareaActions.fnAsignarSprint();
        tareaActions.fnCompletarTarea();
        tareaActions.fnNuevoSprint();
        tareaActions.fnModificarTarea();
        tareaActions.fnModificarSprint();
        if (!tareaActions.isExit()) {
            BotHelper.sendMessageToTelegram(chatId,
                    "Escribe 'cancelar' para cancelar la operacion actual.", telegramClient);
        }
        return;
    }

    // BotActions solo se crea cuando NO hay wizard activo
    BotActions actions = new BotActions(/* ... */);
    actions.fnDone();
    // ...
}
```

### Que mejoro

- Un mensaje wizard como `"2"` (horas estimadas) ya no puede ser capturado accidentalmente por `fnDone()` si el texto contuviera la etiqueta "Done".
- `BotActions` no se instancia durante un wizard (ahorro de CPU y claridad de intencion).
- Desaparece el bloque `else { "Comando no reconocido" }` que era codigo muerto: la verificacion anticipada ya gestiona ese caso.
- El flujo de control del metodo es lineal y legible: primero wizard, luego flujo normal.

---

## Tecnica 6 — Preparatory Refactoring

### Donde se aplica en el proyecto

Extraccion de `BotUpdateDispatcher @Service` y creacion de `TestBotController @Profile("test")` como prerequisito para poder escribir los tests E2E.

### Por que aplica

Preparatory Refactoring consiste en hacer primero los cambios estructurales necesarios para que una nueva funcionalidad sea implementable limpiamente. Los tests E2E del bot requerian invocar el procesamiento de mensajes sin levantar long-polling de Telegram. Para eso, primero habia que desacoplar la logica de enrutamiento del bean `SpringLongPollingBot`.

### Codigo antes

```java
// ToDoItemBotController — version original: logica y polling mezclados
@Component
@ConditionalOnProperty(name = "telegram.bot.enabled", havingValue = "true", matchIfMissing = true)
public class ToDoItemBotController
        implements SpringLongPollingBot, LongPollingSingleThreadUpdateConsumer {

    // Todo el estado y todos los servicios directamente en el controlador del bot
    private final TelegramClient telegramClient;
    private final ToDoItemService toDoItemService;
    private final DeepSeekService deepSeekService;
    private final TareaService tareaService;
    private final SprintService sprintService;
    // ... 8 dependencias mas ...

    @Override
    public void consume(Update update) {
        // ~150 lineas de logica de enrutamiento incrustadas aqui
        if (!update.hasMessage() || !update.getMessage().hasText()) return;
        String mensajeOriginal = update.getMessage().getText();
        // ... toda la logica de dispatch ...
    }
}
// No existia forma de probar consume() sin levantar un bot real de Telegram.
// @ConditionalOnProperty asegura que este bean NO existe en el perfil "test",
// por lo que era imposible inyectarlo en un test.
```

### Codigo despues

Se realiza la refactorizacion preparatoria en dos pasos antes de escribir ni una sola linea de test:

**Paso 1:** extraer `BotUpdateDispatcher @Service` — siempre presente, independiente del perfil.

```java
// BotUpdateDispatcher.java — nueva clase @Service siempre disponible
@Service
public class BotUpdateDispatcher {

    public void dispatch(Update update) {
        // toda la logica que antes estaba en consume()
    }
}
```

**Paso 2:** simplificar `ToDoItemBotController` a solo el registro del long-polling.

```java
// ToDoItemBotController.java — ahora solo registra el bot
@Component
@ConditionalOnProperty(name = "telegram.bot.enabled", havingValue = "true", matchIfMissing = true)
public class ToDoItemBotController
        implements SpringLongPollingBot, LongPollingSingleThreadUpdateConsumer {

    private final BotUpdateDispatcher dispatcher;

    @Override
    public void consume(Update update) {
        dispatcher.dispatch(update);  // delegar, nada mas
    }
}
```

**Paso 3** (ya preparado por los pasos anteriores): crear `TestBotController @Profile("test")` que llama directamente al dispatcher.

```java
// TestBotController.java — solo existe en el perfil "test"
@RestController
@RequestMapping("/test")
@Profile("test")
public class TestBotController {

    private final BotUpdateDispatcher dispatcher;

    @PostMapping("/simulate-message")
    public ResponseEntity<String> simulateMessage(
            @RequestParam String chatId,
            @RequestParam String userId,
            @RequestParam String text) {

        Message message = Message.builder()
                .messageId(UPDATE_ID_SEQ.get())
                .date((int) (System.currentTimeMillis() / 1000))
                .from(User.builder().id(Long.parseLong(userId))
                        .firstName("Test").isBot(false).userName("e2e_test").build())
                .chat(Chat.builder().id(Long.parseLong(chatId)).type("private").build())
                .text(text)
                .build();

        Update update = new Update();
        update.setUpdateId(UPDATE_ID_SEQ.getAndIncrement());
        update.setMessage(message);

        dispatcher.dispatch(update);
        return ResponseEntity.ok("OK");
    }
}
```

### Que mejoro

- Fue posible escribir `TelegramE2ETest` sin mock de Telegram, sin `@MockBean`, sin tocar la clave de API.
- `ToDoItemBotController` paso de ~200 lineas a ~40 lineas: solo registra el bot.
- `BotUpdateDispatcher` puede ser testeado de forma unitaria inyectando mocks de servicios.
- En produccion el comportamiento es identico: `ToDoItemBotController` sigue recibiendo actualizaciones de Telegram y delegando al dispatcher.

---

## Tecnica 7 — User Interface Refactoring

### Donde se aplica en el proyecto

`KanbanPage.jsx` y `SprintPage.jsx` — migracion de `localStorage` a la API REST `/api/sprints`.

Y en el bot: `resolverMensajeEfectivo()` en `BotUpdateDispatcher` — normalizacion de etiquetas de botones a comandos slash.

### Por que aplica

User Interface Refactoring mejora la capa de presentacion sin cambiar la logica de negocio: eliminar estado local que duplica datos del servidor, unificar la representacion de comandos independientemente de como los envie el usuario. Ambas son mejoras de la interfaz (grafica o conversacional).

### Codigo antes — KanbanPage.jsx con localStorage

```jsx
// KanbanPage.jsx — version original con localStorage
import React, { useState, useEffect } from 'react';

export default function KanbanPage() {
  const [sprints, setSprints] = useState([]);
  const [sprintSeleccionado, setSprintSeleccionado] = useState('');

  useEffect(() => {
    // Lee sprints del localStorage — los datos creados por el bot NO aparecen aqui
    const raw = localStorage.getItem('eq51_sprints');
    if (raw) {
      try {
        const lista = JSON.parse(raw);
        setSprints(lista);
        // Busca activo por campo booleano pero el campo se llama 'activo' en BD
        // y a veces 'active' en el localStorage segun quien lo escribio
        const activo = lista.find(s => s.activo || s.active);
        if (activo) setSprintSeleccionado(String(activo.id || activo.idSprint));
      } catch (e) { /* silencioso */ }
    }
  }, []);

  return (
    <select
      value={sprintSeleccionado}
      onChange={e => setSprintSeleccionado(e.target.value)}
    >
      {sprints.map(s => (
        // Campo id vs idSprint inconsistente con el modelo Java
        <option key={s.id || s.idSprint} value={String(s.id || s.idSprint)}>
          {s.nombre}{(s.activo || s.active) ? ' (activo)' : ''}
        </option>
      ))}
    </select>
  );
}
```

### Codigo despues — KanbanPage.jsx con REST API

```jsx
// KanbanPage.jsx — version refactorizada con API REST
import React, { useState, useEffect } from 'react';
import { getSprints } from '../api/sprints';  // modulo de API centralizado

export default function KanbanPage() {
  const [sprints, setSprints] = useState([]);
  const [sprintSeleccionado, setSprintSeleccionado] = useState('');

  useEffect(() => {
    getSprints()
      .then((data) => {
        const lista = data ?? [];
        setSprints(lista);
        // Campo canonico del modelo Java: idSprint, activo
        const activo = lista.find((s) => s.activo);
        if (activo) setSprintSeleccionado(String(activo.idSprint));
      })
      .catch(() => {});
  }, []);

  return (
    <select
      value={sprintSeleccionado}
      onChange={(e) => setSprintSeleccionado(e.target.value)}
    >
      {sprints.map((s) => (
        <option key={s.idSprint} value={String(s.idSprint)}>
          {s.nombre}{s.activo ? ' (active)' : ''}
        </option>
      ))}
    </select>
  );
}

// src/api/sprints.js — capa de acceso a datos centralizada
import { apiFetch } from './client';
export const getSprints      = ()       => apiFetch('/api/sprints');
export const getSprintActivo = ()       => apiFetch('/api/sprints/activo');
export const createSprint    = (data)   => apiFetch('/api/sprints', { method: 'POST', body: data });
export const updateSprint    = (id, d)  => apiFetch(`/api/sprints/${id}`, { method: 'PUT', body: d });
```

### Codigo antes — bot: etiquetas de boton mezcladas con logica

```java
// Antes de resolverMensajeEfectivo: cada handler comparaba contra la etiqueta del boton
// y contra el comando slash por separado, duplicando logica
public void dispatch(Update update) {
    String texto = update.getMessage().getText();

    // fnNuevatarea debia comparar contra "📝 Nueva Tarea" Y contra "/newtask"
    boolean esNuevatarea = texto.equals("/newtask")
            || texto.equals("📝 Nueva Tarea")
            || texto.equals("Nueva Tarea");

    // idem para fnCompletarTarea, fnAsignarSprint, etc.
}
```

### Codigo despues — bot: normalizacion centralizada antes del despacho

```java
// BotUpdateDispatcher.dispatch() — el texto se normaliza UNA SOLA VEZ
String mensajeEfectivo = resolverMensajeEfectivo(mensajeOriginal);
// desde este punto, todos los handlers solo comparan contra comandos slash

private String resolverMensajeEfectivo(String mensajeOriginal) {
    if (BotLabels.NEW_TASK.getLabel().equals(mensajeOriginal))          return "/newtask";
    if (BotLabels.ASSIGN_TO_SPRINT.getLabel().equals(mensajeOriginal))  return "/assignsprint";
    if (BotLabels.COMPLETE_TASK.getLabel().equals(mensajeOriginal))     return "/donetask";
    if (BotLabels.SPRINT_TABLE.getLabel().equals(mensajeOriginal))      return "/sprinttable";
    if (BotLabels.KPI_REPORT.getLabel().equals(mensajeOriginal))        return "/kpi";
    if (BotLabels.NEW_SPRINT.getLabel().equals(mensajeOriginal))        return "/newsprint";
    if (BotLabels.MODIFY_TASK.getLabel().equals(mensajeOriginal))       return "/modifytask";
    if (BotLabels.MODIFY_SPRINT.getLabel().equals(mensajeOriginal))     return "/modifysprint";
    return mensajeOriginal;
}
```

### Que mejoro

- Los sprints creados desde el bot de Telegram ahora aparecen inmediatamente en el Kanban y en el selector de sprint, porque ambos leen de la misma fuente de verdad (la BD via REST).
- `localStorage` quedo eliminado del flujo de datos de sprints: no mas inconsistencias entre nombre de campos (`id` vs `idSprint`, `active` vs `activo`).
- `resolverMensajeEfectivo` actua como capa de traduccion UI→dominio: cambiar la etiqueta de un boton de Telegram requiere modificar un unico lugar.

---

## Preguntas del Profesor

### 1. Puedes aplicar las mismas tecnicas al frontend (React) que al backend (Spring Boot)?

**Si, con las mismas tecnicas pero diferentes mecanismos de implementacion.**

| Tecnica                   | Backend (Spring Boot)                                        | Frontend (React)                                              |
|---------------------------|--------------------------------------------------------------|---------------------------------------------------------------|
| Red-Green Refactoring     | `TelegramE2ETest`: wizard paso a paso en lugar de texto libre | `KanbanBoard.test.jsx`: probar `handleDragEnd` con eventos sinteticos en lugar de depender del estado visual |
| Refactoring by Abstraction| Interfaz `IntentParser` con implementaciones intercambiables | Hook `useTareas()` abstrae la logica de fetch, cache y estado global; los componentes solo consumen el hook |
| Composing Method          | `dispatch()` dividido en dos caminos con retorno temprano    | Funcion `enviar()` en `ChatbotPanel.jsx` podia dividirse en `construirHistorial()`, `agregarMensajeUsuario()` y `animarRespuesta()` |
| Simplifying Methods       | `construirCuerpoSolicitud()` extrae logica repetida en dos metodos | `ChatbotPanel.jsx`: la animacion de escritura caracter a caracter (setInterval) podria extraerse a un hook `useTipingEffect(texto)` |
| Moving Features           | Verificacion de wizard movida del final al inicio de dispatch | El selector de sprint en `KanbanPage.jsx` movio la logica de seleccion de `SprintList` al estado del padre para compartirla con `KanbanBoard` |
| Preparatory Refactoring   | `BotUpdateDispatcher` creado antes de escribir `TelegramE2ETest` | Crear `src/api/sprints.js` fue el prerequisito para que `KanbanPage` y `SprintPage` pudieran migrar de localStorage |
| UI Refactoring            | `resolverMensajeEfectivo` normaliza etiquetas a comandos slash | `KanbanPage.jsx` muestra skeleton de carga durante el fetch inicial, mejorando la percepcion de velocidad |

**Diferencia clave**: en Spring Boot la abstraccion se expresa con interfaces y beans inyectables; en React se expresa con hooks, contextos y modulos de API. La tecnica es identica, la herramienta es diferente.

**Ejemplo concreto de Composing Method en el frontend** — la funcion `enviar()` de `ChatbotPanel.jsx` realiza cuatro cosas distintas en secuencia:

```jsx
// Antes: todo en una funcion
async function enviar(texto) {
    const msg = texto.trim();
    if (!msg || cargando) return;
    const historial = mensajes.filter(m => m.rol !== 'sistema')
        .slice(-10).map(m => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto }));
    setHintsVisible(false);
    setMensajes(prev => [...prev, { rol: 'usuario', texto: msg }]);
    setEntrada('');
    setCargando(true);
    let respuesta;
    try { respuesta = await enviarMensaje(msg, historial); }
    catch (err) { respuesta = 'Error connecting...'; }
    setCargando(false);
    setMensajes(prev => [...prev, { rol: 'asistente', texto: '' }]);
    let i = 0;
    const intervalo = setInterval(() => {
        i++;
        setMensajes(prev => { const c=[...prev]; c[c.length-1]={rol:'asistente',texto:respuesta.slice(0,i)}; return c; });
        if (i >= respuesta.length) clearInterval(intervalo);
    }, 14);
}

// Despues: Composing Method
async function enviar(texto) {
    const msg = texto.trim();
    if (!msg || cargando) return;
    const historial = construirHistorial(mensajes);
    agregarMensajeUsuario(msg);
    const respuesta = await obtenerRespuesta(msg, historial);
    animarRespuesta(respuesta);
}
```

---

### 2. La interfaz de usuario influye en la tecnica a utilizar?

**Si, de forma directa.** El tipo de interfaz condiciona que refactorizaciones son urgentes y cuales son optativas.

**Ejemplo 1 — ChatbotPanel.jsx y Simplifying Methods:**

El efecto de escritura caracter a caracter (`setInterval` a 14 ms) es logica de presentacion pura: no afecta al dato (la respuesta del LLM) sino a como se muestra. Esta logica esta incrustada dentro de `enviar()` junto con la llamada al backend. *Simplifying Methods* es urgente aqui porque el `setInterval` es dificil de limpiar correctamente (memory leak si el componente se desmonta antes de que termine), y extraerlo a un hook `useTipingEffect` permite hacer `clearInterval` en el `useEffect` de cleanup de React.

```jsx
// useTipingEffect.js — metodo simplificado y testeable
export function useTypingEffect(texto, velocidadMs = 14) {
    const [mostrado, setMostrado] = useState('');
    useEffect(() => {
        if (!texto) return;
        let i = 0;
        const id = setInterval(() => {
            i++;
            setMostrado(texto.slice(0, i));
            if (i >= texto.length) clearInterval(id);
        }, velocidadMs);
        return () => clearInterval(id); // limpieza garantizada
    }, [texto, velocidadMs]);
    return mostrado;
}
```

Sin la presion de la UI (animacion de escritura), esta refactorizacion no seria necesaria. Es la interfaz la que introduce el requisito tecnico.

**Ejemplo 2 — KanbanBoard.jsx y Preparatory Refactoring:**

El tablero Kanban usa drag-and-drop (`@dnd-kit`). Las actualizaciones optimistas (mostrar el cambio antes de que la API confirme y hacer rollback si falla) son *Preparatory Refactoring*: antes de agregar el drag-and-drop, fue necesario agregar el mecanismo de rollback de estado. Sin la interfaz visual drag-and-drop, esa preparacion no habria sido necesaria.

```jsx
// KanbanBoard.jsx — actualizacion optimista como preparacion para DnD
async function handleDragEnd(event) {
    const estadoAnterior = [...tareas]; // guardar estado ANTES de mutar
    actualizarEstadoLocal(event);       // actualizar UI inmediatamente (optimista)
    try {
        await actualizarTareaEnApi(event);
    } catch {
        setTareas(estadoAnterior);      // rollback si falla
        mostrarToast('No se pudo mover la tarea', 'error');
    }
}
```

**Ejemplo 3 — Bot de Telegram y User Interface Refactoring:**

El bot usa botones de teclado con etiquetas en espanol ("📝 Nueva Tarea"). La funcion `resolverMensajeEfectivo()` es exclusivamente necesaria porque la interfaz del bot permite dos formas de disparar el mismo comando (boton de teclado o comando slash). En una API REST pura no existiria esta tecnica de normalizacion; es la naturaleza de la interfaz conversacional la que la hace necesaria.

**Conclusion sobre la pregunta:** la interfaz no solo influye en la estetica del codigo — define que problemas tecnicos aparecen y, por ende, que tecnica de refactorizacion es la apropiada. Una animacion de UI introduce requisitos de limpieza de recursos. Una interaccion drag-and-drop introduce requisitos de consistencia de estado. Un teclado de botones introduce requisitos de normalizacion de entradas.

---

## Conclusion

Las siete tecnicas se aplicaron sobre codigo real del proyecto:

| Tecnica                   | Archivo(s) principales modificados                        | Impacto                                                    |
|---------------------------|-----------------------------------------------------------|------------------------------------------------------------|
| Red-Green Refactoring     | `TelegramE2ETest.java`                                    | Tests deterministas, sin dependencia del LLM               |
| Refactoring by Abstraction| `IntentParser`, `LlmIntentParser`, `AgentOrchestrator`    | Intercambiable sin tocar el orquestador                    |
| Composing Method          | `BotUpdateDispatcher`, `TareaBotActions`                  | Metodos cortos, rutas claras, facil agregar wizard nuevo   |
| Simplifying Methods       | `LlmIntentParser`                                         | Sin duplicacion del cuerpo JSON, metodos auxiliares testeables |
| Moving Features           | `BotUpdateDispatcher.dispatch()`                          | Wizard protegido, handlers legacy no interfieren           |
| Preparatory Refactoring   | `ToDoItemBotController`, `BotUpdateDispatcher`, `TestBotController` | Tests E2E sin infraestructura de Telegram real  |
| User Interface Refactoring| `KanbanPage.jsx`, `SprintPage.jsx`, `BotUpdateDispatcher` | Bot y UI consistentes, `localStorage` eliminado del flujo  |

La refactorizacion no es un evento unico: es un habito continuo. Cada nueva funcionalidad — el wizard `/modifytask`, la animacion de escritura del chatbot, los tests E2E — revelo deuda tecnica que se pago con las tecnicas documentadas antes de seguir construyendo encima.
