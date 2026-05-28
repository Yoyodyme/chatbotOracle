package com.springboot.MyTodoList.agent;

import org.springframework.stereotype.Component;

import java.text.Normalizer;

/**
 * Rule-based intent classifier using English and Spanish keywords.
 * Normalizes text (lowercase + accent removal) before comparing.
 * Used as fallback when the LLM is unavailable or fails.
 *
 * Spanish keywords are kept for backwards compatibility with existing bot users.
 */
@Component
public class RuleBasedIntentParser implements IntentParser {

    private static final String PREFIX_TASKS_OF        = "tasks of ";
    private static final String PREFIX_TASKS_ASSIGNED  = "tasks assigned to ";

    @Override
    public ParsedIntent parse(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return unknownIntent();
        }

        String text = normalizeText(userMessage);

        // 1. Help
        if (text.contains("help") || text.contains("ayuda")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.HELP);
            return result;
        }

        // 2. Sprint summary
        if (text.contains("current sprint")
                || text.contains("sprint summary")
                || text.contains("sprint status")
                || text.contains("sprint actual")
                || text.contains("resumen sprint")
                || text.contains("estado del sprint")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.SPRINT_SUMMARY);
            return result;
        }

        // 3. Team workload
        if (text.contains("team workload")
                || text.contains("who has the most work")
                || text.contains("carga del equipo")
                || text.contains("quien tiene mas carga")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.TEAM_WORKLOAD);
            return result;
        }

        // 4. Tasks by assignee — extract name after the preposition
        if (text.contains(PREFIX_TASKS_OF) || text.contains(PREFIX_TASKS_ASSIGNED)) {
            String name = extractNameAfterPreposition(text);
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.TASKS_BY_USER);
            result.setAssignedTo(name);
            return result;
        }

        // 5. Tasks by status
        if (text.contains("pending") || text.contains("pendiente")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.TASKS_BY_STATUS);
            result.setFilterStatus("pending");
            return result;
        }
        if (text.contains("in progress") || text.contains("en progreso")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.TASKS_BY_STATUS);
            result.setFilterStatus("in progress");
            return result;
        }
        if (text.contains("completed") || text.contains("completada") || text.contains("completadas")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.TASKS_BY_STATUS);
            result.setFilterStatus("completed");
            return result;
        }

        // 6. List all tasks
        if (text.contains("list")
                || text.contains("all tasks")
                || text.contains("listar")
                || text.contains("lista")
                || text.contains("todas las tareas")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.LIST_TASKS);
            return result;
        }

        // 7. View details of a specific task
        if (text.contains("detail")
                || text.contains("view task")
                || text.contains("show task")
                || text.contains("detalle")
                || text.contains("ver tarea")
                || text.contains("mostrar tarea")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.VIEW_TASK);
            return result;
        }

        // 8. Modify or edit a task
        if (text.contains("modify")
                || text.contains("edit task")
                || text.contains("change task")
                || text.contains("modificar")
                || text.contains("editar tarea")
                || text.contains("cambiar tarea")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.MODIFY_TASK);
            return result;
        }

        // 9. Create a new task
        if (text.contains("create task")
                || text.contains("new task")
                || text.contains("add task")
                || text.contains("crear tarea")
                || text.contains("nueva tarea")
                || text.contains("agregar tarea")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.CREATE_TASK);
            return result;
        }

        // 10. Assign / reassign a task to a sprint
        if (text.contains("assign sprint")
                || text.contains("add to sprint")
                || text.contains("assign to sprint")
                || text.contains("reassign")
                || text.contains("asignar sprint")
                || text.contains("agregar al sprint")
                || text.contains("reasignar")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.ASSIGN_SPRINT);
            return result;
        }

        // 11. Complete / mark a task done
        if (text.contains("complete task")
                || text.contains("mark done")
                || text.contains("finish task")
                || text.contains("done task")
                || text.contains("completar tarea")
                || text.contains("marcar completada")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.COMPLETE_TASK);
            return result;
        }

        // 12. Create a new sprint
        if (text.contains("create sprint")
                || text.contains("new sprint")
                || text.contains("add sprint")
                || text.contains("crear sprint")
                || text.contains("nuevo sprint")) {
            ParsedIntent result = new ParsedIntent();
            result.setIntent(IntentType.CREATE_SPRINT);
            return result;
        }

        // 13. No match
        return unknownIntent();
    }

    // -------------------------------------------------------------------------
    // Private helper methods
    // -------------------------------------------------------------------------

    /**
     * Converts text to lowercase and removes diacritical marks (accents)
     * using the NFD canonical decomposition of the Unicode standard.
     *
     * @param text original text from the user
     * @return normalized text ready for comparison
     */
    private String normalizeText(String text) {
        return Normalizer
                .normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase();
    }

    /**
     * Extracts the team member name that appears after "tasks of " or
     * "tasks assigned to " in the already normalized text.
     *
     * @param normalizedText lowercase text without accents
     * @return extracted name, or null if not found
     */
    private String extractNameAfterPreposition(String normalizedText) {
        int start = normalizedText.indexOf(PREFIX_TASKS_ASSIGNED);
        if (start >= 0) {
            return normalizedText.substring(start + PREFIX_TASKS_ASSIGNED.length()).trim();
        }
        start = normalizedText.indexOf(PREFIX_TASKS_OF);
        if (start >= 0) {
            return normalizedText.substring(start + PREFIX_TASKS_OF.length()).trim();
        }
        return null;
    }

    /** Creates a ParsedIntent with UNKNOWN intent and all other fields empty. */
    private ParsedIntent unknownIntent() {
        ParsedIntent result = new ParsedIntent();
        result.setIntent(IntentType.UNKNOWN);
        return result;
    }
}
