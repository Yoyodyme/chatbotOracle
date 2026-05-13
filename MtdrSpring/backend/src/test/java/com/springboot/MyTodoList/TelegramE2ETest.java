package com.springboot.MyTodoList;

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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
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

    private final RestTemplate restTemplate = new RestTemplate();

    private static Long tareaIdCreada;
    private static Long tareaIdAsignada;

    // -------------------------------------------------------------------------
    // Utilidad: simular mensaje al bot via endpoint interno /test/simulate-message
    // -------------------------------------------------------------------------
    private void sendMessageToBot(String texto) throws Exception {
        String url = "http://localhost:8081/test/simulate-message"
                + "?chatId=" + testChatId
                + "&userId=" + testChatId
                + "&text=" + java.net.URLEncoder.encode(texto, "UTF-8");
        try {
            restTemplate.postForObject(url, null, String.class);
        } catch (Exception e) {
            System.err.println("Error al simular mensaje: " + e.getMessage());
            throw e;
        }
        Thread.sleep(2_000);
    }

    // -------------------------------------------------------------------------
    // Helpers de BD
    // -------------------------------------------------------------------------
    private EstatusTarea obtenerEstatusInicial() {
        return estatusTareaRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay registros en ESTATUS_TAREA"));
    }

    private EstatusTarea obtenerEstatusCompletada() {
        EstatusTarea completada = estatusTareaRepository.findByNombre("Completada");
        assertThat(completada).withFailMessage("No existe estatus 'Completada'").isNotNull();
        return completada;
    }

    private Rol obtenerRolDefault() {
        return rolRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay registros en ROLES"));
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
        long tareasAntes = tareaRepository.count();

        sendMessageToBot("nueva tarea Implementar login prueba automatica 3 puntos Sprint 1");

        List<Tarea> tareas = tareaRepository.findAll();
        Optional<Tarea> tareaLogin = tareas.stream()
                .filter(t -> t.getTitulo() != null &&
                        t.getTitulo().toLowerCase().contains("login prueba"))
                .findFirst();

        assertThat(tareaLogin)
                .withFailMessage("No se encontró la tarea creada en BD. Tareas antes: "
                        + tareasAntes + ", después: " + tareas.size())
                .isPresent();

        tareaIdCreada = tareaLogin.get().getIdTarea();
        System.out.println("✅ Test 1 PASSED — Tarea creada con ID: " + tareaIdCreada);
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

        Optional<Tarea> tareaEliminada = tareaRepository.findById(tareaIdCreada);
        assertThat(tareaEliminada)
                .withFailMessage("La tarea con ID " + tareaIdCreada + " todavía existe en BD")
                .isNotPresent();

        System.out.println("✅ Test 2 PASSED — Tarea " + tareaIdCreada + " eliminada de BD");
    }

    // -------------------------------------------------------------------------
    // Test 3: Asignar tarea a un usuario
    // -------------------------------------------------------------------------
    @Test
    @Order(3)
    void testAsignarTarea() throws Exception {
        Rol rolDefault = obtenerRolDefault();
        buscarOCrearUsuario("ana.test", "Ana García", "ana_e2e_001", rolDefault);

        Tarea tarea = new Tarea();
        tarea.setTitulo("Tarea E2E asignacion automatica");
        tarea.setEstatus(obtenerEstatusInicial());
        tarea = tareaRepository.save(tarea);
        tareaIdAsignada = tarea.getIdTarea();

        sendMessageToBot("asignar tarea " + tareaIdAsignada + " a Ana");

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
    // Test 4: Completar tarea
    // -------------------------------------------------------------------------
    @Test
    @Order(4)
    void testCompletarTarea() throws Exception {
        assertThat(tareaIdAsignada)
                .withFailMessage("tareaIdAsignada es null — ¿falló el Order(3)?")
                .isNotNull();

        sendMessageToBot("completar tarea " + tareaIdAsignada);

        Tarea tareaCompletada = tareaRepository.findById(tareaIdAsignada).orElseThrow();
        assertThat(tareaCompletada.getEstatus()).withFailMessage("Estatus null en BD").isNotNull();
        assertThat(tareaCompletada.getEstatus().getNombre().toLowerCase())
                .withFailMessage("Estatus no es 'completada': "
                        + tareaCompletada.getEstatus().getNombre())
                .contains("complet");

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
                .filter(e -> !e.getNombre().equalsIgnoreCase("Completada"))
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
                        t.getEstatus().getNombre().equalsIgnoreCase("Completada"))
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