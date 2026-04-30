package com.springboot.MyTodoList.agent;

/**
 * Tipos de intención reconocidos por el orquestador de agente IA.
 */
public enum IntentType {
    /** El usuario pide ayuda o instrucciones generales. */
    AYUDA,

    /** El usuario quiere ver todas las tareas. */
    LISTAR_TAREAS,

    /** El usuario quiere las tareas de un integrante específico. */
    TAREAS_POR_ASIGNADO,

    /** El usuario filtra tareas por estatus (pendiente, en progreso, completada). */
    TAREAS_POR_ESTATUS,

    /** El usuario solicita un resumen del sprint actual. */
    RESUMEN_SPRINT,

    /** El usuario pregunta por la carga de trabajo del equipo. */
    CARGA_EQUIPO,

    /** El usuario quiere ver los detalles de una tarea específica. */
    VER_TAREA,

    /** El usuario quiere modificar o editar una tarea existente. */
    MODIFICAR_TAREA,

    /** El usuario quiere reasignar una tarea a otro integrante. */
    ASIGNAR_TAREA,

    /** No se pudo determinar la intención del mensaje. */
    DESCONOCIDO
}
