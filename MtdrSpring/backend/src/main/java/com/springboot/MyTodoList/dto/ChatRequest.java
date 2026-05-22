package com.springboot.MyTodoList.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Request body for the AI agent chat endpoint.
 * The {@code historial} field is optional: Jackson ignores it if absent from the JSON,
 * so existing clients that do not send it remain compatible.
 */
@Data
@NoArgsConstructor
public class ChatRequest {

    /** Message sent by the user in the current turn. */
    private String mensaje;

    /**
     * Optional conversation history in OpenAI/DeepSeek API format.
     * Each entry contains the keys "role" ("user" or "assistant") and "content".
     * If the client does not send it, Jackson will leave it as {@code null}.
     */
    private List<Map<String, String>> historial;
}
