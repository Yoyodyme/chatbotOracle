package com.springboot.MyTodoList.util;

import com.springboot.MyTodoList.model.EstatusTarea;
import com.springboot.MyTodoList.model.PrioridadTarea;
import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.service.EstatusTareaService;
import com.springboot.MyTodoList.service.PrioridadTareaService;
import com.springboot.MyTodoList.service.SprintService;
import com.springboot.MyTodoList.service.TareaService;
import com.springboot.MyTodoList.service.UsuarioService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Handles all new Telegram bot commands related to the Tarea (task) domain:
 * /newtask, /assignsprint, /donetask, /sprinttable, /kpi
 *
 * Instantiated per incoming message. Uses BotConversationManager (Spring bean)
 * for multi-step conversation state.
 */
public class TareaBotActions {

    private static final Logger logger = LoggerFactory.getLogger(TareaBotActions.class);
    private static final double MAX_HORAS_RECOMENDADAS = 4.0;
    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yy");
    private static final DateTimeFormatter FORMATO_FECHA_COMPLETO = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final TelegramClient telegramClient;
    private final TareaService tareaService;
    private final SprintService sprintService;
    private final UsuarioService usuarioService;
    private final EstatusTareaService estatusTareaService;
    private final PrioridadTareaService prioridadTareaService;
    private final BotConversationManager conversationManager;

    private String textoMensaje;
    private long chatId;
    private String telegramUserId;  // Telegram user ID as String (for Usuario.idIntegrationUsuario)
    private String telegramFirstName;
    private String telegramLastName;
    private String telegramUsername;
    boolean exit;

    public TareaBotActions(TelegramClient telegramClient,
                           TareaService tareaService,
                           SprintService sprintService,
                           UsuarioService usuarioService,
                           EstatusTareaService estatusTareaService,
                           PrioridadTareaService prioridadTareaService,
                           BotConversationManager conversationManager) {
        this.telegramClient = telegramClient;
        this.tareaService = tareaService;
        this.sprintService = sprintService;
        this.usuarioService = usuarioService;
        this.estatusTareaService = estatusTareaService;
        this.prioridadTareaService = prioridadTareaService;
        this.conversationManager = conversationManager;
        this.exit = false;
    }

    public void setTextoMensaje(String texto) { this.textoMensaje = texto; }
    public void setChatId(long chatId) { this.chatId = chatId; }
    public void setTelegramUserId(String telegramUserId) { this.telegramUserId = telegramUserId; }
    public void setTelegramFirstName(String telegramFirstName) { this.telegramFirstName = telegramFirstName; }
    public void setTelegramLastName(String telegramLastName) { this.telegramLastName = telegramLastName; }
    public void setTelegramUsername(String telegramUsername) { this.telegramUsername = telegramUsername; }
    public boolean isExit() { return exit; }

    // ── /newtask ─────────────────────────────────────────────────────────────

    public void fnNuevatarea() {
        if (exit) return;

        boolean esComandoInicio = textoMensaje.equals(BotCommands.NEW_TASK.getCommand());
        boolean tieneConversacionNewtask = conversationManager.tieneConversacionActiva(chatId)
                && "newtask".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!esComandoInicio && !tieneConversacionNewtask) return;

        if (esComandoInicio) {
            ConversationState estado = new ConversationState("newtask");
            conversationManager.iniciarConversacion(chatId, estado);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_TITLE.getMessage(), telegramClient);
            exit = true;
            return;
        }

        // Conversation already active — handle current step
        ConversationState estado = conversationManager.obtenerEstado(chatId);
        procesarPasoNewtask(estado);
        exit = true;
    }

    private void procesarPasoNewtask(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_CANCELLED.getMessage(), telegramClient);
            return;
        }

        switch (estado.getPaso()) {
            case 0: // waiting for title
                estado.setDato("titulo", textoMensaje.trim());
                estado.avanzarPaso();
                BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_DESC.getMessage(), telegramClient);
                break;

            case 1: // waiting for description
                String descripcion = textoMensaje.equalsIgnoreCase("saltar") ? null : textoMensaje.trim();
                estado.setDato("descripcion", descripcion);
                estado.avanzarPaso();
                BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_HOURS.getMessage(), telegramClient);
                break;

            case 2: // waiting for hours
                procesarHorasEstimadas(estado);
                break;

            case 3: // waiting for hours-too-long confirmation (si/cancelar)
                procesarConfirmacionHorasLargas(estado);
                break;

            case 4: // waiting for priority selection
                procesarPrioridadYCrearTarea(estado);
                break;

            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void procesarHorasEstimadas(ConversationState estado) {
        double horas;
        try {
            horas = Double.parseDouble(textoMensaje.trim().replace(",", "."));
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_HOURS_INVALID.getMessage(), telegramClient);
            return;
        }

        estado.setDato("horasEstimadas", horas);

        if (horas > MAX_HORAS_RECOMENDADAS) {
            estado.setPaso(3); // jump to confirmation step
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_HOURS_TOO_LONG.getMessage(), telegramClient);
            return;
        }

        estado.setPaso(4);
        enviarSeleccionPrioridad();
    }

    private void procesarConfirmacionHorasLargas(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("si") || textoMensaje.equalsIgnoreCase("sí")) {
            estado.setPaso(4);
            enviarSeleccionPrioridad();
        } else if (textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_CANCELLED.getMessage(), telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, "Responde 'si' para confirmar o 'cancelar' para cancelar.", telegramClient);
        }
    }

    private void enviarSeleccionPrioridad() {
        List<PrioridadTarea> prioridades = prioridadTareaService.obtenerTodasLasPrioridades();
        StringBuilder sb = new StringBuilder(BotMessages.NEWTASK_PRIORITY.getMessage()).append("\n\n");
        for (PrioridadTarea p : prioridades) {
            sb.append(p.getIdPrioridad()).append(". ").append(p.getNombre()).append("\n");
        }
        sb.append("\nEscribe el numero de la prioridad:");
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    private void procesarPrioridadYCrearTarea(ConversationState estado) {
        Long idPrioridad;
        try {
            idPrioridad = Long.parseLong(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Numero de prioridad invalido. Intenta de nuevo:", telegramClient);
            return;
        }

        Usuario usuario = obtenerOAutoRegistrarUsuario();

        Tarea nuevaTarea = new Tarea();
        nuevaTarea.setTitulo((String) estado.getDato("titulo"));
        nuevaTarea.setDescripcion((String) estado.getDato("descripcion"));
        nuevaTarea.setHorasEstimadas((Double) estado.getDato("horasEstimadas"));
        nuevaTarea.setUsuarioCreador(usuario);
        nuevaTarea.setUsuarioAsignado(usuario);

        PrioridadTarea prioridad = new PrioridadTarea();
        prioridad.setIdPrioridad(idPrioridad);
        nuevaTarea.setPrioridad(prioridad);

        EstatusTarea estatusPendiente = estatusTareaService.obtenerEstatusPorNombre("Pendiente");
        if (estatusPendiente != null) {
            nuevaTarea.setEstatus(estatusPendiente);
        } else {
            // Fallback: usar el primer estatus disponible para que la tarea sea visible en el tablero
            List<EstatusTarea> todosLosEstatus = estatusTareaService.obtenerTodosLosEstatus();
            if (!todosLosEstatus.isEmpty()) {
                nuevaTarea.setEstatus(todosLosEstatus.get(0));
                logger.warn("Estatus 'Pendiente' no encontrado; usando '{}' como fallback",
                        todosLosEstatus.get(0).getNombre());
            } else {
                logger.warn("No se encontro ningun estatus en la BD; la tarea se guardara sin estatus");
            }
        }

        Tarea tareaCreada = tareaService.crearTarea(nuevaTarea);
        conversationManager.terminarConversacion(chatId);

        String mensaje = BotMessages.NEWTASK_CREATED.getMessage()
                .replace("{id}", String.valueOf(tareaCreada.getIdTarea()))
                .replace("{titulo}", tareaCreada.getTitulo())
                .replace("{horas}", String.valueOf(tareaCreada.getHorasEstimadas()));
        BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
    }

    // ── /assignsprint ─────────────────────────────────────────────────────────

    public void fnAsignarSprint() {
        if (exit) return;

        boolean esComandoInicio = textoMensaje.equals(BotCommands.ASSIGN_SPRINT.getCommand());
        boolean tieneConversacionActiva = conversationManager.tieneConversacionActiva(chatId)
                && "assignsprint".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!esComandoInicio && !tieneConversacionActiva) return;

        if (esComandoInicio) {
            iniciarFlujoAsignarSprint();
            exit = true;
            return;
        }

        ConversationState estado = conversationManager.obtenerEstado(chatId);
        procesarPasoAsignarSprint(estado);
        exit = true;
    }

    private void iniciarFlujoAsignarSprint() {
        Optional<Sprint> sprintOpt = sprintService.obtenerSprintActivo();
        if (sprintOpt.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_NO_SPRINT.getMessage(), telegramClient);
            return;
        }

        Usuario usuarioSprint = obtenerOAutoRegistrarUsuario();

        List<Tarea> tareasPendientes = tareaService.obtenerTareasPorEstatusYUsuario("Pendiente", usuarioSprint.getIdUsuario());
        if (tareasPendientes.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_NO_TASKS.getMessage(), telegramClient);
            return;
        }

        ConversationState estado = new ConversationState("assignsprint");
        estado.setDato("idSprint", sprintOpt.get().getIdSprint());
        estado.setDato("idUsuario", usuarioSprint.getIdUsuario());
        conversationManager.iniciarConversacion(chatId, estado);

        String listaTareas = construirListaTareas(tareasPendientes);
        String mensaje = BotMessages.ASSIGNSPRINT_SELECT.getMessage().replace("{lista}", listaTareas);
        BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
    }

    private void procesarPasoAsignarSprint(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operacion cancelada.", telegramClient);
            return;
        }

        Long idTarea;
        try {
            idTarea = Long.parseLong(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_INVALID_ID.getMessage(), telegramClient);
            return;
        }

        Tarea tarea = tareaService.obtenerTareaPorId(idTarea);
        Long idUsuario = (Long) estado.getDato("idUsuario");
        Long idSprint = (Long) estado.getDato("idSprint");

        if (tarea == null || tarea.getUsuarioAsignado() == null
                || !tarea.getUsuarioAsignado().getIdUsuario().equals(idUsuario)) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_NOT_FOUND.getMessage(), telegramClient);
            return;
        }

        EstatusTarea estatusEnProgreso = estatusTareaService.obtenerEstatusPorNombre("En Progreso");
        if (estatusEnProgreso == null) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Error de configuracion: estatus 'En Progreso' no encontrado.", telegramClient);
            return;
        }
        tarea.setEstatus(estatusEnProgreso);
        Sprint sprint = sprintService.obtenerSprintPorId(idSprint)
                .orElseThrow(() -> new RuntimeException("Sprint no encontrado: " + idSprint));
        tarea.setSprint(sprint);
        tareaService.actualizarTarea(idTarea, tarea);
        conversationManager.terminarConversacion(chatId);

        String mensaje = BotMessages.ASSIGNSPRINT_DONE.getMessage()
                .replace("{id}", String.valueOf(idTarea));
        BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
    }

    // ── /donetask ─────────────────────────────────────────────────────────────

    public void fnCompletarTarea() {
        if (exit) return;

        boolean esComandoInicio = textoMensaje.equals(BotCommands.DONE_TASK.getCommand());
        boolean tieneConversacionActiva = conversationManager.tieneConversacionActiva(chatId)
                && "donetask".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!esComandoInicio && !tieneConversacionActiva) return;

        if (esComandoInicio) {
            iniciarFlujoCompletarTarea();
            exit = true;
            return;
        }

        ConversationState estado = conversationManager.obtenerEstado(chatId);
        procesarPasoCompletarTarea(estado);
        exit = true;
    }

    private void iniciarFlujoCompletarTarea() {
        Usuario usuarioDone = obtenerOAutoRegistrarUsuario();

        List<Tarea> tareasActivas = tareaService.obtenerTareasActivasPorUsuario(usuarioDone.getIdUsuario());
        if (tareasActivas.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.DONETASK_NO_TASKS.getMessage(), telegramClient);
            return;
        }

        ConversationState estado = new ConversationState("donetask");
        estado.setDato("idUsuario", usuarioDone.getIdUsuario());
        conversationManager.iniciarConversacion(chatId, estado);

        String listaTareas = construirListaTareas(tareasActivas);
        String mensaje = BotMessages.DONETASK_SELECT.getMessage().replace("{lista}", listaTareas);
        BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
    }

    private void procesarPasoCompletarTarea(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operacion cancelada.", telegramClient);
            return;
        }

        if (estado.getPaso() == 0) {
            // waiting for task ID
            Long idTarea;
            try {
                idTarea = Long.parseLong(textoMensaje.trim());
            } catch (NumberFormatException e) {
                BotHelper.sendMessageToTelegram(chatId, "ID invalido. Escribe el numero de la tarea:", telegramClient);
                return;
            }

            Tarea tarea = tareaService.obtenerTareaPorId(idTarea);
            Long idUsuario = (Long) estado.getDato("idUsuario");

            if (tarea == null || tarea.getUsuarioAsignado() == null
                    || !tarea.getUsuarioAsignado().getIdUsuario().equals(idUsuario)) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_NOT_FOUND.getMessage(), telegramClient);
                return;
            }

            String estatusActual = tarea.getEstatus() != null ? tarea.getEstatus().getNombre() : "";
            if (!estatusActual.equals("Pendiente") && !estatusActual.equals("En Progreso")) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId,
                        "Esa tarea ya no esta activa (estatus: " + estatusActual + "). Operacion cancelada.",
                        telegramClient);
                return;
            }

            estado.setDato("idTarea", idTarea);
            estado.avanzarPaso();
            BotHelper.sendMessageToTelegram(chatId, BotMessages.DONETASK_HOURS.getMessage(), telegramClient);
            return;
        }

        if (estado.getPaso() == 1) {
            // waiting for real hours
            double horasReales;
            try {
                horasReales = Double.parseDouble(textoMensaje.trim().replace(",", "."));
            } catch (NumberFormatException e) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.DONETASK_HOURS_INVALID.getMessage(), telegramClient);
                return;
            }

            Long idTarea = (Long) estado.getDato("idTarea");
            Tarea tarea = tareaService.obtenerTareaPorId(idTarea);
            if (tarea == null) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId, "Tarea no encontrada. Operacion cancelada.", telegramClient);
                return;
            }

            EstatusTarea estatusCompletada = estatusTareaService.obtenerEstatusPorNombre("Completada");
            if (estatusCompletada == null) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId, "Error de configuracion: estatus 'Completada' no encontrado.", telegramClient);
                return;
            }
            tarea.setEstatus(estatusCompletada);
            tarea.setHorasReales(horasReales);
            tareaService.actualizarTarea(idTarea, tarea);
            conversationManager.terminarConversacion(chatId);

            String mensaje = BotMessages.DONETASK_DONE.getMessage()
                    .replace("{id}", String.valueOf(idTarea))
                    .replace("{horas}", String.valueOf(horasReales));
            BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
        }
    }

    // ── /sprinttable ──────────────────────────────────────────────────────────

    public void fnTablaSprint() {
        if (exit) return;
        if (!textoMensaje.equals(BotCommands.SPRINT_TABLE.getCommand())) return;

        Optional<Sprint> sprintOpt = sprintService.obtenerSprintActivo();
        if (sprintOpt.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.SPRINTTABLE_NO_SPRINT.getMessage(), telegramClient);
            exit = true;
            return;
        }

        Sprint sprint = sprintOpt.get();
        List<Tarea> tareas = tareaService.obtenerTareasPorSprint(sprint.getIdSprint());

        if (tareas.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.SPRINTTABLE_EMPTY.getMessage(), telegramClient);
            exit = true;
            return;
        }

        String tabla = construirTablaSprint(sprint, tareas);
        BotHelper.sendMessageToTelegram(chatId, tabla, telegramClient);
        exit = true;
    }

    // ── /kpi ──────────────────────────────────────────────────────────────────

    public void fnKpi() {
        if (exit) return;
        if (!textoMensaje.equals(BotCommands.KPI.getCommand())) return;

        Optional<Sprint> sprintOpt = sprintService.obtenerSprintActivo();
        if (sprintOpt.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.KPI_NO_SPRINT.getMessage(), telegramClient);
            exit = true;
            return;
        }

        Sprint sprint = sprintOpt.get();
        List<Tarea> tareas = tareaService.obtenerTareasPorSprint(sprint.getIdSprint());

        if (tareas.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.KPI_EMPTY.getMessage(), telegramClient);
            exit = true;
            return;
        }

        String reporte = construirReporteKpi(sprint, tareas);
        BotHelper.sendMessageToTelegram(chatId, reporte, telegramClient);
        exit = true;
    }

    // ── /newsprint ────────────────────────────────────────────────────────────

    public void fnNuevoSprint() {
        if (exit) return;

        boolean esComandoInicio = textoMensaje.equals(BotCommands.NEW_SPRINT.getCommand());
        boolean tieneConversacionActiva = conversationManager.tieneConversacionActiva(chatId)
                && "newsprint".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!esComandoInicio && !tieneConversacionActiva) return;

        if (esComandoInicio) {
            if (conversationManager.tieneConversacionActiva(chatId)) {
                BotHelper.sendMessageToTelegram(chatId,
                        "Ya tienes una operacion en curso. Escribe 'cancelar' para terminarla primero.",
                        telegramClient);
                exit = true;
                return;
            }
            ConversationState estado = new ConversationState("newsprint");
            conversationManager.iniciarConversacion(chatId, estado);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_NOMBRE.getMessage(), telegramClient);
            exit = true;
            return;
        }

        ConversationState estado = conversationManager.obtenerEstado(chatId);
        procesarPasoNuevoSprint(estado);
        exit = true;
    }

    private void procesarPasoNuevoSprint(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_CANCELLED.getMessage(), telegramClient);
            return;
        }

        switch (estado.getPaso()) {
            case 0: // esperando nombre del sprint
                estado.setDato("nombreSprint", textoMensaje.trim());
                estado.avanzarPaso();
                BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INICIO.getMessage(), telegramClient);
                break;

            case 1: // esperando fecha de inicio
                try {
                    LocalDate fechaInicio = LocalDate.parse(textoMensaje.trim(),
                            FORMATO_FECHA_COMPLETO);
                    estado.setDato("fechaInicio", fechaInicio);
                    estado.avanzarPaso();
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_FIN.getMessage(), telegramClient);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                }
                break;

            case 2: // esperando fecha de fin
                try {
                    LocalDate fechaFin = LocalDate.parse(textoMensaje.trim(),
                            FORMATO_FECHA_COMPLETO);
                    LocalDate fechaInicio = (LocalDate) estado.getDato("fechaInicio");

                    if (!fechaFin.isAfter(fechaInicio)) {
                        BotHelper.sendMessageToTelegram(chatId,
                                "La fecha de fin debe ser posterior a la fecha de inicio. Intenta de nuevo (dd/MM/yyyy):",
                                telegramClient);
                        break;
                    }

                    // Desactivar sprint activo anterior si existe
                    Optional<Sprint> sprintPrevioOpt = sprintService.obtenerSprintActivo();
                    if (sprintPrevioOpt.isPresent()) {
                        Sprint sprintPrevio = sprintPrevioOpt.get();
                        sprintPrevio.setActivo(false);
                        Sprint resultado = sprintService.actualizarSprint(sprintPrevio.getIdSprint(), sprintPrevio);
                        if (resultado == null) {
                            logger.warn("No se pudo desactivar el sprint anterior con ID {}", sprintPrevio.getIdSprint());
                        }
                    }

                    // Crear el nuevo sprint
                    Sprint nuevoSprint = new Sprint();
                    nuevoSprint.setNombre((String) estado.getDato("nombreSprint"));
                    nuevoSprint.setFechaInicio(fechaInicio);
                    nuevoSprint.setFechaFin(fechaFin);
                    nuevoSprint.setActivo(true);
                    sprintService.crearSprint(nuevoSprint);

                    conversationManager.terminarConversacion(chatId);

                    String mensaje = BotMessages.NEWSPRINT_CREADO.getMessage()
                            .replace("{nombre}", nuevoSprint.getNombre());
                    BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                }
                break;

            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Usuario obtenerOAutoRegistrarUsuario() {
        Optional<Usuario> usuarioOpt = usuarioService.buscarPorTelegramId(telegramUserId);
        if (usuarioOpt.isPresent()) {
            return usuarioOpt.get();
        }

        String nombreUsuario = (telegramUsername != null && !telegramUsername.isEmpty())
                ? telegramUsername
                : "user_" + telegramUserId;

        String nombreCompleto;
        if (telegramFirstName != null && !telegramFirstName.isEmpty()) {
            nombreCompleto = telegramLastName != null && !telegramLastName.isEmpty()
                    ? telegramFirstName + " " + telegramLastName
                    : telegramFirstName;
        } else {
            nombreCompleto = nombreUsuario;
        }

        Usuario nuevo = usuarioService.autoRegistrarUsuario(telegramUserId, nombreUsuario, nombreCompleto);
        BotHelper.sendMessageToTelegram(chatId,
                "Bienvenido, " + nombreCompleto + "! Te hemos registrado automaticamente en el sistema.",
                telegramClient);
        return nuevo;
    }

    private String construirListaTareas(List<Tarea> tareas) {
        StringBuilder sb = new StringBuilder();
        for (Tarea t : tareas) {
            sb.append("ID ").append(t.getIdTarea())
              .append(" — ").append(t.getTitulo());
            if (t.getHorasEstimadas() != null) {
                sb.append(" (").append(t.getHorasEstimadas()).append("h est.)");
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    private String construirTablaSprint(Sprint sprint, List<Tarea> tareas) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== SPRINT: ").append(sprint.getNombre()).append(" ===\n");
        if (sprint.getFechaInicio() != null && sprint.getFechaFin() != null) {
            sb.append(sprint.getFechaInicio().format(FORMATO_FECHA))
              .append(" - ").append(sprint.getFechaFin().format(FORMATO_FECHA)).append("\n");
        }
        sb.append("Total tareas: ").append(tareas.size()).append("\n\n");

        sb.append(String.format("%-6s %-20s %-12s %-12s %5s %5s\n",
                "ID", "Titulo", "Dev", "Estatus", "HEst", "HReal"));
        sb.append("-".repeat(65)).append("\n");

        for (Tarea t : tareas) {
            String dev = t.getUsuarioAsignado() != null
                    ? truncar(t.getUsuarioAsignado().getNombreCompleto(), 12)
                    : "Sin asignar";
            String estatus = t.getEstatus() != null ? truncar(t.getEstatus().getNombre(), 12) : "—";
            String hEst = t.getHorasEstimadas() != null ? t.getHorasEstimadas() + "h" : "—";
            String hReal = t.getHorasReales() != null ? t.getHorasReales() + "h" : "—";
            String titulo = truncar(t.getTitulo(), 20);

            sb.append(String.format("%-6s %-20s %-12s %-12s %5s %5s\n",
                    t.getIdTarea(), titulo, dev, estatus, hEst, hReal));
        }
        return sb.toString();
    }

    private String construirReporteKpi(Sprint sprint, List<Tarea> tareas) {
        // Agrupa por desarrollador: [total, completadas, horasEstTotal, horasRealTotal]
        Map<String, double[]> kpiPorDev = new LinkedHashMap<>();

        for (Tarea t : tareas) {
            String dev = t.getUsuarioAsignado() != null
                    ? t.getUsuarioAsignado().getNombreCompleto() : "Sin asignar";
            kpiPorDev.putIfAbsent(dev, new double[]{0, 0, 0, 0});
            double[] metricas = kpiPorDev.get(dev);
            metricas[0]++;
            boolean completada = t.getEstatus() != null
                    && "Completada".equalsIgnoreCase(t.getEstatus().getNombre());
            if (completada) metricas[1]++;
            if (t.getHorasEstimadas() != null) metricas[2] += t.getHorasEstimadas();
            if (t.getHorasReales() != null) metricas[3] += t.getHorasReales();
        }

        StringBuilder sb = new StringBuilder();
        sb.append("=== KPI — ").append(sprint.getNombre()).append(" ===\n\n");

        for (Map.Entry<String, double[]> entrada : kpiPorDev.entrySet()) {
            double[] m = entrada.getValue();
            double eficiencia = m[2] > 0 ? (m[3] / m[2]) * 100 : 0;
            sb.append("Developer: ").append(entrada.getKey()).append("\n");
            sb.append("  Tareas total     : ").append((int) m[0]).append("\n");
            sb.append("  Completadas      : ").append((int) m[1]).append("\n");
            sb.append("  Horas estimadas  : ").append(m[2]).append("h\n");
            sb.append("  Horas reales     : ").append(m[3]).append("h\n");
            if (m[3] > 0) {
                sb.append("  Eficiencia       : ").append(String.format("%.0f%%", eficiencia))
                  .append(eficiencia <= 100 ? " (bajo presupuesto)" : " (sobre presupuesto)").append("\n");
            }
            sb.append("\n");
        }

        long completadasTotal = tareas.stream()
                .filter(t -> t.getEstatus() != null && "Completada".equalsIgnoreCase(t.getEstatus().getNombre()))
                .count();
        sb.append("TOTAL SPRINT: ").append(completadasTotal).append("/").append(tareas.size())
          .append(" tareas completadas");

        return sb.toString();
    }

    private String truncar(String texto, int maxLen) {
        if (texto == null) return "—";
        return texto.length() <= maxLen ? texto : texto.substring(0, maxLen - 1) + ".";
    }
}
