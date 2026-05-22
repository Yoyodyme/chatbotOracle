package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "SPRINTS")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Sprint {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sprints_seq")
    @SequenceGenerator(name = "sprints_seq", sequenceName = "SPRINTS_SEQ", allocationSize = 1)
    @Column(name = "ID_SPRINT")
    private Long idSprint;

    @Column(name = "NOMBRE", length = 100, nullable = false)
    private String nombre;

    @Column(name = "FECHA_INICIO")
    private LocalDate fechaInicio;

    @Column(name = "FECHA_FIN")
    private LocalDate fechaFin;

    @Column(name = "ESTADO", length = 20)
    private String estado;

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
