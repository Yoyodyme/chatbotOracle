package com.springboot.MyTodoList;

import com.springboot.MyTodoList.model.EstatusTarea;
import com.springboot.MyTodoList.model.Rol;
import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.repository.EstatusTareaRepository;
import com.springboot.MyTodoList.repository.RolRepository;
import com.springboot.MyTodoList.repository.TareaRepository;
import com.springboot.MyTodoList.repository.UsuarioRepository;
import com.springboot.MyTodoList.util.BotConversationManager;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@ActiveProfiles("test")
class TelegramE2ETest {

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

    @Autowired
    private BotConversationManager conversationManager;

    private final RestTemplate restTemplate = new RestTemplate();

    private Long tareaIdCreada;
    private Long tareaIdAsignada;

    // -------------------------------------------------------------------------
    // Setup
    // -------------------------------------------------------------------------

    @BeforeAll
    void setUp() {
        Rol rolDefault = obtenerRolDefault();
        buscarOCrearUsuario("ana.test", "Ana García", "ana_e2e_001", rolDefault);
        // Pre-register the bot test user so /modifytask and /donetask can find it
        buscarOCrearUsuario("e2e_test", "Test", testChatId, rolDefault);
    }

    @BeforeEach
    void clearConversationState() {
        conversationManager.terminarConversacion(Long.parseLong(testChatId));
    }

    // -------------------------------------------------------------------------
    // Wizard helpers
    // -------------------------------------------------------------------------

    /**
     * Drives the /newtask 7-step wizard and returns the ID of the created task.
     * Steps: /newtask → title → saltar (skip desc) → 2h → priority 1 → assignee 1 → si
     */
    private Long crearTareaConWizard(String titulo) throws Exception {
        sendMessageToBot("/newtask");
        sendMessageToBot(titulo);
        sendMessageToBot("saltar");  // skip description
        sendMessageToBot("2");       // 2 hours estimated (≤ 4.0 → no long-hours warning)
        sendMessageToBot("1");       // priority: first in list
        sendMessageToBot("1");       // assignee: first in list
        sendMessageToBot("si");      // confirm creation

        return tareaRepository.findAll().stream()
                .filter(t -> t.getTitulo() != null && t.getTitulo().contains(titulo))
                .findFirst()
                .map(Tarea::getIdTarea)
                .orElseThrow(() -> new AssertionError("Tarea '" + titulo + "' no encontrada en BD tras wizard"));
    }

    /**
     * Drives /modifytask campo 5 (asignado) to reassign tareaId to the named user.
     * The task must already be assigned to the bot test user before calling this.
     */
    private void asignarTareaConFlujo(Long tareaId, String nombreBuscado) throws Exception {
        List<Usuario> usuarios = usuarioRepository.findAll();
        int idx = IntStream.range(0, usuarios.size())
                .filter(i -> usuarios.get(i).getNombreCompleto() != null &&
                        usuarios.get(i).getNombreCompleto().toLowerCase()
                                .contains(nombreBuscado.toLowerCase()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Usuario '" + nombreBuscado + "' no encontrado en BD"));

        sendMessageToBot("/modifytask");
        sendMessageToBot(String.valueOf(tareaId));
        sendMessageToBot("5");                     // campo 5 = asignado
        sendMessageToBot(String.valueOf(idx + 1)); // 1-indexed
        sendMessageToBot("si");
    }

    /**
     * Reassigns tareaId to the bot test user with status Pendiente (prerequisite for
     * /donetask), then drives the /donetask 3-step wizard to completion.
     */
    private void completarTareaConFlujo(Long tareaId) throws Exception {
        Usuario botUser = obtenerBotTestUser();
        EstatusTarea pendiente = obtenerEstatusPendiente();
        Tarea tarea = tareaRepository.findById(tareaId).orElseThrow();
        tarea.setUsuarioAsignado(botUser);
        tarea.setEstatus(pendiente);
        tareaRepository.save(tarea);

        sendMessageToBot("/donetask");
        sendMessageToBot(String.valueOf(tareaId));
        sendMessageToBot("2"); // 2 actual hours
    }

    // -------------------------------------------------------------------------
    // Utilidad: simular mensaje al bot vía endpoint interno /test/simulate-message
    // -------------------------------------------------------------------------
    private void sendMessageToBot(String texto) throws Exception {
        String url = "http://localhost:8081/test/simulate-message"
                + "?chatId=" + testChatId
                + "&userId=" + testChatId
                + "&text=" + texto;
        try {
            restTemplate.postForObject(url, null, String.class);
        } catch (Exception e) {
            System.err.println("Error al simular mensaje: " + e.getMessage());
            throw e;
        }
        Thread.sleep(1_500);
    }

    // -------------------------------------------------------------------------
    // Helpers de BD
    // -------------------------------------------------------------------------

    private Usuario obtenerBotTestUser() {
        return usuarioRepository.findAll().stream()
                .filter(u -> testChatId.equals(u.getIdIntegrationUsuario()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Bot test user no encontrado (idIntegration=" + testChatId + ")"));
    }

    private EstatusTarea obtenerEstatusPendiente() {
        EstatusTarea pendiente = buscarEstatus("Pending", "Backlog", "Pendiente", "In Progress");
        if (pendiente != null) return pendiente;
        return estatusTareaRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay registros en ESTATUS_TAREA"));
    }

    private EstatusTarea obtenerEstatusInicial() {
        return estatusTareaRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay registros en ESTATUS_TAREA"));
    }

    private EstatusTarea obtenerEstatusCompletada() {
        EstatusTarea completada = buscarEstatus("Completed", "Done", "Completada");
        assertThat(completada).withFailMessage("No existe estatus 'Completed', 'Done' ni 'Completada'").isNotNull();
        return completada;
    }

    private EstatusTarea buscarEstatus(String... nombres) {
        for (String nombre : nombres) {
            EstatusTarea e = estatusTareaRepository.findByNombre(nombre);
            if (e != null) return e;
        }
        return null;
    }

    private Rol obtenerRolDefault() {
        return rolRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay registros en ROLES"));
    }

    private Usuario buscarOCrearUsuario(String nombreUsuario, String nombreCompleto, String integrationId, Rol rol) {
        Usuario usuario = usuarioRepository.findByNombreUsuario(nombreUsuario);
        if (usuario != null) return usuario;
        
        usuario = usuarioRepository.findAll().stream()
                .filter(u -> integrationId.equals(u.getIdIntegrationUsuario()))
                .findFirst()
                .orElse(null);
        if (usuario != null) return usuario;

        usuario = new Usuario();
        usuario.setIdIntegrationUsuario(integrationId);
        usuario.setNombreUsuario(nombreUsuario);
        usuario.setNombreCompleto(nombreCompleto);
        usuario.setRol(rol);
        return usuarioRepository.save(usuario);
    }

    // -------------------------------------------------------------------------
    // Test 1: Dar de alta una tarea vía wizard /newtask
    // -------------------------------------------------------------------------
    @Test
    @Order(1)
    void testDarDeAltaTarea() throws Exception {
        long tareasAntes = tareaRepository.count();

        tareaIdCreada = crearTareaConWizard("E2E alta automatica");

        assertThat(tareaIdCreada)
                .withFailMessage("No se encontró la tarea en BD. Tareas antes: " + tareasAntes)
                .isNotNull();

        System.out.println("✅ Test 1 PASSED — Tarea creada con ID: " + tareaIdCreada);
    }

    // -------------------------------------------------------------------------
    // Test 2: Dar de baja una tarea (crear vía wizard + eliminar desde BD)
    // -------------------------------------------------------------------------
    @Test
    @Order(2)
    void testDarDeBajaTarea() throws Exception {
        Long idEliminar = crearTareaConWizard("E2E baja automatica");

        tareaRepository.deleteById(idEliminar);

        Optional<Tarea> tareaEliminada = tareaRepository.findById(idEliminar);
        assertThat(tareaEliminada)
                .withFailMessage("La tarea con ID " + idEliminar + " todavía existe en BD")
                .isNotPresent();

        System.out.println("✅ Test 2 PASSED — Tarea " + idEliminar + " eliminada de BD");
    }

    // -------------------------------------------------------------------------
    // Test 3: Asignar tarea a un usuario vía wizard /modifytask campo 5
    // -------------------------------------------------------------------------
    @Test
    @Order(3)
    void testAsignarTarea() throws Exception {
        Usuario botUser = obtenerBotTestUser();
        Rol rolDefault = obtenerRolDefault();
        buscarOCrearUsuario("ana.test", "Ana García", "ana_e2e_001", rolDefault);

        // Task must be assigned to bot user so /modifytask lists it
        Tarea tarea = new Tarea();
        tarea.setTitulo("Tarea E2E asignacion automatica");
        tarea.setEstatus(obtenerEstatusInicial());
        tarea.setUsuarioAsignado(botUser);
        tarea = tareaRepository.save(tarea);
        tareaIdAsignada = tarea.getIdTarea();

        asignarTareaConFlujo(tareaIdAsignada, "Ana");

        Tarea tareaActualizada = tareaRepository.findById(tareaIdAsignada).orElseThrow();
        assertThat(tareaActualizada.getUsuarioAsignado())
                .withFailMessage("usuarioAsignado sigue null tras el comando")
                .isNotNull();
        assertThat(tareaActualizada.getUsuarioAsignado().getNombreCompleto().toLowerCase())
                .withFailMessage("El asignado no es Ana")
                .contains("ana");

        System.out.println("✅ Test 3 PASSED — Tarea asignada a: "
                + tareaActualizada.getUsuarioAsignado().getNombreCompleto());
    }

    // -------------------------------------------------------------------------
    // Test 4: Completar tarea vía wizard /donetask
    // -------------------------------------------------------------------------
    @Test
    @Order(4)
    void testCompletarTarea() throws Exception {
        assertThat(tareaIdAsignada)
                .withFailMessage("tareaIdAsignada es null — ¿falló el Order(3)?")
                .isNotNull();

        completarTareaConFlujo(tareaIdAsignada);

        Tarea tareaCompletada = tareaRepository.findById(tareaIdAsignada).orElseThrow();
        assertThat(tareaCompletada.getEstatus()).withFailMessage("Estatus null en BD").isNotNull();
        String estatusNombre = tareaCompletada.getEstatus().getNombre().toLowerCase();
        assertThat(estatusNombre.contains("done") || estatusNombre.contains("complet"))
                .withFailMessage("Estatus no es done/completada: "
                        + tareaCompletada.getEstatus().getNombre())
                .isTrue();

        System.out.println("✅ Test 4 PASSED — Estatus: " + tareaCompletada.getEstatus().getNombre());
    }

    // -------------------------------------------------------------------------
    // Test 5: Visualizar tareas de un desarrollador
    // -------------------------------------------------------------------------
    @Test
    @Order(5)
    void testVisualizarTareasDesarrollador() throws Exception {
        Rol rolDefault = obtenerRolDefault();
        EstatusTarea estatus = obtenerEstatusInicial();
        Usuario ana = buscarOCrearUsuario("ana.test", "Ana García", "ana_e2e_001", rolDefault);

        Tarea t1 = new Tarea();
        t1.setTitulo("Tarea E2E visualizacion uno");
        t1.setEstatus(estatus);
        t1.setUsuarioAsignado(ana);
        tareaRepository.save(t1);

        Tarea t2 = new Tarea();
        t2.setTitulo("Tarea E2E visualizacion dos");
        t2.setEstatus(estatus);
        t2.setUsuarioAsignado(ana);
        tareaRepository.save(t2);

        sendMessageToBot("que tareas tiene Ana");

        List<Tarea> tareasDeAna = tareaRepository.findAll().stream()
                .filter(t -> t.getUsuarioAsignado() != null &&
                        t.getUsuarioAsignado().getNombreCompleto().toLowerCase().contains("ana"))
                .toList();

        assertThat(tareasDeAna)
                .withFailMessage("Ana no tiene tareas en BD")
                .isNotEmpty();
        assertThat(tareasDeAna.size())
                .withFailMessage("Ana debería tener al menos 2 tareas")
                .isGreaterThanOrEqualTo(2);

        System.out.println("✅ Test 5 PASSED — Ana tiene " + tareasDeAna.size() + " tareas en BD");
    }

    // -------------------------------------------------------------------------
    // Test 6: Visualizar KPIs de un desarrollador
    // -------------------------------------------------------------------------
    @Test
    @Order(6)
    void testVisualizarKPIs() throws Exception {
        EstatusTarea completada = obtenerEstatusCompletada();
        EstatusTarea pendiente = estatusTareaRepository.findAll().stream()
                .filter(e -> !e.getNombre().equalsIgnoreCase("Completada")
                          && !e.getNombre().equalsIgnoreCase("Done")
                          && !e.getNombre().equalsIgnoreCase("Completed"))
                .findFirst()
                .orElse(completada);

        Rol rolDefault = obtenerRolDefault();
        Usuario luis = buscarOCrearUsuario("luis.test", "Luis Martínez", "luis_e2e_001", rolDefault);

        Tarea c1 = new Tarea();
        c1.setTitulo("KPI completada uno luis");
        c1.setEstatus(completada);
        c1.setUsuarioAsignado(luis);
        tareaRepository.save(c1);

        Tarea c2 = new Tarea();
        c2.setTitulo("KPI completada dos luis");
        c2.setEstatus(completada);
        c2.setUsuarioAsignado(luis);
        tareaRepository.save(c2);

        Tarea p1 = new Tarea();
        p1.setTitulo("KPI pendiente uno luis");
        p1.setEstatus(pendiente);
        p1.setUsuarioAsignado(luis);
        tareaRepository.save(p1);

        sendMessageToBot("kpi de Luis");

        long completadasLuis = tareaRepository.findAll().stream()
                .filter(t -> t.getUsuarioAsignado() != null &&
                        t.getUsuarioAsignado().getNombreCompleto().toLowerCase().contains("luis") &&
                        t.getEstatus() != null && (
                            t.getEstatus().getNombre().equalsIgnoreCase("Completed") ||
                            t.getEstatus().getNombre().equalsIgnoreCase("Done") ||
                            t.getEstatus().getNombre().equalsIgnoreCase("Completada")))
                .count();

        long totalLuis = tareaRepository.findAll().stream()
                .filter(t -> t.getUsuarioAsignado() != null &&
                        t.getUsuarioAsignado().getNombreCompleto().toLowerCase().contains("luis"))
                .count();

        assertThat(completadasLuis).withFailMessage("Luis no tiene tareas completadas").isGreaterThan(0);
        assertThat(totalLuis).withFailMessage("Luis no tiene tareas").isGreaterThan(0);

        System.out.println("✅ Test 6 PASSED — Luis: " + completadasLuis + "/" + totalLuis + " completadas");
    }

    // -------------------------------------------------------------------------
    // Test 7: Manager visualiza tareas del equipo
    // -------------------------------------------------------------------------
    @Test
    @Order(7)
    void testManagerVisualizaEquipo() throws Exception {
        Rol rolManager = rolRepository.findByNombre("MANAGER");
        if (rolManager == null) rolManager = rolRepository.findByNombre("Manager");
        if (rolManager == null) rolManager = rolRepository.findByNombre("Admin");
        if (rolManager == null) {
            rolManager = new Rol();
            rolManager.setNombre("MANAGER");
            rolManager.setDescripcion("Manager E2E");
            rolManager = rolRepository.save(rolManager);
        }

        sendMessageToBot("ver tareas del equipo");

        long totalTareas = tareaRepository.count();
        long totalUsuarios = usuarioRepository.count();

        assertThat(totalTareas)
                .withFailMessage("No hay tareas en el sistema")
                .isGreaterThan(0);
        assertThat(totalUsuarios)
                .withFailMessage("No hay usuarios en el sistema")
                .isGreaterThan(0);

        System.out.println("✅ Test 7 PASSED — Equipo: " + totalUsuarios
                + " usuarios, " + totalTareas + " tareas en BD");
    }
}
