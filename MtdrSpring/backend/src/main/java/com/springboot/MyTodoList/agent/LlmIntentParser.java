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
 * Clasificador de intenciones que delega al LLM configurado (DeepSeek por defecto).
 * Si el agente está deshabilitado, la clave de API está en blanco, o ocurre cualquier
 * excepción, cae automáticamente al clasificador basado en reglas.
 *
 * Soporta historial de conversación multi-turno: cuando se proporciona un historial
 * no vacío, los mensajes previos se insertan entre el mensaje de sistema y el nuevo
 * mensaje del usuario, dando contexto al modelo.
 */
@Component
public class LlmIntentParser implements IntentParser {

    private static final Logger log = LoggerFactory.getLogger(LlmIntentParser.class);

    private static final String PROMPT_SISTEMA_CLASIFICADOR =
            "Eres un clasificador de intenciones para un asistente de gestion agile en espanol. "
            + "IMPORTANTE: Responde UNICAMENTE con un objeto JSON plano. Sin markdown, sin bloques de codigo, "
            + "sin explicaciones. Solo el JSON crudo. "
            + "Intenciones permitidas: AYUDA, LISTAR_TAREAS, TAREAS_POR_ASIGNADO, TAREAS_POR_ESTATUS, "
            + "RESUMEN_SPRINT, CARGA_EQUIPO, VER_TAREA, MODIFICAR_TAREA, ASIGNAR_TAREA, DESCONOCIDO "
            + "Formato exacto: {\"intent\":\"...\",\"asignado\":null,\"estatus\":null,\"titulo\":null,"
            + "\"clarificationNeeded\":false,\"clarificationQuestion\":null} "
            + "Si falta informacion, pon clarificationNeeded en true y escribe la pregunta "
            + "en clarificationQuestion en espanol.";

    private static final String PROMPT_SISTEMA_CONVERSACIONAL =
            "Eres un asistente para el proyecto Yoyodyme. Tienes acceso a informacion de tareas, "
            + "sprints y usuarios. Puedes responder preguntas sobre Scrum, Kanban, metodologias agiles, "
            + "gestion de proyectos de software y las tareas del proyecto. "
            + "Responde siempre en espanol. Para cualquier otro tema responde: "
            + "\"Solo puedo ayudarte con consultas del proyecto o metodologias agiles.\"";

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

        // Se construye una sola vez con los headers fijos de autenticación
        this.restClient = RestClient.builder()
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + aiProps.getApiKey())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    // -------------------------------------------------------------------------
    // Implementación de IntentParser (contrato de interfaz — sin historial)
    // -------------------------------------------------------------------------

    /**
     * Clasifica la intención del mensaje enviándolo al LLM con temperatura 0.
     * Versión sin historial, compatible con llamadores existentes.
     * Delega a {@link #parse(String, List)} con lista vacía.
     *
     * @param textoMensaje mensaje del usuario en español
     * @return intención clasificada con sus parámetros
     */
    @Override
    public ParsedIntent parse(String textoMensaje) {
        return parse(textoMensaje, Collections.emptyList());
    }

    /**
     * Clasifica la intención del mensaje enviándolo al LLM con temperatura 0.
     * Incluye el historial previo de la conversación para mayor contexto.
     * Cae al clasificador de reglas si el agente está deshabilitado o ante cualquier error.
     *
     * @param textoMensaje mensaje del usuario en español
     * @param historial    mensajes previos de la conversación (puede estar vacío)
     * @return intención clasificada con sus parámetros
     */
    public ParsedIntent parse(String textoMensaje, List<Map<String, String>> historial) {
        if (!aiProps.isHabilitado() || esClaveVacia(aiProps.getApiKey())) {
            log.debug("Agente IA deshabilitado o sin clave — usando clasificador de reglas");
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
            log.warn("LlmIntentParser falló al clasificar intención — usando clasificador de reglas. "
                    + "Causa: {}", ex.getMessage());
            return parserRespaldo.parse(textoMensaje);
        }
    }

    // -------------------------------------------------------------------------
    // Métodos públicos adicionales del agente
    // -------------------------------------------------------------------------

    /**
     * Genera una respuesta conversacional libre usando el LLM con temperatura 0.7.
     * Versión sin historial, compatible con llamadores existentes.
     * Delega a {@link #generarRespuestaConversacional(String, List)} con lista vacía.
     *
     * @param texto mensaje o pregunta del usuario
     * @return respuesta en español generada por el LLM, o mensaje de error si falla
     */
    public String generarRespuestaConversacional(String texto) {
        return generarRespuestaConversacional(texto, Collections.emptyList());
    }

    /**
     * Genera una respuesta conversacional libre usando el LLM con temperatura 0.7.
     * Incluye el historial previo de la conversación para dar contexto al modelo.
     *
     * @param texto     mensaje o pregunta del usuario
     * @param historial mensajes previos de la conversación (puede estar vacío)
     * @return respuesta en español generada por el LLM, o mensaje de error si falla
     */
    public String generarRespuestaConversacional(String texto, List<Map<String, String>> historial) {
        if (!aiProps.isHabilitado() || esClaveVacia(aiProps.getApiKey())) {
            return "El asistente IA no está disponible en este momento.";
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
            log.warn("LlmIntentParser falló al generar respuesta conversacional. Causa: {}",
                    ex.getMessage());
            return "Lo siento, no pude procesar tu consulta en este momento.";
        }
    }

    // -------------------------------------------------------------------------
    // Métodos de apoyo privados
    // -------------------------------------------------------------------------

    /**
     * Construye el mapa que representa el cuerpo JSON de la solicitud al LLM.
     * Si se proporciona un historial no vacío, los mensajes previos se insertan
     * entre el mensaje de sistema y el nuevo mensaje del usuario.
     *
     * @param promptSistema  instrucciones de sistema para el modelo
     * @param mensajeUsuario texto del usuario en el turno actual
     * @param temperatura    nivel de aleatoriedad (0 = determinista, 0.7 = creativo)
     * @param historial      mensajes previos de la conversación (puede ser vacío o null)
     * @return mapa listo para serializar a JSON
     */
    private Map<String, Object> construirCuerpoSolicitud(String promptSistema,
                                                          String mensajeUsuario,
                                                          double temperatura,
                                                          List<Map<String, String>> historial) {
        List<Map<String, String>> mensajes = new ArrayList<>();

        // 1. Mensaje de sistema (siempre primero)
        mensajes.add(Map.of("role", "system", "content", promptSistema));

        // 2. Historial previo (si existe) para dar contexto multi-turno
        if (historial != null && !historial.isEmpty()) {
            mensajes.addAll(historial);
        }

        // 3. Mensaje actual del usuario (siempre al final)
        mensajes.add(Map.of("role", "user", "content", mensajeUsuario));

        return Map.of(
                "model",       aiProps.getModelo(),
                "temperature", temperatura,
                "messages",    mensajes
        );
    }

    /**
     * Extrae el texto de {@code choices[0].message.content} de la respuesta JSON del LLM.
     *
     * @param respuestaJson respuesta completa en formato JSON string
     * @return contenido del mensaje generado por el modelo
     * @throws Exception si el JSON no tiene la estructura esperada
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
     * Elimina bloques de código Markdown (``` ... ```) al inicio y final del texto
     * para que el JSON pueda deserializarse correctamente.
     *
     * @param texto texto que puede contener delimitadores Markdown
     * @return texto limpio sin delimitadores
     */
    private String eliminarMarkdown(String texto) {
        if (texto == null) {
            return "";
        }
        // Eliminar bloque de apertura con etiqueta opcional: ```json o ```
        String limpio = texto.strip().replaceAll("^```[a-zA-Z]*\\s*", "");
        // Eliminar bloque de cierre
        limpio = limpio.replaceAll("```\\s*$", "");
        return limpio.strip();
    }

    /** Comprueba si la clave de API es nula o está en blanco. */
    private boolean esClaveVacia(String clave) {
        return clave == null || clave.isBlank();
    }
}
