package com.springboot.MyTodoList.agent;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Result of the intent analysis of a user message.
 * Compatible with JSON deserialization from the LLM response.
 *
 * Fields annotated with {@code @JsonProperty} map to the LLM's JSON keys
 * (which may differ from the Java field names for backwards compatibility).
 * New slot fields use matching Java and JSON names.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ParsedIntent {

    /** Detected intent; UNKNOWN by default if it cannot be classified. */
    private IntentType intent = IntentType.UNKNOWN;

    // -------------------------------------------------------------------------
    // Informational query slots (legacy LLM JSON keys preserved)
    // -------------------------------------------------------------------------

    /** For TASKS_BY_USER: team member name to filter by. LLM JSON key: "asignado". */
    @JsonProperty("asignado")
    private String assignedTo;

    /** For TASKS_BY_STATUS: status name to filter by. LLM JSON key: "estatus". */
    @JsonProperty("estatus")
    private String filterStatus;

    /** Task title mentioned (for VIEW_TASK, MODIFY_TASK queries). LLM JSON key: "titulo". */
    @JsonProperty("titulo")
    private String queryTitle;

    // -------------------------------------------------------------------------
    // Action intent slots — populated during CREATE_TASK / MODIFY_TASK wizards
    // -------------------------------------------------------------------------

    /** Task title to use in CREATE_TASK / MODIFY_TASK wizard. LLM JSON key: "title". */
    private String title;

    /** Sprint name or identifier mentioned by the user. LLM JSON key: "sprintName". */
    private String sprintName;

    /** Assignee name mentioned by the user. LLM JSON key: "assigneeName". */
    private String assigneeName;

    /** Priority name (High / Medium / Low). LLM JSON key: "priority". */
    private String priority;

    /** Estimated hours as a decimal number. LLM JSON key: "estimatedHours". */
    private Double estimatedHours;

    // -------------------------------------------------------------------------
    // Clarification support
    // -------------------------------------------------------------------------

    /** Whether the LLM needs more information from the user before answering. */
    private boolean clarificationNeeded;

    /** Question to ask the user for clarification when {@code clarificationNeeded} is true. */
    private String clarificationQuestion;
}
