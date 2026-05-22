package com.springboot.MyTodoList.agent;

import org.springframework.stereotype.Component;

import java.text.Normalizer;

/**
 * Rule-based intent classifier using English keywords.
 * Normalizes text (lowercase + accent removal) before comparing.
 * Used as fallback when the LLM is unavailable or fails.
 */
@Component
public class RuleBasedIntentParser implements IntentParser {

    private static final String PREFIJO_TAREAS_DE       = "tasks of ";
    private static final String PREFIJO_TAREAS_ASIGNADAS = "tasks assigned to ";

    @Override
    public ParsedIntent parse(String textoMensaje) {
        if (textoMensaje == null || textoMensaje.isBlank()) {
            return intentDesconocido();
        }

        String texto = normalizarTexto(textoMensaje);

        // 1. Help
        if (texto.contains("help") || texto.contains("ayuda")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.AYUDA);
            return resultado;
        }

        // 2. Sprint summary
        if (texto.contains("current sprint")
                || texto.contains("sprint summary")
                || texto.contains("sprint status")
                || texto.contains("sprint actual")
                || texto.contains("resumen sprint")
                || texto.contains("estado del sprint")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.RESUMEN_SPRINT);
            return resultado;
        }

        // 3. Team workload
        if (texto.contains("team workload")
                || texto.contains("who has the most work")
                || texto.contains("carga del equipo")
                || texto.contains("quien tiene mas carga")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.CARGA_EQUIPO);
            return resultado;
        }

        // 4. Tasks by assignee — extract name after the preposition
        if (texto.contains(PREFIJO_TAREAS_DE) || texto.contains(PREFIJO_TAREAS_ASIGNADAS)) {
            String nombre = extraerNombreTrasPreposicion(texto);
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.TAREAS_POR_ASIGNADO);
            resultado.setAsignado(nombre);
            return resultado;
        }

        // 5. Tasks by status
        if (texto.contains("pending") || texto.contains("pendiente")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.TAREAS_POR_ESTATUS);
            resultado.setEstatus("pending");
            return resultado;
        }
        if (texto.contains("in progress") || texto.contains("en progreso")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.TAREAS_POR_ESTATUS);
            resultado.setEstatus("in progress");
            return resultado;
        }
        if (texto.contains("completed") || texto.contains("completada") || texto.contains("completadas")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.TAREAS_POR_ESTATUS);
            resultado.setEstatus("completed");
            return resultado;
        }

        // 6. List all tasks
        if (texto.contains("list")
                || texto.contains("all tasks")
                || texto.contains("listar")
                || texto.contains("lista")
                || texto.contains("todas las tareas")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.LISTAR_TAREAS);
            return resultado;
        }

        // 7. View details of a specific task
        if (texto.contains("detail")
                || texto.contains("view task")
                || texto.contains("show task")
                || texto.contains("detalle")
                || texto.contains("ver tarea")
                || texto.contains("mostrar tarea")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.VER_TAREA);
            return resultado;
        }

        // 8. Modify or edit a task
        if (texto.contains("modify")
                || texto.contains("edit task")
                || texto.contains("change task")
                || texto.contains("modificar")
                || texto.contains("editar tarea")
                || texto.contains("cambiar tarea")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.MODIFICAR_TAREA);
            return resultado;
        }

        // 9. Assign or reassign a task
        if (texto.contains("assign")
                || texto.contains("reassign")
                || texto.contains("asignar")
                || texto.contains("reasignar")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.ASIGNAR_TAREA);
            return resultado;
        }

        // 10. No match
        return intentDesconocido();
    }

    // -------------------------------------------------------------------------
    // Private helper methods
    // -------------------------------------------------------------------------

    /**
     * Converts text to lowercase and removes diacritical marks (accents)
     * using the NFD canonical decomposition of the Unicode standard.
     *
     * @param texto original text from the user
     * @return normalized text ready for comparison
     */
    private String normalizarTexto(String texto) {
        return Normalizer
                .normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase();
    }

    /**
     * Extracts the team member name that appears after "tasks of " or
     * "tasks assigned to " in the already normalized text.
     *
     * @param textoNormalizado lowercase text without accents
     * @return extracted name, or null if not found
     */
    private String extraerNombreTrasPreposicion(String textoNormalizado) {
        int inicio = textoNormalizado.indexOf(PREFIJO_TAREAS_ASIGNADAS);
        if (inicio >= 0) {
            return textoNormalizado.substring(inicio + PREFIJO_TAREAS_ASIGNADAS.length()).trim();
        }
        inicio = textoNormalizado.indexOf(PREFIJO_TAREAS_DE);
        if (inicio >= 0) {
            return textoNormalizado.substring(inicio + PREFIJO_TAREAS_DE.length()).trim();
        }
        return null;
    }

    /** Creates a ParsedIntent with DESCONOCIDO intent and all other fields empty. */
    private ParsedIntent intentDesconocido() {
        ParsedIntent resultado = new ParsedIntent();
        resultado.setIntent(IntentType.DESCONOCIDO);
        return resultado;
    }
}
