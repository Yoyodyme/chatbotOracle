package com.springboot.MyTodoList.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Cuerpo de la solicitud al endpoint de chat del agente IA.
 * El campo {@code historial} es opcional: Jackson lo ignora si está ausente en el JSON,
 * por lo que los clientes existentes que no lo envíen siguen siendo compatibles.
 */
@Data
@NoArgsConstructor
public class ChatRequest {

    /** Mensaje en español enviado por el usuario en el turno actual. */
    private String mensaje;

    /**
     * Historial de conversación opcional en formato de la API de OpenAI/DeepSeek.
     * Cada entrada contiene las claves "role" ("user" o "assistant") y "content".
     * Si el cliente no lo envía, Jackson lo dejará como {@code null}.
     */
    private List<Map<String, String>> historial;
}
