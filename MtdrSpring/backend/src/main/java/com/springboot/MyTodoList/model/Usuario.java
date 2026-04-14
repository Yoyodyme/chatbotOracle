package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "USUARIOS")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_USUARIO")
    private Long idUsuario;

    @Column(name = "ID_INTEGRATION_USUARIO", unique = true, length = 100)
    private String idIntegrationUsuario;

    @Column(name = "NOMBRE_USUARIO", length = 100)
    private String nombreUsuario;

    @Column(name = "NOMBRE_COMPLETO", length = 200)
    private String nombreCompleto;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_ROL", foreignKey = @ForeignKey(name = "FK_USUARIO_ROL"))
    private Rol rol;

    @Column(name = "CREADO_EN", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        creadoEn = LocalDateTime.now();
    }
}
