package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "PRIORIDAD_TAREA")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrioridadTarea {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_PRIORIDAD")
    private Long idPrioridad;

    @Column(name = "NOMBRE", length = 100)
    private String nombre;

    @Column(name = "ORDEN")
    private Long orden;
}
