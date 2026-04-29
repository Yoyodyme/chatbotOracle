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

import java.util.List;
import java.util.Map;

/**
 * Clasificador de intenciones que delega al LLM configurado (DeepSeek por defecto).
 * Si el agente está deshabilitado, la clave de API está en blanco, o ocurre cualquier
 * excepción, cae automáticamente al clasificador basado en reglas.
 */
@Component
public class LlmIntentParser implements IntentParser {

    private static final Logger log = LoggerFactory.getLogger(LlmIntentParser.class);

    private static final String PROMPT_SISTEMA_CLASIFICADOR =
            "Eres un clasificador de intenciones para un asistente de gestion agile en espanol. "
            + "IMPORTANTE: Responde UNICAMENTE con un objeto JSON plano. Sin markdown, sin bloques de codigo, "
            + "sin explicaciones. Solo el JSON crudo. "
            + "Intenciones permitidas: AYUDA, LISTAR_TAREAS, TAREAS_POR_ASIGNADO, TAREAS_POR_ESTATUS, "
            + "RESUMEN_SPRINT, CARGA_EQUIPO, DESCONOCIDO "
            + "Formato exacto: {\"intent\":\"...\",\"asignado\":null,\"estatus\":null,\"titulo\":null,"
            + "\"clarificationNeeded\":false,\"clarificationQuestion\":null} "
            + "Si falta informacion, pon clarificationNeeded en true y escribe la pregunta "
            + "en clarificationQuestion en espanol.";

    private static final String PROMPT_SISTEMA_CONVERSACIONAL =
            "Eres un asistente de gestion agile amable y util en espanol. Puedes responder preguntas "
            + "sobre Scrum, Kanban, metodologias agiles, gestion de proyectos de software y las tareas "
            + "del proyecto. Para cualquier otro tema responde: "
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
    // Implementación de IntentParser
    // -------------------------------------------------------------------------

    /**
     * Clasifica la intención del mensaje enviándolo al LLM con temperatura 0.
     * Cae al clasificador de reglas si el agente está deshabilitado o ante cualquier error.
     *
     * @param textoMensaje mensaje del usuario en español
     * @return intención clasificada con sus parámetros
     */
    @Override
    public ParsedIntent parse(String textoMensaje) {
        if (!aiProps.isHabilitado() || esClaveVacia(aiProps.getApiKey())) {
            log.debug("Agente IA deshabilitado o sin clave — usando clasificador de reglas");
            return parserRespaldo.parse(textoMensaje);
        }

        try {
            Map<String, Object> cuerpo = construirCuerpoSolicitud(
                    PROMPT_SISTEMA_CLASIFICADOR, textoMensaje, 0.0);

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
     * Útil para preguntas sobre metodologías ágiles que no requieren clasificación de intención.
     *
     * @param texto mensaje o pregunta del usuario
     * @return respuesta en español generada por el LLM, o mensaje de error si falla
     */
    public String generarRespuestaConversacional(String texto) {
        if (!aiProps.isHabilitado() || esClaveVacia(aiProps.getApiKey())) {
            return "El asistente IA no está disponible en este momento.";
        }

        try {
            Map<String, Object> cuerpo = construirCuerpoSolicitud(
                    PROMPT_SISTEMA_CONVERSACIONAL, texto, 0.7);

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
     *
     * @param promptSistema instrucciones de sistema para el modelo
     * @param mensajeUsuario texto del usuario
     * @param temperatura    nivel de aleatoriedad (0 = determinista, 0.7 = creativo)
     * @return mapa listo para serializar a JSON
     */
    private Map<String, Object> construirCuerpoSolicitud(String promptSistema,
                                                          String mensajeUsuario,
                                                          double temperatura) {
        return Map.of(
                "model", aiProps.getModelo(),
                "temperature", temperatura,
                "messages", List.of(
                        Map.of("role", "system",  "content", promptSistema),
                        Map.of("role", "user",    "content", mensajeUsuario)
                )
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
