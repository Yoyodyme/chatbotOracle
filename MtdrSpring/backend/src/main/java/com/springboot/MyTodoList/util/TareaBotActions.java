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
 * /newtask, /assignsprint, /donetask, /sprinttable, /kpi, /newsprint,
 * /modifytask, /modifysprint
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

            case 2: // waiting for estimated hours
                procesarHorasEstimadas(estado);
                break;

            case 3: // waiting for confirmation of long hours (yes/cancel)
                procesarConfirmacionHorasLargas(estado);
                break;

            case 4: // waiting for priority selection
                procesarPrioridadNewtask(estado);
                break;

            case 5: // waiting for assignee selection
                procesarAsignadoNewtask(estado);
                break;

            case 6: // waiting for final confirmation
                procesarConfirmacionTarea(estado);
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
            estado.setPaso(3); // saltar a confirmacion de horas largas
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_HOURS_TOO_LONG.getMessage(), telegramClient);
            return;
        }

        estado.setPaso(4);
        enviarSeleccionPrioridad(estado);
    }

    private void procesarConfirmacionHorasLargas(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("yes") || textoMensaje.equalsIgnoreCase("si") || textoMensaje.equalsIgnoreCase("sí")) {
            estado.setPaso(4);
            enviarSeleccionPrioridad(estado);
        } else if (textoMensaje.equalsIgnoreCase("cancel") || textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_CANCELLED.getMessage(), telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, "Reply 'yes' to confirm or 'cancel' to cancel.", telegramClient);
        }
    }

    private void enviarSeleccionPrioridad(ConversationState estado) {
        List<PrioridadTarea> prioridades = prioridadTareaService.obtenerTodasLasPrioridades();
        estado.setDato("listaPrioridades", prioridades);
        StringBuilder sb = new StringBuilder(BotMessages.NEWTASK_PRIORITY.getMessage()).append("\n\n");
        for (int i = 0; i < prioridades.size(); i++) {
            sb.append(i + 1).append(". ").append(prioridades.get(i).getNombre()).append("\n");
        }
        sb.append("\nEnter the priority number:");
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    @SuppressWarnings("unchecked")
    private void procesarPrioridadNewtask(ConversationState estado) {
        int indice;
        try {
            indice = Integer.parseInt(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid priority number. Please try again:", telegramClient);
            return;
        }

        List<PrioridadTarea> prioridades = (List<PrioridadTarea>) estado.getDato("listaPrioridades");
        if (prioridades == null || indice < 1 || indice > prioridades.size()) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose between 1 and " + (prioridades != null ? prioridades.size() : "?") + ":", telegramClient);
            return;
        }

        PrioridadTarea prioridadSeleccionada = prioridades.get(indice - 1);
        estado.setDato("prioridadSeleccionada", prioridadSeleccionada);
        estado.setPaso(5);
        enviarSeleccionAsignado(estado);
    }

    private void enviarSeleccionAsignado(ConversationState estado) {
        List<Usuario> usuarios = usuarioService.obtenerTodosLosUsuarios();
        estado.setDato("listaUsuarios", usuarios);
        StringBuilder sb = new StringBuilder(BotMessages.SELECCIONAR_ASIGNADO.getMessage()).append("\n\n");
        for (int i = 0; i < usuarios.size(); i++) {
            sb.append(i + 1).append(". ").append(usuarios.get(i).getNombreCompleto()).append("\n");
        }
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    @SuppressWarnings("unchecked")
    private void procesarAsignadoNewtask(ConversationState estado) {
        int indice;
        try {
            indice = Integer.parseInt(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid number. Enter the user number:", telegramClient);
            return;
        }

        List<Usuario> usuarios = (List<Usuario>) estado.getDato("listaUsuarios");
        if (usuarios == null || indice < 1 || indice > usuarios.size()) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose between 1 and " + (usuarios != null ? usuarios.size() : "?") + ":", telegramClient);
            return;
        }

        Usuario usuarioAsignado = usuarios.get(indice - 1);
        estado.setDato("usuarioAsignado", usuarioAsignado);
        estado.setPaso(6);

        // Show summary for confirmation
        mostrarConfirmacionNuevaTarea(estado);
    }

    private void mostrarConfirmacionNuevaTarea(ConversationState estado) {
        String titulo = (String) estado.getDato("titulo");
        String descripcion = (String) estado.getDato("descripcion");
        Double horas = (Double) estado.getDato("horasEstimadas");
        PrioridadTarea prioridad = (PrioridadTarea) estado.getDato("prioridadSeleccionada");
        Usuario asignado = (Usuario) estado.getDato("usuarioAsignado");

        String mensajeConfirmacion = String.format(
                BotMessages.TAREA_CONFIRMACION.getMessage(),
                titulo != null ? titulo : "(no title)",
                descripcion != null ? descripcion : "(no description)",
                horas != null ? horas : 0.0,
                prioridad != null ? prioridad.getNombre() : "(no priority)",
                asignado != null ? asignado.getNombreCompleto() : "(no assignee)"
        );
        BotHelper.sendMessageToTelegram(chatId, mensajeConfirmacion, telegramClient);
    }

    private void procesarConfirmacionTarea(ConversationState estado) {
        String texto = textoMensaje.trim().toLowerCase();

        if (texto.equals("yes") || texto.equals("si") || texto.equals("sí")) {
            crearTareaDesdeEstado(estado);
            return;
        }

        if (texto.startsWith("edit ") || texto.startsWith("editar ")) {
            String campo = texto.startsWith("edit ") ? texto.substring(5).trim() : texto.substring(7).trim();
            switch (campo) {
                case "title":
                case "titulo":
                    estado.setPaso(0);
                    BotHelper.sendMessageToTelegram(chatId, "Enter the new title:", telegramClient);
                    break;
                case "description":
                case "descripcion":
                    estado.setPaso(1);
                    BotHelper.sendMessageToTelegram(chatId, "Enter the new description (or 'skip'):", telegramClient);
                    break;
                case "hours":
                case "horas":
                    estado.setPaso(2);
                    BotHelper.sendMessageToTelegram(chatId, "Enter the estimated hours:", telegramClient);
                    break;
                case "priority":
                case "prioridad":
                    estado.setPaso(4);
                    enviarSeleccionPrioridad(estado);
                    break;
                case "assigned":
                case "asignado":
                    estado.setPaso(5);
                    enviarSeleccionAsignado(estado);
                    break;
                default:
                    BotHelper.sendMessageToTelegram(chatId,
                            "Field not recognized. Use: edit title, edit description, edit hours, edit priority, edit assigned",
                            telegramClient);
            }
            return;
        }

        if (texto.equals("cancel") || texto.equals("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_CANCELLED.getMessage(), telegramClient);
            return;
        }

        // Unrecognized response — show summary again
        BotHelper.sendMessageToTelegram(chatId,
                "Reply 'yes' to save, 'edit [field]' to correct, or 'cancel' to cancel.",
                telegramClient);
        mostrarConfirmacionNuevaTarea(estado);
    }

    @SuppressWarnings("unchecked")
    private void crearTareaDesdeEstado(ConversationState estado) {
        Usuario usuarioCreador = obtenerOAutoRegistrarUsuario();
        Usuario usuarioAsignado = (Usuario) estado.getDato("usuarioAsignado");
        PrioridadTarea prioridad = (PrioridadTarea) estado.getDato("prioridadSeleccionada");

        Tarea nuevaTarea = new Tarea();
        nuevaTarea.setTitulo((String) estado.getDato("titulo"));
        nuevaTarea.setDescripcion((String) estado.getDato("descripcion"));
        nuevaTarea.setHorasEstimadas((Double) estado.getDato("horasEstimadas"));
        nuevaTarea.setUsuarioCreador(usuarioCreador);
        nuevaTarea.setUsuarioAsignado(usuarioAsignado != null ? usuarioAsignado : usuarioCreador);
        nuevaTarea.setPrioridad(prioridad);

        EstatusTarea estatusPendiente = estatusTareaService.obtenerEstatusPorNombre("Pendiente");
        if (estatusPendiente != null) {
            nuevaTarea.setEstatus(estatusPendiente);
        } else {
            List<EstatusTarea> todosLosEstatus = estatusTareaService.obtenerTodosLosEstatus();
            if (!todosLosEstatus.isEmpty()) {
                nuevaTarea.setEstatus(todosLosEstatus.get(0));
                logger.warn("Status 'Pendiente' not found; using '{}' as fallback",
                        todosLosEstatus.get(0).getNombre());
            } else {
                logger.warn("No status found in the database; the task will be saved without a status");
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
        if (textoMensaje.equalsIgnoreCase("cancel") || textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operation cancelled.", telegramClient);
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
            BotHelper.sendMessageToTelegram(chatId, "Configuration error: status 'En Progreso' not found.", telegramClient);
            return;
        }
        tarea.setEstatus(estatusEnProgreso);
        Sprint sprint = sprintService.obtenerSprintPorId(idSprint)
                .orElseThrow(() -> new RuntimeException("Sprint not found: " + idSprint));
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
        if (textoMensaje.equalsIgnoreCase("cancel") || textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operation cancelled.", telegramClient);
            return;
        }

        if (estado.getPaso() == 0) {
            // waiting for task ID
            Long idTarea;
            try {
                idTarea = Long.parseLong(textoMensaje.trim());
            } catch (NumberFormatException e) {
                BotHelper.sendMessageToTelegram(chatId, "Invalid ID. Enter the task number:", telegramClient);
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
                        "That task is no longer active (status: " + estatusActual + "). Operation cancelled.",
                        telegramClient);
                return;
            }

            estado.setDato("idTarea", idTarea);
            estado.avanzarPaso();
            BotHelper.sendMessageToTelegram(chatId, BotMessages.DONETASK_HOURS.getMessage(), telegramClient);
            return;
        }

        if (estado.getPaso() == 1) {
            // waiting for actual hours
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
                BotHelper.sendMessageToTelegram(chatId, "Task not found. Operation cancelled.", telegramClient);
                return;
            }

            EstatusTarea estatusCompletada = estatusTareaService.obtenerEstatusPorNombre("Completada");
            if (estatusCompletada == null) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId, "Configuration error: status 'Completada' not found.", telegramClient);
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
                        "You already have an operation in progress. Type 'cancel' to finish it first.",
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
            case 0: // waiting for sprint name
                estado.setDato("nombreSprint", textoMensaje.trim());
                estado.avanzarPaso();
                BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INICIO.getMessage(), telegramClient);
                break;

            case 1: // waiting for start date
                try {
                    LocalDate fechaInicio = LocalDate.parse(textoMensaje.trim(), FORMATO_FECHA_COMPLETO);
                    estado.setDato("fechaInicio", fechaInicio);
                    estado.avanzarPaso();
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_FIN.getMessage(), telegramClient);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                }
                break;

            case 2: // waiting for end date
                try {
                    LocalDate fechaFin = LocalDate.parse(textoMensaje.trim(), FORMATO_FECHA_COMPLETO);
                    LocalDate fechaInicio = (LocalDate) estado.getDato("fechaInicio");

                    if (!fechaFin.isAfter(fechaInicio)) {
                        BotHelper.sendMessageToTelegram(chatId,
                                "The end date must be after the start date. Please try again (dd/MM/yyyy):",
                                telegramClient);
                        break;
                    }

                    estado.setDato("fechaFin", fechaFin);
                    estado.avanzarPaso();

                    // Show summary for confirmation before creating
                    String resumen = String.format(
                            BotMessages.SPRINT_CONFIRMACION.getMessage(),
                            estado.getDato("nombreSprint"),
                            fechaInicio.format(FORMATO_FECHA_COMPLETO),
                            fechaFin.format(FORMATO_FECHA_COMPLETO)
                    );
                    BotHelper.sendMessageToTelegram(chatId, resumen, telegramClient);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                }
                break;

            case 3: // waiting for sprint creation confirmation
                procesarConfirmacionNuevoSprint(estado);
                break;

            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void procesarConfirmacionNuevoSprint(ConversationState estado) {
        String texto = textoMensaje.trim().toLowerCase();
        if (texto.equals("yes") || texto.equals("si") || texto.equals("sí")) {
            // Deactivate previous active sprint if one exists
            Optional<Sprint> sprintPrevioOpt = sprintService.obtenerSprintActivo();
            if (sprintPrevioOpt.isPresent()) {
                Sprint sprintPrevio = sprintPrevioOpt.get();
                sprintPrevio.setActivo(false);
                Sprint resultado = sprintService.actualizarSprint(sprintPrevio.getIdSprint(), sprintPrevio);
                if (resultado == null) {
                    logger.warn("Could not deactivate the previous sprint with ID {}", sprintPrevio.getIdSprint());
                }
            }

            // Create the new sprint
            Sprint nuevoSprint = new Sprint();
            nuevoSprint.setNombre((String) estado.getDato("nombreSprint"));
            nuevoSprint.setFechaInicio((LocalDate) estado.getDato("fechaInicio"));
            nuevoSprint.setFechaFin((LocalDate) estado.getDato("fechaFin"));
            nuevoSprint.setActivo(true);
            sprintService.crearSprint(nuevoSprint);
            conversationManager.terminarConversacion(chatId);

            String mensaje = BotMessages.NEWSPRINT_CREADO.getMessage()
                    .replace("{nombre}", nuevoSprint.getNombre());
            BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
        } else if (texto.equals("no") || texto.equals("cancel") || texto.equals("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_CANCELLED.getMessage(), telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, "Reply 'yes' to create the sprint or 'no' to cancel.", telegramClient);
        }
    }

    // ── /modifytask ───────────────────────────────────────────────────────────

    public void fnModificarTarea() {
        if (exit) return;

        boolean esComandoInicio = textoMensaje.equals(BotCommands.MODIFY_TASK.getCommand());
        boolean tieneConversacionActiva = conversationManager.tieneConversacionActiva(chatId)
                && "modifytask".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!esComandoInicio && !tieneConversacionActiva) return;

        if (esComandoInicio) {
            iniciarFlujoModificarTarea();
            exit = true;
            return;
        }

        ConversationState estado = conversationManager.obtenerEstado(chatId);
        procesarPasoModificarTarea(estado);
        exit = true;
    }

    private void iniciarFlujoModificarTarea() {
        Usuario usuario = obtenerOAutoRegistrarUsuario();
        List<Tarea> todasLasTareas = tareaService.obtenerTareasPorUsuarioAsignado(usuario.getIdUsuario());

        if (todasLasTareas.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, "You have no assigned tasks to modify.", telegramClient);
            return;
        }

        ConversationState estado = new ConversationState("modifytask");
        estado.setDato("idUsuario", usuario.getIdUsuario());
        conversationManager.iniciarConversacion(chatId, estado);

        StringBuilder sb = new StringBuilder("Your tasks:\n\n");
        sb.append(construirListaTareasDetallada(todasLasTareas));
        sb.append("\n").append(BotMessages.SELECCIONAR_TAREA_MODIFICAR.getMessage());
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    private void procesarPasoModificarTarea(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("cancel") || textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operation cancelled.", telegramClient);
            return;
        }

        switch (estado.getPaso()) {
            case 0: // waiting for task ID
                procesarSeleccionTareaModificar(estado);
                break;

            case 1: // waiting for field number to edit
                procesarSeleccionCampo(estado);
                break;

            case 2: // waiting for new field value
                procesarNuevoValorCampo(estado);
                break;

            case 3: // waiting for final confirmation
                procesarConfirmacionModificarTarea(estado);
                break;

            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void procesarSeleccionTareaModificar(ConversationState estado) {
        Long idTarea;
        try {
            idTarea = Long.parseLong(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid ID. Enter the task ID number:", telegramClient);
            return;
        }

        Tarea tarea = tareaService.obtenerTareaPorId(idTarea);
        Long idUsuario = (Long) estado.getDato("idUsuario");

        if (tarea == null || tarea.getUsuarioAsignado() == null
                || !tarea.getUsuarioAsignado().getIdUsuario().equals(idUsuario)) {
            BotHelper.sendMessageToTelegram(chatId, "That task assigned to you was not found. Try a different ID:", telegramClient);
            return;
        }

        estado.setDato("idTarea", idTarea);
        estado.setDato("tareaActual", tarea);
        estado.avanzarPaso();

        String detalle = mostrarDetalleTarea(tarea);
        BotHelper.sendMessageToTelegram(chatId, detalle, telegramClient);
        BotHelper.sendMessageToTelegram(chatId, BotMessages.MODIFICAR_CAMPO.getMessage(), telegramClient);
    }

    private void procesarSeleccionCampo(ConversationState estado) {
        int campo;
        try {
            campo = Integer.parseInt(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid number. " + BotMessages.MODIFICAR_CAMPO.getMessage(), telegramClient);
            return;
        }

        if (campo < 1 || campo > 7) {
            BotHelper.sendMessageToTelegram(chatId, "Choose a number from 1 to 7:\n" + BotMessages.MODIFICAR_CAMPO.getMessage(), telegramClient);
            return;
        }

        estado.setDato("campoSeleccionado", campo);
        estado.avanzarPaso();

        switch (campo) {
            case 1:
                BotHelper.sendMessageToTelegram(chatId, "Enter the new title:", telegramClient);
                break;
            case 2:
                BotHelper.sendMessageToTelegram(chatId, "Enter the new description:", telegramClient);
                break;
            case 3:
                BotHelper.sendMessageToTelegram(chatId, "Enter the new estimated hours (number):", telegramClient);
                break;
            case 4:
                List<PrioridadTarea> prioridades = prioridadTareaService.obtenerTodasLasPrioridades();
                estado.setDato("listaPrioridades", prioridades);
                StringBuilder sbP = new StringBuilder("Select the new priority:\n\n");
                for (int i = 0; i < prioridades.size(); i++) {
                    sbP.append(i + 1).append(". ").append(prioridades.get(i).getNombre()).append("\n");
                }
                BotHelper.sendMessageToTelegram(chatId, sbP.toString(), telegramClient);
                break;
            case 5:
                List<Usuario> usuarios = usuarioService.obtenerTodosLosUsuarios();
                estado.setDato("listaUsuarios", usuarios);
                StringBuilder sbU = new StringBuilder("Select the new assignee:\n\n");
                for (int i = 0; i < usuarios.size(); i++) {
                    sbU.append(i + 1).append(". ").append(usuarios.get(i).getNombreCompleto()).append("\n");
                }
                BotHelper.sendMessageToTelegram(chatId, sbU.toString(), telegramClient);
                break;
            case 6:
                List<Sprint> sprints = sprintService.obtenerTodosLosSprints();
                estado.setDato("listaSprints", sprints);
                StringBuilder sbS = new StringBuilder("Select the new sprint:\n\n");
                for (int i = 0; i < sprints.size(); i++) {
                    Sprint s = sprints.get(i);
                    sbS.append(i + 1).append(". ").append(s.getNombre());
                    if (s.getFechaInicio() != null && s.getFechaFin() != null) {
                        sbS.append(" (").append(s.getFechaInicio().format(FORMATO_FECHA))
                           .append(" - ").append(s.getFechaFin().format(FORMATO_FECHA)).append(")");
                    }
                    if (Boolean.TRUE.equals(s.getActivo())) sbS.append(" [Activo]");
                    sbS.append("\n");
                }
                BotHelper.sendMessageToTelegram(chatId, sbS.toString(), telegramClient);
                break;
            case 7:
                List<EstatusTarea> estatus = estatusTareaService.obtenerTodosLosEstatus();
                estado.setDato("listaEstatus", estatus);
                StringBuilder sbE = new StringBuilder("Select the new status:\n\n");
                for (int i = 0; i < estatus.size(); i++) {
                    sbE.append(i + 1).append(". ").append(estatus.get(i).getNombre()).append("\n");
                }
                BotHelper.sendMessageToTelegram(chatId, sbE.toString(), telegramClient);
                break;
            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    @SuppressWarnings("unchecked")
    private void procesarNuevoValorCampo(ConversationState estado) {
        int campo = (int) estado.getDato("campoSeleccionado");
        Tarea tareaActual = (Tarea) estado.getDato("tareaActual");

        switch (campo) {
            case 1: // title
                String nuevoTitulo = textoMensaje.trim();
                if (nuevoTitulo.isEmpty()) {
                    BotHelper.sendMessageToTelegram(chatId, "The title cannot be empty. Please try again:", telegramClient);
                    return;
                }
                estado.setDato("nuevoTitulo", nuevoTitulo);
                break;

            case 2: // description
                estado.setDato("nuevaDescripcion", textoMensaje.trim());
                break;

            case 3: // estimated hours
                try {
                    double nuevasHoras = Double.parseDouble(textoMensaje.trim().replace(",", "."));
                    estado.setDato("nuevasHoras", nuevasHoras);
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Invalid number. Enter the estimated hours:", telegramClient);
                    return;
                }
                break;

            case 4: // priority
                try {
                    int indicePrioridad = Integer.parseInt(textoMensaje.trim());
                    List<PrioridadTarea> prioridades = (List<PrioridadTarea>) estado.getDato("listaPrioridades");
                    if (prioridades == null || indicePrioridad < 1 || indicePrioridad > prioridades.size()) {
                        BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                        return;
                    }
                    estado.setDato("nuevaPrioridad", prioridades.get(indicePrioridad - 1));
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                    return;
                }
                break;

            case 5: // assignee
                try {
                    int indiceUsuario = Integer.parseInt(textoMensaje.trim());
                    List<Usuario> usuarios = (List<Usuario>) estado.getDato("listaUsuarios");
                    if (usuarios == null || indiceUsuario < 1 || indiceUsuario > usuarios.size()) {
                        BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                        return;
                    }
                    estado.setDato("nuevoAsignado", usuarios.get(indiceUsuario - 1));
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                    return;
                }
                break;

            case 6: // sprint
                try {
                    int indiceSprint = Integer.parseInt(textoMensaje.trim());
                    List<Sprint> sprints = (List<Sprint>) estado.getDato("listaSprints");
                    if (sprints == null || indiceSprint < 1 || indiceSprint > sprints.size()) {
                        BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                        return;
                    }
                    estado.setDato("nuevoSprint", sprints.get(indiceSprint - 1));
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                    return;
                }
                break;

            case 7: // status
                try {
                    int indiceEstatus = Integer.parseInt(textoMensaje.trim());
                    List<EstatusTarea> listaEstatus = (List<EstatusTarea>) estado.getDato("listaEstatus");
                    if (listaEstatus == null || indiceEstatus < 1 || indiceEstatus > listaEstatus.size()) {
                        BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                        return;
                    }
                    estado.setDato("nuevoEstatus", listaEstatus.get(indiceEstatus - 1));
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                    return;
                }
                break;

            default:
                conversationManager.terminarConversacion(chatId);
                return;
        }

        estado.avanzarPaso();
        // Show change summary and ask for confirmation
        String resumen = construirResumenCambio(campo, estado, tareaActual);
        BotHelper.sendMessageToTelegram(chatId, resumen + "\n\nDo you confirm the changes? (yes / no)", telegramClient);
    }

    @SuppressWarnings("unchecked")
    private void procesarConfirmacionModificarTarea(ConversationState estado) {
        String texto = textoMensaje.trim().toLowerCase();

        if (texto.equals("yes") || texto.equals("si") || texto.equals("sí")) {
            Long idTarea = (Long) estado.getDato("idTarea");
            int campo = (int) estado.getDato("campoSeleccionado");

            // Build Tarea object with only the modified field
            Tarea tareaActualizada = new Tarea();

            switch (campo) {
                case 1:
                    tareaActualizada.setTitulo((String) estado.getDato("nuevoTitulo"));
                    break;
                case 2:
                    tareaActualizada.setDescripcion((String) estado.getDato("nuevaDescripcion"));
                    break;
                case 3:
                    tareaActualizada.setHorasEstimadas((Double) estado.getDato("nuevasHoras"));
                    break;
                case 4:
                    tareaActualizada.setPrioridad((PrioridadTarea) estado.getDato("nuevaPrioridad"));
                    break;
                case 5:
                    tareaActualizada.setUsuarioAsignado((Usuario) estado.getDato("nuevoAsignado"));
                    break;
                case 6:
                    tareaActualizada.setSprint((Sprint) estado.getDato("nuevoSprint"));
                    break;
                case 7:
                    tareaActualizada.setEstatus((EstatusTarea) estado.getDato("nuevoEstatus"));
                    break;
                default:
                    conversationManager.terminarConversacion(chatId);
                    return;
            }

            Tarea resultado = tareaService.actualizarTarea(idTarea, tareaActualizada);
            conversationManager.terminarConversacion(chatId);

            if (resultado != null) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.CAMBIOS_GUARDADOS.getMessage(), telegramClient);
            } else {
                BotHelper.sendMessageToTelegram(chatId, "Error saving changes. Please try again.", telegramClient);
            }
        } else if (texto.equals("no")) {
            // Return to field selection
            estado.setPaso(1);
            Tarea tareaActual = (Tarea) estado.getDato("tareaActual");
            BotHelper.sendMessageToTelegram(chatId, mostrarDetalleTarea(tareaActual), telegramClient);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.MODIFICAR_CAMPO.getMessage(), telegramClient);
        } else if (texto.equals("cancel") || texto.equals("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operation cancelled.", telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, "Reply 'yes' to confirm, 'no' to choose another field, or 'cancel'.", telegramClient);
        }
    }

    // ── /modifysprint ─────────────────────────────────────────────────────────

    public void fnModificarSprint() {
        if (exit) return;

        boolean esComandoInicio = textoMensaje.equals(BotCommands.MODIFY_SPRINT.getCommand());
        boolean tieneConversacionActiva = conversationManager.tieneConversacionActiva(chatId)
                && "modifysprint".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!esComandoInicio && !tieneConversacionActiva) return;

        if (esComandoInicio) {
            iniciarFlujoModificarSprint();
            exit = true;
            return;
        }

        ConversationState estado = conversationManager.obtenerEstado(chatId);
        procesarPasoModificarSprint(estado);
        exit = true;
    }

    private void iniciarFlujoModificarSprint() {
        List<Sprint> sprints = sprintService.obtenerTodosLosSprints();

        if (sprints.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, "There are no sprints available to modify.", telegramClient);
            return;
        }

        ConversationState estado = new ConversationState("modifysprint");
        conversationManager.iniciarConversacion(chatId, estado);

        StringBuilder sb = new StringBuilder("Available sprints:\n\n");
        for (Sprint s : sprints) {
            sb.append("ID ").append(s.getIdSprint()).append(" — ").append(s.getNombre());
            if (s.getFechaInicio() != null && s.getFechaFin() != null) {
                sb.append(" (").append(s.getFechaInicio().format(FORMATO_FECHA_COMPLETO))
                  .append(" -> ").append(s.getFechaFin().format(FORMATO_FECHA_COMPLETO)).append(")");
            }
            sb.append(Boolean.TRUE.equals(s.getActivo()) ? " [Active]" : " [Inactive]");
            sb.append("\n");
        }
        sb.append("\nEnter the ID of the sprint you want to modify:");
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    private void procesarPasoModificarSprint(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("cancel") || textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operation cancelled.", telegramClient);
            return;
        }

        switch (estado.getPaso()) {
            case 0: // waiting for sprint ID
                procesarSeleccionSprintModificar(estado);
                break;

            case 1: // waiting for field number to edit
                procesarSeleccionCampoSprint(estado);
                break;

            case 2: // waiting for new value
                procesarNuevoValorSprint(estado);
                break;

            case 3: // waiting for confirmation
                procesarConfirmacionModificarSprint(estado);
                break;

            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void procesarSeleccionSprintModificar(ConversationState estado) {
        Long idSprint;
        try {
            idSprint = Long.parseLong(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid ID. Enter the sprint ID number:", telegramClient);
            return;
        }

        Optional<Sprint> sprintOpt = sprintService.obtenerSprintPorId(idSprint);
        if (sprintOpt.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, "Sprint not found. Enter a valid ID:", telegramClient);
            return;
        }

        Sprint sprint = sprintOpt.get();
        estado.setDato("idSprint", idSprint);
        estado.setDato("sprintActual", sprint);
        estado.avanzarPaso();

        StringBuilder detalle = new StringBuilder("Selected sprint:\n");
        detalle.append("Name: ").append(sprint.getNombre()).append("\n");
        if (sprint.getFechaInicio() != null) {
            detalle.append("Start: ").append(sprint.getFechaInicio().format(FORMATO_FECHA_COMPLETO)).append("\n");
        }
        if (sprint.getFechaFin() != null) {
            detalle.append("End: ").append(sprint.getFechaFin().format(FORMATO_FECHA_COMPLETO)).append("\n");
        }
        detalle.append("Active: ").append(Boolean.TRUE.equals(sprint.getActivo()) ? "Yes" : "No").append("\n\n");
        detalle.append("Which field do you want to edit?\n1. Name\n2. Start date\n3. End date");
        BotHelper.sendMessageToTelegram(chatId, detalle.toString(), telegramClient);
    }

    private void procesarSeleccionCampoSprint(ConversationState estado) {
        int campo;
        try {
            campo = Integer.parseInt(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose 1, 2 or 3:", telegramClient);
            return;
        }

        if (campo < 1 || campo > 3) {
            BotHelper.sendMessageToTelegram(chatId, "Choose a number from 1 to 3:\n1. Name\n2. Start date\n3. End date", telegramClient);
            return;
        }

        estado.setDato("campoSprint", campo);
        estado.avanzarPaso();

        switch (campo) {
            case 1:
                BotHelper.sendMessageToTelegram(chatId, "Enter the new sprint name:", telegramClient);
                break;
            case 2:
                BotHelper.sendMessageToTelegram(chatId, "Enter the new start date (dd/MM/yyyy):", telegramClient);
                break;
            case 3:
                BotHelper.sendMessageToTelegram(chatId, "Enter the new end date (dd/MM/yyyy):", telegramClient);
                break;
            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void procesarNuevoValorSprint(ConversationState estado) {
        int campo = (int) estado.getDato("campoSprint");
        Sprint sprintActual = (Sprint) estado.getDato("sprintActual");

        switch (campo) {
            case 1: // name
                String nuevoNombre = textoMensaje.trim();
                if (nuevoNombre.isEmpty()) {
                    BotHelper.sendMessageToTelegram(chatId, "The name cannot be empty. Please try again:", telegramClient);
                    return;
                }
                estado.setDato("nuevoNombreSprint", nuevoNombre);
                break;

            case 2: // start date
                try {
                    LocalDate nuevaFechaInicio = LocalDate.parse(textoMensaje.trim(), FORMATO_FECHA_COMPLETO);
                    estado.setDato("nuevaFechaInicioSprint", nuevaFechaInicio);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                    return;
                }
                break;

            case 3: // end date
                try {
                    LocalDate nuevaFechaFin = LocalDate.parse(textoMensaje.trim(), FORMATO_FECHA_COMPLETO);
                    // Validate that it is after the current or new start date
                    LocalDate fechaInicioRef = estado.getDato("nuevaFechaInicioSprint") != null
                            ? (LocalDate) estado.getDato("nuevaFechaInicioSprint")
                            : sprintActual.getFechaInicio();
                    if (fechaInicioRef != null && !nuevaFechaFin.isAfter(fechaInicioRef)) {
                        BotHelper.sendMessageToTelegram(chatId,
                                "The end date must be after the start date. Please try again (dd/MM/yyyy):",
                                telegramClient);
                        return;
                    }
                    estado.setDato("nuevaFechaFinSprint", nuevaFechaFin);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                    return;
                }
                break;

            default:
                conversationManager.terminarConversacion(chatId);
                return;
        }

        estado.avanzarPaso();

        // Compute name, fechaInicio, fechaFin for summary (use new value if it was modified)
        String nombreMostrar = estado.getDato("nuevoNombreSprint") != null
                ? (String) estado.getDato("nuevoNombreSprint")
                : sprintActual.getNombre();
        LocalDate inicioMostrar = estado.getDato("nuevaFechaInicioSprint") != null
                ? (LocalDate) estado.getDato("nuevaFechaInicioSprint")
                : sprintActual.getFechaInicio();
        LocalDate finMostrar = estado.getDato("nuevaFechaFinSprint") != null
                ? (LocalDate) estado.getDato("nuevaFechaFinSprint")
                : sprintActual.getFechaFin();

        String resumen = String.format(
                BotMessages.SPRINT_CONFIRMACION.getMessage(),
                nombreMostrar,
                inicioMostrar != null ? inicioMostrar.format(FORMATO_FECHA_COMPLETO) : "—",
                finMostrar != null ? finMostrar.format(FORMATO_FECHA_COMPLETO) : "—"
        );
        BotHelper.sendMessageToTelegram(chatId, resumen, telegramClient);
    }

    private void procesarConfirmacionModificarSprint(ConversationState estado) {
        String texto = textoMensaje.trim().toLowerCase();
        Sprint sprintActual = (Sprint) estado.getDato("sprintActual");
        Long idSprint = (Long) estado.getDato("idSprint");

        if (texto.equals("yes") || texto.equals("si") || texto.equals("sí")) {
            // Build sprint with the fields to update
            Sprint sprintActualizado = new Sprint();
            if (estado.getDato("nuevoNombreSprint") != null) {
                sprintActualizado.setNombre((String) estado.getDato("nuevoNombreSprint"));
            }
            if (estado.getDato("nuevaFechaInicioSprint") != null) {
                sprintActualizado.setFechaInicio((LocalDate) estado.getDato("nuevaFechaInicioSprint"));
            }
            if (estado.getDato("nuevaFechaFinSprint") != null) {
                sprintActualizado.setFechaFin((LocalDate) estado.getDato("nuevaFechaFinSprint"));
            }

            Sprint resultado = sprintService.actualizarSprint(idSprint, sprintActualizado);
            conversationManager.terminarConversacion(chatId);

            if (resultado != null) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.CAMBIOS_GUARDADOS.getMessage(), telegramClient);
            } else {
                BotHelper.sendMessageToTelegram(chatId, "Error saving changes. Please try again.", telegramClient);
            }
        } else if (texto.equals("no") || texto.equals("cancel") || texto.equals("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operation cancelled.", telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, "Reply 'yes' to save changes or 'no' to cancel.", telegramClient);
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
                "Welcome, " + nombreCompleto + "! You have been automatically registered in the system.",
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

    private String construirListaTareasDetallada(List<Tarea> tareas) {
        StringBuilder sb = new StringBuilder();
        for (Tarea t : tareas) {
            sb.append("ID ").append(t.getIdTarea())
              .append(" — ").append(t.getTitulo());
            if (t.getEstatus() != null) {
                sb.append(" [").append(t.getEstatus().getNombre()).append("]");
            }
            if (t.getHorasEstimadas() != null) {
                sb.append(" (").append(t.getHorasEstimadas()).append("h est.)");
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    private String mostrarDetalleTarea(Tarea tarea) {
        StringBuilder sb = new StringBuilder("Task details:\n\n");
        sb.append("ID: ").append(tarea.getIdTarea()).append("\n");
        sb.append("Title: ").append(tarea.getTitulo()).append("\n");
        sb.append("Description: ").append(tarea.getDescripcion() != null ? tarea.getDescripcion() : "(no description)").append("\n");
        sb.append("Estimated hours: ").append(tarea.getHorasEstimadas() != null ? tarea.getHorasEstimadas() + "h" : "—").append("\n");
        sb.append("Actual hours: ").append(tarea.getHorasReales() != null ? tarea.getHorasReales() + "h" : "—").append("\n");
        sb.append("Priority: ").append(tarea.getPrioridad() != null ? tarea.getPrioridad().getNombre() : "—").append("\n");
        sb.append("Status: ").append(tarea.getEstatus() != null ? tarea.getEstatus().getNombre() : "—").append("\n");
        sb.append("Assigned to: ").append(tarea.getUsuarioAsignado() != null ? tarea.getUsuarioAsignado().getNombreCompleto() : "—").append("\n");
        sb.append("Sprint: ").append(tarea.getSprint() != null ? tarea.getSprint().getNombre() : "—").append("\n");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String construirResumenCambio(int campo, ConversationState estado, Tarea tareaActual) {
        StringBuilder sb = new StringBuilder("Proposed change:\n");
        switch (campo) {
            case 1:
                sb.append("Title: ").append(tareaActual.getTitulo())
                  .append(" -> ").append(estado.getDato("nuevoTitulo"));
                break;
            case 2:
                sb.append("Description: ").append(tareaActual.getDescripcion())
                  .append(" -> ").append(estado.getDato("nuevaDescripcion"));
                break;
            case 3:
                sb.append("Estimated hours: ").append(tareaActual.getHorasEstimadas())
                  .append(" -> ").append(estado.getDato("nuevasHoras"));
                break;
            case 4:
                String prioridadAnterior = tareaActual.getPrioridad() != null ? tareaActual.getPrioridad().getNombre() : "—";
                PrioridadTarea nuevaPrioridad = (PrioridadTarea) estado.getDato("nuevaPrioridad");
                sb.append("Priority: ").append(prioridadAnterior)
                  .append(" -> ").append(nuevaPrioridad != null ? nuevaPrioridad.getNombre() : "—");
                break;
            case 5:
                String asignadoAnterior = tareaActual.getUsuarioAsignado() != null
                        ? tareaActual.getUsuarioAsignado().getNombreCompleto() : "—";
                Usuario nuevoAsignado = (Usuario) estado.getDato("nuevoAsignado");
                sb.append("Assigned to: ").append(asignadoAnterior)
                  .append(" -> ").append(nuevoAsignado != null ? nuevoAsignado.getNombreCompleto() : "—");
                break;
            case 6:
                String sprintAnterior = tareaActual.getSprint() != null ? tareaActual.getSprint().getNombre() : "—";
                Sprint nuevoSprint = (Sprint) estado.getDato("nuevoSprint");
                sb.append("Sprint: ").append(sprintAnterior)
                  .append(" -> ").append(nuevoSprint != null ? nuevoSprint.getNombre() : "—");
                break;
            case 7:
                String estatusAnterior = tareaActual.getEstatus() != null ? tareaActual.getEstatus().getNombre() : "—";
                EstatusTarea nuevoEstatus = (EstatusTarea) estado.getDato("nuevoEstatus");
                sb.append("Status: ").append(estatusAnterior)
                  .append(" -> ").append(nuevoEstatus != null ? nuevoEstatus.getNombre() : "—");
                break;
            default:
                sb.append("(unknown field)");
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
        sb.append("Total tasks: ").append(tareas.size()).append("\n\n");

        sb.append(String.format("%-6s %-20s %-12s %-12s %5s %5s\n",
                "ID", "Title", "Dev", "Status", "HEst", "HReal"));
        sb.append("-".repeat(65)).append("\n");

        for (Tarea t : tareas) {
            String dev = t.getUsuarioAsignado() != null
                    ? truncar(t.getUsuarioAsignado().getNombreCompleto(), 12)
                    : "Unassigned";
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
        // Group by developer: [total, completed, totalEstHours, totalRealHours]
        Map<String, double[]> kpiPorDev = new LinkedHashMap<>();

        for (Tarea t : tareas) {
            String dev = t.getUsuarioAsignado() != null
                    ? t.getUsuarioAsignado().getNombreCompleto() : "Unassigned";
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
            sb.append("  Total tasks      : ").append((int) m[0]).append("\n");
            sb.append("  Completed        : ").append((int) m[1]).append("\n");
            sb.append("  Estimated hours  : ").append(m[2]).append("h\n");
            sb.append("  Actual hours     : ").append(m[3]).append("h\n");
            if (m[3] > 0) {
                sb.append("  Efficiency       : ").append(String.format("%.0f%%", eficiencia))
                  .append(eficiencia <= 100 ? " (under budget)" : " (over budget)").append("\n");
            }
            sb.append("\n");
        }

        long completadasTotal = tareas.stream()
                .filter(t -> t.getEstatus() != null && "Completada".equalsIgnoreCase(t.getEstatus().getNombre()))
                .count();
        sb.append("TOTAL SPRINT: ").append(completadasTotal).append("/").append(tareas.size())
          .append(" tasks completed");

        return sb.toString();
    }

    private String truncar(String texto, int maxLen) {
        if (texto == null) return "—";
        return texto.length() <= maxLen ? texto : texto.substring(0, maxLen - 1) + ".";
    }
}
