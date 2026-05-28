package com.springboot.MyTodoList.agent;

import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.service.SprintService;
import com.springboot.MyTodoList.service.TareaService;
import com.springboot.MyTodoList.service.UsuarioService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Main orchestrator for the conversational assistant.
 * Receives the user's text, delegates intent analysis to LlmIntentParser,
 * and dispatches logic to the appropriate handler for each recognized intent.
 *
 * Supports multi-turn conversation history through the overloaded
 * {@link #handleMessage(String, List)}, which passes prior context to the parser.
 * The single-argument {@link #handleMessage(String)} remains compatible with
 * all existing callers (Telegram bot, etc.).
 */
@Service
public class AgentOrchestrator {

    private static final Logger logger = LoggerFactory.getLogger(AgentOrchestrator.class);
    private static final int MAX_TAREAS = 10;

    private final LlmIntentParser llmIntentParser;
    private final TareaService tareaService;
    private final SprintService sprintService;
    private final UsuarioService usuarioService;

    public AgentOrchestrator(LlmIntentParser llmIntentParser,
                              TareaService tareaService,
                              SprintService sprintService,
                              UsuarioService usuarioService) {
        this.llmIntentParser = llmIntentParser;
        this.tareaService    = tareaService;
        this.sprintService   = sprintService;
        this.usuarioService  = usuarioService;
    }

    // -------------------------------------------------------------------------
    // Primary entry points
    // -------------------------------------------------------------------------

    /**
     * Entry point compatible with existing callers (Telegram bot, etc.).
     * Delegates to {@link #handleMessage(String, List)} with an empty history.
     *
     * @param text user message
     * @return plain-text response in English
     */
    public String handleMessage(String text) {
        return handleMessage(text, Collections.emptyList());
    }

    /**
     * Analyses the message, determines the intent, and returns the appropriate response.
     * The conversation history is forwarded to the LLM for context-aware replies.
     *
     * @param text    user message in the current turn
     * @param history previous conversation messages (may be empty)
     * @return plain-text response in English
     */
    public String handleMessage(String text, List<Map<String, String>> history) {
        if (text == null || text.isBlank()) {
            return "Please type a message. You can ask me to list tasks, show sprint info, "
                    + "or describe what you need.";
        }

        ParsedIntent parsedIntent;
        try {
            parsedIntent = llmIntentParser.parse(text, history);
        } catch (Exception ex) {
            logger.error("Error analysing intent for message: {}", text, ex);
            return "An error occurred while processing your message. Please try again.";
        }

        // If the model needs more information, return the clarification question immediately
        if (parsedIntent.isClarificationNeeded()
                && !safe(parsedIntent.getClarificationQuestion()).isBlank()) {
            return parsedIntent.getClarificationQuestion();
        }

        switch (parsedIntent.getIntent()) {
            case HELP:
                return handleHelp();
            case LIST_TASKS:
                return handleListTasks();
            case TASKS_BY_USER:
                return handleTasksByUser(safe(parsedIntent.getAssignedTo()));
            case TASKS_BY_STATUS:
                return handleTasksByStatus(safe(parsedIntent.getFilterStatus()));
            case SPRINT_SUMMARY:
                return handleSprintSummary();
            case TEAM_WORKLOAD:
                return handleTeamWorkload();
            case VIEW_TASK: {
                String qt = parsedIntent.getQueryTitle();
                String vt = (qt != null && !qt.isBlank()) ? qt : parsedIntent.getTitle();
                return handleViewTask(safe(vt));
            }
            // Action intents — the dispatcher handles starting the wizard
            case CREATE_TASK:
            case ASSIGN_SPRINT:
            case COMPLETE_TASK:
            case MODIFY_TASK:
            case CREATE_SPRINT:
            case MODIFY_SPRINT:
            case SPRINT_TABLE:
            case KPI_REPORT:
                return "Use the menu buttons or describe what you need and I'll get started.";
            case UNKNOWN:
            default:
                return llmIntentParser.generarRespuestaConversacional(text, history);
        }
    }

    /**
     * Generates a response from an already-classified intent without invoking the LLM again.
     * Used by BotUpdateDispatcher to avoid a second LLM round-trip when the intent
     * was already resolved via {@link #classifyIntent(String, List)}.
     *
     * @param parsedIntent intent resolved by the dispatcher
     * @param text         original user message (used for conversational fallback)
     * @param history      previous conversation messages
     * @return plain-text response in English
     */
    public String generateResponse(ParsedIntent parsedIntent,
                                   String text,
                                   List<Map<String, String>> history) {
        if (parsedIntent == null) {
            return llmIntentParser.generarRespuestaConversacional(text, history);
        }

        if (parsedIntent.isClarificationNeeded()
                && !safe(parsedIntent.getClarificationQuestion()).isBlank()) {
            return parsedIntent.getClarificationQuestion();
        }

        switch (parsedIntent.getIntent()) {
            case HELP:
                return handleHelp();
            case LIST_TASKS:
                return handleListTasks();
            case TASKS_BY_USER:
                return handleTasksByUser(safe(parsedIntent.getAssignedTo()));
            case TASKS_BY_STATUS:
                return handleTasksByStatus(safe(parsedIntent.getFilterStatus()));
            case SPRINT_SUMMARY:
                return handleSprintSummary();
            case TEAM_WORKLOAD:
                return handleTeamWorkload();
            case VIEW_TASK: {
                String qt = parsedIntent.getQueryTitle();
                String vt = (qt != null && !qt.isBlank()) ? qt : parsedIntent.getTitle();
                return handleViewTask(safe(vt));
            }
            case UNKNOWN:
            default:
                return llmIntentParser.generarRespuestaConversacional(text, history);
        }
    }

    /**
     * Classifies the intent of a message and extracts available slots.
     * Used by BotUpdateDispatcher to decide which wizard to start.
     *
     * @param text    user message
     * @param history previous conversation messages
     * @return parsed intent with extracted slot values
     */
    public ParsedIntent classifyIntent(String text, List<Map<String, String>> history) {
        try {
            return llmIntentParser.parse(text, history);
        } catch (Exception ex) {
            logger.error("classifyIntent failed, returning UNKNOWN", ex);
            ParsedIntent unknown = new ParsedIntent();
            unknown.setIntent(IntentType.UNKNOWN);
            return unknown;
        }
    }

    // -------------------------------------------------------------------------
    // Deprecated backwards-compatibility delegates
    // -------------------------------------------------------------------------

    /** @deprecated Use {@link #handleMessage(String)} instead. */
    @Deprecated
    public String manejarMensaje(String text) {
        return handleMessage(text);
    }

    /** @deprecated Use {@link #handleMessage(String, List)} instead. */
    @Deprecated
    public String manejarMensaje(String text, List<Map<String, String>> history) {
        return handleMessage(text, history);
    }

    // -------------------------------------------------------------------------
    // Intent handlers
    // -------------------------------------------------------------------------

    /** Returns the static help text with the assistant's capabilities. */
    private String handleHelp() {
        return "I can help you with:\n"
                + "• List all tasks\n"
                + "• Tasks by team member (e.g. \"tasks of Gabriel\")\n"
                + "• Filter by status (e.g. \"pending tasks\")\n"
                + "• Active sprint summary\n"
                + "• Team workload\n"
                + "• Task details (e.g. \"details of Login task\")\n"
                + "• Or just ask anything about the project";
    }

    /** Lists all tasks (up to MAX_TAREAS visible, with an indicator when there are more). */
    private String handleListTasks() {
        List<Tarea> tasks = tareaService.obtenerTodosLasTareas();

        if (tasks.isEmpty()) {
            return "No tasks found.";
        }

        int total = tasks.size();
        StringBuilder sb = new StringBuilder("Tasks on record:\n");

        tasks.stream()
             .limit(MAX_TAREAS)
             .forEach(t -> sb.append(formatTaskBullet(t)).append("\n"));

        if (total > MAX_TAREAS) {
            sb.append("…and ").append(total - MAX_TAREAS).append(" more.");
        }

        return sb.toString().trim();
    }

    /**
     * Looks up a user by name (fuzzy normalized match) and lists their assigned tasks.
     *
     * @param searchName name of the user extracted from the intent
     */
    private String handleTasksByUser(String searchName) {
        if (searchName.isBlank()) {
            return "I didn't catch the user's name. Could you provide the full name or username?";
        }

        List<Usuario> users = usuarioService.obtenerTodosLosUsuarios();

        Optional<Usuario> found = users.stream()
                .filter(u -> normalize(safe(u.getNombreCompleto())).contains(normalize(searchName))
                          || normalize(safe(u.getNombreUsuario())).contains(normalize(searchName)))
                .findFirst();

        if (found.isEmpty()) {
            logger.warn("No user found with name: {}", searchName);
            return "No user found with name '" + searchName + "'. "
                    + "Please check that the name is spelled correctly.";
        }

        Usuario user = found.get();
        List<Tarea> tasks = tareaService.obtenerTareasPorUsuarioAsignado(user.getIdUsuario());

        if (tasks.isEmpty()) {
            return "No tasks assigned to " + safe(user.getNombreCompleto()) + ".";
        }

        int total = tasks.size();
        StringBuilder sb = new StringBuilder(
                "Tasks assigned to " + safe(user.getNombreCompleto()) + ":\n");

        tasks.stream()
             .limit(MAX_TAREAS)
             .forEach(t -> sb.append(formatTaskBulletWithStatus(t)).append("\n"));

        if (total > MAX_TAREAS) {
            sb.append("…and ").append(total - MAX_TAREAS).append(" more.");
        }

        return sb.toString().trim();
    }

    /**
     * Filters tasks by status using a normalized partial match.
     *
     * @param searchStatus status name extracted from the intent
     */
    private String handleTasksByStatus(String searchStatus) {
        if (searchStatus.isBlank()) {
            return "I didn't catch the status. Try: Pending, In Progress, or Completed.";
        }

        List<Tarea> all = tareaService.obtenerTodosLasTareas();

        List<Tarea> filtered = all.stream()
                .filter(t -> t.getEstatus() != null
                          && normalize(t.getEstatus().getNombre())
                                 .contains(normalize(searchStatus)))
                .collect(Collectors.toList());

        if (filtered.isEmpty()) {
            return "No tasks with status '" + searchStatus + "'.";
        }

        int total = filtered.size();
        StringBuilder sb = new StringBuilder(
                "Tasks with status '" + searchStatus + "':\n");

        filtered.stream()
                .limit(MAX_TAREAS)
                .forEach(t -> sb.append(formatTaskBullet(t)).append("\n"));

        if (total > MAX_TAREAS) {
            sb.append("…and ").append(total - MAX_TAREAS).append(" more.");
        }

        return sb.toString().trim();
    }

    /** Shows name, dates, totals, status breakdown, and hours for the active sprint. */
    private String handleSprintSummary() {
        Optional<Sprint> sprintOpt = sprintService.obtenerSprintActivo();

        if (sprintOpt.isEmpty()) {
            return "There is no active sprint at this time.";
        }

        Sprint sprint = sprintOpt.get();
        List<Tarea> tasks = tareaService.obtenerTareasPorSprint(sprint.getIdSprint());

        int totalTasks = tasks.size();

        Map<String, Long> byStatus = tasks.stream()
                .filter(t -> t.getEstatus() != null)
                .collect(Collectors.groupingBy(
                        t -> t.getEstatus().getNombre(),
                        Collectors.counting()));

        double estimatedHours = tasks.stream()
                .filter(t -> t.getHorasEstimadas() != null)
                .mapToDouble(Tarea::getHorasEstimadas)
                .sum();

        double actualHours = tasks.stream()
                .filter(t -> t.getHorasReales() != null)
                .mapToDouble(Tarea::getHorasReales)
                .sum();

        StringBuilder sb = new StringBuilder();
        sb.append("Active Sprint Summary\n");
        sb.append("Name: ").append(safe(sprint.getNombre())).append("\n");
        sb.append("Start: ").append(sprint.getFechaInicio() != null ? sprint.getFechaInicio() : "—").append("\n");
        sb.append("End: ").append(sprint.getFechaFin() != null ? sprint.getFechaFin() : "—").append("\n");
        sb.append("Total tasks: ").append(totalTasks).append("\n");

        if (!byStatus.isEmpty()) {
            sb.append("By status:\n");
            byStatus.forEach((status, count) ->
                    sb.append("  • ").append(status).append(": ").append(count).append("\n"));
        }

        sb.append(String.format("Estimated hours: %.1f\n", estimatedHours));
        sb.append(String.format("Actual hours: %.1f", actualHours));

        return sb.toString().trim();
    }

    /** Shows the task count per team member, sorted from highest to lowest. */
    private String handleTeamWorkload() {
        List<Tarea> all = tareaService.obtenerTodosLasTareas();

        if (all.isEmpty()) {
            return "No tasks on record to show team workload.";
        }

        Map<String, Long> workloadByPerson = all.stream()
                .collect(Collectors.groupingBy(
                        t -> (t.getUsuarioAsignado() != null
                                && t.getUsuarioAsignado().getNombreCompleto() != null)
                             ? t.getUsuarioAsignado().getNombreCompleto()
                             : "Unassigned",
                        Collectors.counting()));

        StringBuilder sb = new StringBuilder("Team workload:\n");

        workloadByPerson.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .forEach(entry ->
                        sb.append("• ").append(entry.getKey())
                          .append(": ").append(entry.getValue())
                          .append(" task(s)\n"));

        return sb.toString().trim();
    }

    /**
     * Searches for a task by partial title match and shows its details.
     *
     * @param searchTitle title or partial title extracted from the intent
     */
    private String handleViewTask(String searchTitle) {
        if (searchTitle == null || searchTitle.isBlank()) {
            return "Which task would you like to see? Please provide the title or part of the name.";
        }

        List<Tarea> all = tareaService.obtenerTodosLasTareas();

        Optional<Tarea> found = all.stream()
                .filter(t -> t.getTitulo() != null
                        && normalize(t.getTitulo()).contains(normalize(searchTitle)))
                .findFirst();

        if (found.isEmpty()) {
            return "No task found with title '" + searchTitle + "'. "
                    + "Please check that the name is spelled correctly.";
        }

        Tarea t = found.get();
        String status     = t.getEstatus() != null ? safe(t.getEstatus().getNombre()) : "—";
        String assignedTo = t.getUsuarioAsignado() != null
                ? safe(t.getUsuarioAsignado().getNombreCompleto()) : "Unassigned";
        String estHours   = t.getHorasEstimadas() != null ? String.valueOf(t.getHorasEstimadas()) : "—";
        String actHours   = t.getHorasReales()    != null ? String.valueOf(t.getHorasReales())    : "—";

        return "Task: " + safe(t.getTitulo()) + "\n"
                + "Status: " + status + "\n"
                + "Assigned to: " + assignedTo + "\n"
                + "Estimated hours: " + estHours + "\n"
                + "Actual hours: " + actHours;
    }

    // -------------------------------------------------------------------------
    // Format helpers
    // -------------------------------------------------------------------------

    /**
     * Formats a task as a single line: "• title [status] — assignee".
     * Shows title, status, and assignee name ("Unassigned" when null).
     */
    private String formatTaskBullet(Tarea task) {
        String title    = safe(task.getTitulo());
        String status   = task.getEstatus() != null
                ? safe(task.getEstatus().getNombre())
                : "no status";
        String assignee = task.getUsuarioAsignado() != null
                ? safe(task.getUsuarioAsignado().getNombreCompleto())
                : "Unassigned";
        return "• " + title + " [" + status + "] — " + assignee;
    }

    /**
     * Formats a task showing only title and status (without assignee).
     * Used in lists where the assignee is already the context (TASKS_BY_USER).
     */
    private String formatTaskBulletWithStatus(Tarea task) {
        String title  = safe(task.getTitulo());
        String status = task.getEstatus() != null
                ? safe(task.getEstatus().getNombre())
                : "no status";
        return "• " + title + " [" + status + "]";
    }

    // -------------------------------------------------------------------------
    // Utility helpers
    // -------------------------------------------------------------------------

    /**
     * Normalizes text for comparison: converts to lowercase and removes accents.
     *
     * @param text text to normalize
     * @return normalized text, or empty string if null
     */
    private String normalize(String text) {
        if (text == null) {
            return "";
        }
        return Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase();
    }

    /**
     * Returns the value if non-null, or an empty string otherwise.
     *
     * @param value possibly-null value
     * @return the original value or ""
     */
    private String safe(String value) {
        return value != null ? value : "";
    }
}
