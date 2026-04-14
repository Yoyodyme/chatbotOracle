package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "EVIDENCIAS_TAREA")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EvidenciaTarea {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_EVIDENCIA")
    private Long idEvidencia;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_TAREA", foreignKey = @ForeignKey(name = "FK_EVIDENCIA_TAREA"))
    private Tarea tarea;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_USUARIO_SUBIO", foreignKey = @ForeignKey(name = "FK_EVIDENCIA_USUARIO"))
    private Usuario usuarioSubio;

    @Column(name = "URL_ARCHIVO", length = 500)
    private String urlArchivo;

    @Column(name = "NOTA", length = 500)
    private String nota;

    @Column(name = "CREADO_EN", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        creadoEn = LocalDateTime.now();
    }
}
