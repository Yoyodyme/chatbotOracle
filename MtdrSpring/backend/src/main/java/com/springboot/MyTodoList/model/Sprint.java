package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity that maps to the SPRINTS table; represents a time-boxed iteration
 * used to group and track a collection of work items.
 */
@Entity
@Table(name = "SPRINTS")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Sprint {

    /** Sequence-backed surrogate key. */
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sprints_seq")
    @SequenceGenerator(name = "sprints_seq", sequenceName = "SPRINTS_SEQ", allocationSize = 1)
    @Column(name = "ID_SPRINT")
    private Long idSprint;

    /** Human-readable label for the iteration; required. */
    @Column(name = "NOMBRE", length = 100, nullable = false)
    private String nombre;

    /** Calendar date on which the iteration begins. */
    @Column(name = "FECHA_INICIO")
    private LocalDate fechaInicio;

    /** Calendar date on which the iteration ends. */
    @Column(name = "FECHA_FIN")
    private LocalDate fechaFin;

    /**
     * Lifecycle marker; defaulted automatically on first insert based on whether
     * the start date is in the future ("FUTURO") or not ("PASADO").
     * The value "current" is used by queries to find the active iteration.
     */
    @Column(name = "ESTADO", length = 20)
    private String estado;

    /** Wall-clock timestamp set automatically on first insert; never overwritten. */
    @Column(name = "CREADO_EN", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        creadoEn = LocalDateTime.now();
        if (estado == null) {
            if (fechaInicio != null && fechaInicio.isAfter(LocalDate.now())) {
                estado = "FUTURO";
            } else {
                estado = "PASADO";
            }
        }
    }
}
