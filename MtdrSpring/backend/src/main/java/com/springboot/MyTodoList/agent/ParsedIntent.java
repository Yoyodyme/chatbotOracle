package com.springboot.MyTodoList.agent;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Resultado del análisis de intención de un mensaje del usuario.
 * Compatible con deserialización JSON desde la respuesta del LLM.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ParsedIntent {

    /** Intención detectada; DESCONOCIDO por defecto si no se puede clasificar. */
    private IntentType intent = IntentType.DESCONOCIDO;

    /** Nombre del integrante al que están asignadas las tareas (si aplica). */
    private String asignado;

    /** Estatus de las tareas a filtrar (si aplica). */
    private String estatus;

    /** Título de la tarea mencionada (si aplica). */
    private String titulo;

    /** Indica si se necesita más información del usuario para resolver la intención. */
    private boolean clarificationNeeded;

    /** Pregunta que el asistente debe hacerle al usuario para aclarar su intención. */
    private String clarificationQuestion;
}
