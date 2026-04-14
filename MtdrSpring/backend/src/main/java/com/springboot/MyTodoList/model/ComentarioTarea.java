package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "COMENTARIOS_TAREA")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComentarioTarea {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_COMENTARIO")
    private Long idComentario;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_TAREA", foreignKey = @ForeignKey(name = "FK_COMENT_TAREA"))
    private Tarea tarea;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_USUARIO_AUTOR", foreignKey = @ForeignKey(name = "FK_COMENT_USUARIO"))
    private Usuario usuarioAutor;

    @Column(name = "CUERPO", length = 1000)
    private String cuerpo;

    @Column(name = "CREADO_EN", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        creadoEn = LocalDateTime.now();
    }
}
