package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ESTATUS_TAREA")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EstatusTarea {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_ESTATUS")
    private Long idEstatus;

    @Column(name = "NOMBRE", length = 100)
    private String nombre;

    @Column(name = "ORDEN")
    private Long orden;
}
