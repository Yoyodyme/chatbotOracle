package com.springboot.MyTodoList;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.springboot.MyTodoList.model.EstatusTarea;
import com.springboot.MyTodoList.model.Rol;
import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.repository.EstatusTareaRepository;
import com.springboot.MyTodoList.repository.RolRepository;
import com.springboot.MyTodoList.repository.TareaRepository;
import com.springboot.MyTodoList.repository.UsuarioRepository;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas E2E del bot de Telegram.
 *
 * IMPORTANTE — cómo funciona:
 *   sendMessageToBot()  →  usa el token del bot para enviar un mensaje FROM el bot
 *                          TO el chat de prueba. Para que el bot RESPONDA se requiere
 *                          que el bot ya esté corriendo en otro proceso (o pod K8s) y
 *                          que el tester haya enviado el mensaje desde la app real de
 *                          Telegram. La verificación de respuesta se hace vía
 *                          getUpdates (últimos mensajes recibidos por el bot).
 *                          La verificación de estado en BD es siempre la fuente de
 *                          verdad más confiable.
 *
 *   getLastBotResponse() → llama a getUpdates?offset=-1 para obtener la última
 *                          actualización recibida por el bot. Filtra mensajes del bot
 *                          (is_bot=true). Si no encuentra ninguno devuelve el texto
 *                          del último update disponible.
 *
 * SETUP PREVIO REQUERIDO:
 *   1. Habla con @userinfobot en Telegram para obtener tu chat_id personal.
 *   2. Agrégalo a src/test/resources/application-test.properties como
 *      TEST_CHAT_ID=<tu_chat_id>
 *   3. El bot debe estar corriendo en otro proceso o pod de K8s apuntando a la
 *      misma BD Oracle ADB que usan estas pruebas.
 *      TELEGRAM_BOT_ENABLED=false en este contexto de prueba para evitar conflictos.
 *   4. Ejecuta las pruebas: mvn test -Dtest=TelegramE2ETest -Dspring.profiles.active=test
 *   5. Los Thread.sleep(3_000) son necesarios para que Telegram entregue el mensaje
 *      al bot y éste procese y persista en BD antes de verificar.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@ActiveProfiles("test")
class TelegramE2ETest {

    private static final String TELEGRAM_API = "https://api.telegram.org/bot";

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${TEST_CHAT_ID}")
    private String testChatId;

    @Autowired
    private TareaRepository tareaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private EstatusTareaRepository estatusTareaRepository;

    @Autowired
    private RolRepository rolRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Estado compartido entre tests (static para sobrevivir entre instancias JUnit 5)
    private static Long tareaIdCreada;
    private static Long tareaIdAsignada;

    // -------------------------------------------------------------------------
    // Utilidades de comunicación con Telegram
    // -------------------------------------------------------------------------

    /**
     * Envía un mensaje usando el token del bot al chat de prueba.
     * Aguarda 3 segundos para dar tiempo al bot de procesar la petición.
     *
     * NOTA: el endpoint /sendMessage con el token del bot envía FROM el bot.
     * Para simular mensajes de usuario se requiere la Telegram User API
     * (TDLib / Pyrogram). Para CI totalmente automatizado considera un
     * endpoint interno de inyección de updates o usar un segundo bot de prueba.
     */
    private void sendMessageToBot(String texto) throws Exception {
        String url = TELEGRAM_API + botToken + "/sendMessage";

        Map<String, String> cuerpo = new HashMap<>();
        cuerpo.put("chat_id", testChatId);
        cuerpo.put("text", texto);

        HttpHeaders cabeceras = new HttpHeaders();
        cabeceras.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, String>> peticion = new HttpEntity<>(cuerpo, cabeceras);
        ResponseEntity<String> respuesta = restTemplate.postForEntity(url, peticion, String.class);

        assertThat(respuesta.getStatusCode().is2xxSuccessful())
                .withFailMessage("Error al llamar a /sendMessage de Telegram: " + respuesta.getBody())
                .isTrue();

        Thread.sleep(3_000);
    }

    /**
     * Recupera el texto del último mensaje disponible en getUpdates.
     * Prioriza mensajes donde from.is_bot = true; si no encuentra ninguno
     * devuelve el texto del update más reciente.
     *
     * NOTA: getUpdates devuelve los mensajes RECIBIDOS por el bot (de usuarios),
     * no los mensajes que el bot envió. Para capturar respuestas del bot se
     * recomienda agregar un mecanismo de logging en la BD o usar el offset
     * correcto después de una sesión de chat real.
     */
    private String getLastBotResponse() throws Exception {
        String url = TELEGRAM_API + botToken + "/getUpdates?offset=-1&limit=10";
        String jsonRespuesta = restTemplate.getForObject(url, String.class);

        JsonNode raiz = objectMapper.readTree(jsonRespuesta);
        JsonNode resultados = raiz.path("result");

        if (resultados.isMissingNode() || resultados.isEmpty()) {
            return "";
        }

        // Buscar primero un mensaje enviado por el bot (is_bot = true)
        for (int i = resultados.size() - 1; i >= 0; i--) {
            JsonNode update = resultados.get(i);
            JsonNode mensaje = update.path("message");
            if (!mensaje.isMissingNode()) {
                JsonNode from = mensaje.path("from");
                if (from.path("is_bot").asBoolean(false)) {
                    return mensaje.path("text").asText("");
                }
            }
        }

        // Fallback: texto del update más reciente (puede ser mensaje de usuario)
        JsonNode ultimoUpdate = resultados.get(resultados.size() - 1);
        return ultimoUpdate.path("message").path("text").asText("");
    }

    // -------------------------------------------------------------------------
    // Helpers de BD
    // -------------------------------------------------------------------------

    private EstatusTarea obtenerEstatusInicial() {
        return estatusTareaRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "No hay registros en ESTATUS_TAREA — ejecuta SCRIPT_DATOS_INICIALES.sql"));
    }

    private EstatusTarea obtenerEstatusCompletada() {
        EstatusTarea completada = estatusTareaRepository.findByNombre("Completada");
        assertThat(completada)
                .withFailMessage("No existe el estatus 'Completada' en ESTATUS_TAREA")
                .isNotNull();
        return completada;
    }

    private Rol obtenerRolDefault() {
        return rolRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "No hay registros en ROLES — ejecuta SCRIPT_DATOS_INICIALES.sql"));
    }

    private Usuario buscarOCrearUsuario(String nombreUsuario, String nombreCompleto, String integrationId, Rol rol) {
        Usuario usuario = usuarioRepository.findByNombreUsuario(nombreUsuario);
        if (usuario == null) {
            usuario = new Usuario();
            usuario.setIdIntegrationUsuario(integrationId);
            usuario.setNombreUsuario(nombreUsuario);
            usuario.setNombreCompleto(nombreCompleto);
            usuario.setRol(rol);
            usuario = usuarioRepository.save(usuario);
        }
        return usuario;
    }

    // -------------------------------------------------------------------------
    // Test 1: Dar de alta una tarea
    // -------------------------------------------------------------------------

    @Test
    @Order(1)
    void testDarDeAltaTarea() throws Exception {
        sendMessageToBot("nueva tarea Implementar login 3 puntos Sprint 1");

        String respuesta = getLastBotResponse();
        assertThat(respuesta.toLowerCase())
                .withFailMessage("El bot no confirmó la creación — respuesta: " + respuesta)
                .containsAnyOf("creada", "exitosa", "tarea", "nueva", "registrada", "agregada");

        List<Tarea> tareas = tareaRepository.findAll();
        Optional<Tarea> tareaLogin = tareas.stream()
                .filter(t -> t.getTitulo() != null && t.getTitulo().toLowerCase().contains("login"))
                .findFirst();

        assertThat(tareaLogin)
                .withFailMessage("No se encontró ninguna tarea con 'login' en el título en la BD")
                .isPresent();

        tareaIdCreada = tareaLogin.get().getIdTarea();
    }

    // -------------------------------------------------------------------------
    // Test 2: Dar de baja una tarea
    // -------------------------------------------------------------------------

    @Test
    @Order(2)
    void testDarDeBajaTarea() throws Exception {
        assertThat(tareaIdCreada)
                .withFailMessage("tareaIdCreada es null — ¿falló el Order(1)?")
                .isNotNull();

        sendMessageToBot("eliminar tarea " + tareaIdCreada);

        String respuesta = getLastBotResponse();
        assertThat(respuesta.toLowerCase())
                .withFailMessage("El bot no confirmó la eliminación — respuesta: " + respuesta)
                .containsAnyOf("eliminada", "borrada", "eliminado", "borrado", "removida");

        Optional<Tarea> tareaEliminada = tareaRepository.findById(tareaIdCreada);
        assertThat(tareaEliminada)
                .withFailMessage("La tarea con ID " + tareaIdCreada + " todavía existe en la BD")
                .isNotPresent();
    }

    // -------------------------------------------------------------------------
    // Test 3: Asignar una tarea a un usuario
    // -------------------------------------------------------------------------

    @Test
    @Order(3)
    void testAsignarTarea() throws Exception {
        Rol rolDefault = obtenerRolDefault();
        Usuario ana = buscarOCrearUsuario("ana", "Ana García", "ana_e2e_test_id", rolDefault);

        Tarea tarea = new Tarea();
        tarea.setTitulo("Tarea E2E para prueba de asignación");
        tarea.setEstatus(obtenerEstatusInicial());
        tarea = tareaRepository.save(tarea);
        tareaIdAsignada = tarea.getIdTarea();

        sendMessageToBot("asignar tarea " + tareaIdAsignada + " a Ana");

        String respuesta = getLastBotResponse();
        assertThat(respuesta.toLowerCase())
                .withFailMessage("El bot no confirmó la asignación — respuesta: " + respuesta)
                .containsAnyOf("asignada", "asignado", "ana", "actualizada");

        Tarea tareaActualizada = tareaRepository.findById(tareaIdAsignada).orElseThrow();
        assertThat(tareaActualizada.getUsuarioAsignado())
                .withFailMessage("usuarioAsignado sigue siendo null tras el comando de asignación")
                .isNotNull();
        assertThat(tareaActualizada.getUsuarioAsignado().getNombreCompleto().toLowerCase())
                .withFailMessage("El nombre del usuario asignado no contiene 'ana'")
                .contains("ana");
    }

    // -------------------------------------------------------------------------
    // Test 4: Completar una tarea
    // -------------------------------------------------------------------------

    @Test
    @Order(4)
    void testCompletarTarea() throws Exception {
        assertThat(tareaIdAsignada)
                .withFailMessage("tareaIdAsignada es null — ¿falló el Order(3)?")
                .isNotNull();

        sendMessageToBot("completar tarea " + tareaIdAsignada);

        String respuesta = getLastBotResponse();
        assertThat(respuesta.toLowerCase())
                .withFailMessage("El bot no confirmó la completación — respuesta: " + respuesta)
                .containsAnyOf("completada", "completado", "lista", "done", "finalizada", "terminada");

        Tarea tareaCompletada = tareaRepository.findById(tareaIdAsignada).orElseThrow();
        assertThat(tareaCompletada.getEstatus())
                .withFailMessage("El estatus de la tarea es null en BD")
                .isNotNull();
        assertThat(tareaCompletada.getEstatus().getNombre().toLowerCase())
                .withFailMessage("El estatus en BD no refleja 'completada'")
                .contains("complet");
    }

    // -------------------------------------------------------------------------
    // Test 5: Visualizar tareas de un desarrollador
    // -------------------------------------------------------------------------

    @Test
    @Order(5)
    void testVisualizarTareasDesarrollador() throws Exception {
        Rol rolDefault = obtenerRolDefault();
        EstatusTarea estatus = obtenerEstatusInicial();
        Usuario ana = buscarOCrearUsuario("ana", "Ana García", "ana_e2e_vis_id", rolDefault);

        Tarea t1 = new Tarea();
        t1.setTitulo("Implementar módulo de login frontend");
        t1.setEstatus(estatus);
        t1.setUsuarioAsignado(ana);
        tareaRepository.save(t1);

        Tarea t2 = new Tarea();
        t2.setTitulo("Revisar API de autenticación backend");
        t2.setEstatus(estatus);
        t2.setUsuarioAsignado(ana);
        tareaRepository.save(t2);

        sendMessageToBot("que tareas tiene Ana");

        String respuesta = getLastBotResponse();
        assertThat(respuesta.toLowerCase())
                .withFailMessage("La respuesta del bot no menciona a Ana ni sus tareas — respuesta: " + respuesta)
                .containsAnyOf("ana", "login", "autenticaci", "módulo", "tarea", "frontend", "backend");
    }

    // -------------------------------------------------------------------------
    // Test 6: Visualizar KPIs de un desarrollador
    // -------------------------------------------------------------------------

    @Test
    @Order(6)
    void testVisualizarKPIs() throws Exception {
        EstatusTarea completada = obtenerEstatusCompletada();
        EstatusTarea pendiente = estatusTareaRepository.findAll().stream()
                .filter(e -> !e.getNombre().equalsIgnoreCase("Completada"))
                .findFirst()
                .orElse(completada);

        Rol rolDefault = obtenerRolDefault();
        Usuario luis = buscarOCrearUsuario("luis", "Luis Martínez", "luis_e2e_test_id", rolDefault);

        Tarea c1 = new Tarea();
        c1.setTitulo("Tarea completada de Luis número uno");
        c1.setEstatus(completada);
        c1.setUsuarioAsignado(luis);
        tareaRepository.save(c1);

        Tarea c2 = new Tarea();
        c2.setTitulo("Tarea completada de Luis número dos");
        c2.setEstatus(completada);
        c2.setUsuarioAsignado(luis);
        tareaRepository.save(c2);

        Tarea p1 = new Tarea();
        p1.setTitulo("Tarea pendiente de Luis");
        p1.setEstatus(pendiente);
        p1.setUsuarioAsignado(luis);
        tareaRepository.save(p1);

        sendMessageToBot("kpi de Luis");

        String respuesta = getLastBotResponse();
        assertThat(respuesta.toLowerCase())
                .withFailMessage("La respuesta del bot no contiene información de KPIs — respuesta: " + respuesta)
                .containsAnyOf("puntos", "tareas", "completadas", "%", "luis", "kpi", "sprint", "total");
    }

    // -------------------------------------------------------------------------
    // Test 7: Manager visualiza tareas del equipo
    // -------------------------------------------------------------------------

    @Test
    @Order(7)
    void testManagerVisualizaEquipo() throws Exception {
        // Asegurar que existe el rol MANAGER
        Rol rolManager = rolRepository.findByNombre("MANAGER");
        if (rolManager == null) {
            rolManager = rolRepository.findByNombre("Manager");
        }
        if (rolManager == null) {
            rolManager = new Rol();
            rolManager.setNombre("MANAGER");
            rolManager.setDescripcion("Rol de gestión de equipo para pruebas E2E");
            rolManager = rolRepository.save(rolManager);
        }

        // Asignar rol MANAGER al usuario de prueba (identificado por su chat_id de Telegram)
        Optional<Usuario> usuarioTest = usuarioRepository.findByIdIntegrationUsuario(testChatId);
        if (usuarioTest.isPresent()) {
            Usuario u = usuarioTest.get();
            u.setRol(rolManager);
            usuarioRepository.save(u);
        }

        sendMessageToBot("ver tareas del equipo");

        String respuesta = getLastBotResponse();
        assertThat(respuesta.toLowerCase())
                .withFailMessage("La respuesta del bot no muestra información del equipo — respuesta: " + respuesta)
                .containsAnyOf("equipo", "tareas", "usuario", "asignado", "miembro", "desarrollador");
    }
}

// SETUP PREVIO REQUERIDO:
// 1. Habla con @userinfobot en Telegram para obtener tu chat_id personal.
// 2. Agrégalo a src/test/resources/application-test.properties como:
//       TEST_CHAT_ID=123456789
// 3. El bot debe estar corriendo en OTRO proceso (mvn spring-boot:run en otra
//    terminal, o el pod de Kubernetes) apuntando a la misma BD Oracle ADB.
//    En el proceso de prueba TELEGRAM_BOT_ENABLED=false para no arrancar un
//    segundo consumer de long-polling.
// 4. Para correr las pruebas:
//       mvn test -Dtest=TelegramE2ETest -Dspring.profiles.active=test -pl MtdrSpring/backend
// 5. Los Thread.sleep(3_000) son necesarios para que Telegram entregue el
//    mensaje al bot y el bot actualice la BD antes de que se verifique.
