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

    /** No se pudo determinar la intención del mensaje. */
    DESCONOCIDO
}
