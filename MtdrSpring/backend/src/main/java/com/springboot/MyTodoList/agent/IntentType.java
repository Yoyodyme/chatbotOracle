package com.springboot.MyTodoList.agent;

/**
 * Intent types recognized by the AI agent orchestrator.
 */
public enum IntentType {
    /** The user is asking for help or general instructions. */
    AYUDA,

    /** The user wants to see all tasks. */
    LISTAR_TAREAS,

    /** The user wants the tasks assigned to a specific team member. */
    TAREAS_POR_ASIGNADO,

    /** The user is filtering tasks by status (pending, in progress, completed). */
    TAREAS_POR_ESTATUS,

    /** The user is requesting a summary of the current sprint. */
    RESUMEN_SPRINT,

    /** The user is asking about the team's workload. */
    CARGA_EQUIPO,

    /** The user wants to see the details of a specific task. */
    VER_TAREA,

    /** The user wants to modify or edit an existing task. */
    MODIFICAR_TAREA,

    /** The user wants to reassign a task to another team member. */
    ASIGNAR_TAREA,

    /** The intent of the message could not be determined. */
    DESCONOCIDO
}
