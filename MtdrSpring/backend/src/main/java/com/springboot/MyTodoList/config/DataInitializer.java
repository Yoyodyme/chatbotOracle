package com.springboot.MyTodoList.config;

import com.springboot.MyTodoList.model.*;
import com.springboot.MyTodoList.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Seeds test data on application startup if the database is empty.
 * Uses the same services as the REST endpoints so IDs are generated correctly.
 * @Order(1) → runs BEFORE the CommandLineRunner in MyTodoListApplication.
 */
@Component
@Order(1)
public class DataInitializer implements CommandLineRunner {

    @Autowired private RolService rolService;
    @Autowired private EstatusTareaService estatusTareaService;
    @Autowired private PrioridadTareaService prioridadTareaService;
    @Autowired private EquipoService equipoService;
    @Autowired private UsuarioService usuarioService;
    @Autowired private TareaService tareaService;
    @Autowired private MiembroEquipoService miembroEquipoService;
    @Autowired private ComentarioTareaService comentarioTareaService;
    @Autowired private EvidenciaTareaService evidenciaTareaService;
    @Autowired private LogTareaService logTareaService;

    @Override
    public void run(String... args) throws Exception {

        if (!rolService.obtenerTodosLosRoles().isEmpty()) {
            System.out.println("\n[DataInitializer] Database already has data — skipping initialization.\n");
            return;
        }

        System.out.println("\n========== INITIALIZING TEST DATA ==========\n");

        // ── ROLES ──────────────────────────────────────────────────────────────
        Rol rolAdmin = rolService.crearRol(new Rol(null, "Admin",     "Full system control"));
        Rol rolDev   = rolService.crearRol(new Rol(null, "Developer", "Own task management"));
        System.out.println("Roles    -> Admin(id=" + rolAdmin.getIdRol() + ")  Developer(id=" + rolDev.getIdRol() + ")");

        // ── STATUSES ───────────────────────────────────────────────────────────
        EstatusTarea estPendiente  = estatusTareaService.crearEstatus(new EstatusTarea(null, "Pending",     1L));
        EstatusTarea estProgreso   = estatusTareaService.crearEstatus(new EstatusTarea(null, "In Progress", 2L));
        EstatusTarea estCompletada = estatusTareaService.crearEstatus(new EstatusTarea(null, "Completed",   3L));
        System.out.println("Statuses -> Pending(id=" + estPendiente.getIdEstatus()  +
                           ")  InProgress(id=" + estProgreso.getIdEstatus()   +
                           ")  Completed(id=" + estCompletada.getIdEstatus() + ")");

        // ── PRIORITIES ────────────────────────────────────────────────────────
        PrioridadTarea priBaja  = prioridadTareaService.crearPrioridad(new PrioridadTarea(null, "Low",    1L));
        PrioridadTarea priMedia = prioridadTareaService.crearPrioridad(new PrioridadTarea(null, "Medium", 2L));
        PrioridadTarea priAlta  = prioridadTareaService.crearPrioridad(new PrioridadTarea(null, "High",   3L));
        System.out.println("Priority -> Low(id=" + priBaja.getIdPrioridad()  +
                           ")  Medium(id=" + priMedia.getIdPrioridad() +
                           ")  High(id="  + priAlta.getIdPrioridad()  + ")");

        // ── TEAMS ─────────────────────────────────────────────────────────────
        Equipo eqAlpha = equipoService.crearEquipo(new Equipo(null, "Team Alpha"));
        Equipo eqBeta  = equipoService.crearEquipo(new Equipo(null, "Team Beta"));
        Equipo eqGamma = equipoService.crearEquipo(new Equipo(null, "Team Gamma"));
        System.out.println("Teams    -> Alpha(id=" + eqAlpha.getIdEquipo() +
                           ")  Beta(id=" + eqBeta.getIdEquipo() +
                           ")  Gamma(id=" + eqGamma.getIdEquipo() + ")");

        // ── USERS ─────────────────────────────────────────────────────────────
        Usuario gabriel   = usuario("gabriel.admin",  "Gabriel Administrador", "TG_001", rolAdmin);
        Usuario rutilo    = usuario("rutilo.dev",     "Rutilo Developer",      "TG_002", rolDev);
        Usuario grecia    = usuario("grecia.dev",     "Grecia Developer",      "TG_003", rolDev);
        Usuario eugenio   = usuario("eugenio.dev",    "Eugenio Developer",     "TG_004", rolDev);
        Usuario elian     = usuario("elian.dev",      "Elian Developer",       "TG_005", rolDev);
        Usuario alejandro = usuario("alejandro.dev",  "Alejandro Developer",   "TG_006", rolDev);
        System.out.println("Users    -> gabriel(id=" + gabriel.getIdUsuario()   +
                           ")  rutilo(id="    + rutilo.getIdUsuario()    +
                           ")  grecia(id="    + grecia.getIdUsuario()    +
                           ")  eugenio(id="   + eugenio.getIdUsuario()   +
                           ")  elian(id="     + elian.getIdUsuario()     +
                           ")  alejandro(id=" + alejandro.getIdUsuario() + ")");

        // ── TASKS ──────────────────────────────────────────────────────────────
        Tarea tarLogin    = tarea("Implement JWT login",
                                  "Create the login screen and authentication endpoint with JWT",
                                  estPendiente, priAlta, gabriel, rutilo, LocalDate.of(2026, 4, 30));

        Tarea tarBD       = tarea("Design database",
                                  "Model entities and relationships in Oracle ADB",
                                  estProgreso, priMedia, gabriel, grecia, LocalDate.of(2026, 4, 25));

        Tarea tarCICD     = tarea("Configure CI/CD pipeline",
                                  "Automated deployment pipeline on OCI",
                                  estPendiente, priMedia, rutilo, eugenio, LocalDate.of(2026, 5, 10));

        Tarea tarTelegram = tarea("Integrate Telegram bot",
                                  "Connect the bot to the REST API endpoints",
                                  estProgreso, priAlta, gabriel, elian, LocalDate.of(2026, 5, 5));

        Tarea tarSwagger  = tarea("Document API with Swagger",
                                  "Create complete documentation for all endpoints",
                                  estCompletada, priBaja, rutilo, alejandro, LocalDate.of(2026, 4, 20));

        System.out.println("Tasks    -> login(id=" + tarLogin.getIdTarea()    +
                           ")  bd(id="       + tarBD.getIdTarea()       +
                           ")  cicd(id="     + tarCICD.getIdTarea()     +
                           ")  telegram(id=" + tarTelegram.getIdTarea() +
                           ")  swagger(id="  + tarSwagger.getIdTarea()  + ")");

        // ── TEAM MEMBERS ──────────────────────────────────────────────────────
        miembro(eqAlpha, gabriel);
        miembro(eqAlpha, rutilo);
        miembro(eqAlpha, grecia);
        miembro(eqBeta,  eugenio);
        miembro(eqBeta,  elian);
        miembro(eqGamma, alejandro);
        System.out.println("Members  -> 6 records");

        // ── COMMENTS ──────────────────────────────────────────────────────────
        comentario(tarLogin,    rutilo,    "I started with the base JWT structure. Do we use RS256 or HS256?");
        comentario(tarLogin,    gabriel,   "We use HS256 with a 7-day refresh token and a 1-hour access token.");
        comentario(tarBD,       grecia,    "The ER diagram is ready. We need to review the constraints.");
        comentario(tarTelegram, elian,     "Bot connected. Still need to implement /done and /list commands.");
        comentario(tarCICD,     eugenio,   "Pipeline configured in GitHub Actions. OCI deploy still pending.");
        comentario(tarSwagger,  alejandro, "Documentation completed and deployed at /swagger-ui.html.");
        System.out.println("Comments -> 6 records");

        // ── EVIDENCE ──────────────────────────────────────────────────────────
        evidencia(tarLogin,    rutilo,    "https://storage.oracle.com/evidencias/login-jwt.png",    "Screenshot of the login working with a valid token");
        evidencia(tarBD,       grecia,    "https://storage.oracle.com/evidencias/diagrama_er.png",  "ER diagram version 2.0 reviewed");
        evidencia(tarCICD,     eugenio,   "https://storage.oracle.com/evidencias/pipeline.png",     "Green build in GitHub Actions");
        evidencia(tarTelegram, elian,     "https://storage.oracle.com/evidencias/bot-demo.mp4",     "Video of the bot responding to commands");
        evidencia(tarSwagger,  alejandro, "https://storage.oracle.com/evidencias/swagger-docs.pdf", "PDF exported from the Swagger documentation");
        System.out.println("Evidence -> 5 records");

        // ── LOGS ───────────────────────────────────────────────────────────────
        log(tarLogin,    gabriel,   estPendiente.getIdEstatus(),  estProgreso.getIdEstatus(),   "Task started by the team");
        log(tarBD,       grecia,    estPendiente.getIdEstatus(),  estProgreso.getIdEstatus(),   "Database schema design started");
        log(tarSwagger,  alejandro, estProgreso.getIdEstatus(),   estCompletada.getIdEstatus(), "Documentation finalized and approved");
        log(tarCICD,     eugenio,   estPendiente.getIdEstatus(),  estProgreso.getIdEstatus(),   "Pipeline configured in GitHub Actions");
        log(tarTelegram, elian,     estPendiente.getIdEstatus(),  estProgreso.getIdEstatus(),   "Bot registered and connected to endpoints");
        System.out.println("Logs     -> 5 records");

        // ── GENERATED IDs SUMMARY ─────────────────────────────────────────────
        System.out.println("\n========== GENERATED IDs (use in Postman) ==========");
        System.out.println("  Role     Admin=" + rolAdmin.getIdRol()            + "  Developer="  + rolDev.getIdRol());
        System.out.println("  Status   Pending=" + estPendiente.getIdEstatus()  + "  InProgress=" + estProgreso.getIdEstatus() + "  Completed=" + estCompletada.getIdEstatus());
        System.out.println("  Priority Low="   + priBaja.getIdPrioridad()       + "  Medium="     + priMedia.getIdPrioridad()  + "  High="      + priAlta.getIdPrioridad());
        System.out.println("  Team     Alpha=" + eqAlpha.getIdEquipo()           + "  Beta="       + eqBeta.getIdEquipo()       + "  Gamma="     + eqGamma.getIdEquipo());
        System.out.println("  User     gabriel=" + gabriel.getIdUsuario()        + "  rutilo="     + rutilo.getIdUsuario()      + "  grecia="    + grecia.getIdUsuario());
        System.out.println("  User     eugenio=" + eugenio.getIdUsuario()        + "  elian="      + elian.getIdUsuario()       + "  alejandro=" + alejandro.getIdUsuario());
        System.out.println("  Task     login="   + tarLogin.getIdTarea()         + "  bd="         + tarBD.getIdTarea()         + "  cicd="      + tarCICD.getIdTarea());
        System.out.println("  Task     telegram=" + tarTelegram.getIdTarea()     + "  swagger="    + tarSwagger.getIdTarea());
        System.out.println("=====================================================\n");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Usuario usuario(String username, String nombre, String tgId, Rol rol) {
        Usuario u = new Usuario();
        u.setNombreUsuario(username);
        u.setNombreCompleto(nombre);
        u.setIdIntegrationUsuario(tgId);
        u.setRol(rol);
        return usuarioService.crearUsuario(u);
    }

    private Tarea tarea(String titulo, String desc, EstatusTarea estatus, PrioridadTarea prioridad,
                        Usuario creador, Usuario asignado, LocalDate fechaVenc) {
        Tarea t = new Tarea();
        t.setTitulo(titulo);
        t.setDescripcion(desc);
        t.setEstatus(estatus);
        t.setPrioridad(prioridad);
        t.setUsuarioCreador(creador);
        t.setUsuarioAsignado(asignado);
        t.setFechaVencimiento(fechaVenc);
        return tareaService.crearTarea(t);
    }

    private void miembro(Equipo equipo, Usuario usuario) {
        MiembroEquipo m = new MiembroEquipo();
        m.setEquipo(equipo);
        m.setUsuario(usuario);
        miembroEquipoService.crearMiembroEquipo(m);
    }

    private void comentario(Tarea tarea, Usuario autor, String cuerpo) {
        ComentarioTarea c = new ComentarioTarea();
        c.setTarea(tarea);
        c.setUsuarioAutor(autor);
        c.setCuerpo(cuerpo);
        comentarioTareaService.crearComentario(c);
    }

    private void evidencia(Tarea tarea, Usuario usuario, String url, String nota) {
        EvidenciaTarea e = new EvidenciaTarea();
        e.setTarea(tarea);
        e.setUsuarioSubio(usuario);
        e.setUrlArchivo(url);
        e.setNota(nota);
        evidenciaTareaService.crearEvidencia(e);
    }

    private void log(Tarea tarea, Usuario usuario, Long origen, Long destino, String mensaje) {
        LogTarea l = new LogTarea();
        l.setTarea(tarea);
        l.setUsuario(usuario);
        l.setIdEstatusOrigen(origen);
        l.setIdEstatuDestino(destino);
        l.setMensaje(mensaje);
        logTareaService.crearLog(l);
    }
}
