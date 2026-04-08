package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "TAREAS")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Tarea {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_TAREA")
    private Long idTarea;

    @Column(name = "TITULO", length = 200)
    private String titulo;

    @Column(name = "DESCRIPCION", length = 500)
    private String descripcion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_ESTATUS", foreignKey = @ForeignKey(name = "FK_TAREA_ESTATUS"))
    private EstatusTarea estatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_PRIORIDAD", foreignKey = @ForeignKey(name = "FK_TAREA_PRIORIDAD"))
    private PrioridadTarea prioridad;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_USUARIO_CREADOR", foreignKey = @ForeignKey(name = "FK_TAREA_CREADOR"))
    private Usuario usuarioCreador;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_USUARIO_ASIGNADO", foreignKey = @ForeignKey(name = "FK_TAREA_ASIGNADO"))
    private Usuario usuarioAsignado;

    @Column(name = "FECHA_VENCIMIENTO")
    private LocalDate fechaVencimiento;

    @Column(name = "NULL_FIELD", length = 50)
    private String nullField;

    @Column(name = "CREADO_EN", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @Column(name = "ACTUALIZADO_EN")
    private LocalDateTime actualizadoEn;

    @PrePersist
    protected void onCreate() {
        creadoEn = LocalDateTime.now();
        actualizadoEn = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        actualizadoEn = LocalDateTime.now();
    }
}
