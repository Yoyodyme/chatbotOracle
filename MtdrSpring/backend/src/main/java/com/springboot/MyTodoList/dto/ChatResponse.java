package com.springboot.MyTodoList.dto;

import lombok.Value;

/**
 * Respuesta inmutable del agente IA al endpoint de chat.
 */
@Value
public class ChatResponse {

    /** Texto de la respuesta generada por el agente en español. */
    String respuesta;
}
