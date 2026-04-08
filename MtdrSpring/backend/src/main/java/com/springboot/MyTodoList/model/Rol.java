package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ROLES")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Rol {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_ROL")
    private Long idRol;

    @Column(name = "NOMBRE", length = 100)
    private String nombre;

    @Column(name = "DESCRIPCION", length = 255)
    private String descripcion;
}
