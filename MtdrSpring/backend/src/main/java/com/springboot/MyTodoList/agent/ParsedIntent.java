package com.springboot.MyTodoList.agent;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Result of the intent analysis of a user message.
 * Compatible with JSON deserialization from the LLM response.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ParsedIntent {

    /** Detected intent; DESCONOCIDO by default if it cannot be classified. */
    private IntentType intent = IntentType.DESCONOCIDO;

    /** Name of the team member to whom the tasks are assigned (if applicable). */
    private String asignado;

    /** Status of the tasks to filter (if applicable). */
    private String estatus;

    /** Title of the task mentioned (if applicable). */
    private String titulo;

    /** Indicates whether more information is needed from the user to resolve the intent. */
    private boolean clarificationNeeded;

    /** Question that the assistant should ask the user to clarify their intent. */
    private String clarificationQuestion;
}
