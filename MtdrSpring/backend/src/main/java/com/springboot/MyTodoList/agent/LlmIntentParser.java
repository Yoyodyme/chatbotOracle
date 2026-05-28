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
            "You are an intent classifier for an agile project management Telegram bot. "
            + "IMPORTANT: Respond ONLY with a plain JSON object — no markdown, no code blocks, no explanation. Raw JSON only. "
            + "Allowed intents: HELP, LIST_TASKS, TASKS_BY_USER, TASKS_BY_STATUS, SPRINT_SUMMARY, TEAM_WORKLOAD, "
            + "VIEW_TASK, CREATE_TASK, ASSIGN_SPRINT, COMPLETE_TASK, MODIFY_TASK, CREATE_SPRINT, MODIFY_SPRINT, "
            + "SPRINT_TABLE, KPI_REPORT, UNKNOWN. "
            + "Exact JSON format: "
            + "{\"intent\":\"...\",\"title\":null,\"sprintName\":null,\"assigneeName\":null,\"priority\":null,"
            + "\"estimatedHours\":null,\"asignado\":null,\"estatus\":null,\"titulo\":null,"
            + "\"clarificationNeeded\":false,\"clarificationQuestion\":null} "
            + "Slot extraction rules: "
            + "- 'title': task name for CREATE_TASK, MODIFY_TASK, or VIEW_TASK. "
            + "- 'sprintName': sprint name/number if mentioned. "
            + "- 'assigneeName': person to assign a task to (CREATE_TASK/MODIFY_TASK). "
            + "- 'priority': High, Medium, or Low if mentioned. "
            + "- 'estimatedHours': numeric hours if mentioned. "
            + "- 'asignado': person name for TASKS_BY_USER queries. "
            + "- 'estatus': status string for TASKS_BY_STATUS queries (Pending/In Progress/Completed). "
            + "- 'titulo': task name for VIEW_TASK informational queries. "
            + "If critical information is missing and a clarification is needed, set clarificationNeeded:true.";

    private static final String PROMPT_SISTEMA_CONVERSACIONAL =
            "You are an assistant for the EQ51 agile project. "
            + "You can answer questions about tasks, sprints, team members, Scrum, Kanban, and agile methodologies. "
            + "Always respond in English. "
            + "For topics unrelated to project management, respond: "
            + "\"I can only help with project and agile methodology questions.\"";

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
     * @param userMessage user message
     * @return classified intent with its parameters
     */
    @Override
    public ParsedIntent parse(String userMessage) {
        return parse(userMessage, Collections.emptyList());
    }

    /**
     * Classifies the intent of a message by sending it to the LLM at temperature 0.
     * Includes the previous conversation history for additional context.
     * Falls back to the rule-based classifier if the agent is disabled or any error occurs.
     *
     * @param userMessage user message
     * @param history     previous conversation messages (may be empty)
     * @return classified intent with its parameters
     */
    public ParsedIntent parse(String userMessage, List<Map<String, String>> history) {
        if (!aiProps.isHabilitado() || isApiKeyBlank(aiProps.getApiKey())) {
            log.debug("AI agent disabled or missing key — using rule-based classifier");
            return parserRespaldo.parse(userMessage);
        }

        try {
            Map<String, Object> requestBody = buildRequestBody(
                    PROMPT_SISTEMA_CLASIFICADOR, userMessage, 0.0, history);

            String rawResponse = restClient.post()
                    .uri(aiProps.getApiUrl())
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            String content  = extractContent(rawResponse);
            String jsonText = stripMarkdown(content);

            return objectMapper.readValue(jsonText, ParsedIntent.class);

        } catch (Exception ex) {
            log.warn("LlmIntentParser failed to classify intent — using rule-based classifier. "
                    + "Cause: {}", ex.getMessage());
            return parserRespaldo.parse(userMessage);
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
     * @param text user message or question
     * @return response generated by the LLM, or an error message if it fails
     */
    public String generarRespuestaConversacional(String text) {
        return generarRespuestaConversacional(text, Collections.emptyList());
    }

    /**
     * Generates a free conversational response using the LLM at temperature 0.7.
     * Includes the previous conversation history to give the model context.
     *
     * @param text    user message or question
     * @param history previous conversation messages (may be empty)
     * @return response generated by the LLM, or an error message if it fails
     */
    public String generarRespuestaConversacional(String text, List<Map<String, String>> history) {
        if (!aiProps.isHabilitado() || isApiKeyBlank(aiProps.getApiKey())) {
            return "The AI assistant is not available at this time.";
        }

        try {
            Map<String, Object> requestBody = buildRequestBody(
                    PROMPT_SISTEMA_CONVERSACIONAL, text, 0.7, history);

            String rawResponse = restClient.post()
                    .uri(aiProps.getApiUrl())
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            return extractContent(rawResponse);

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
     * @param systemPrompt  system instructions for the model
     * @param userMessage   user text in the current turn
     * @param temperature   randomness level (0 = deterministic, 0.7 = creative)
     * @param history       previous conversation messages (may be empty or null)
     * @return map ready to serialize to JSON
     */
    private Map<String, Object> buildRequestBody(String systemPrompt,
                                                  String userMessage,
                                                  double temperature,
                                                  List<Map<String, String>> history) {
        List<Map<String, String>> messages = new ArrayList<>();

        // 1. System message (always first)
        messages.add(Map.of("role", "system", "content", systemPrompt));

        // 2. Previous history (if present) to provide multi-turn context
        if (history != null && !history.isEmpty()) {
            messages.addAll(history);
        }

        // 3. Current user message (always last)
        messages.add(Map.of("role", "user", "content", userMessage));

        return Map.of(
                "model",       aiProps.getModelo(),
                "temperature", temperature,
                "messages",    messages
        );
    }

    /**
     * Extracts the text from {@code choices[0].message.content} in the LLM JSON response.
     *
     * @param responseJson full response in JSON string format
     * @return content of the message generated by the model
     * @throws Exception if the JSON does not have the expected structure
     */
    private String extractContent(String responseJson) throws Exception {
        JsonNode root = objectMapper.readTree(responseJson);
        return root.path("choices")
                   .path(0)
                   .path("message")
                   .path("content")
                   .asText();
    }

    /**
     * Removes Markdown code blocks (``` ... ```) from the beginning and end of text
     * so the JSON can be deserialized correctly.
     *
     * @param text text that may contain Markdown delimiters
     * @return clean text without delimiters
     */
    private String stripMarkdown(String text) {
        if (text == null) {
            return "";
        }
        // Remove opening block with optional label: ```json or ```
        String clean = text.strip().replaceAll("^```[a-zA-Z]*\\s*", "");
        // Remove closing block
        clean = clean.replaceAll("```\\s*$", "");
        return clean.strip();
    }

    /** Checks whether the API key is null or blank. */
    private boolean isApiKeyBlank(String key) {
        return key == null || key.isBlank();
    }
}
