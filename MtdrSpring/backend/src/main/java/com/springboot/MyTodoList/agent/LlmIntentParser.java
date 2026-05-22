package com.springboot.MyTodoList.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.springboot.MyTodoList.config.AiProps;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Intent classifier that delegates to the configured LLM (DeepSeek by default).
 * If the agent is disabled, the API key is blank, or any exception occurs,
 * it falls back automatically to the rule-based classifier.
 *
 * Supports multi-turn conversation history: when a non-empty history is provided,
 * previous messages are inserted between the system message and the new user
 * message, giving the model context.
 */
@Component
public class LlmIntentParser implements IntentParser {

    private static final Logger log = LoggerFactory.getLogger(LlmIntentParser.class);

    private static final String PROMPT_SISTEMA_CLASIFICADOR =
            "You are an intent classifier for an agile management assistant in English. "
            + "IMPORTANT: Respond ONLY with a plain JSON object. No markdown, no code blocks, "
            + "no explanations. Raw JSON only. "
            + "Allowed intents: AYUDA, LISTAR_TAREAS, TAREAS_POR_ASIGNADO, TAREAS_POR_ESTATUS, "
            + "RESUMEN_SPRINT, CARGA_EQUIPO, VER_TAREA, MODIFICAR_TAREA, ASIGNAR_TAREA, DESCONOCIDO "
            + "Exact format: {\"intent\":\"...\",\"asignado\":null,\"estatus\":null,\"titulo\":null,"
            + "\"clarificationNeeded\":false,\"clarificationQuestion\":null} "
            + "If information is missing, set clarificationNeeded to true and write the question "
            + "in clarificationQuestion in English.";

    private static final String PROMPT_SISTEMA_CONVERSACIONAL =
            "You are an assistant for the Yoyodyme project. You have access to information about tasks, "
            + "sprints, and users. You can answer questions about Scrum, Kanban, agile methodologies, "
            + "software project management, and the project's tasks. "
            + "Always respond in English. For any other topic respond: "
            + "\"I can only help you with project queries or agile methodologies.\"";

    private final AiProps aiProps;
    private final RuleBasedIntentParser parserRespaldo;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public LlmIntentParser(AiProps aiProps,
                           RuleBasedIntentParser parserRespaldo,
                           ObjectMapper objectMapper) {
        this.aiProps        = aiProps;
        this.parserRespaldo = parserRespaldo;
        this.objectMapper   = objectMapper;

        // Built once with fixed authentication headers
        this.restClient = RestClient.builder()
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + aiProps.getApiKey())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    // -------------------------------------------------------------------------
    // IntentParser implementation (interface contract — no history)
    // -------------------------------------------------------------------------

    /**
     * Classifies the intent of a message by sending it to the LLM at temperature 0.
     * History-free version, compatible with existing callers.
     * Delegates to {@link #parse(String, List)} with an empty list.
     *
     * @param textoMensaje user message
     * @return classified intent with its parameters
     */
    @Override
    public ParsedIntent parse(String textoMensaje) {
        return parse(textoMensaje, Collections.emptyList());
    }

    /**
     * Classifies the intent of a message by sending it to the LLM at temperature 0.
     * Includes the previous conversation history for additional context.
     * Falls back to the rule-based classifier if the agent is disabled or any error occurs.
     *
     * @param textoMensaje user message
     * @param historial    previous conversation messages (may be empty)
     * @return classified intent with its parameters
     */
    public ParsedIntent parse(String textoMensaje, List<Map<String, String>> historial) {
        if (!aiProps.isHabilitado() || esClaveVacia(aiProps.getApiKey())) {
            log.debug("AI agent disabled or missing key — using rule-based classifier");
            return parserRespaldo.parse(textoMensaje);
        }

        try {
            Map<String, Object> cuerpo = construirCuerpoSolicitud(
                    PROMPT_SISTEMA_CLASIFICADOR, textoMensaje, 0.0, historial);

            String respuestaRaw = restClient.post()
                    .uri(aiProps.getApiUrl())
                    .body(cuerpo)
                    .retrieve()
                    .body(String.class);

            String contenido = extraerContenido(respuestaRaw);
            String json      = eliminarMarkdown(contenido);

            return objectMapper.readValue(json, ParsedIntent.class);

        } catch (Exception ex) {
            log.warn("LlmIntentParser failed to classify intent — using rule-based classifier. "
                    + "Cause: {}", ex.getMessage());
            return parserRespaldo.parse(textoMensaje);
        }
    }

    // -------------------------------------------------------------------------
    // Additional public agent methods
    // -------------------------------------------------------------------------

    /**
     * Generates a free conversational response using the LLM at temperature 0.7.
     * History-free version, compatible with existing callers.
     * Delegates to {@link #generarRespuestaConversacional(String, List)} with an empty list.
     *
     * @param texto user message or question
     * @return response generated by the LLM, or an error message if it fails
     */
    public String generarRespuestaConversacional(String texto) {
        return generarRespuestaConversacional(texto, Collections.emptyList());
    }

    /**
     * Generates a free conversational response using the LLM at temperature 0.7.
     * Includes the previous conversation history to give the model context.
     *
     * @param texto     user message or question
     * @param historial previous conversation messages (may be empty)
     * @return response generated by the LLM, or an error message if it fails
     */
    public String generarRespuestaConversacional(String texto, List<Map<String, String>> historial) {
        if (!aiProps.isHabilitado() || esClaveVacia(aiProps.getApiKey())) {
            return "The AI assistant is not available at this time.";
        }

        try {
            Map<String, Object> cuerpo = construirCuerpoSolicitud(
                    PROMPT_SISTEMA_CONVERSACIONAL, texto, 0.7, historial);

            String respuestaRaw = restClient.post()
                    .uri(aiProps.getApiUrl())
                    .body(cuerpo)
                    .retrieve()
                    .body(String.class);

            return extraerContenido(respuestaRaw);

        } catch (Exception ex) {
            log.warn("LlmIntentParser failed to generate conversational response. Cause: {}",
                    ex.getMessage());
            return "Sorry, I could not process your request at this time.";
        }
    }

    // -------------------------------------------------------------------------
    // Private helper methods
    // -------------------------------------------------------------------------

    /**
     * Builds the map representing the JSON request body for the LLM.
     * If a non-empty history is provided, previous messages are inserted
     * between the system message and the new user message.
     *
     * @param promptSistema  system instructions for the model
     * @param mensajeUsuario user text in the current turn
     * @param temperatura    randomness level (0 = deterministic, 0.7 = creative)
     * @param historial      previous conversation messages (may be empty or null)
     * @return map ready to serialize to JSON
     */
    private Map<String, Object> construirCuerpoSolicitud(String promptSistema,
                                                          String mensajeUsuario,
                                                          double temperatura,
                                                          List<Map<String, String>> historial) {
        List<Map<String, String>> mensajes = new ArrayList<>();

        // 1. System message (always first)
        mensajes.add(Map.of("role", "system", "content", promptSistema));

        // 2. Previous history (if present) to provide multi-turn context
        if (historial != null && !historial.isEmpty()) {
            mensajes.addAll(historial);
        }

        // 3. Current user message (always last)
        mensajes.add(Map.of("role", "user", "content", mensajeUsuario));

        return Map.of(
                "model",       aiProps.getModelo(),
                "temperature", temperatura,
                "messages",    mensajes
        );
    }

    /**
     * Extracts the text from {@code choices[0].message.content} in the LLM JSON response.
     *
     * @param respuestaJson full response in JSON string format
     * @return content of the message generated by the model
     * @throws Exception if the JSON does not have the expected structure
     */
    private String extraerContenido(String respuestaJson) throws Exception {
        JsonNode raiz = objectMapper.readTree(respuestaJson);
        return raiz.path("choices")
                   .path(0)
                   .path("message")
                   .path("content")
                   .asText();
    }

    /**
     * Removes Markdown code blocks (``` ... ```) from the beginning and end of text
     * so the JSON can be deserialized correctly.
     *
     * @param texto text that may contain Markdown delimiters
     * @return clean text without delimiters
     */
    private String eliminarMarkdown(String texto) {
        if (texto == null) {
            return "";
        }
        // Remove opening block with optional label: ```json or ```
        String limpio = texto.strip().replaceAll("^```[a-zA-Z]*\\s*", "");
        // Remove closing block
        limpio = limpio.replaceAll("```\\s*$", "");
        return limpio.strip();
    }

    /** Checks whether the API key is null or blank. */
    private boolean esClaveVacia(String clave) {
        return clave == null || clave.isBlank();
    }
}
