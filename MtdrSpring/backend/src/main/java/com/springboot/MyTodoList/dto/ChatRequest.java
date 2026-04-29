package com.springboot.MyTodoList.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Cuerpo de la solicitud al endpoint de chat del agente IA.
 */
@Data
@NoArgsConstructor
public class ChatRequest {

    /** Mensaje en español enviado por el usuario. */
    private String mensaje;
}
