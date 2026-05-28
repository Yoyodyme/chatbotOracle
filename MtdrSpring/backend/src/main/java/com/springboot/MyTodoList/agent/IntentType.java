package com.springboot.MyTodoList.agent;

/**
 * Intent types recognized by the AI agent orchestrator.
 * Each value maps to a distinct user goal: informational queries are handled
 * directly by AgentOrchestrator, while action intents trigger a wizard flow
 * in the dispatcher.
 */
public enum IntentType {

    // -------------------------------------------------------------------------
    // Informational queries — handled inline by AgentOrchestrator
    // -------------------------------------------------------------------------

    /** The user is asking for help or general instructions. */
    HELP,

    /** The user wants to see all tasks. */
    LIST_TASKS,

    /** The user wants the tasks assigned to a specific team member. */
    TASKS_BY_USER,

    /** The user is filtering tasks by status (pending, in progress, completed). */
    TASKS_BY_STATUS,

    /** The user is requesting a summary of the current sprint. */
    SPRINT_SUMMARY,

    /** The user is asking about the team's workload distribution. */
    TEAM_WORKLOAD,

    /** The user wants to see the details of a specific task. */
    VIEW_TASK,

    // -------------------------------------------------------------------------
    // Action intents — trigger a wizard flow in the dispatcher
    // -------------------------------------------------------------------------

    /** The user wants to create a new task. */
    CREATE_TASK,

    /** The user wants to assign a task to a sprint. */
    ASSIGN_SPRINT,

    /** The user wants to mark a task as completed. */
    COMPLETE_TASK,

    /** The user wants to modify or edit an existing task. */
    MODIFY_TASK,

    /** The user wants to create a new sprint. */
    CREATE_SPRINT,

    /** The user wants to edit an existing sprint. */
    MODIFY_SPRINT,

    /** The user wants to view the sprint task table. */
    SPRINT_TABLE,

    /** The user wants to view a KPI report. */
    KPI_REPORT,

    // -------------------------------------------------------------------------
    // Fallback
    // -------------------------------------------------------------------------

    /** The intent of the message could not be determined. */
    UNKNOWN
}
