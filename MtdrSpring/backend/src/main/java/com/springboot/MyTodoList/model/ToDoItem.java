package com.springboot.MyTodoList.model;

import java.time.OffsetDateTime;

/**
 * Clase adaptadora que envuelve una {@link Tarea} y expone la API que el
 * código heredado del bot (BotActions) y el controlador REST /todolist esperan.
 *
 * Ya no es una entidad JPA — el mapeo a la tabla TAREAS lo gestiona
 * únicamente {@link Tarea} para evitar el conflicto de doble @Entity.
 */
public class ToDoItem {

    private Tarea tarea;

    /** Constructor requerido por Jackson para deserializar @RequestBody en el REST controller. */
    public ToDoItem() {
        this.tarea = new Tarea();
    }

    public ToDoItem(Tarea tarea) {
        this.tarea = tarea;
    }

    /** Acceso a la entidad subyacente, necesario para actualizaciones en ToDoItemService. */
    public Tarea getTarea() { return tarea; }

    public int getID() {
        return tarea.getIdTarea() != null ? tarea.getIdTarea().intValue() : 0;
    }

    public String getTitulo() { return tarea.getTitulo(); }
    public void setTitulo(String titulo) { tarea.setTitulo(titulo); }

    public String getDescription() { return tarea.getDescripcion(); }
    public void setDescription(String descripcion) { tarea.setDescripcion(descripcion); }

    /**
     * La columna DONE ya no existe en el esquema EQ51.
     * Se considera "done" cuando el estatus es "Completada".
     */
    public boolean isDone() {
        return tarea.getEstatus() != null
                && "Completada".equalsIgnoreCase(tarea.getEstatus().getNombre());
    }

    public void setDone(boolean done) {
        // No-op: el estado de completado se gestiona vía EstatusTarea en TareaBotActions.
        // BotActions llama a setDone() para marcar items; dado que la lógica de estatus
        // completa ya vive en TareaBotActions, se mantiene como no-operación aquí.
    }

    public OffsetDateTime getCreation_ts() {
        if (tarea.getCreadoEn() == null) return null;
        return tarea.getCreadoEn().atOffset(java.time.ZoneOffset.UTC);
    }

    @Override
    public String toString() {
        return "ToDoItem{tarea=" + tarea + '}';
    }
}