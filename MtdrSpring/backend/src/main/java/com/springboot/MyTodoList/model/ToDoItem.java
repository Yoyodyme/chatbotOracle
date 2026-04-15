package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import jakarta.persistence.Column;
import java.time.OffsetDateTime;

@Entity
@Table(name = "TAREAS")
public class ToDoItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_TAREA")
    private int id;

    private String titulo;
    private String descripcion;
    @Column(name = "DONE", nullable = true)
    private Boolean done;
    @Column(name = "CREADO_EN")
    private OffsetDateTime creation_ts;

    @ManyToOne
    @JoinColumn(name = "ID_USUARIO_ASIGNADO")
    private User user;

    public ToDoItem() {}

    public int getID() { return id; }
    public void setID(int id) { this.id = id; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getDescription() { return descripcion; }
    public void setDescription(String descripcion) { this.descripcion = descripcion; }

    public boolean isDone() { return done != null && done; }
    public void setDone(boolean done) { this.done = done; }

    public OffsetDateTime getCreation_ts() { return creation_ts; }
    public void setCreation_ts(OffsetDateTime creation_ts) { this.creation_ts = creation_ts; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    @Override
    public String toString() {
        return "ToDoItem{" +
                "id=" + id +
                ", titulo='" + titulo + '\'' +
                ", descripcion='" + descripcion + '\'' +
                ", done=" + done +
                ", creation_ts=" + creation_ts +
                '}';
    }
}