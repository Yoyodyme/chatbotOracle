package com.springboot.MyTodoList.util;

import com.springboot.MyTodoList.agent.ParsedIntent;
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
import java.util.stream.Collectors;

/**
 * Handles all Telegram bot commands related to the Tarea (task) domain:
 * /newtask, /assignsprint, /donetask, /sprinttable, /kpi, /newsprint,
 * /modifytask, /modifysprint
 *
 * Instantiated per incoming message. Uses BotConversationManager (Spring bean)
 * for multi-step conversation state.
 */
public class TareaBotActions {

    private static final Logger logger = LoggerFactory.getLogger(TareaBotActions.class);
    private static final double MAX_RECOMMENDED_HOURS = 4.0;
    private static final DateTimeFormatter DATE_FORMAT_SHORT = DateTimeFormatter.ofPattern("dd/MM/yy");
    private static final DateTimeFormatter DATE_FORMAT_FULL = DateTimeFormatter.ofPattern("dd/MM/yyyy");

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
        this.textoMensaje = "";
        this.exit = false;
    }

    public void setTextoMensaje(String texto) { this.textoMensaje = texto; }
    public void setChatId(long chatId) { this.chatId = chatId; }
    public void setTelegramUserId(String telegramUserId) { this.telegramUserId = telegramUserId; }
    public void setTelegramFirstName(String telegramFirstName) { this.telegramFirstName = telegramFirstName; }
    public void setTelegramLastName(String telegramLastName) { this.telegramLastName = telegramLastName; }
    public void setTelegramUsername(String telegramUsername) { this.telegramUsername = telegramUsername; }
    public boolean isExit() { return exit; }

    // ── /newtask — slot-aware entry point ────────────────────────────────────

    /**
     * Starts the newtask wizard, pre-populating slots from the parsed intent if available.
     * When intent is null, behaves like a plain /newtask command.
     */
    public void startNewtask(ParsedIntent intent) {
        if (exit) return;
        if (conversationManager.tieneConversacionActiva(chatId)) {
            BotHelper.sendMessageToTelegram(chatId,
                    "You already have an operation in progress. Type 'cancel' to finish it first.",
                    telegramClient);
            exit = true;
            return;
        }

        ConversationState state = new ConversationState("newtask");
        int startStep = 0;

        if (intent != null) {
            // Pre-fill title — if provided, skip step 0 (title prompt).
            String title = intent.getTitle();
            if (title != null && !title.isBlank()) {
                state.setDato("titulo", title.trim());
                startStep = 1;
            }

            // Pre-fill estimated hours.
            Double hours = intent.getEstimatedHours();
            if (hours != null) {
                state.setDato("horasEstimadas", hours);
            }

            // Try to resolve assignee by fuzzy name match.
            String assigneeName = intent.getAssigneeName();
            if (assigneeName != null && !assigneeName.isBlank()) {
                List<Usuario> users = usuarioService.obtenerTodosLosUsuarios();
                users.stream()
                        .filter(u -> u.getNombreCompleto() != null
                                && u.getNombreCompleto().toLowerCase()
                                        .contains(assigneeName.toLowerCase()))
                        .findFirst()
                        .ifPresent(u -> state.setDato("usuarioAsignado", u));
            }

            // Try to resolve priority by fuzzy name match.
            String priorityName = intent.getPriority();
            if (priorityName != null && !priorityName.isBlank()) {
                List<PrioridadTarea> priorities = prioridadTareaService.obtenerTodasLasPrioridades();
                priorities.stream()
                        .filter(p -> p.getNombre() != null
                                && p.getNombre().toLowerCase()
                                        .contains(priorityName.toLowerCase()))
                        .findFirst()
                        .ifPresent(p -> state.setDato("prioridadSeleccionada", p));
            }
        }

        state.setPaso(startStep);
        conversationManager.iniciarConversacion(chatId, state);

        if (startStep == 0) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_TITLE.getMessage(), telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_DESC.getMessage(), telegramClient);
        }
        exit = true;
    }

    /**
     * Starts the assign-sprint wizard. Delegates slot pre-filling to the flow starter.
     * When intent is null, behaves like a plain /assignsprint command.
     */
    public void startAssignSprint(ParsedIntent intent) {
        if (exit) return;
        if (conversationManager.tieneConversacionActiva(chatId)) {
            BotHelper.sendMessageToTelegram(chatId,
                    "You already have an operation in progress. Type 'cancel' to finish it first.",
                    telegramClient);
            exit = true;
            return;
        }
        startAssignSprintFlow();
        exit = true;
    }

    /**
     * Starts the complete-task wizard.
     * When intent is null, behaves like a plain /donetask command.
     */
    public void startCompleteTask(ParsedIntent intent) {
        if (exit) return;
        if (conversationManager.tieneConversacionActiva(chatId)) {
            BotHelper.sendMessageToTelegram(chatId,
                    "You already have an operation in progress. Type 'cancel' to finish it first.",
                    telegramClient);
            exit = true;
            return;
        }
        startCompleteTaskFlow();
        exit = true;
    }

    /**
     * Starts the new-sprint wizard.
     * When intent is null, behaves like a plain /newsprint command.
     */
    public void startNewSprint(ParsedIntent intent) {
        if (exit) return;
        if (conversationManager.tieneConversacionActiva(chatId)) {
            BotHelper.sendMessageToTelegram(chatId,
                    "You already have an operation in progress. Type 'cancel' to finish it first.",
                    telegramClient);
            exit = true;
            return;
        }
        ConversationState state = new ConversationState("newsprint");
        conversationManager.iniciarConversacion(chatId, state);
        BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_NOMBRE.getMessage(), telegramClient);
        exit = true;
    }

    /**
     * Starts the modify-task wizard.
     * When intent is null, behaves like a plain /modifytask command.
     */
    public void startModifyTask(ParsedIntent intent) {
        if (exit) return;
        if (conversationManager.tieneConversacionActiva(chatId)) {
            BotHelper.sendMessageToTelegram(chatId,
                    "You already have an operation in progress. Type 'cancel' to finish it first.",
                    telegramClient);
            exit = true;
            return;
        }
        startModifyTaskFlow();
        exit = true;
    }

    /**
     * Starts the modify-sprint wizard.
     * When intent is null, behaves like a plain /modifysprint command.
     */
    public void startModifySprint(ParsedIntent intent) {
        if (exit) return;
        if (conversationManager.tieneConversacionActiva(chatId)) {
            BotHelper.sendMessageToTelegram(chatId,
                    "You already have an operation in progress. Type 'cancel' to finish it first.",
                    telegramClient);
            exit = true;
            return;
        }
        startModifySprintFlow();
        exit = true;
    }

    // ── /newtask — legacy entry point (delegates to startNewtask) ────────────

    public void fnNuevatarea() {
        if (exit) return;

        boolean isStartCommand = textoMensaje.equals(BotCommands.NEW_TASK.getCommand());
        boolean hasActiveConversation = conversationManager.tieneConversacionActiva(chatId)
                && "newtask".equals(conversationManager.obtenerEstado(chatId).getComando());

        logger.info("[fnNuevatarea] chatId={} isStartCommand={} hasActiveConversation={}",
                chatId, isStartCommand, hasActiveConversation);

        if (!isStartCommand && !hasActiveConversation) return;

        if (isStartCommand) {
            startNewtask(null);
            return;
        }

        // Wizard already active — handle the current step.
        ConversationState state = conversationManager.obtenerEstado(chatId);
        processNewtaskStep(state);
        exit = true;
    }

    private void processNewtaskStep(ConversationState state) {
        if (textoMensaje.equalsIgnoreCase("cancel")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_CANCELLED.getMessage(), telegramClient);
            return;
        }

        switch (state.getPaso()) {
            case 0: // waiting for title
                state.setDato("titulo", textoMensaje.trim());
                state.avanzarPaso();
                BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_DESC.getMessage(), telegramClient);
                break;

            case 1: // waiting for description
                String description = textoMensaje.equalsIgnoreCase("skip") ? null : textoMensaje.trim();
                state.setDato("descripcion", description);
                state.avanzarPaso();
                // If hours are already pre-filled by intent, cascade through pre-filled steps.
                if (state.getDato("horasEstimadas") != null) {
                    advanceFromStep4(state);
                } else {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_HOURS.getMessage(), telegramClient);
                }
                break;

            case 2: // waiting for estimated hours
                processEstimatedHours(state);
                break;

            case 3: // waiting for confirmation of long hours (yes / cancel)
                processLongHoursConfirmation(state);
                break;

            case 4: // waiting for priority selection
                // If priority is already pre-filled by intent, skip to step 5.
                if (state.getDato("prioridadSeleccionada") != null) {
                    state.setPaso(5);
                    sendAssigneeSelection(state);
                } else {
                    processPrioritySelection(state);
                }
                break;

            case 5: // waiting for assignee selection
                // If assignee is already pre-filled by intent, skip to step 6.
                if (state.getDato("usuarioAsignado") != null) {
                    state.setPaso(6);
                    showNewTaskConfirmation(state);
                } else {
                    processAssigneeSelection(state);
                }
                break;

            case 6: // waiting for final confirmation
                processTaskConfirmation(state);
                break;

            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void processEstimatedHours(ConversationState state) {
        double hours;
        try {
            hours = Double.parseDouble(textoMensaje.trim().replace(",", "."));
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_HOURS_INVALID.getMessage(), telegramClient);
            return;
        }

        state.setDato("horasEstimadas", hours);

        if (hours > MAX_RECOMMENDED_HOURS) {
            state.setPaso(3); // jump to long-hours confirmation
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_HOURS_TOO_LONG.getMessage(), telegramClient);
            return;
        }

        advanceFromStep4(state);
    }

    private void processLongHoursConfirmation(ConversationState state) {
        if (textoMensaje.equalsIgnoreCase("yes")) {
            state.setPaso(4);
            sendPrioritySelection(state);
        } else if (textoMensaje.equalsIgnoreCase("cancel")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_CANCELLED.getMessage(), telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, "Reply 'yes' to confirm or 'cancel' to cancel.", telegramClient);
        }
    }

    /**
     * Advances the newtask wizard from step 4 (priority), cascading over any
     * steps whose slots were already pre-filled by the parsed intent.
     * Called after hours are confirmed so that the wizard never prompts for
     * information the LLM already extracted.
     */
    private void advanceFromStep4(ConversationState state) {
        if (state.getDato("prioridadSeleccionada") == null) {
            state.setPaso(4);
            sendPrioritySelection(state);
        } else if (state.getDato("usuarioAsignado") == null) {
            state.setPaso(5);
            sendAssigneeSelection(state);
        } else {
            state.setPaso(6);
            showNewTaskConfirmation(state);
        }
    }

    private void sendPrioritySelection(ConversationState state) {
        List<PrioridadTarea> priorities = prioridadTareaService.obtenerTodasLasPrioridades();
        state.setDato("listaPrioridades", priorities);
        StringBuilder sb = new StringBuilder(BotMessages.NEWTASK_PRIORITY.getMessage()).append("\n\n");
        for (int i = 0; i < priorities.size(); i++) {
            sb.append(i + 1).append(". ").append(priorities.get(i).getNombre()).append("\n");
        }
        sb.append("\nEnter the priority number:");
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    @SuppressWarnings("unchecked")
    private void processPrioritySelection(ConversationState state) {
        int index;
        try {
            index = Integer.parseInt(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid priority number. Please try again:", telegramClient);
            return;
        }

        List<PrioridadTarea> priorities = (List<PrioridadTarea>) state.getDato("listaPrioridades");
        if (priorities == null || index < 1 || index > priorities.size()) {
            BotHelper.sendMessageToTelegram(chatId,
                    "Invalid number. Choose between 1 and " + (priorities != null ? priorities.size() : "?") + ":",
                    telegramClient);
            return;
        }

        state.setDato("prioridadSeleccionada", priorities.get(index - 1));
        state.setPaso(5);
        sendAssigneeSelection(state);
    }

    private void sendAssigneeSelection(ConversationState state) {
        List<Usuario> users = usuarioService.obtenerTodosLosUsuarios();
        state.setDato("listaUsuarios", users);
        StringBuilder sb = new StringBuilder(BotMessages.SELECCIONAR_ASIGNADO.getMessage()).append("\n\n");
        for (int i = 0; i < users.size(); i++) {
            sb.append(i + 1).append(". ").append(users.get(i).getNombreCompleto()).append("\n");
        }
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    @SuppressWarnings("unchecked")
    private void processAssigneeSelection(ConversationState state) {
        int index;
        try {
            index = Integer.parseInt(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid number. Enter the user number:", telegramClient);
            return;
        }

        List<Usuario> users = (List<Usuario>) state.getDato("listaUsuarios");
        if (users == null || index < 1 || index > users.size()) {
            BotHelper.sendMessageToTelegram(chatId,
                    "Invalid number. Choose between 1 and " + (users != null ? users.size() : "?") + ":",
                    telegramClient);
            return;
        }

        state.setDato("usuarioAsignado", users.get(index - 1));
        state.setPaso(6);
        showNewTaskConfirmation(state);
    }

    private void showNewTaskConfirmation(ConversationState state) {
        String title       = (String)        state.getDato("titulo");
        String description = (String)        state.getDato("descripcion");
        Double hours       = (Double)        state.getDato("horasEstimadas");
        PrioridadTarea priority = (PrioridadTarea) state.getDato("prioridadSeleccionada");
        Usuario assignee   = (Usuario)       state.getDato("usuarioAsignado");

        String confirmationMsg = String.format(
                BotMessages.TAREA_CONFIRMACION.getMessage(),
                title       != null ? title       : "(no title)",
                description != null ? description : "(no description)",
                hours       != null ? hours       : 0.0,
                priority    != null ? priority.getNombre()         : "(no priority)",
                assignee    != null ? assignee.getNombreCompleto() : "(no assignee)"
        );
        BotHelper.sendMessageToTelegram(chatId, confirmationMsg, telegramClient);
    }

    private void processTaskConfirmation(ConversationState state) {
        String text = textoMensaje.trim().toLowerCase();

        if (text.equals("yes")) {
            createTaskFromState(state);
            return;
        }

        if (text.startsWith("edit ")) {
            String field = text.substring(5).trim();
            switch (field) {
                case "title":
                    state.setPaso(0);
                    BotHelper.sendMessageToTelegram(chatId, "Enter the new title:", telegramClient);
                    break;
                case "description":
                    state.setPaso(1);
                    BotHelper.sendMessageToTelegram(chatId, "Enter the new description (or 'skip'):", telegramClient);
                    break;
                case "hours":
                    state.setPaso(2);
                    BotHelper.sendMessageToTelegram(chatId, "Enter the estimated hours:", telegramClient);
                    break;
                case "priority":
                    state.setPaso(4);
                    sendPrioritySelection(state);
                    break;
                case "assigned":
                    state.setPaso(5);
                    sendAssigneeSelection(state);
                    break;
                default:
                    BotHelper.sendMessageToTelegram(chatId,
                            "Field not recognized. Use: edit title, edit description, edit hours, edit priority, edit assigned",
                            telegramClient);
            }
            return;
        }

        if (text.equals("cancel")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_CANCELLED.getMessage(), telegramClient);
            return;
        }

        // Unrecognized response — show summary again.
        BotHelper.sendMessageToTelegram(chatId,
                "Reply 'yes' to save, 'edit [field]' to correct, or 'cancel' to cancel.",
                telegramClient);
        showNewTaskConfirmation(state);
    }

    @SuppressWarnings("unchecked")
    private void createTaskFromState(ConversationState state) {
        Usuario creator  = getOrRegisterUser();
        Usuario assignee = (Usuario)       state.getDato("usuarioAsignado");
        PrioridadTarea priority = (PrioridadTarea) state.getDato("prioridadSeleccionada");

        Tarea newTask = new Tarea();
        newTask.setTitulo((String) state.getDato("titulo"));
        newTask.setDescripcion((String) state.getDato("descripcion"));
        newTask.setHorasEstimadas((Double) state.getDato("horasEstimadas"));
        newTask.setUsuarioCreador(creator);
        newTask.setUsuarioAsignado(assignee != null ? assignee : creator);
        newTask.setPrioridad(priority);

        // Status lookup uses English names to match the database.
        EstatusTarea pendingStatus = estatusTareaService.obtenerEstatusPorNombre("Pending");
        if (pendingStatus != null) {
            newTask.setEstatus(pendingStatus);
        } else {
            List<EstatusTarea> allStatuses = estatusTareaService.obtenerTodosLosEstatus();
            if (!allStatuses.isEmpty()) {
                newTask.setEstatus(allStatuses.get(0));
                logger.warn("Status 'Pending' not found; using '{}' as fallback",
                        allStatuses.get(0).getNombre());
            } else {
                logger.warn("No status found in the database; task will be saved without a status");
            }
        }

        Tarea created = tareaService.crearTarea(newTask);
        conversationManager.terminarConversacion(chatId);

        String message = BotMessages.NEWTASK_CREATED.getMessage()
                .replace("{id}", String.valueOf(created.getIdTarea()))
                .replace("{titulo}", created.getTitulo())
                .replace("{horas}", String.valueOf(created.getHorasEstimadas()));
        BotHelper.sendMessageToTelegram(chatId, message, telegramClient);
    }

    // ── /assignsprint ─────────────────────────────────────────────────────────

    public void fnAsignarSprint() {
        if (exit) return;

        boolean isStartCommand = textoMensaje.equals(BotCommands.ASSIGN_SPRINT.getCommand());
        boolean hasActiveConversation = conversationManager.tieneConversacionActiva(chatId)
                && "assignsprint".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!isStartCommand && !hasActiveConversation) return;

        if (isStartCommand) {
            startAssignSprint(null);
            return;
        }

        ConversationState state = conversationManager.obtenerEstado(chatId);
        processAssignSprintStep(state);
        exit = true;
    }

    private void startAssignSprintFlow() {
        Optional<Sprint> sprintOpt = sprintService.obtenerSprintActivo();
        if (sprintOpt.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_NO_SPRINT.getMessage(), telegramClient);
            return;
        }

        Usuario user = getOrRegisterUser();

        // Status lookup uses English names to match the database.
        List<Tarea> pendingTasks = tareaService.obtenerTareasPorEstatusYUsuario("Pending", user.getIdUsuario());
        if (pendingTasks.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_NO_TASKS.getMessage(), telegramClient);
            return;
        }

        ConversationState state = new ConversationState("assignsprint");
        state.setDato("idSprint", sprintOpt.get().getIdSprint());
        state.setDato("idUsuario", user.getIdUsuario());
        conversationManager.iniciarConversacion(chatId, state);

        String taskList = buildTaskList(pendingTasks);
        String message = BotMessages.ASSIGNSPRINT_SELECT.getMessage().replace("{lista}", taskList);
        BotHelper.sendMessageToTelegram(chatId, message, telegramClient);
    }

    private void processAssignSprintStep(ConversationState state) {
        if (textoMensaje.equalsIgnoreCase("cancel")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operation cancelled.", telegramClient);
            return;
        }

        Long taskId;
        try {
            taskId = Long.parseLong(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_INVALID_ID.getMessage(), telegramClient);
            return;
        }

        Tarea task = tareaService.obtenerTareaPorId(taskId);
        Long userId   = (Long) state.getDato("idUsuario");
        Long sprintId = (Long) state.getDato("idSprint");

        if (task == null || task.getUsuarioAsignado() == null
                || !task.getUsuarioAsignado().getIdUsuario().equals(userId)) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_NOT_FOUND.getMessage(), telegramClient);
            return;
        }

        // Status lookup uses English names to match the database.
        EstatusTarea inProgressStatus = estatusTareaService.obtenerEstatusPorNombre("In Progress");
        if (inProgressStatus == null) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId,
                    "Configuration error: status 'In Progress' not found.", telegramClient);
            return;
        }
        task.setEstatus(inProgressStatus);
        Sprint sprint = sprintService.obtenerSprintPorId(sprintId)
                .orElseThrow(() -> new RuntimeException("Sprint not found: " + sprintId));
        task.setSprint(sprint);
        tareaService.actualizarTarea(taskId, task);
        conversationManager.terminarConversacion(chatId);

        String message = BotMessages.ASSIGNSPRINT_DONE.getMessage()
                .replace("{id}", String.valueOf(taskId));
        BotHelper.sendMessageToTelegram(chatId, message, telegramClient);
    }

    // ── /donetask ─────────────────────────────────────────────────────────────

    public void fnCompletarTarea() {
        if (exit) return;

        boolean isStartCommand = textoMensaje.equals(BotCommands.DONE_TASK.getCommand());
        boolean hasActiveConversation = conversationManager.tieneConversacionActiva(chatId)
                && "donetask".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!isStartCommand && !hasActiveConversation) return;

        if (isStartCommand) {
            startCompleteTask(null);
            return;
        }

        ConversationState state = conversationManager.obtenerEstado(chatId);
        processCompleteTaskStep(state);
        exit = true;
    }

    private void startCompleteTaskFlow() {
        Usuario user = getOrRegisterUser();

        logger.info("[donetask] Searching active tasks — telegramUserId={}, userId={}",
                telegramUserId, user.getIdUsuario());

        List<Tarea> activeTasks = tareaService.obtenerTareasActivasPorUsuario(user.getIdUsuario());

        logger.info("[donetask] Active tasks found: {}", activeTasks.size());

        if (activeTasks.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.DONETASK_NO_TASKS.getMessage(), telegramClient);
            return;
        }

        ConversationState state = new ConversationState("donetask");
        state.setDato("idUsuario", user.getIdUsuario());
        conversationManager.iniciarConversacion(chatId, state);

        String taskList = buildTaskList(activeTasks);
        String message = BotMessages.DONETASK_SELECT.getMessage().replace("{lista}", taskList);
        BotHelper.sendMessageToTelegram(chatId, message, telegramClient);
    }

    private void processCompleteTaskStep(ConversationState state) {
        if (textoMensaje.equalsIgnoreCase("cancel")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operation cancelled.", telegramClient);
            return;
        }

        if (state.getPaso() == 0) {
            // Waiting for task ID.
            Long taskId;
            try {
                taskId = Long.parseLong(textoMensaje.trim());
            } catch (NumberFormatException e) {
                BotHelper.sendMessageToTelegram(chatId, "Invalid ID. Enter the task number:", telegramClient);
                return;
            }

            Tarea task   = tareaService.obtenerTareaPorId(taskId);
            Long userId  = (Long) state.getDato("idUsuario");

            logger.info("[donetask] step 0 — taskId={}, expectedUserId={}, taskUserId={}",
                    taskId, userId,
                    (task != null && task.getUsuarioAsignado() != null)
                            ? task.getUsuarioAsignado().getIdUsuario() : "null");

            if (task == null || task.getUsuarioAsignado() == null
                    || !task.getUsuarioAsignado().getIdUsuario().equals(userId)) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_NOT_FOUND.getMessage(), telegramClient);
                return;
            }

            String currentStatus = task.getEstatus() != null ? task.getEstatus().getNombre() : "";
            // Status comparison uses English names to match the database.
            if (!currentStatus.equals("Pending") && !currentStatus.equals("In Progress")) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId,
                        "That task is no longer active (status: " + currentStatus + "). Operation cancelled.",
                        telegramClient);
                return;
            }

            state.setDato("idTarea", taskId);
            state.avanzarPaso();
            BotHelper.sendMessageToTelegram(chatId, BotMessages.DONETASK_HOURS.getMessage(), telegramClient);
            return;
        }

        if (state.getPaso() == 1) {
            // Waiting for actual hours.
            double actualHours;
            try {
                actualHours = Double.parseDouble(textoMensaje.trim().replace(",", "."));
            } catch (NumberFormatException e) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.DONETASK_HOURS_INVALID.getMessage(), telegramClient);
                return;
            }

            Long taskId = (Long) state.getDato("idTarea");
            Tarea task  = tareaService.obtenerTareaPorId(taskId);
            if (task == null) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId, "Task not found. Operation cancelled.", telegramClient);
                return;
            }

            // Status lookup uses English names to match the database.
            EstatusTarea completedStatus = estatusTareaService.obtenerEstatusPorNombre("Completed");
            if (completedStatus == null) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId,
                        "Configuration error: status 'Completed' not found.", telegramClient);
                return;
            }
            task.setEstatus(completedStatus);
            task.setHorasReales(actualHours);
            tareaService.actualizarTarea(taskId, task);
            conversationManager.terminarConversacion(chatId);

            String message = BotMessages.DONETASK_DONE.getMessage()
                    .replace("{id}", String.valueOf(taskId))
                    .replace("{horas}", String.valueOf(actualHours));
            BotHelper.sendMessageToTelegram(chatId, message, telegramClient);
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
        List<Tarea> tasks = tareaService.obtenerTareasPorSprint(sprint.getIdSprint());

        if (tasks.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.SPRINTTABLE_EMPTY.getMessage(), telegramClient);
            exit = true;
            return;
        }

        String table = buildSprintTable(sprint, tasks);
        BotHelper.sendMessageToTelegram(chatId, table, telegramClient);
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
        List<Tarea> tasks = tareaService.obtenerTareasPorSprint(sprint.getIdSprint());

        if (tasks.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.KPI_EMPTY.getMessage(), telegramClient);
            exit = true;
            return;
        }

        String report = buildKpiReport(sprint, tasks);
        BotHelper.sendMessageToTelegram(chatId, report, telegramClient);
        exit = true;
    }

    // ── /activesprint ──────────────────────────────────────────────────────────

    public void fnActiveSprint() {
        if (exit) return;
        if (!textoMensaje.equals(BotCommands.ACTIVE_SPRINT.getCommand())) return;

        Optional<Sprint> sprintOpt = sprintService.obtenerSprintActivo();
        if (sprintOpt.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ACTIVESPRINT_NO_SPRINT.getMessage(), telegramClient);
            exit = true;
            return;
        }

        Sprint sprint = sprintOpt.get();
        List<Tarea> tasks = tareaService.obtenerTareasPorSprint(sprint.getIdSprint());
        BotHelper.sendMessageToTelegram(chatId, buildActiveSprintReport(sprint, tasks), telegramClient);
        exit = true;
    }

    private String buildActiveSprintReport(Sprint sprint, List<Tarea> tasks) {
        Map<String, Long> byStatus = tasks.stream()
                .filter(t -> t.getEstatus() != null)
                .collect(Collectors.groupingBy(t -> t.getEstatus().getNombre(), Collectors.counting()));

        double estimatedHours = tasks.stream()
                .filter(t -> t.getHorasEstimadas() != null)
                .mapToDouble(Tarea::getHorasEstimadas)
                .sum();

        double actualHours = tasks.stream()
                .filter(t -> t.getHorasReales() != null)
                .mapToDouble(Tarea::getHorasReales)
                .sum();

        StringBuilder sb = new StringBuilder("=== ACTIVE SPRINT ===\n");
        sb.append("Name: ").append(sprint.getNombre()).append("\n");
        if (sprint.getFechaInicio() != null && sprint.getFechaFin() != null) {
            sb.append("Start: ").append(sprint.getFechaInicio().format(DATE_FORMAT_SHORT))
              .append("  End: ").append(sprint.getFechaFin().format(DATE_FORMAT_SHORT)).append("\n");
        }
        sb.append("Status: ").append(sprint.getEstado() != null ? sprint.getEstado() : "—").append("\n\n");
        sb.append("Tasks: ").append(tasks.size()).append(" total\n");
        if (!byStatus.isEmpty()) {
            byStatus.forEach((status, count) ->
                    sb.append("  • ").append(status).append(": ").append(count).append("\n"));
        }
        sb.append(String.format("%nEstimated: %.1fh  |  Actual: %.1fh", estimatedHours, actualHours));
        return sb.toString();
    }

    // ── /listsprints ───────────────────────────────────────────────────────────

    public void fnListSprints() {
        if (exit) return;
        if (!textoMensaje.equals(BotCommands.LIST_SPRINTS.getCommand())) return;

        List<Sprint> sprints = sprintService.obtenerTodosLosSprints();
        if (sprints.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.LISTSPRINTS_EMPTY.getMessage(), telegramClient);
            exit = true;
            return;
        }

        StringBuilder sb = new StringBuilder("All Sprints:\n\n");
        for (int i = 0; i < sprints.size(); i++) {
            Sprint s = sprints.get(i);
            sb.append(i + 1).append(". ").append(s.getNombre());
            if ("current".equals(s.getEstado())) {
                sb.append("  [current]");
            } else if ("past".equals(s.getEstado())) {
                sb.append("  [past]");
            } else if (s.getEstado() != null) {
                sb.append("  [").append(s.getEstado()).append("]");
            }
            if (s.getFechaInicio() != null && s.getFechaFin() != null) {
                sb.append("  ").append(s.getFechaInicio().format(DATE_FORMAT_SHORT))
                  .append(" → ").append(s.getFechaFin().format(DATE_FORMAT_SHORT));
            }
            sb.append("\n");
        }
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
        exit = true;
    }

    // ── /newsprint ────────────────────────────────────────────────────────────

    public void fnNuevoSprint() {
        if (exit) return;

        boolean isStartCommand = textoMensaje.equals(BotCommands.NEW_SPRINT.getCommand());
        boolean hasActiveConversation = conversationManager.tieneConversacionActiva(chatId)
                && "newsprint".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!isStartCommand && !hasActiveConversation) return;

        if (isStartCommand) {
            startNewSprint(null);
            return;
        }

        ConversationState state = conversationManager.obtenerEstado(chatId);
        processNewSprintStep(state);
        exit = true;
    }

    private void processNewSprintStep(ConversationState state) {
        if (textoMensaje.equalsIgnoreCase("cancel")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_CANCELLED.getMessage(), telegramClient);
            return;
        }

        switch (state.getPaso()) {
            case 0: // waiting for sprint name
                state.setDato("nombreSprint", textoMensaje.trim());
                state.avanzarPaso();
                BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INICIO.getMessage(), telegramClient);
                break;

            case 1: // waiting for start date
                try {
                    LocalDate startDate = LocalDate.parse(textoMensaje.trim(), DATE_FORMAT_FULL);
                    state.setDato("fechaInicio", startDate);
                    state.avanzarPaso();
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_FIN.getMessage(), telegramClient);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                }
                break;

            case 2: // waiting for end date
                try {
                    LocalDate endDate   = LocalDate.parse(textoMensaje.trim(), DATE_FORMAT_FULL);
                    LocalDate startDate = (LocalDate) state.getDato("fechaInicio");

                    if (!endDate.isAfter(startDate)) {
                        BotHelper.sendMessageToTelegram(chatId,
                                "The end date must be after the start date. Please try again (dd/MM/yyyy):",
                                telegramClient);
                        break;
                    }

                    state.setDato("fechaFin", endDate);
                    state.avanzarPaso();

                    String summary = String.format(
                            BotMessages.SPRINT_CONFIRMACION.getMessage(),
                            state.getDato("nombreSprint"),
                            startDate.format(DATE_FORMAT_FULL),
                            endDate.format(DATE_FORMAT_FULL)
                    );
                    BotHelper.sendMessageToTelegram(chatId, summary, telegramClient);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                }
                break;

            case 3: // waiting for sprint creation confirmation
                processNewSprintConfirmation(state);
                break;

            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void processNewSprintConfirmation(ConversationState state) {
        String text = textoMensaje.trim().toLowerCase();
        if (text.equals("yes")) {
            // Deactivate the previous active sprint if one exists.
            Optional<Sprint> previousSprintOpt = sprintService.obtenerSprintActivo();
            if (previousSprintOpt.isPresent()) {
                Sprint previousSprint = previousSprintOpt.get();
                // Sprint estado uses English values to match the database.
                previousSprint.setEstado("past");
                Sprint result = sprintService.actualizarSprint(previousSprint.getIdSprint(), previousSprint);
                if (result == null) {
                    logger.warn("Could not deactivate the previous sprint with ID {}",
                            previousSprint.getIdSprint());
                }
            }

            Sprint newSprint = new Sprint();
            newSprint.setNombre((String) state.getDato("nombreSprint"));
            newSprint.setFechaInicio((LocalDate) state.getDato("fechaInicio"));
            newSprint.setFechaFin((LocalDate) state.getDato("fechaFin"));
            // Sprint estado uses English values to match the database.
            newSprint.setEstado("current");
            sprintService.crearSprint(newSprint);
            conversationManager.terminarConversacion(chatId);

            String message = BotMessages.NEWSPRINT_CREADO.getMessage()
                    .replace("{nombre}", newSprint.getNombre());
            BotHelper.sendMessageToTelegram(chatId, message, telegramClient);
        } else if (text.equals("no") || text.equals("cancel")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_CANCELLED.getMessage(), telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId,
                    "Reply 'yes' to create the sprint or 'no' to cancel.", telegramClient);
        }
    }

    // ── /modifytask ───────────────────────────────────────────────────────────

    public void fnModificarTarea() {
        if (exit) return;

        boolean isStartCommand = textoMensaje.equals(BotCommands.MODIFY_TASK.getCommand());
        boolean hasActiveConversation = conversationManager.tieneConversacionActiva(chatId)
                && "modifytask".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!isStartCommand && !hasActiveConversation) return;

        if (isStartCommand) {
            startModifyTask(null);
            return;
        }

        ConversationState state = conversationManager.obtenerEstado(chatId);
        processModifyTaskStep(state);
        exit = true;
    }

    private void startModifyTaskFlow() {
        Usuario user = getOrRegisterUser();
        List<Tarea> allTasks = tareaService.obtenerTareasPorUsuarioAsignado(user.getIdUsuario());

        if (allTasks.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, "You have no assigned tasks to modify.", telegramClient);
            return;
        }

        ConversationState state = new ConversationState("modifytask");
        state.setDato("idUsuario", user.getIdUsuario());
        conversationManager.iniciarConversacion(chatId, state);

        StringBuilder sb = new StringBuilder("Your tasks:\n\n");
        sb.append(buildDetailedTaskList(allTasks));
        sb.append("\n").append(BotMessages.SELECCIONAR_TAREA_MODIFICAR.getMessage());
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    private void processModifyTaskStep(ConversationState state) {
        if (textoMensaje.equalsIgnoreCase("cancel")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operation cancelled.", telegramClient);
            return;
        }

        switch (state.getPaso()) {
            case 0: // waiting for task ID
                processTaskSelectionForModify(state);
                break;
            case 1: // waiting for field number to edit
                processFieldSelection(state);
                break;
            case 2: // waiting for new field value
                processNewFieldValue(state);
                break;
            case 3: // waiting for final confirmation
                processModifyTaskConfirmation(state);
                break;
            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void processTaskSelectionForModify(ConversationState state) {
        Long taskId;
        try {
            taskId = Long.parseLong(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid ID. Enter the task ID number:", telegramClient);
            return;
        }

        Tarea task   = tareaService.obtenerTareaPorId(taskId);
        Long userId  = (Long) state.getDato("idUsuario");

        if (task == null || task.getUsuarioAsignado() == null
                || !task.getUsuarioAsignado().getIdUsuario().equals(userId)) {
            BotHelper.sendMessageToTelegram(chatId,
                    "That task assigned to you was not found. Try a different ID:", telegramClient);
            return;
        }

        state.setDato("idTarea", taskId);
        state.setDato("tareaActual", task);
        state.avanzarPaso();

        BotHelper.sendMessageToTelegram(chatId, showTaskDetail(task), telegramClient);
        BotHelper.sendMessageToTelegram(chatId, BotMessages.MODIFICAR_CAMPO.getMessage(), telegramClient);
    }

    private void processFieldSelection(ConversationState state) {
        int field;
        try {
            field = Integer.parseInt(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId,
                    "Invalid number. " + BotMessages.MODIFICAR_CAMPO.getMessage(), telegramClient);
            return;
        }

        if (field < 1 || field > 7) {
            BotHelper.sendMessageToTelegram(chatId,
                    "Choose a number from 1 to 7:\n" + BotMessages.MODIFICAR_CAMPO.getMessage(), telegramClient);
            return;
        }

        state.setDato("campoSeleccionado", field);
        state.avanzarPaso();

        switch (field) {
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
                List<PrioridadTarea> priorities = prioridadTareaService.obtenerTodasLasPrioridades();
                state.setDato("listaPrioridades", priorities);
                StringBuilder sbP = new StringBuilder("Select the new priority:\n\n");
                for (int i = 0; i < priorities.size(); i++) {
                    sbP.append(i + 1).append(". ").append(priorities.get(i).getNombre()).append("\n");
                }
                BotHelper.sendMessageToTelegram(chatId, sbP.toString(), telegramClient);
                break;
            case 5:
                List<Usuario> users = usuarioService.obtenerTodosLosUsuarios();
                state.setDato("listaUsuarios", users);
                StringBuilder sbU = new StringBuilder("Select the new assignee:\n\n");
                for (int i = 0; i < users.size(); i++) {
                    sbU.append(i + 1).append(". ").append(users.get(i).getNombreCompleto()).append("\n");
                }
                BotHelper.sendMessageToTelegram(chatId, sbU.toString(), telegramClient);
                break;
            case 6:
                List<Sprint> sprints = sprintService.obtenerTodosLosSprints();
                state.setDato("listaSprints", sprints);
                StringBuilder sbS = new StringBuilder("Select the new sprint:\n\n");
                for (int i = 0; i < sprints.size(); i++) {
                    Sprint s = sprints.get(i);
                    sbS.append(i + 1).append(". ").append(s.getNombre());
                    if (s.getFechaInicio() != null && s.getFechaFin() != null) {
                        sbS.append(" (").append(s.getFechaInicio().format(DATE_FORMAT_SHORT))
                           .append(" - ").append(s.getFechaFin().format(DATE_FORMAT_SHORT)).append(")");
                    }
                    if ("current".equals(s.getEstado())) sbS.append(" [Active]");
                    sbS.append("\n");
                }
                BotHelper.sendMessageToTelegram(chatId, sbS.toString(), telegramClient);
                break;
            case 7:
                List<EstatusTarea> statuses = estatusTareaService.obtenerTodosLosEstatus();
                state.setDato("listaEstatus", statuses);
                StringBuilder sbE = new StringBuilder("Select the new status:\n\n");
                for (int i = 0; i < statuses.size(); i++) {
                    sbE.append(i + 1).append(". ").append(statuses.get(i).getNombre()).append("\n");
                }
                BotHelper.sendMessageToTelegram(chatId, sbE.toString(), telegramClient);
                break;
            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    @SuppressWarnings("unchecked")
    private void processNewFieldValue(ConversationState state) {
        int field = (int) state.getDato("campoSeleccionado");
        Tarea currentTask = (Tarea) state.getDato("tareaActual");

        switch (field) {
            case 1: // title
                String newTitle = textoMensaje.trim();
                if (newTitle.isEmpty()) {
                    BotHelper.sendMessageToTelegram(chatId, "The title cannot be empty. Please try again:", telegramClient);
                    return;
                }
                state.setDato("nuevoTitulo", newTitle);
                break;

            case 2: // description
                state.setDato("nuevaDescripcion", textoMensaje.trim());
                break;

            case 3: // estimated hours
                try {
                    double newHours = Double.parseDouble(textoMensaje.trim().replace(",", "."));
                    state.setDato("nuevasHoras", newHours);
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Invalid number. Enter the estimated hours:", telegramClient);
                    return;
                }
                break;

            case 4: // priority
                try {
                    int priorityIndex = Integer.parseInt(textoMensaje.trim());
                    List<PrioridadTarea> priorities = (List<PrioridadTarea>) state.getDato("listaPrioridades");
                    if (priorities == null || priorityIndex < 1 || priorityIndex > priorities.size()) {
                        BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                        return;
                    }
                    state.setDato("nuevaPrioridad", priorities.get(priorityIndex - 1));
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                    return;
                }
                break;

            case 5: // assignee
                try {
                    int userIndex = Integer.parseInt(textoMensaje.trim());
                    List<Usuario> users = (List<Usuario>) state.getDato("listaUsuarios");
                    if (users == null || userIndex < 1 || userIndex > users.size()) {
                        BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                        return;
                    }
                    state.setDato("nuevoAsignado", users.get(userIndex - 1));
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                    return;
                }
                break;

            case 6: // sprint
                try {
                    int sprintIndex = Integer.parseInt(textoMensaje.trim());
                    List<Sprint> sprints = (List<Sprint>) state.getDato("listaSprints");
                    if (sprints == null || sprintIndex < 1 || sprintIndex > sprints.size()) {
                        BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                        return;
                    }
                    state.setDato("nuevoSprint", sprints.get(sprintIndex - 1));
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                    return;
                }
                break;

            case 7: // status
                try {
                    int statusIndex = Integer.parseInt(textoMensaje.trim());
                    List<EstatusTarea> statuses = (List<EstatusTarea>) state.getDato("listaEstatus");
                    if (statuses == null || statusIndex < 1 || statusIndex > statuses.size()) {
                        BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                        return;
                    }
                    state.setDato("nuevoEstatus", statuses.get(statusIndex - 1));
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose from the list:", telegramClient);
                    return;
                }
                break;

            default:
                conversationManager.terminarConversacion(chatId);
                return;
        }

        state.avanzarPaso();
        String summary = buildChangeSummary(field, state, currentTask);
        BotHelper.sendMessageToTelegram(chatId, summary + "\n\nDo you confirm the changes? (yes / no)", telegramClient);
    }

    @SuppressWarnings("unchecked")
    private void processModifyTaskConfirmation(ConversationState state) {
        String text = textoMensaje.trim().toLowerCase();

        if (text.equals("yes")) {
            Long taskId = (Long) state.getDato("idTarea");
            int field   = (int)  state.getDato("campoSeleccionado");

            Tarea updatedTask = new Tarea();

            switch (field) {
                case 1: updatedTask.setTitulo((String) state.getDato("nuevoTitulo")); break;
                case 2: updatedTask.setDescripcion((String) state.getDato("nuevaDescripcion")); break;
                case 3: updatedTask.setHorasEstimadas((Double) state.getDato("nuevasHoras")); break;
                case 4: updatedTask.setPrioridad((PrioridadTarea) state.getDato("nuevaPrioridad")); break;
                case 5: updatedTask.setUsuarioAsignado((Usuario) state.getDato("nuevoAsignado")); break;
                case 6: updatedTask.setSprint((Sprint) state.getDato("nuevoSprint")); break;
                case 7: updatedTask.setEstatus((EstatusTarea) state.getDato("nuevoEstatus")); break;
                default:
                    conversationManager.terminarConversacion(chatId);
                    return;
            }

            Tarea result = tareaService.actualizarTarea(taskId, updatedTask);
            conversationManager.terminarConversacion(chatId);

            if (result != null) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.CAMBIOS_GUARDADOS.getMessage(), telegramClient);
            } else {
                BotHelper.sendMessageToTelegram(chatId, "Error saving changes. Please try again.", telegramClient);
            }
        } else if (text.equals("no")) {
            // Return to field selection.
            state.setPaso(1);
            Tarea currentTask = (Tarea) state.getDato("tareaActual");
            BotHelper.sendMessageToTelegram(chatId, showTaskDetail(currentTask), telegramClient);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.MODIFICAR_CAMPO.getMessage(), telegramClient);
        } else if (text.equals("cancel")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operation cancelled.", telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId,
                    "Reply 'yes' to confirm, 'no' to choose another field, or 'cancel'.", telegramClient);
        }
    }

    // ── /modifysprint ─────────────────────────────────────────────────────────

    public void fnModificarSprint() {
        if (exit) return;

        boolean isStartCommand = textoMensaje.equals(BotCommands.MODIFY_SPRINT.getCommand());
        boolean hasActiveConversation = conversationManager.tieneConversacionActiva(chatId)
                && "modifysprint".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!isStartCommand && !hasActiveConversation) return;

        if (isStartCommand) {
            startModifySprint(null);
            return;
        }

        ConversationState state = conversationManager.obtenerEstado(chatId);
        processModifySprintStep(state);
        exit = true;
    }

    private void startModifySprintFlow() {
        List<Sprint> sprints = sprintService.obtenerTodosLosSprints();

        if (sprints.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, "There are no sprints available to modify.", telegramClient);
            return;
        }

        ConversationState state = new ConversationState("modifysprint");
        conversationManager.iniciarConversacion(chatId, state);

        StringBuilder sb = new StringBuilder("Available sprints:\n\n");
        for (Sprint s : sprints) {
            sb.append("ID ").append(s.getIdSprint()).append(" — ").append(s.getNombre());
            if (s.getFechaInicio() != null && s.getFechaFin() != null) {
                sb.append(" (").append(s.getFechaInicio().format(DATE_FORMAT_FULL))
                  .append(" -> ").append(s.getFechaFin().format(DATE_FORMAT_FULL)).append(")");
            }
            sb.append(s.getEstado() != null ? " [" + s.getEstado() + "]" : "");
            sb.append("\n");
        }
        sb.append("\nEnter the ID of the sprint you want to modify:");
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    private void processModifySprintStep(ConversationState state) {
        if (textoMensaje.equalsIgnoreCase("cancel")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operation cancelled.", telegramClient);
            return;
        }

        switch (state.getPaso()) {
            case 0: // waiting for sprint ID
                processSprintSelectionForModify(state);
                break;
            case 1: // waiting for field number to edit
                processSprintFieldSelection(state);
                break;
            case 2: // waiting for new value
                processNewSprintValue(state);
                break;
            case 3: // waiting for confirmation
                processModifySprintConfirmation(state);
                break;
            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void processSprintSelectionForModify(ConversationState state) {
        Long sprintId;
        try {
            sprintId = Long.parseLong(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid ID. Enter the sprint ID number:", telegramClient);
            return;
        }

        Optional<Sprint> sprintOpt = sprintService.obtenerSprintPorId(sprintId);
        if (sprintOpt.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, "Sprint not found. Enter a valid ID:", telegramClient);
            return;
        }

        Sprint sprint = sprintOpt.get();
        state.setDato("idSprint", sprintId);
        state.setDato("sprintActual", sprint);
        state.avanzarPaso();

        StringBuilder detail = new StringBuilder("Selected sprint:\n");
        detail.append("Name: ").append(sprint.getNombre()).append("\n");
        if (sprint.getFechaInicio() != null) {
            detail.append("Start: ").append(sprint.getFechaInicio().format(DATE_FORMAT_FULL)).append("\n");
        }
        if (sprint.getFechaFin() != null) {
            detail.append("End: ").append(sprint.getFechaFin().format(DATE_FORMAT_FULL)).append("\n");
        }
        detail.append("Status: ").append(sprint.getEstado() != null ? sprint.getEstado() : "—").append("\n\n");
        detail.append("Which field do you want to edit?\n1. Name\n2. Start date\n3. End date");
        BotHelper.sendMessageToTelegram(chatId, detail.toString(), telegramClient);
    }

    private void processSprintFieldSelection(ConversationState state) {
        int field;
        try {
            field = Integer.parseInt(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Invalid number. Choose 1, 2 or 3:", telegramClient);
            return;
        }

        if (field < 1 || field > 3) {
            BotHelper.sendMessageToTelegram(chatId,
                    "Choose a number from 1 to 3:\n1. Name\n2. Start date\n3. End date", telegramClient);
            return;
        }

        state.setDato("campoSprint", field);
        state.avanzarPaso();

        switch (field) {
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

    private void processNewSprintValue(ConversationState state) {
        int field = (int) state.getDato("campoSprint");
        Sprint currentSprint = (Sprint) state.getDato("sprintActual");

        switch (field) {
            case 1: // name
                String newName = textoMensaje.trim();
                if (newName.isEmpty()) {
                    BotHelper.sendMessageToTelegram(chatId, "The name cannot be empty. Please try again:", telegramClient);
                    return;
                }
                state.setDato("nuevoNombreSprint", newName);
                break;

            case 2: // start date
                try {
                    LocalDate newStartDate = LocalDate.parse(textoMensaje.trim(), DATE_FORMAT_FULL);
                    state.setDato("nuevaFechaInicioSprint", newStartDate);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                    return;
                }
                break;

            case 3: // end date
                try {
                    LocalDate newEndDate = LocalDate.parse(textoMensaje.trim(), DATE_FORMAT_FULL);
                    LocalDate startDateRef = state.getDato("nuevaFechaInicioSprint") != null
                            ? (LocalDate) state.getDato("nuevaFechaInicioSprint")
                            : currentSprint.getFechaInicio();
                    if (startDateRef != null && !newEndDate.isAfter(startDateRef)) {
                        BotHelper.sendMessageToTelegram(chatId,
                                "The end date must be after the start date. Please try again (dd/MM/yyyy):",
                                telegramClient);
                        return;
                    }
                    state.setDato("nuevaFechaFinSprint", newEndDate);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                    return;
                }
                break;

            default:
                conversationManager.terminarConversacion(chatId);
                return;
        }

        state.avanzarPaso();

        String displayName = state.getDato("nuevoNombreSprint") != null
                ? (String) state.getDato("nuevoNombreSprint")
                : currentSprint.getNombre();
        LocalDate displayStart = state.getDato("nuevaFechaInicioSprint") != null
                ? (LocalDate) state.getDato("nuevaFechaInicioSprint")
                : currentSprint.getFechaInicio();
        LocalDate displayEnd = state.getDato("nuevaFechaFinSprint") != null
                ? (LocalDate) state.getDato("nuevaFechaFinSprint")
                : currentSprint.getFechaFin();

        String summary = String.format(
                BotMessages.SPRINT_CONFIRMACION.getMessage(),
                displayName,
                displayStart != null ? displayStart.format(DATE_FORMAT_FULL) : "—",
                displayEnd   != null ? displayEnd.format(DATE_FORMAT_FULL)   : "—"
        );
        BotHelper.sendMessageToTelegram(chatId, summary, telegramClient);
    }

    private void processModifySprintConfirmation(ConversationState state) {
        String text    = textoMensaje.trim().toLowerCase();
        Long sprintId  = (Long) state.getDato("idSprint");

        if (text.equals("yes")) {
            Sprint updatedSprint = new Sprint();
            if (state.getDato("nuevoNombreSprint") != null) {
                updatedSprint.setNombre((String) state.getDato("nuevoNombreSprint"));
            }
            if (state.getDato("nuevaFechaInicioSprint") != null) {
                updatedSprint.setFechaInicio((LocalDate) state.getDato("nuevaFechaInicioSprint"));
            }
            if (state.getDato("nuevaFechaFinSprint") != null) {
                updatedSprint.setFechaFin((LocalDate) state.getDato("nuevaFechaFinSprint"));
            }

            Sprint result = sprintService.actualizarSprint(sprintId, updatedSprint);
            conversationManager.terminarConversacion(chatId);

            if (result != null) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.CAMBIOS_GUARDADOS.getMessage(), telegramClient);
            } else {
                BotHelper.sendMessageToTelegram(chatId, "Error saving changes. Please try again.", telegramClient);
            }
        } else if (text.equals("no") || text.equals("cancel")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operation cancelled.", telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId,
                    "Reply 'yes' to save changes or 'no' to cancel.", telegramClient);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Looks up the Telegram user in the database, auto-registering them if not found.
     */
    private Usuario getOrRegisterUser() {
        Optional<Usuario> userOpt = usuarioService.buscarPorTelegramId(telegramUserId);
        if (userOpt.isPresent()) {
            return userOpt.get();
        }

        String username = (telegramUsername != null && !telegramUsername.isEmpty())
                ? telegramUsername
                : "user_" + telegramUserId;

        String fullName;
        if (telegramFirstName != null && !telegramFirstName.isEmpty()) {
            fullName = telegramLastName != null && !telegramLastName.isEmpty()
                    ? telegramFirstName + " " + telegramLastName
                    : telegramFirstName;
        } else {
            fullName = username;
        }

        Usuario newUser = usuarioService.autoRegistrarUsuario(telegramUserId, username, fullName);
        BotHelper.sendMessageToTelegram(chatId,
                "Welcome, " + fullName + "! You have been automatically registered in the system.",
                telegramClient);
        return newUser;
    }

    /**
     * Builds a concise task list string (ID, title, estimated hours).
     */
    private String buildTaskList(List<Tarea> tasks) {
        StringBuilder sb = new StringBuilder();
        for (Tarea t : tasks) {
            sb.append("ID ").append(t.getIdTarea())
              .append(" — ").append(t.getTitulo());
            if (t.getHorasEstimadas() != null) {
                sb.append(" (").append(t.getHorasEstimadas()).append("h est.)");
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    /**
     * Builds a detailed task list string including status and estimated hours.
     */
    private String buildDetailedTaskList(List<Tarea> tasks) {
        StringBuilder sb = new StringBuilder();
        for (Tarea t : tasks) {
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

    /**
     * Builds a formatted task detail block for display in the wizard.
     */
    private String showTaskDetail(Tarea task) {
        StringBuilder sb = new StringBuilder("Task details:\n\n");
        sb.append("ID: ").append(task.getIdTarea()).append("\n");
        sb.append("Title: ").append(task.getTitulo()).append("\n");
        sb.append("Description: ").append(task.getDescripcion() != null ? task.getDescripcion() : "(no description)").append("\n");
        sb.append("Estimated hours: ").append(task.getHorasEstimadas() != null ? task.getHorasEstimadas() + "h" : "—").append("\n");
        sb.append("Actual hours: ").append(task.getHorasReales() != null ? task.getHorasReales() + "h" : "—").append("\n");
        sb.append("Priority: ").append(task.getPrioridad() != null ? task.getPrioridad().getNombre() : "—").append("\n");
        sb.append("Status: ").append(task.getEstatus() != null ? task.getEstatus().getNombre() : "—").append("\n");
        sb.append("Assigned to: ").append(task.getUsuarioAsignado() != null ? task.getUsuarioAsignado().getNombreCompleto() : "—").append("\n");
        sb.append("Sprint: ").append(task.getSprint() != null ? task.getSprint().getNombre() : "—").append("\n");
        return sb.toString();
    }

    /**
     * Builds a one-line change summary for the modify-task confirmation step.
     */
    @SuppressWarnings("unchecked")
    private String buildChangeSummary(int field, ConversationState state, Tarea currentTask) {
        StringBuilder sb = new StringBuilder("Proposed change:\n");
        switch (field) {
            case 1:
                sb.append("Title: ").append(currentTask.getTitulo())
                  .append(" -> ").append(state.getDato("nuevoTitulo"));
                break;
            case 2:
                sb.append("Description: ").append(currentTask.getDescripcion())
                  .append(" -> ").append(state.getDato("nuevaDescripcion"));
                break;
            case 3:
                sb.append("Estimated hours: ").append(currentTask.getHorasEstimadas())
                  .append(" -> ").append(state.getDato("nuevasHoras"));
                break;
            case 4:
                String prevPriority = currentTask.getPrioridad() != null ? currentTask.getPrioridad().getNombre() : "—";
                PrioridadTarea newPriority = (PrioridadTarea) state.getDato("nuevaPrioridad");
                sb.append("Priority: ").append(prevPriority)
                  .append(" -> ").append(newPriority != null ? newPriority.getNombre() : "—");
                break;
            case 5:
                String prevAssignee = currentTask.getUsuarioAsignado() != null
                        ? currentTask.getUsuarioAsignado().getNombreCompleto() : "—";
                Usuario newAssignee = (Usuario) state.getDato("nuevoAsignado");
                sb.append("Assigned to: ").append(prevAssignee)
                  .append(" -> ").append(newAssignee != null ? newAssignee.getNombreCompleto() : "—");
                break;
            case 6:
                String prevSprint = currentTask.getSprint() != null ? currentTask.getSprint().getNombre() : "—";
                Sprint newSprint = (Sprint) state.getDato("nuevoSprint");
                sb.append("Sprint: ").append(prevSprint)
                  .append(" -> ").append(newSprint != null ? newSprint.getNombre() : "—");
                break;
            case 7:
                String prevStatus = currentTask.getEstatus() != null ? currentTask.getEstatus().getNombre() : "—";
                EstatusTarea newStatus = (EstatusTarea) state.getDato("nuevoEstatus");
                sb.append("Status: ").append(prevStatus)
                  .append(" -> ").append(newStatus != null ? newStatus.getNombre() : "—");
                break;
            default:
                sb.append("(unknown field)");
        }
        return sb.toString();
    }

    /**
     * Builds the formatted sprint task table string.
     */
    private String buildSprintTable(Sprint sprint, List<Tarea> tasks) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== SPRINT: ").append(sprint.getNombre()).append(" ===\n");
        if (sprint.getFechaInicio() != null && sprint.getFechaFin() != null) {
            sb.append(sprint.getFechaInicio().format(DATE_FORMAT_SHORT))
              .append(" - ").append(sprint.getFechaFin().format(DATE_FORMAT_SHORT)).append("\n");
        }
        sb.append("Total tasks: ").append(tasks.size()).append("\n\n");

        sb.append(String.format("%-6s %-20s %-12s %-12s %5s %5s\n",
                "ID", "Title", "Dev", "Status", "HEst", "HReal"));
        sb.append("-".repeat(65)).append("\n");

        for (Tarea t : tasks) {
            String dev     = t.getUsuarioAsignado() != null
                    ? truncate(t.getUsuarioAsignado().getNombreCompleto(), 12)
                    : "Unassigned";
            String status  = t.getEstatus() != null ? truncate(t.getEstatus().getNombre(), 12) : "—";
            String hEst    = t.getHorasEstimadas() != null ? t.getHorasEstimadas() + "h" : "—";
            String hReal   = t.getHorasReales()    != null ? t.getHorasReales() + "h"    : "—";
            String title   = truncate(t.getTitulo(), 20);

            sb.append(String.format("%-6s %-20s %-12s %-12s %5s %5s\n",
                    t.getIdTarea(), title, dev, status, hEst, hReal));
        }
        return sb.toString();
    }

    /**
     * Builds the KPI report per developer for the given sprint.
     */
    private String buildKpiReport(Sprint sprint, List<Tarea> tasks) {
        // Group by developer: [total, completed, totalEstHours, totalRealHours]
        Map<String, double[]> kpiByDev = new LinkedHashMap<>();

        for (Tarea t : tasks) {
            String dev = t.getUsuarioAsignado() != null
                    ? t.getUsuarioAsignado().getNombreCompleto() : "Unassigned";
            kpiByDev.putIfAbsent(dev, new double[]{0, 0, 0, 0});
            double[] metrics = kpiByDev.get(dev);
            metrics[0]++;
            // Status comparison uses English names to match the database.
            boolean completed = t.getEstatus() != null
                    && "Completed".equalsIgnoreCase(t.getEstatus().getNombre());
            if (completed) metrics[1]++;
            if (t.getHorasEstimadas() != null) metrics[2] += t.getHorasEstimadas();
            if (t.getHorasReales()    != null) metrics[3] += t.getHorasReales();
        }

        StringBuilder sb = new StringBuilder();
        sb.append("=== KPI — ").append(sprint.getNombre()).append(" ===\n\n");

        for (Map.Entry<String, double[]> entry : kpiByDev.entrySet()) {
            double[] m = entry.getValue();
            double efficiency = m[2] > 0 ? (m[3] / m[2]) * 100 : 0;
            sb.append("Developer: ").append(entry.getKey()).append("\n");
            sb.append("  Total tasks      : ").append((int) m[0]).append("\n");
            sb.append("  Completed        : ").append((int) m[1]).append("\n");
            sb.append("  Estimated hours  : ").append(m[2]).append("h\n");
            sb.append("  Actual hours     : ").append(m[3]).append("h\n");
            if (m[3] > 0) {
                sb.append("  Efficiency       : ").append(String.format("%.0f%%", efficiency))
                  .append(efficiency <= 100 ? " (under budget)" : " (over budget)").append("\n");
            }
            sb.append("\n");
        }

        long completedTotal = tasks.stream()
                .filter(t -> t.getEstatus() != null
                        && "Completed".equalsIgnoreCase(t.getEstatus().getNombre()))
                .count();
        sb.append("TOTAL SPRINT: ").append(completedTotal).append("/").append(tasks.size())
          .append(" tasks completed");

        return sb.toString();
    }

    /**
     * Truncates a string to maxLen characters, appending "." if shortened.
     */
    private String truncate(String text, int maxLen) {
        if (text == null) return "—";
        return text.length() <= maxLen ? text : text.substring(0, maxLen - 1) + ".";
    }
}
