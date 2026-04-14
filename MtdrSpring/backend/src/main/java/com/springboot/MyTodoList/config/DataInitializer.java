package com.springboot.MyTodoList.config;

import com.springboot.MyTodoList.model.*;
import com.springboot.MyTodoList.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Inserta datos de prueba al iniciar la app si la BD está vacía.
 * Usa los mismos servicios que los endpoints REST → IDs generados correctamente.
 * @Order(1) → corre ANTES que el CommandLineRunner de MyTodoListApplication.
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
            System.out.println("\n[DataInitializer] La BD ya tiene datos — saltando inicializacion.\n");
            return;
        }

        System.out.println("\n========== INICIALIZANDO DATOS DE PRUEBA ==========\n");

        // ── ROLES ──────────────────────────────────────────────────────────────
        Rol rolAdmin = rolService.crearRol(new Rol(null, "Admin",     "Control total del sistema"));
        Rol rolDev   = rolService.crearRol(new Rol(null, "Developer", "Gestion de tareas propias"));
        System.out.println("Roles    → Admin(id=" + rolAdmin.getIdRol() + ")  Developer(id=" + rolDev.getIdRol() + ")");

        // ── ESTATUS ────────────────────────────────────────────────────────────
        EstatusTarea estPendiente  = estatusTareaService.crearEstatus(new EstatusTarea(null, "Pendiente",   1L));
        EstatusTarea estProgreso   = estatusTareaService.crearEstatus(new EstatusTarea(null, "En Progreso", 2L));
        EstatusTarea estCompletada = estatusTareaService.crearEstatus(new EstatusTarea(null, "Completada",  3L));
        System.out.println("Estatus  → Pendiente(id=" + estPendiente.getIdEstatus()  +
                           ")  EnProgreso(id=" + estProgreso.getIdEstatus()   +
                           ")  Completada(id=" + estCompletada.getIdEstatus() + ")");

        // ── PRIORIDADES ────────────────────────────────────────────────────────
        PrioridadTarea priBaja  = prioridadTareaService.crearPrioridad(new PrioridadTarea(null, "Baja",  1L));
        PrioridadTarea priMedia = prioridadTareaService.crearPrioridad(new PrioridadTarea(null, "Media", 2L));
        PrioridadTarea priAlta  = prioridadTareaService.crearPrioridad(new PrioridadTarea(null, "Alta",  3L));
        System.out.println("Prioridad→ Baja(id=" + priBaja.getIdPrioridad()  +
                           ")  Media(id=" + priMedia.getIdPrioridad() +
                           ")  Alta(id="  + priAlta.getIdPrioridad()  + ")");

        // ── EQUIPOS ────────────────────────────────────────────────────────────
        Equipo eqAlpha = equipoService.crearEquipo(new Equipo(null, "Equipo Alpha"));
        Equipo eqBeta  = equipoService.crearEquipo(new Equipo(null, "Equipo Beta"));
        Equipo eqGamma = equipoService.crearEquipo(new Equipo(null, "Equipo Gamma"));
        System.out.println("Equipos  → Alpha(id=" + eqAlpha.getIdEquipo() +
                           ")  Beta(id=" + eqBeta.getIdEquipo() +
                           ")  Gamma(id=" + eqGamma.getIdEquipo() + ")");

        // ── USUARIOS ───────────────────────────────────────────────────────────
        Usuario gabriel   = usuario("gabriel.admin",  "Gabriel Administrador", "TG_001", rolAdmin);
        Usuario rutilo    = usuario("rutilo.dev",     "Rutilo Developer",      "TG_002", rolDev);
        Usuario grecia    = usuario("grecia.dev",     "Grecia Developer",      "TG_003", rolDev);
        Usuario eugenio   = usuario("eugenio.dev",    "Eugenio Developer",     "TG_004", rolDev);
        Usuario elian     = usuario("elian.dev",      "Elian Developer",       "TG_005", rolDev);
        Usuario alejandro = usuario("alejandro.dev",  "Alejandro Developer",   "TG_006", rolDev);
        System.out.println("Usuarios → gabriel(id=" + gabriel.getIdUsuario()   +
                           ")  rutilo(id="    + rutilo.getIdUsuario()    +
                           ")  grecia(id="    + grecia.getIdUsuario()    +
                           ")  eugenio(id="   + eugenio.getIdUsuario()   +
                           ")  elian(id="     + elian.getIdUsuario()     +
                           ")  alejandro(id=" + alejandro.getIdUsuario() + ")");

        // ── TAREAS ─────────────────────────────────────────────────────────────
        Tarea tarLogin    = tarea("Implementar login con JWT",
                                  "Crear pantalla de login y endpoint de autenticacion con JWT",
                                  estPendiente, priAlta, gabriel, rutilo, LocalDate.of(2026, 4, 30));

        Tarea tarBD       = tarea("Disenar base de datos",
                                  "Modelar entidades y relaciones en Oracle ADB",
                                  estProgreso, priMedia, gabriel, grecia, LocalDate.of(2026, 4, 25));

        Tarea tarCICD     = tarea("Configurar CI/CD pipeline",
                                  "Pipeline de despliegue automatico en OCI",
                                  estPendiente, priMedia, rutilo, eugenio, LocalDate.of(2026, 5, 10));

        Tarea tarTelegram = tarea("Integrar bot de Telegram",
                                  "Conectar el bot con los endpoints REST de la API",
                                  estProgreso, priAlta, gabriel, elian, LocalDate.of(2026, 5, 5));

        Tarea tarSwagger  = tarea("Documentar API con Swagger",
                                  "Crear documentacion completa de todos los endpoints",
                                  estCompletada, priBaja, rutilo, alejandro, LocalDate.of(2026, 4, 20));

        System.out.println("Tareas   → login(id=" + tarLogin.getIdTarea()    +
                           ")  bd(id="       + tarBD.getIdTarea()       +
                           ")  cicd(id="     + tarCICD.getIdTarea()     +
                           ")  telegram(id=" + tarTelegram.getIdTarea() +
                           ")  swagger(id="  + tarSwagger.getIdTarea()  + ")");

        // ── MIEMBROS DE EQUIPO ─────────────────────────────────────────────────
        miembro(eqAlpha, gabriel);
        miembro(eqAlpha, rutilo);
        miembro(eqAlpha, grecia);
        miembro(eqBeta,  eugenio);
        miembro(eqBeta,  elian);
        miembro(eqGamma, alejandro);
        System.out.println("Miembros → 6 registros");

        // ── COMENTARIOS ────────────────────────────────────────────────────────
        comentario(tarLogin,    rutilo,    "Empece con la estructura base del JWT. Usamos RS256 o HS256?");
        comentario(tarLogin,    gabriel,   "Usamos HS256 con refresh token de 7 dias y access token de 1 hora.");
        comentario(tarBD,       grecia,    "El diagrama ER esta listo. Necesitamos revisar las constraints.");
        comentario(tarTelegram, elian,     "Bot conectado. Falta implementar los comandos /done y /list.");
        comentario(tarCICD,     eugenio,   "Pipeline configurado en GitHub Actions. Falta el deploy a OCI.");
        comentario(tarSwagger,  alejandro, "Documentacion completada y desplegada en /swagger-ui.html.");
        System.out.println("Comentarios → 6 registros");

        // ── EVIDENCIAS ─────────────────────────────────────────────────────────
        evidencia(tarLogin,    rutilo,    "https://storage.oracle.com/evidencias/login-jwt.png",    "Captura del login funcionando con token valido");
        evidencia(tarBD,       grecia,    "https://storage.oracle.com/evidencias/diagrama_er.png",  "Diagrama ER version 2.0 revisado");
        evidencia(tarCICD,     eugenio,   "https://storage.oracle.com/evidencias/pipeline.png",     "Build verde en GitHub Actions");
        evidencia(tarTelegram, elian,     "https://storage.oracle.com/evidencias/bot-demo.mp4",     "Video del bot respondiendo comandos");
        evidencia(tarSwagger,  alejandro, "https://storage.oracle.com/evidencias/swagger-docs.pdf", "PDF exportado de la documentacion Swagger");
        System.out.println("Evidencias → 5 registros");

        // ── LOGS ───────────────────────────────────────────────────────────────
        log(tarLogin,    gabriel,   estPendiente.getIdEstatus(),  estProgreso.getIdEstatus(),   "Tarea iniciada por el equipo");
        log(tarBD,       grecia,    estPendiente.getIdEstatus(),  estProgreso.getIdEstatus(),   "Inicio de diseno de esquema de BD");
        log(tarSwagger,  alejandro, estProgreso.getIdEstatus(),   estCompletada.getIdEstatus(), "Documentacion finalizada y aprobada");
        log(tarCICD,     eugenio,   estPendiente.getIdEstatus(),  estProgreso.getIdEstatus(),   "Pipeline configurado en GitHub Actions");
        log(tarTelegram, elian,     estPendiente.getIdEstatus(),  estProgreso.getIdEstatus(),   "Bot registrado y conectado a los endpoints");
        System.out.println("Logs     → 5 registros");

        // ── RESUMEN DE IDs ─────────────────────────────────────────────────────
        System.out.println("\n========== IDs GENERADOS (usar en Postman) ==========");
        System.out.println("  Rol     Admin=" + rolAdmin.getIdRol()            + "  Developer="  + rolDev.getIdRol());
        System.out.println("  Estatus Pendiente=" + estPendiente.getIdEstatus() + "  EnProgreso=" + estProgreso.getIdEstatus() + "  Completada=" + estCompletada.getIdEstatus());
        System.out.println("  Prioridad Baja="  + priBaja.getIdPrioridad()     + "  Media="      + priMedia.getIdPrioridad()  + "  Alta="       + priAlta.getIdPrioridad());
        System.out.println("  Equipo  Alpha=" + eqAlpha.getIdEquipo()           + "  Beta="       + eqBeta.getIdEquipo()       + "  Gamma="      + eqGamma.getIdEquipo());
        System.out.println("  Usuario gabriel=" + gabriel.getIdUsuario()        + "  rutilo="     + rutilo.getIdUsuario()      + "  grecia="     + grecia.getIdUsuario());
        System.out.println("  Usuario eugenio=" + eugenio.getIdUsuario()        + "  elian="      + elian.getIdUsuario()       + "  alejandro="  + alejandro.getIdUsuario());
        System.out.println("  Tarea   login="   + tarLogin.getIdTarea()         + "  bd="         + tarBD.getIdTarea()         + "  cicd="       + tarCICD.getIdTarea());
        System.out.println("  Tarea   telegram=" + tarTelegram.getIdTarea()     + "  swagger="    + tarSwagger.getIdTarea());
        System.out.println("=====================================================\n");
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

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
