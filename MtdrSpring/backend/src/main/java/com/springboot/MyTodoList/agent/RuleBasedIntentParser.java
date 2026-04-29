package com.springboot.MyTodoList.agent;

import org.springframework.stereotype.Component;

import java.text.Normalizer;

/**
 * Clasificador de intenciones basado en reglas de palabras clave en español.
 * Normaliza el texto (minúsculas + eliminación de acentos) antes de comparar.
 * Se usa como respaldo cuando el LLM no está disponible o falla.
 */
@Component
public class RuleBasedIntentParser implements IntentParser {

    private static final String PREFIJO_TAREAS_DE       = "tareas de ";
    private static final String PREFIJO_TAREAS_ASIGNADAS = "tareas asignadas a ";

    @Override
    public ParsedIntent parse(String textoMensaje) {
        if (textoMensaje == null || textoMensaje.isBlank()) {
            return intentDesconocido();
        }

        String texto = normalizarTexto(textoMensaje);

        // 1. Ayuda
        if (texto.contains("ayuda") || texto.contains("help")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.AYUDA);
            return resultado;
        }

        // 2. Resumen de sprint
        if (texto.contains("sprint actual")
                || texto.contains("resumen sprint")
                || texto.contains("estado del sprint")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.RESUMEN_SPRINT);
            return resultado;
        }

        // 3. Carga del equipo
        if (texto.contains("carga del equipo")
                || texto.contains("quien tiene mas carga")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.CARGA_EQUIPO);
            return resultado;
        }

        // 4. Tareas por asignado — extraer nombre tras la preposición
        if (texto.contains(PREFIJO_TAREAS_DE) || texto.contains(PREFIJO_TAREAS_ASIGNADAS)) {
            String nombre = extraerNombreTrasPreposicion(texto);
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.TAREAS_POR_ASIGNADO);
            resultado.setAsignado(nombre);
            return resultado;
        }

        // 5. Tareas por estatus
        if (texto.contains("pendiente")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.TAREAS_POR_ESTATUS);
            resultado.setEstatus("pendiente");
            return resultado;
        }
        if (texto.contains("en progreso")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.TAREAS_POR_ESTATUS);
            resultado.setEstatus("en progreso");
            return resultado;
        }
        if (texto.contains("completada") || texto.contains("completadas")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.TAREAS_POR_ESTATUS);
            resultado.setEstatus("completada");
            return resultado;
        }

        // 6. Listar todas las tareas
        if (texto.contains("listar")
                || texto.contains("lista")
                || texto.contains("todas las tareas")) {
            ParsedIntent resultado = new ParsedIntent();
            resultado.setIntent(IntentType.LISTAR_TAREAS);
            return resultado;
        }

        // 7. Sin coincidencia
        return intentDesconocido();
    }

    // -------------------------------------------------------------------------
    // Métodos de apoyo privados
    // -------------------------------------------------------------------------

    /**
     * Convierte el texto a minúsculas y elimina marcas diacríticas (acentos)
     * usando la descomposición canónica NFD del estándar Unicode.
     *
     * @param texto texto original del usuario
     * @return texto normalizado listo para comparación
     */
    private String normalizarTexto(String texto) {
        return Normalizer
                .normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase();
    }

    /**
     * Extrae el nombre del integrante que aparece después de "tareas de " o
     * "tareas asignadas a " en el texto ya normalizado.
     *
     * @param textoNormalizado texto en minúsculas sin acentos
     * @return nombre extraído, o null si no se encontró
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

    /** Crea un ParsedIntent con intención DESCONOCIDO y todos los demás campos vacíos. */
    private ParsedIntent intentDesconocido() {
        ParsedIntent resultado = new ParsedIntent();
        resultado.setIntent(IntentType.DESCONOCIDO);
        return resultado;
    }
}
