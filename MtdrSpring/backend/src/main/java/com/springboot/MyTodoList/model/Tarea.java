package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity that maps to the TAREAS table; represents a single unit of work
 * that can be assigned, prioritised, and tracked through a lifecycle.
 */
@Entity
@Table(name = "TAREAS")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Tarea {

    /** Auto-generated surrogate key. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_TAREA")
    private Long idTarea;

    /** Short human-readable label; required, capped at 200 characters. */
    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    @Column(name = "TITULO", nullable = false, length = 200)
    private String titulo;

    /** Optional longer explanation of the work, capped at 500 characters. */
    @Size(max = 500, message = "Description must not exceed 500 characters")
    @Column(name = "DESCRIPCION", length = 500)
    private String descripcion;

    /** Current lifecycle state; resolved eagerly via FK to ESTATUS_TAREA. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_ESTATUS", foreignKey = @ForeignKey(name = "FK_TAREA_ESTATUS"))
    private EstatusTarea estatus;

    /** Relative urgency level; resolved eagerly via FK to PRIORIDAD_TAREA. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_PRIORIDAD", foreignKey = @ForeignKey(name = "FK_TAREA_PRIORIDAD"))
    private PrioridadTarea prioridad;

    /** Account that originally submitted this record. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_USUARIO_CREADOR", foreignKey = @ForeignKey(name = "FK_TAREA_CREADOR"))
    private Usuario usuarioCreador;

    /** Account currently responsible for completing the work. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_USUARIO_ASIGNADO", foreignKey = @ForeignKey(name = "FK_TAREA_ASIGNADO"))
    private Usuario usuarioAsignado;

    /** Calendar date by which the work must be finished; nullable. */
    @Column(name = "FECHA_VENCIMIENTO")
    private LocalDate fechaVencimiento;

    /** Wall-clock timestamp set automatically on first insert; never overwritten. */
    @Column(name = "CREADO_EN",
            columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            updatable = false)
    private LocalDateTime creadoEn;

    /** Wall-clock timestamp refreshed automatically on every write. */
    @Column(name = "ACTUALIZADO_EN")
    private LocalDateTime actualizadoEn;

    /** Planned effort in decimal hours with two-decimal precision. */
    @Column(name = "HORAS_ESTIMADAS",
            columnDefinition = "NUMBER(5,2) DEFAULT 0.00")
    private Double horasEstimadas;

    /** Actual effort logged after the work is complete, in decimal hours. */
    @Column(name = "HORAS_REALES",
            columnDefinition = "NUMBER(5,2) DEFAULT 0.00")
    private Double horasReales;

    /** Iteration this record belongs to; nullable until the work is scheduled. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_SPRINT", foreignKey = @ForeignKey(name = "FK_TAREA_SPRINT"))
    private Sprint sprint;

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
